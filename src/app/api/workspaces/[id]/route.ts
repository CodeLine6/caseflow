import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/workspaces/[id] - Get workspace details
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

        const workspace = await prisma.workspace.findUnique({
            where: { id },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                members: {
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
                },
                _count: {
                    select: {
                        cases: true,
                        members: true,
                        clients: true,
                    },
                },
            },
        })

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
        }

        // Check if user is a member
        const isMember = workspace.members.some(m => m.userId === session.user.id)
        if (!isMember && workspace.ownerId !== session.user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        return NextResponse.json({ workspace })
    } catch (error) {
        console.error('Failed to fetch workspace:', error)
        return NextResponse.json(
            { error: 'Failed to fetch workspace' },
            { status: 500 }
        )
    }
}

// PUT /api/workspaces/[id] - Update workspace
export async function PUT(
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
        const { name, description } = body

        // Check if user is owner
        const workspace = await prisma.workspace.findUnique({
            where: { id },
            select: { ownerId: true },
        })

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
        }

        if (workspace.ownerId !== session.user.id) {
            return NextResponse.json({ error: 'Only the owner can update workspace settings' }, { status: 403 })
        }

        const updatedWorkspace = await prisma.workspace.update({
            where: { id },
            data: {
                name: name || undefined,
                description: description !== undefined ? description : undefined,
            },
        })

        return NextResponse.json({ workspace: updatedWorkspace })
    } catch (error) {
        console.error('Failed to update workspace:', error)
        return NextResponse.json(
            { error: 'Failed to update workspace' },
            { status: 500 }
        )
    }
}

// DELETE /api/workspaces/[id] - Delete workspace
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        // Check if user is owner
        const workspace = await prisma.workspace.findUnique({
            where: { id },
            select: { ownerId: true },
        })

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
        }

        if (workspace.ownerId !== session.user.id) {
            return NextResponse.json({ error: 'Only the owner can delete the workspace' }, { status: 403 })
        }

        await prisma.workspace.delete({
            where: { id },
        })

        return NextResponse.json({ message: 'Workspace deleted successfully' })
    } catch (error) {
        console.error('Failed to delete workspace:', error)
        return NextResponse.json(
            { error: 'Failed to delete workspace' },
            { status: 500 }
        )
    }
}
