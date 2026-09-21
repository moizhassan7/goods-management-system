import { describe, expect, it } from 'vitest';
import {
    BACKUP_FORMAT,
    BACKUP_TABLES,
    BACKUP_VERSION,
    RESTORE_CONFIRMATION,
} from '@/lib/backup-constants';
import {
    BackupError,
    backupFileName,
    parseAndValidateBackup,
    summarizeBackupTables,
} from '@/lib/backup';

function validBackup(overrides: Record<string, unknown> = {}) {
    return {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        createdAt: '2026-09-21T12:00:00.000Z',
        createdBy: 'superadmin',
        tables: {
            User: [{ id: 1, username: 'superadmin', password: 'hash', role: 'SUPERADMIN' }],
            City: [{ id: 1, name: 'Sargodha' }],
        },
        ...overrides,
    };
}

describe('backup validation', () => {
    it('accepts a Zikria backup and fills missing tables as empty arrays', () => {
        const payload = parseAndValidateBackup(validBackup());

        expect(payload.format).toBe(BACKUP_FORMAT);
        expect(payload.version).toBe(BACKUP_VERSION);
        expect(payload.tables.User).toHaveLength(1);
        expect(payload.tables.City).toEqual([{ id: 1, name: 'Sargodha' }]);
        expect(payload.tables.Shipment).toEqual([]);
        expect(Object.keys(payload.tables)).toHaveLength(BACKUP_TABLES.length);
    });

    it('rejects a random JSON file', () => {
        expect(() => parseAndValidateBackup({ hello: 'world' })).toThrow(BackupError);
        expect(() => parseAndValidateBackup({ hello: 'world' })).toThrow(/not a Zikria Goods backup/i);
    });

    it('rejects a wrong backup version', () => {
        expect(() => parseAndValidateBackup(validBackup({ version: 99 }))).toThrow(/unsupported backup version/i);
    });

    it('rejects a table that is not an array', () => {
        expect(() => parseAndValidateBackup(validBackup({
            tables: { User: { id: 1 } },
        }))).toThrow(/invalid/i);
    });

    it('counts records across known tables only', () => {
        const payload = parseAndValidateBackup(validBackup());
        const summary = summarizeBackupTables(payload.tables);
        expect(summary.totalRecords).toBe(2);
        expect(summary.tables.find((table) => table.key === 'User')?.count).toBe(1);
    });

    it('builds a dated json filename', () => {
        expect(backupFileName(new Date('2026-09-21T10:15:00.000Z'))).toBe(
            'zikria-gms-backup-2026-09-21T10-15-00.json',
        );
    });

    it('keeps the restore confirmation phrase exact', () => {
        expect(RESTORE_CONFIRMATION).toBe('RESTORE');
    });
});
