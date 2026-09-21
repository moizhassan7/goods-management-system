import { describe, expect, it } from 'vitest';
import { UserRole } from '@/lib/auth';
import { canTransitionDeliveryApproval } from '@/lib/approval';
import { rateLimit } from '@/lib/rate-limit';
import { getAuthSecret, signSessionToken, verifySessionToken } from '@/lib/session';

describe('signed sessions', () => {
  it('rejects a tampered token and a raw user id', async () => {
    const token = await signSessionToken({ id: 1, username: 'superadmin', role: 'SUPERADMIN' });
    const flipped = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;

    expect(await verifySessionToken(token)).toMatchObject({ id: 1, role: 'SUPERADMIN' });
    expect(await verifySessionToken(flipped)).toBeNull();
    expect(await verifySessionToken('1')).toBeNull();
  });

  it('refuses to start signing when AUTH_SECRET is missing in production', () => {
    const env = process.env as Record<string, string | undefined>;
    const previousEnv = env.NODE_ENV;
    const previousSecret = env.AUTH_SECRET;
    env.NODE_ENV = 'production';
    delete env.AUTH_SECRET;

    expect(() => getAuthSecret()).toThrow(/AUTH_SECRET/);

    env.NODE_ENV = previousEnv;
    env.AUTH_SECRET = previousSecret;
  });
});

describe('delivery approval transitions', () => {
  it('lets an admin do the first stage and blocks a final approval', () => {
    expect(canTransitionDeliveryApproval(UserRole.ADMIN, 'PENDING', 'APPROVED_BY_ADMIN')).toBe(true);
    expect(canTransitionDeliveryApproval(UserRole.ADMIN, 'PENDING', 'REJECTED')).toBe(true);
    expect(canTransitionDeliveryApproval(UserRole.ADMIN, 'APPROVED_BY_ADMIN', 'APPROVED')).toBe(false);
    expect(canTransitionDeliveryApproval(UserRole.OPERATOR, 'PENDING', 'APPROVED')).toBe(false);
    expect(canTransitionDeliveryApproval(UserRole.OPERATOR, 'PENDING', 'APPROVED_BY_ADMIN')).toBe(false);
  });

  it('lets only a superadmin finish approval', () => {
    expect(canTransitionDeliveryApproval(UserRole.SUPERADMIN, 'APPROVED_BY_ADMIN', 'APPROVED')).toBe(true);
    expect(canTransitionDeliveryApproval(UserRole.SUPERADMIN, 'PENDING', 'APPROVED')).toBe(false);
    expect(canTransitionDeliveryApproval(UserRole.ADMIN, 'PENDING', 'APPROVED')).toBe(false);
  });
});

describe('rate limit', () => {
  it('blocks the 11th attempt in the same window', () => {
    const key = `test-login-${Date.now()}`;
    for (let i = 0; i < 10; i += 1) {
      expect(rateLimit(key, 10, 60_000)).toBe(true);
    }
    expect(rateLimit(key, 10, 60_000)).toBe(false);
  });
});
