import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission, Permission } from '@/lib/permissions'
import { createAuditLog, AuditAction, AuditEntity } from '@/lib/audit'
import type { WorkspaceRole } from '@prisma/client'

interface RBACContext {
    userId: string
    workspaceId: string
    role: WorkspaceRole
}

// Get user context for RBAC checks
export async function getRBACContext(workspaceId?: string): Promise<RBACContext | null> {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
        return null
    }

    const wsId = workspaceId || session.user.defaultWorkspaceId

    if (!wsId) {
        return null
    }

    const member = await prisma.workspaceMember.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId: wsId,
                userId: session.user.id,
            },
        },
        select: { role: true },
    })

    if (!member) {
        return null
    }

    return {
        userId: session.user.id,
        workspaceId: wsId,
        role: member.role,
    }
}

// Check if user has permission and return error response if not
export async function checkPermission(
    permission: Permission,
    workspaceId?: string
): Promise<{ context: RBACContext } | { error: NextResponse }> {
    const context = await getRBACContext(workspaceId)

    if (!context) {
        return {
            error: NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            ),
        }
    }

    if (!hasPermission(context.role, permission)) {
        return {
            error: NextResponse.json(
                { error: `Permission denied: ${permission}` },
                { status: 403 }
            ),
        }
    }

    return { context }
}

// Wrapper for API handlers that require specific permissions
export function withPermission(
    permission: Permission,
    handler: (context: RBACContext, request: Request) => Promise<NextResponse>
) {
    return async (request: Request): Promise<NextResponse> => {
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId') || undefined

        const result = await checkPermission(permission, workspaceId)

        if ('error' in result) {
            return result.error
        }

        return handler(result.context, request)
    }
}

// Log an action after permission check passes
export async function logAction(
    context: RBACContext,
    action: AuditAction,
    entity: AuditEntity,
    entityId?: string,
    metadata?: Record<string, unknown>,
    request?: Request
) {
    const headers = request?.headers

    await createAuditLog({
        action,
        entity,
        entityId,
        userId: context.userId,
        workspaceId: context.workspaceId,
        metadata,
        ipAddress: headers?.get('x-forwarded-for') || headers?.get('x-real-ip') || undefined,
        userAgent: headers?.get('user-agent') || undefined,
    })
}
