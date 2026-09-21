import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, Permissions, requireAuth } from '@/lib/auth';
import {
    BackupError,
    MAX_BACKUP_BYTES,
    parseAndValidateBackup,
    restoreBackupPayload,
    RESTORE_CONFIRMATION,
    sessionUserStillExists,
    summarizeBackupTables,
} from '@/lib/backup';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { prismaErrorMessage } from '@/lib/api-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 180;

export async function POST(request: NextRequest) {
    const auth = await requireAuth(request, Permissions.BACKUP_RESTORE);
    if (isAuthError(auth)) return auth;

    if (!rateLimit(`backup-restore:${auth.id}:${clientIp(request)}`, 3, 10 * 60_000)) {
        return NextResponse.json(tooManyRequests(), { status: 429 });
    }

    try {
        const contentType = request.headers.get('content-type') || '';
        if (!contentType.includes('multipart/form-data')) {
            return NextResponse.json(
                { message: 'Upload a backup JSON file using the restore form.' },
                { status: 400 },
            );
        }

        const form = await request.formData();
        const confirmation = String(form.get('confirmation') || '').trim();
        if (confirmation !== RESTORE_CONFIRMATION) {
            return NextResponse.json(
                { message: `Type ${RESTORE_CONFIRMATION} to confirm a full database restore.` },
                { status: 400 },
            );
        }

        const file = form.get('file');
        if (!(file instanceof File)) {
            return NextResponse.json({ message: 'Select a backup JSON file to restore.' }, { status: 400 });
        }

        if (file.size <= 0) {
            return NextResponse.json({ message: 'The selected backup file is empty.' }, { status: 400 });
        }

        if (file.size > MAX_BACKUP_BYTES) {
            return NextResponse.json(
                { message: 'Backup file is too large. Maximum size is 80 MB.' },
                { status: 413 },
            );
        }

        const name = file.name.toLowerCase();
        if (!name.endsWith('.json')) {
            return NextResponse.json(
                { message: 'Only .json backup files exported from this system can be restored.' },
                { status: 400 },
            );
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(await file.text());
        } catch {
            return NextResponse.json({ message: 'Backup file is not valid JSON.' }, { status: 400 });
        }

        const payload = parseAndValidateBackup(parsed);
        const restored = await restoreBackupPayload(payload);
        const summary = summarizeBackupTables(payload.tables);
        const sessionValid = await sessionUserStillExists(auth.id);

        return NextResponse.json({
            success: true,
            message: 'Database restored from backup.',
            restored,
            summary,
            sessionValid,
        });
    } catch (error) {
        if (error instanceof BackupError) {
            return NextResponse.json({ message: error.message }, { status: error.status });
        }

        console.error('Backup restore failed:', error instanceof Error ? error.message : 'unknown');
        return NextResponse.json(
            { message: prismaErrorMessage(error, 'Failed to restore database backup.') },
            { status: 500 },
        );
    }
}
