import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission, isErrorResponse, filterWorkspacesByPermission } from '@/lib/rbac'

// GET /api/tasks - List tasks
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const caseId = searchParams.get('caseId')
        const status = searchParams.get('status')
        const assigneeId = searchParams.get('assigneeId')
        const workspaceId = searchParams.get('workspaceId')

        // Determine view scope from permissions:
        // tasks.read    → view all tasks in workspace
        // tasks.readOwn → view only tasks assigned to user
        const [allWorkspaceIds, ownWorkspaceIds] = await Promise.all([
            filterWorkspacesByPermission(session.user.id, 'tasks.read'),
            filterWorkspacesByPermission(session.user.id, 'tasks.readOwn'),
        ])
        const hasViewAll = allWorkspaceIds.length > 0
        const allowedWorkspaceIds = hasViewAll ? allWorkspaceIds : ownWorkspaceIds
        if (allowedWorkspaceIds.length === 0) {
            return NextResponse.json({ tasks: [] })
        }
        const workspaceIds = workspaceId && allowedWorkspaceIds.includes(workspaceId) ? [workspaceId] : allowedWorkspaceIds

        const whereClause: Record<string, unknown> = {
            workspaceId: { in: workspaceIds },
        }

        if (caseId) whereClause.caseId = caseId
        if (status) whereClause.status = status
        if (assigneeId) whereClause.assignedToId = assigneeId

        // If user only has readOwn, scope to their assigned tasks
        if (!hasViewAll && !assigneeId) {
            whereClause.assignedToId = session.user.id
        }

        const tasks = await prisma.task.findMany({
            where: whereClause,
            include: {
                case: { select: { id: true, title: true, caseNumber: true } },
                assignedTo: { select: { id: true, name: true, avatar: true } },
                createdBy: { select: { id: true, name: true } },
            },
            orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
        })

        // Map to expected format for frontend
        const mappedTasks = tasks.map(t => ({
            ...t,
            assignee: t.assignedTo,
        }))

        return NextResponse.json({ tasks: mappedTasks })
    } catch (error) {
        console.error('Error fetching tasks:', error)
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }
}

// POST /api/tasks - Create task
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { caseId, title, description, priority, dueDate, assigneeId, workspaceId: bodyWorkspaceId } = body

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 })
        }

        // Get workspace from case or use provided workspaceId
        let workspaceId = bodyWorkspaceId

        if (caseId) {
            const caseData = await prisma.case.findUnique({
                where: { id: caseId },
                select: { workspaceId: true },
            })

            if (!caseData) {
                return NextResponse.json({ error: 'Case not found' }, { status: 404 })
            }

            workspaceId = caseData.workspaceId
        }

        if (!workspaceId) {
            // Get user's first workspace
            const membership = await prisma.workspaceMember.findFirst({
                where: { userId: session.user.id },
                select: { workspaceId: true },
            })
            workspaceId = membership?.workspaceId
        }

        if (!workspaceId) {
            return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
        }

        // Check RBAC permission
        const rbac = await requirePermission(workspaceId, 'tasks.create')
        if (isErrorResponse(rbac)) return rbac

        // If assigning task to someone, check tasks.assign
        if (assigneeId) {
            const assignRbac = await requirePermission(workspaceId, 'tasks.assign')
            if (isErrorResponse(assignRbac)) return assignRbac
        }

        const task = await prisma.task.create({
            data: {
                title,
                description,
                priority: priority || 'MEDIUM',
                dueDate: dueDate ? new Date(dueDate) : null,
                caseId: caseId || null,
                assignedToId: assigneeId || null,
                createdByUserId: session.user.id,
                workspaceId,
                status: 'PENDING',
            },
            include: {
                case: true,
                assignedTo: true,
            },
        })

        return NextResponse.json(task, { status: 201 })
    } catch (error) {
        console.error('Error creating task:', error)
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }
}
