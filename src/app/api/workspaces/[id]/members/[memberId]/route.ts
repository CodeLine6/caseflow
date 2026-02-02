import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PUT /api/workspaces/[id]/members/[memberId] - Update member role
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; memberId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id, memberId } = await params
        const body = await request.json()
        const { role } = body

        if (!role) {
            return NextResponse.json({ error: 'Role is required' }, { status: 400 })
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
        const canManage = isOwner ||
            currentUserMember?.role === 'ADMIN' ||
            currentUserMember?.role === 'MANAGER'

        if (!canManage) {
            return NextResponse.json({ error: 'Not authorized to manage members' }, { status: 403 })
        }

        // Get the target member
        const targetMember = await prisma.workspaceMember.findUnique({
            where: { id: memberId },
        })

        if (!targetMember) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 })
        }

        // Cannot change owner's role
        if (targetMember.userId === workspace.ownerId) {
            return NextResponse.json({ error: 'Cannot change owner\'s role' }, { status: 403 })
        }

        // Update role
        const updatedMember = await prisma.workspaceMember.update({
            where: { id: memberId },
            data: { role },
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

        return NextResponse.json({ member: updatedMember })
    } catch (error) {
        console.error('Failed to update member:', error)
        return NextResponse.json(
            { error: 'Failed to update member' },
            { status: 500 }
        )
    }
}

// DELETE /api/workspaces/[id]/members/[memberId] - Remove member
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; memberId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id, memberId } = await params

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
        const canManage = isOwner ||
            currentUserMember?.role === 'ADMIN' ||
            currentUserMember?.role === 'MANAGER'

        if (!canManage) {
            return NextResponse.json({ error: 'Not authorized to remove members' }, { status: 403 })
        }

        // Get the target member
        const targetMember = await prisma.workspaceMember.findUnique({
            where: { id: memberId },
        })

        if (!targetMember) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 })
        }

        // Cannot remove owner
        if (targetMember.userId === workspace.ownerId) {
            return NextResponse.json({ error: 'Cannot remove workspace owner' }, { status: 403 })
        }

        await prisma.workspaceMember.delete({
            where: { id: memberId },
        })

        return NextResponse.json({ message: 'Member removed successfully' })
    } catch (error) {
        console.error('Failed to remove member:', error)
        return NextResponse.json(
            { error: 'Failed to remove member' },
            { status: 500 }
        )
    }
}
