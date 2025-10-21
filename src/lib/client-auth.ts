// src/lib/client-auth.ts
export enum UserRole {
    OPERATOR = 'OPERATOR',
    ADMIN = 'ADMIN',
    SUPERADMIN = 'SUPERADMIN',
}
// You would expose the current user session role through a hook here.