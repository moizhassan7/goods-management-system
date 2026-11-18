import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, signSessionToken } from '@/lib/session';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
    },
    shipment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    transaction: {
      deleteMany: vi.fn(),
    },
    delivery: {
      deleteMany: vi.fn(),
    },
    vehicleTransaction: {
      deleteMany: vi.fn(),
    },
    labourAssignment: {
      deleteMany: vi.fn(),
    },
    labourPaymentHistory: {
      deleteMany: vi.fn(),
    },
    goodsDetails: {
      deleteMany: vi.fn(),
    },
    returnShipment: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { GET as getRecycleBin } from '@/app/api/recycle-bin/route';
import { POST as restoreShipment } from '@/app/api/recycle-bin/[shipmentId]/restore/route';
import { DELETE as permanentDeleteShipment } from '@/app/api/recycle-bin/[shipmentId]/route';
import { DELETE as softDeleteShipment } from '@/app/api/shipments/[shipmentId]/route';

async function createRequest(role: string, username: string, url: string, method: string, body?: any) {
  const token = await signSessionToken({ id: 99, username, role });
  prismaMock.user.findUnique.mockResolvedValue({ id: 99, username, role });
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      cookie: `${AUTH_COOKIE_NAME}=${token}`,
      'content-type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
    },
  });
}

describe('Recycle Bin & Soft Delete System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Permissions & Access Control', () => {
    it('rejects unauthenticated request to Recycle Bin', async () => {
      const req = new NextRequest('http://localhost/api/recycle-bin', { method: 'GET' });
      const res = await getRecycleBin(req);
      expect(res.status).toBe(401);
    });

    it('blocks OPERATOR from viewing the Recycle Bin with 403', async () => {
      const req = await createRequest('OPERATOR', 'operator_ali', 'http://localhost/api/recycle-bin', 'GET');
      const res = await getRecycleBin(req);
      expect(res.status).toBe(403);
    });

    it('blocks regular ADMIN from viewing the Recycle Bin with 403', async () => {
      const req = await createRequest('ADMIN', 'admin_user', 'http://localhost/api/recycle-bin', 'GET');
      const res = await getRecycleBin(req);
      expect(res.status).toBe(403);
    });

    it('allows SUPERADMIN to view the Recycle Bin with 200', async () => {
      prismaMock.$transaction.mockResolvedValue([
        [
          {
            register_number: 'REG-101',
            bility_number: 'BL-505',
            bility_date: new Date('2026-11-18'),
            total_charges: { toString: () => '2500.00' },
            total_delivery_charges: { toString: () => '200.00' },
            remarks: null,
            deleted_at: new Date('2026-11-18T12:00:00Z'),
            deleted_by_name: 'operator_ali',
            deleted_by_id: 99,
            departureCity: { name: 'Sargodha' },
            toCity: { name: 'Lahore' },
            sender: { name: 'Sender Corp' },
            receiver: { name: 'Receiver Co' },
            vehicle: { vehicleNumber: 'LES-9999' },
            forwardingAgency: { name: 'Zikria Goods' },
            deletedBy: { id: 99, username: 'operator_ali', role: 'OPERATOR' },
            goodsDetails: [{ quantity: 5, itemCatalog: { item_description: 'Bags' } }],
          },
        ],
        1,
        { _sum: { total_charges: 2500, total_delivery_charges: 200 } },
      ]);

      const req = await createRequest('SUPERADMIN', 'super_boss', 'http://localhost/api/recycle-bin', 'GET');
      const res = await getRecycleBin(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.shipments).toHaveLength(1);
      expect(data.shipments[0].bility_number).toBe('BL-505');
      expect(data.shipments[0].deleted_by_name).toBe('operator_ali');
    });
  });

  describe('Soft Delete Operation', () => {
    it('allows an OPERATOR to soft delete a bilty and records operator details', async () => {
      prismaMock.shipment.findUnique.mockResolvedValue({
        register_number: 'REG-202',
        bility_number: 'BL-999',
        is_deleted: false,
      });
      prismaMock.shipment.update.mockResolvedValue({
        register_number: 'REG-202',
        bility_number: 'BL-999',
        is_deleted: true,
      });

      const req = await createRequest(
        'OPERATOR',
        'operator_hassan',
        'http://localhost/api/shipments/REG-202',
        'DELETE'
      );
      const res = await softDeleteShipment(req, { params: Promise.resolve({ shipmentId: 'REG-202' }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.message).toContain('moved to Recycle Bin');

      // Verify update was called with soft-delete fields
      expect(prismaMock.shipment.update).toHaveBeenCalledWith({
        where: { register_number: 'REG-202' },
        data: expect.objectContaining({
          is_deleted: true,
          deleted_by_name: 'operator_hassan',
          deleted_by_id: 99,
          deleted_at: expect.any(Date),
        }),
      });
    });
  });

  describe('Restore Operation', () => {
    it('blocks OPERATOR from restoring a deleted bilty with 403', async () => {
      const req = await createRequest(
        'OPERATOR',
        'operator_ali',
        'http://localhost/api/recycle-bin/REG-202/restore',
        'POST'
      );
      const res = await restoreShipment(req, { params: Promise.resolve({ shipmentId: 'REG-202' }) });
      expect(res.status).toBe(403);
    });

    it('allows SUPERADMIN to restore a soft-deleted bilty', async () => {
      prismaMock.shipment.findUnique.mockResolvedValue({
        register_number: 'REG-202',
        bility_number: 'BL-999',
        is_deleted: true,
      });
      prismaMock.shipment.update.mockResolvedValue({
        register_number: 'REG-202',
        bility_number: 'BL-999',
        is_deleted: false,
      });

      const req = await createRequest(
        'SUPERADMIN',
        'super_boss',
        'http://localhost/api/recycle-bin/REG-202/restore',
        'POST'
      );
      const res = await restoreShipment(req, { params: Promise.resolve({ shipmentId: 'REG-202' }) });
      expect(res.status).toBe(200);

      expect(prismaMock.shipment.update).toHaveBeenCalledWith({
        where: { register_number: 'REG-202' },
        data: {
          is_deleted: false,
          deleted_at: null,
          deleted_by_id: null,
          deleted_by_name: null,
        },
      });
    });
  });

  describe('Permanent Delete Operation', () => {
    it('blocks OPERATOR from permanently deleting a bilty with 403', async () => {
      const req = await createRequest(
        'OPERATOR',
        'operator_ali',
        'http://localhost/api/recycle-bin/REG-202',
        'DELETE'
      );
      const res = await permanentDeleteShipment(req, { params: Promise.resolve({ shipmentId: 'REG-202' }) });
      expect(res.status).toBe(403);
    });

    it('allows SUPERADMIN to permanently delete a bilty and cascade foreign records', async () => {
      prismaMock.shipment.findUnique.mockResolvedValue({
        register_number: 'REG-202',
        bility_number: 'BL-999',
        is_deleted: true,
      });
      prismaMock.$transaction.mockImplementation(async (callback: any) => {
        return callback(prismaMock);
      });

      const req = await createRequest(
        'SUPERADMIN',
        'super_boss',
        'http://localhost/api/recycle-bin/REG-202',
        'DELETE'
      );
      const res = await permanentDeleteShipment(req, { params: Promise.resolve({ shipmentId: 'REG-202' }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.message).toContain('permanently deleted');
      expect(prismaMock.shipment.delete).toHaveBeenCalledWith({ where: { register_number: 'REG-202' } });
    });
  });
});
