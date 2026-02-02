import { prisma } from './prisma'

export type AuditAction =
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'VIEW'
    | 'LOGIN'
    | 'LOGOUT'
    | 'EXPORT'
    | 'INVITE'
    | 'ROLE_CHANGE'

export type AuditEntity =
    | 'cases'
    | 'hearings'
    | 'documents'
    | 'clients'
    | 'tasks'
    | 'invoices'
    | 'workspace'
    | 'user'

interface AuditLogParams {
    action: AuditAction
    entity: AuditEntity
    entityId?: string
    userId: string
    workspaceId?: string
    metadata?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
}

export async function createAuditLog({
    action,
    entity,
    entityId,
    userId,
    workspaceId,
    metadata,
    ipAddress,
    userAgent,
}: AuditLogParams) {
    try {
        await prisma.auditLog.create({
            data: {
                action,
                entity,
                entityId,
                userId,
                workspaceId,
                metadata: metadata ?? undefined,
                ipAddress,
                userAgent,
            },
        })
    } catch (error) {
        // Log error but don't throw - audit logging should not break main operations
        console.error('Failed to create audit log:', error)
    }
}

export async function getAuditLogs({
    workspaceId,
    userId,
    entity,
    entityId,
    limit = 50,
    offset = 0,
}: {
    workspaceId?: string
    userId?: string
    entity?: string
    entityId?: string
    limit?: number
    offset?: number
}) {
    return prisma.auditLog.findMany({
        where: {
            ...(workspaceId && { workspaceId }),
            ...(userId && { userId }),
            ...(entity && { entity }),
            ...(entityId && { entityId }),
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
    })
}
