import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { type Permission, ROLE_PERMISSIONS } from '@/lib/permissions'
import type { WorkspaceRole } from '@prisma/client'

export interface RBACResult {
    allowed: boolean
    membership: {
        id: string
        role: WorkspaceRole
        workspaceId: string
        userId: string
    }
    effectivePermissions: Permission[]
}

/**
 * Get a user's effective permissions for a workspace,
 * combining role defaults with custom permission overrides.
 */
export async function getEffectivePermissions(
    memberId: string,
    role: WorkspaceRole
): Promise<Permission[]> {
    // Start with role defaults
    const rolePerms = new Set<Permission>(ROLE_PERMISSIONS[role] || [])

    // Apply custom overrides
    const customPerms = await prisma.permission.findMany({
        where: { memberId },
        select: { action: true, granted: true },
    })

    for (const cp of customPerms) {
        const action = cp.action as Permission
        if (cp.granted) {
            rolePerms.add(action)
        } else {
            rolePerms.delete(action)
        }
    }

    return [...rolePerms]
}

/**
 * Check if a user has a specific permission in a workspace.
 * Returns the membership and whether the action is allowed.
 *
 * @throws Returns null if user is not a member of the workspace.
 */
export async function checkPermission(
    userId: string,
    workspaceId: string,
    permission: Permission
): Promise<RBACResult | null> {
    const membership = await prisma.workspaceMember.findUnique({
        where: {
            workspaceId_userId: { workspaceId, userId },
        },
        select: {
            id: true,
            role: true,
            workspaceId: true,
            userId: true,
        },
    })

    if (!membership) return null

    const effectivePermissions = await getEffectivePermissions(membership.id, membership.role)
    const allowed = effectivePermissions.includes(permission)

    return { allowed, membership, effectivePermissions }
}

/**
 * Require a specific permission in a workspace.
 * Use in API route handlers. Returns a NextResponse 401/403 on failure,
 * or the RBACResult on success.
 */
export async function requirePermission(
    workspaceId: string,
    permission: Permission
): Promise<RBACResult | NextResponse> {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await checkPermission(session.user.id, workspaceId, permission)

    if (!result) {
        return NextResponse.json(
            { error: 'You are not a member of this workspace' },
            { status: 403 }
        )
    }

    if (!result.allowed) {
        return NextResponse.json(
            { error: `Permission denied: ${permission}` },
            { status: 403 }
        )
    }

    return result
}

/**
 * Type guard to check if requirePermission returned an error response.
 */
export function isErrorResponse(result: RBACResult | NextResponse): result is NextResponse {
    return result instanceof NextResponse
}

/**
 * Filter a user's workspace memberships to only those where
 * they hold a specific permission. Used in GET routes to scope
 * read access based on permissions.
 */
export async function filterWorkspacesByPermission(
    userId: string,
    permission: Permission
): Promise<string[]> {
    const memberships = await prisma.workspaceMember.findMany({
        where: { userId },
        select: { id: true, role: true, workspaceId: true },
    })

    const allowed: string[] = []
    for (const m of memberships) {
        const perms = await getEffectivePermissions(m.id, m.role)
        if (perms.includes(permission)) {
            allowed.push(m.workspaceId)
        }
    }
    return allowed
}
