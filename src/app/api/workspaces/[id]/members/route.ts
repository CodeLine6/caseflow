import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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
            },
            orderBy: { createdAt: 'asc' },
        })

        return NextResponse.json({ members })
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

        // Check if user can manage members
        const workspace = await prisma.workspace.findUnique({
            where: { id },
            include: {
                members: {
                    where: { userId: session.user.id },
                },
            },
        })

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
        }

        const currentUserMember = workspace.members[0]
        const isOwner = workspace.ownerId === session.user.id
        const canInvite = isOwner ||
            currentUserMember?.role === 'ADMIN' ||
            currentUserMember?.role === 'MANAGER'

        if (!canInvite) {
            return NextResponse.json({ error: 'Not authorized to invite members' }, { status: 403 })
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
