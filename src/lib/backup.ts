import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { invalidateMasterCache } from '@/lib/cache';
import {
    BACKUP_FORMAT,
    BACKUP_TABLES,
    BACKUP_VERSION,
    INSERT_CHUNK_SIZE,
    type BackupTableKey,
} from '@/lib/backup-constants';

export {
    BACKUP_FORMAT,
    BACKUP_TABLES,
    BACKUP_VERSION,
    INSERT_CHUNK_SIZE,
    MAX_BACKUP_BYTES,
    RESTORE_CONFIRMATION,
} from '@/lib/backup-constants';
export type { BackupTableKey } from '@/lib/backup-constants';

type DbClient = PrismaClient | Prisma.TransactionClient;

type TableDelegate = {
    findMany: () => Promise<Record<string, unknown>[]>;
    createMany: (args: { data: Record<string, unknown>[] }) => Promise<{ count: number }>;
    count: () => Promise<number>;
};

export type BackupPayload = {
    format: typeof BACKUP_FORMAT;
    version: typeof BACKUP_VERSION;
    createdAt: string;
    createdBy: string;
    tables: Record<string, Record<string, unknown>[]>;
};

export type BackupSummary = {
    createdAt?: string;
    createdBy?: string;
    totalRecords: number;
    tables: Array<{ key: BackupTableKey; count: number }>;
};

export class BackupError extends Error {
    status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = 'BackupError';
        this.status = status;
    }
}

function delegate(db: DbClient, model: (typeof BACKUP_TABLES)[number]['model']): TableDelegate {
    return (db as unknown as Record<string, TableDelegate>)[model];
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function backupFileName(date = new Date()) {
    const stamp = date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `zikria-gms-backup-${stamp}.json`;
}

export function parseAndValidateBackup(raw: unknown): BackupPayload {
    if (!isPlainRecord(raw)) {
        throw new BackupError('Backup file is not valid JSON.');
    }

    if (raw.format !== BACKUP_FORMAT) {
        throw new BackupError('This file is not a Zikria Goods backup.');
    }

    if (raw.version !== BACKUP_VERSION) {
        throw new BackupError(`Unsupported backup version. Expected ${BACKUP_VERSION}.`);
    }

    if (!isPlainRecord(raw.tables)) {
        throw new BackupError('Backup file is missing table data.');
    }

    const tables: BackupPayload['tables'] = {};
    for (const table of BACKUP_TABLES) {
        const rows = raw.tables[table.key];
        if (rows === undefined) {
            tables[table.key] = [];
            continue;
        }
        if (!Array.isArray(rows)) {
            throw new BackupError(`Backup table "${table.key}" is invalid.`);
        }
        for (const row of rows) {
            if (!isPlainRecord(row)) {
                throw new BackupError(`Backup table "${table.key}" contains an invalid row.`);
            }
        }
        tables[table.key] = rows as Record<string, unknown>[];
    }

    return {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
        createdBy: typeof raw.createdBy === 'string' ? raw.createdBy : 'unknown',
        tables,
    };
}

export function summarizeBackupTables(tables: BackupPayload['tables']): BackupSummary {
    const summaryTables = BACKUP_TABLES.map((table) => ({
        key: table.key,
        count: tables[table.key]?.length ?? 0,
    }));

    return {
        totalRecords: summaryTables.reduce((sum, table) => sum + table.count, 0),
        tables: summaryTables,
    };
}

export async function getLiveBackupSummary(): Promise<BackupSummary> {
    const counts = await Promise.all(
        BACKUP_TABLES.map((table) => delegate(prisma, table.model).count()),
    );

    const tables = BACKUP_TABLES.map((table, index) => ({
        key: table.key,
        count: counts[index] ?? 0,
    }));

    return {
        totalRecords: tables.reduce((sum, table) => sum + table.count, 0),
        tables,
    };
}

export async function createBackupPayload(createdBy: string): Promise<BackupPayload> {
    const tables = await prisma.$transaction(
        async (tx) => {
            const dumped: BackupPayload['tables'] = {};
            for (const table of BACKUP_TABLES) {
                dumped[table.key] = await delegate(tx, table.model).findMany();
            }
            return dumped;
        },
        {
            maxWait: 15_000,
            timeout: 120_000,
        },
    );

    return {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        createdBy,
        tables,
    };
}

function quotedTableList() {
    return BACKUP_TABLES.map((table) => `"${table.sqlName}"`).join(', ');
}

async function resetSerialSequences(tx: Prisma.TransactionClient) {
    await tx.$executeRawUnsafe(`
        DO $$
        DECLARE
            rec RECORD;
            max_id BIGINT;
        BEGIN
            FOR rec IN
                SELECT
                    n.nspname AS schema_name,
                    c.relname AS table_name,
                    a.attname AS column_name,
                    pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) AS seq_name
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                JOIN pg_attribute a ON a.attrelid = c.oid
                WHERE n.nspname = 'public'
                  AND c.relkind = 'r'
                  AND a.attnum > 0
                  AND NOT a.attisdropped
                  AND pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) IS NOT NULL
            LOOP
                EXECUTE format(
                    'SELECT COALESCE(MAX(%I), 1) FROM %I.%I',
                    rec.column_name,
                    rec.schema_name,
                    rec.table_name
                ) INTO max_id;

                EXECUTE format('SELECT setval(%L, %s, true)', rec.seq_name, max_id);
            END LOOP;
        END $$;
    `);
}

export async function restoreBackupPayload(payload: BackupPayload) {
    const restored = await prisma.$transaction(
        async (tx) => {
            await tx.$executeRawUnsafe(
                `TRUNCATE TABLE ${quotedTableList()} RESTART IDENTITY CASCADE`,
            );

            const counts: Record<string, number> = {};

            for (const table of BACKUP_TABLES) {
                const rows = payload.tables[table.key] ?? [];
                let inserted = 0;

                for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
                    const chunk = rows.slice(i, i + INSERT_CHUNK_SIZE);
                    if (chunk.length === 0) continue;
                    const result = await delegate(tx, table.model).createMany({ data: chunk });
                    inserted += result.count;
                }

                counts[table.key] = inserted;
            }

            await resetSerialSequences(tx);
            return counts;
        },
        {
            maxWait: 20_000,
            timeout: 180_000,
        },
    );

    await invalidateMasterCache();
    return restored;
}

export async function sessionUserStillExists(userId: number) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
    });
    return Boolean(user);
}
