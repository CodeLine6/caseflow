import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requirePermission, isErrorResponse, getEffectivePermissions } from '@/lib/rbac'

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
        const { role, customPermissions } = body

        if (!role && !customPermissions) {
            return NextResponse.json({ error: 'Role or customPermissions is required' }, { status: 400 })
        }

        // Check RBAC permission
        const rbac = await requirePermission(id, 'workspace.members')
        if (isErrorResponse(rbac)) return rbac

        // Get the target member
        const targetMember = await prisma.workspaceMember.findUnique({
            where: { id: memberId },
        })

        if (!targetMember) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 })
        }

        // Cannot change owner's role
        const workspace = await prisma.workspace.findUnique({
            where: { id },
            select: { ownerId: true },
        })
        if (targetMember.userId === workspace?.ownerId) {
            return NextResponse.json({ error: 'Cannot change owner\'s role' }, { status: 403 })
        }

        // Update role if provided
        if (role) {
            if (role === 'ADMIN') {
                return NextResponse.json({ error: 'ADMIN role is reserved for the workspace owner' }, { status: 400 })
            }
            await prisma.workspaceMember.update({
                where: { id: memberId },
                data: { role },
            })
        }

        // Update custom permissions if provided
        if (customPermissions && Array.isArray(customPermissions)) {
            // Delete existing custom permissions
            await prisma.permission.deleteMany({
                where: { memberId },
            })

            // Create new custom permissions
            if (customPermissions.length > 0) {
                await prisma.permission.createMany({
                    data: customPermissions.map((cp: { action: string; granted: boolean }) => ({
                        memberId,
                        action: cp.action,
                        granted: cp.granted,
                    })),
                })
            }
        }

        // Return updated member with effective permissions
        const updatedMember = await prisma.workspaceMember.findUnique({
            where: { id: memberId },
            include: {
                user: {
                    select: { id: true, name: true, email: true, avatar: true },
                },
                customPermissions: true,
            },
        })

        const effectivePermissions = await getEffectivePermissions(memberId, updatedMember!.role)

        return NextResponse.json({
            member: updatedMember,
            effectivePermissions,
        })
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

        // Check RBAC permission
        const rbac = await requirePermission(id, 'workspace.members')
        if (isErrorResponse(rbac)) return rbac

        // Get the target member
        const targetMember = await prisma.workspaceMember.findUnique({
            where: { id: memberId },
        })

        if (!targetMember) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 })
        }

        // Cannot remove owner
        const workspace = await prisma.workspace.findUnique({
            where: { id },
            select: { ownerId: true },
        })
        if (targetMember.userId === workspace?.ownerId) {
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
