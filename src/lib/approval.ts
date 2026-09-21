import { UserRole } from '@/lib/auth';

export function canTransitionDeliveryApproval(role: UserRole, from: string, to: string): boolean {
    const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPERADMIN;
    const isSuperAdmin = role === UserRole.SUPERADMIN;

    if (from === 'PENDING' && to === 'APPROVED_BY_ADMIN') return isAdmin;
    if (from === 'PENDING' && to === 'REJECTED') return isAdmin;
    if (from === 'APPROVED_BY_ADMIN' && to === 'APPROVED') return isSuperAdmin;
    if (from === 'APPROVED_BY_ADMIN' && to === 'REJECTED') return isSuperAdmin;
    return false;
}
