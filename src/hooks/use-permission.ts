import { useAuth, UserRole } from '@/contexts/AuthContext';

// Define the Permissions Map again on the client side (must match lib/auth.ts)
// This simplifies component imports.
const Permissions = {
    MASTER_DATA_WRITE: [UserRole.ADMIN, UserRole.SUPERADMIN],
    REPORTS_VIEW: [UserRole.ADMIN, UserRole.SUPERADMIN],
    DELIVERY_APPROVAL: [UserRole.SUPERADMIN],
    LABOUR_MANAGEMENT: [UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.OPERATOR],
    CORE_OPERATIONS: [UserRole.OPERATOR, UserRole.ADMIN, UserRole.SUPERADMIN],
};

type PermissionKey = keyof typeof Permissions;

/**
 * Hook to check if the current user has permission for a given action or module.
 */
export function usePermission() {
    const { user, isLoading } = useAuth();

    const check = (permissionKey: PermissionKey): boolean => {
        if (isLoading || !user) return false;

        const requiredRoles = Permissions[permissionKey];
        if (!requiredRoles) return false;

        return requiredRoles.includes(user.role);
    };

    return {
        hasPermission: check,
        userRole: user?.role,
        isAuthLoading: isLoading,
    };
}
