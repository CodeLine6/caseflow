import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requirePermission, isErrorResponse } from '@/lib/rbac'

// GET /api/workspaces/[id]/members - List members
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        // Verify requesting user is a member of this workspace
        const requestingMember = await prisma.workspaceMember.findFirst({
            where: { workspaceId: id, userId: session.user.id },
        })

        if (!requestingMember) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const members = await prisma.workspaceMember.findMany({
            where: { workspaceId: id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
                customPermissions: {
                    select: { action: true, granted: true },
                },
            },
            orderBy: { createdAt: 'asc' },
        })

        const workspace = await prisma.workspace.findUnique({
            where: { id },
            select: { name: true, ownerId: true },
        })

        return NextResponse.json({
            members,
            workspaceName: workspace?.name,
            ownerId: workspace?.ownerId,
        })
    } catch (error) {
        console.error('Failed to fetch members:', error)
        return NextResponse.json(
            { error: 'Failed to fetch members' },
            { status: 500 }
        )
    }
}

// POST /api/workspaces/[id]/members - Invite member
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { email, role = 'MEMBER' } = body

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        // Check RBAC permission
        const rbac = await requirePermission(id, 'workspace.invite')
        if (isErrorResponse(rbac)) return rbac

        // ADMIN role is reserved for the workspace owner
        if (role === 'ADMIN') {
            return NextResponse.json({ error: 'ADMIN role is reserved for the workspace owner' }, { status: 400 })
        }

        // Find the user to invite
        const userToInvite = await prisma.user.findUnique({
            where: { email },
        })

        if (!userToInvite) {
            return NextResponse.json({ error: 'User not found. They need to register first.' }, { status: 404 })
        }

        // Check if already a member
        const existingMember = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: id,
                    userId: userToInvite.id,
                },
            },
        })

        if (existingMember) {
            return NextResponse.json({ error: 'User is already a member of this workspace' }, { status: 400 })
        }

        // Add as member
        const member = await prisma.workspaceMember.create({
            data: {
                workspaceId: id,
                userId: userToInvite.id,
                role: role,
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
        })

        return NextResponse.json({ member }, { status: 201 })
    } catch (error) {
        console.error('Failed to invite member:', error)
        return NextResponse.json(
            { error: 'Failed to invite member' },
            { status: 500 }
        )
    }
}
