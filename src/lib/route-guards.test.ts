import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, signSessionToken } from '@/lib/session';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { POST as postShipment } from '@/app/api/shipments/route';
import { POST as postDelivery } from '@/app/api/deliveries/route';
import { PATCH as patchDelivery } from '@/app/api/deliveries/[deliveryId]/route';
import { POST as postLabour } from '@/app/api/labour-settlements/route';
import { POST as postSignup } from '@/app/api/auth/signup/route';
import { GET as getBackup } from '@/app/api/backup/route';
import { POST as postBackupRestore } from '@/app/api/backup/restore/route';

async function withSession(role: string, username: string, init: { method: string; body?: string; ip?: string }) {
  const token = await signSessionToken({ id: 7, username, role });
  prismaMock.user.findUnique.mockResolvedValue({ id: 7, username, role });
  return new NextRequest('http://localhost/api/test', {
    method: init.method,
    body: init.body,
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=${token}`,
      'content-type': 'application/json',
      'x-forwarded-for': init.ip || '203.0.113.10',
    },
  });
}

describe('route guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an unauthenticated shipment create', async () => {
    const response = await postShipment(new Request('http://localhost/api/shipments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    }));

    expect(response.status).toBe(401);
  });

  it('blocks an operator from the final delivery approval', async () => {
    const request = await withSession('OPERATOR', 'operator', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'APPROVED' }),
    });

    const response = await patchDelivery(request, { params: Promise.resolve({ deliveryId: '4' }) });
    expect(response.status).toBe(403);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('returns 409 when a second delivery hits the unique shipment constraint', async () => {
    prismaMock.$transaction.mockRejectedValue(new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '6.16.3' },
    ));

    const request = await withSession('OPERATOR', 'operator', {
      method: 'POST',
      body: JSON.stringify({
        shipment_id: '202609-0001',
        delivery_date: '2026-09-21',
        receiver_name: 'Receiver',
        station_expense: 0,
        bility_expense: 0,
        station_labour: 0,
        cart_labour: 0,
        total_expenses: 0,
      }),
    });

    const response = await postDelivery(request);
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.message).toMatch(/already recorded/i);
  });

  it('adds labour payments with increment so two updates do not overwrite each other', async () => {
    let collected = new Prisma.Decimal(0);
    const increments: string[] = [];

    prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn({
      labourAssignment: {
        findUnique: async () => ({ shipment_id: '202609-0001', labour_person_id: 3 }),
        update: async ({ data }: { data: { collected_amount: { increment: Prisma.Decimal } } }) => {
          increments.push(data.collected_amount.increment.toString());
          collected = collected.plus(data.collected_amount.increment);
          return { id: 9, collected_amount: collected };
        },
      },
      labourPaymentHistory: { create: async () => ({ id: 1 }) },
    }));

    for (const amount of ['10.50', '4.25']) {
      const request = await withSession('ADMIN', 'admin', {
        method: 'POST',
        body: JSON.stringify({ assignment_id: 9, amount_paid: amount }),
      });
      const response = await postLabour(request);
      expect(response.status).toBe(200);
    }

    expect(increments).toEqual(['10.5', '4.25']);
    expect(collected.toString()).toBe('14.75');
  });

  it('refuses signup after the first user exists when no SuperAdmin is signed in', async () => {
    prismaMock.user.count.mockResolvedValue(1);

    const response = await postSignup(new NextRequest('http://localhost/api/auth/signup', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '203.0.113.55',
      },
      body: JSON.stringify({
        username: 'new-operator',
        password: 'long-enough-password',
        role: 'OPERATOR',
      }),
    }));

    expect(response.status).toBe(401);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated backup download', async () => {
    const response = await getBackup(new NextRequest('http://localhost/api/backup'));
    expect(response.status).toBe(401);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('blocks an operator from restoring the database', async () => {
    const token = await signSessionToken({ id: 7, username: 'operator', role: 'OPERATOR' });
    prismaMock.user.findUnique.mockResolvedValue({ id: 7, username: 'operator', role: 'OPERATOR' });

    const form = new FormData();
    form.append('confirmation', 'RESTORE');
    form.append('file', new File(['{"format":"zikria-gms-backup"}'], 'backup.json', { type: 'application/json' }));

    const response = await postBackupRestore(new NextRequest('http://localhost/api/backup/restore', {
      method: 'POST',
      body: form,
      headers: {
        cookie: `${AUTH_COOKIE_NAME}=${token}`,
        'x-forwarded-for': '203.0.113.10',
      },
    }));

    expect(response.status).toBe(403);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
