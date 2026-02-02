import { WorkspaceRole } from '@prisma/client'

// Define all available permissions
export const PERMISSIONS = {
    // Case permissions
    'cases.create': 'Create new cases',
    'cases.read': 'View cases',
    'cases.update': 'Edit case details',
    'cases.delete': 'Delete cases',
    'cases.assign': 'Assign counsel to cases',

    // Hearing permissions
    'hearings.create': 'Create hearings',
    'hearings.read': 'View hearings',
    'hearings.update': 'Edit hearing details',
    'hearings.delete': 'Delete hearings',
    'hearings.schedule': 'Schedule hearings',

    // Document permissions
    'documents.upload': 'Upload documents',
    'documents.read': 'View documents',
    'documents.download': 'Download documents',
    'documents.delete': 'Delete documents',

    // Client permissions
    'clients.create': 'Create clients',
    'clients.read': 'View clients',
    'clients.update': 'Edit client details',
    'clients.delete': 'Delete clients',

    // Task permissions
    'tasks.create': 'Create tasks',
    'tasks.read': 'View tasks',
    'tasks.update': 'Edit tasks',
    'tasks.delete': 'Delete tasks',
    'tasks.assign': 'Assign tasks to members',

    // Report permissions
    'reports.view': 'View reports',
    'reports.export': 'Export reports',

    // Invoice permissions
    'invoices.create': 'Create invoices',
    'invoices.read': 'View invoices',
    'invoices.update': 'Edit invoices',
    'invoices.delete': 'Delete invoices',

    // Workspace management
    'workspace.manage': 'Manage workspace settings',
    'workspace.invite': 'Invite members',
    'workspace.members': 'Manage members',
} as const

export type Permission = keyof typeof PERMISSIONS

// Role-based permission matrix
export const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
    ADMIN: Object.keys(PERMISSIONS) as Permission[], // All permissions

    MANAGER: [
        'cases.create', 'cases.read', 'cases.update', 'cases.assign',
        'hearings.create', 'hearings.read', 'hearings.update', 'hearings.delete', 'hearings.schedule',
        'documents.upload', 'documents.read', 'documents.download', 'documents.delete',
        'clients.create', 'clients.read', 'clients.update',
        'tasks.create', 'tasks.read', 'tasks.update', 'tasks.delete', 'tasks.assign',
        'reports.view', 'reports.export',
        'invoices.create', 'invoices.read', 'invoices.update',
        'workspace.invite',
    ],

    MEMBER: [
        'cases.read', 'cases.update',
        'hearings.create', 'hearings.read', 'hearings.update', 'hearings.schedule',
        'documents.upload', 'documents.read', 'documents.download',
        'clients.read',
        'tasks.create', 'tasks.read', 'tasks.update',
        'reports.view',
        'invoices.read',
    ],

    ASSISTANT: [
        'cases.read',
        'hearings.read', 'hearings.update',
        'documents.upload', 'documents.read', 'documents.download',
        'clients.read',
        'tasks.read', 'tasks.update',
        'reports.view',
        'invoices.read',
    ],

    INTERN: [
        'cases.read',
        'hearings.read',
        'documents.read',
        'clients.read',
        'tasks.read',
    ],
}

// Check if a role has a specific permission
export function hasPermission(role: WorkspaceRole, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

// Check if a role has any of the specified permissions
export function hasAnyPermission(role: WorkspaceRole, permissions: Permission[]): boolean {
    return permissions.some(p => hasPermission(role, p))
}

// Check if a role has all of the specified permissions
export function hasAllPermissions(role: WorkspaceRole, permissions: Permission[]): boolean {
    return permissions.every(p => hasPermission(role, p))
}

// Get all permissions for a role
export function getRolePermissions(role: WorkspaceRole): Permission[] {
    return ROLE_PERMISSIONS[role] || []
}

// Permission groups for UI display
export const PERMISSION_GROUPS = {
    'Cases': ['cases.create', 'cases.read', 'cases.update', 'cases.delete', 'cases.assign'],
    'Hearings': ['hearings.create', 'hearings.read', 'hearings.update', 'hearings.delete', 'hearings.schedule'],
    'Documents': ['documents.upload', 'documents.read', 'documents.download', 'documents.delete'],
    'Clients': ['clients.create', 'clients.read', 'clients.update', 'clients.delete'],
    'Tasks': ['tasks.create', 'tasks.read', 'tasks.update', 'tasks.delete', 'tasks.assign'],
    'Reports': ['reports.view', 'reports.export'],
    'Invoices': ['invoices.create', 'invoices.read', 'invoices.update', 'invoices.delete'],
    'Workspace': ['workspace.manage', 'workspace.invite', 'workspace.members'],
} as const
