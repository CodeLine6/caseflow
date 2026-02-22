import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission, isErrorResponse } from '@/lib/rbac'

// GET /api/tasks/[id] - Get a single task
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                case: { select: { id: true, title: true, caseNumber: true } },
                assignedTo: { select: { id: true, name: true, avatar: true } },
                createdBy: { select: { id: true, name: true } },
            },
        })

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        // Check tasks.read permission
        const rbac = await requirePermission(task.workspaceId, 'tasks.read')
        if (isErrorResponse(rbac)) return rbac

        return NextResponse.json({ task })
    } catch (error) {
        console.error('Error fetching task:', error)
        return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
    }
}

// PUT /api/tasks/[id] - Update a task
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()

        const existingTask = await prisma.task.findUnique({
            where: { id },
            select: { workspaceId: true, assignedToId: true },
        })

        if (!existingTask) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        // Check tasks.update permission
        const rbac = await requirePermission(existingTask.workspaceId, 'tasks.update')
        if (isErrorResponse(rbac)) return rbac

        // If changing assignee, check tasks.assign
        if (body.assigneeId !== undefined && body.assigneeId !== existingTask.assignedToId) {
            const assignRbac = await requirePermission(existingTask.workspaceId, 'tasks.assign')
            if (isErrorResponse(assignRbac)) return assignRbac
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: {
                title: body.title,
                description: body.description,
                priority: body.priority,
                status: body.status,
                dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
                assignedToId: body.assigneeId !== undefined ? (body.assigneeId || null) : undefined,
                completedAt: body.status === 'COMPLETED' ? new Date() : undefined,
            },
            include: {
                case: { select: { id: true, title: true, caseNumber: true } },
                assignedTo: { select: { id: true, name: true, avatar: true } },
                createdBy: { select: { id: true, name: true } },
            },
        })

        return NextResponse.json({ task: updatedTask })
    } catch (error) {
        console.error('Error updating task:', error)
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const task = await prisma.task.findUnique({
            where: { id },
            select: { workspaceId: true },
        })

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        // Check tasks.delete permission
        const rbac = await requirePermission(task.workspaceId, 'tasks.delete')
        if (isErrorResponse(rbac)) return rbac

        await prisma.task.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting task:', error)
        return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
    }
}
