import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/cases/[id] - Get a single case
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

        const caseData = await prisma.case.findUnique({
            where: { id },
            include: {
                client: true,
                mainCounsel: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                    },
                },
                court: true,
                workspace: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                hearings: {
                    orderBy: { hearingDate: 'asc' },
                    take: 5,
                },
                documents: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
                tasks: {
                    orderBy: { dueDate: 'asc' },
                    take: 5,
                    include: {
                        assignee: {
                            select: { id: true, name: true, avatar: true },
                        },
                    },
                },
                _count: {
                    select: {
                        hearings: true,
                        documents: true,
                        tasks: true,
                    },
                },
            },
        })

        if (!caseData) {
            return NextResponse.json({ error: 'Case not found' }, { status: 404 })
        }

        // Verify user has access to this workspace
        const membership = await prisma.workspaceMember.findFirst({
            where: {
                workspaceId: caseData.workspaceId,
                userId: session.user.id,
            },
        })

        if (!membership) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        return NextResponse.json(caseData)
    } catch (error) {
        console.error('Error fetching case:', error)
        return NextResponse.json({ error: 'Failed to fetch case' }, { status: 500 })
    }
}

// PUT /api/cases/[id] - Update a case
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

        // Get the case to check workspace access
        const existingCase = await prisma.case.findUnique({
            where: { id },
            select: { workspaceId: true },
        })

        if (!existingCase) {
            return NextResponse.json({ error: 'Case not found' }, { status: 404 })
        }

        const membership = await prisma.workspaceMember.findFirst({
            where: {
                workspaceId: existingCase.workspaceId,
                userId: session.user.id,
            },
        })

        if (!membership) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const updatedCase = await prisma.case.update({
            where: { id },
            data: {
                title: body.title,
                description: body.description,
                caseCategory: body.caseCategory,
                caseType: body.caseType,
                priority: body.priority,
                status: body.status,
                filingDate: body.filingDate ? new Date(body.filingDate) : undefined,
                opposingParty: body.opposingParty,
                opposingCounsel: body.opposingCounsel,
                caseValue: body.caseValue ? parseFloat(body.caseValue) : null,
                clientId: body.clientId || null,
                courtId: body.courtId || null,
                mainCounselId: body.mainCounselId || null,
            },
            include: {
                client: true,
                mainCounsel: true,
                court: true,
            },
        })

        // Create audit log
        await prisma.auditLog.create({
            data: {
                action: 'UPDATE',
                entity: 'cases',
                entityId: id,
                userId: session.user.id,
                workspaceId: existingCase.workspaceId,
                metadata: { changes: body },
            },
        })

        return NextResponse.json(updatedCase)
    } catch (error) {
        console.error('Error updating case:', error)
        return NextResponse.json({ error: 'Failed to update case' }, { status: 500 })
    }
}

// DELETE /api/cases/[id] - Delete a case
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

        const existingCase = await prisma.case.findUnique({
            where: { id },
            select: { workspaceId: true, title: true, caseNumber: true },
        })

        if (!existingCase) {
            return NextResponse.json({ error: 'Case not found' }, { status: 404 })
        }

        const membership = await prisma.workspaceMember.findFirst({
            where: {
                workspaceId: existingCase.workspaceId,
                userId: session.user.id,
                role: { in: ['ADMIN', 'MANAGER'] },
            },
        })

        if (!membership) {
            return NextResponse.json({ error: 'Only admins and managers can delete cases' }, { status: 403 })
        }

        await prisma.case.delete({ where: { id } })

        // Create audit log
        await prisma.auditLog.create({
            data: {
                action: 'DELETE',
                entity: 'cases',
                entityId: id,
                userId: session.user.id,
                workspaceId: existingCase.workspaceId,
                metadata: { title: existingCase.title, caseNumber: existingCase.caseNumber },
            },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting case:', error)
        return NextResponse.json({ error: 'Failed to delete case' }, { status: 500 })
    }
}
