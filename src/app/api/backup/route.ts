import { NextRequest, NextResponse } from 'next/server';
import { isAuthError, Permissions, requireAuth } from '@/lib/auth';
import {
    backupFileName,
    createBackupPayload,
    getLiveBackupSummary,
    summarizeBackupTables,
} from '@/lib/backup';
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { prismaErrorMessage } from '@/lib/api-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 180;

export async function GET(request: NextRequest) {
    const auth = await requireAuth(request, Permissions.MASTER_DATA_WRITE);
    if (isAuthError(auth)) return auth;

    if (!rateLimit(`backup-get:${auth.id}:${clientIp(request)}`, 8, 60_000)) {
        return NextResponse.json(tooManyRequests(), { status: 429 });
    }

    try {
        const summaryOnly = request.nextUrl.searchParams.get('summary') === '1';
        if (summaryOnly) {
            const summary = await getLiveBackupSummary();
            return NextResponse.json(summary, {
                headers: { 'Cache-Control': 'no-store' },
            });
        }

        const payload = await createBackupPayload(auth.username);
        const body = JSON.stringify(payload);
        const summary = summarizeBackupTables(payload.tables);

        return new NextResponse(body, {
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Content-Disposition': `attachment; filename="${backupFileName()}"`,
                'Cache-Control': 'no-store',
                'X-Backup-Records': String(summary.totalRecords),
            },
        });
    } catch (error) {
        console.error('Backup download failed:', error instanceof Error ? error.message : 'unknown');
        return NextResponse.json(
            { message: prismaErrorMessage(error, 'Failed to create database backup.') },
            { status: 500 },
        );
    }
}
