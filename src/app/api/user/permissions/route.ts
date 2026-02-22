import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/rbac'

// GET /api/user/permissions?workspaceId=...
// Returns the user's role and effective permissions for the given workspace.
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const workspaceId = searchParams.get('workspaceId')

        if (!workspaceId) {
            return NextResponse.json(
                { error: 'workspaceId is required' },
                { status: 400 }
            )
        }

        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: session.user.id,
                },
            },
            select: {
                id: true,
                role: true,
            },
        })

        if (!membership) {
            return NextResponse.json(
                { error: 'Not a member of this workspace' },
                { status: 403 }
            )
        }

        const permissions = await getEffectivePermissions(membership.id, membership.role)

        return NextResponse.json({
            role: membership.role,
            permissions,
        })
    } catch (error) {
        console.error('Failed to fetch permissions:', error)
        return NextResponse.json(
            { error: 'Failed to fetch permissions' },
            { status: 500 }
        )
    }
}
