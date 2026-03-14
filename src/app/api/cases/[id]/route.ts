// src/app/api/cases/[id]/route.ts
// Changes from original:
//   GET  — court: true already returns zones; courtZone is returned as part of the case scalar fields automatically
//   PUT  — courtZone added to update data + server-side zone validation (same pattern as POST)
//   DELETE — unchanged

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission, isErrorResponse } from '@/lib/rbac'

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
                // court: true returns all court fields including zones (Json?)
                court: true,
                workspace: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                hearings: {
                    orderBy: { hearingDate: 'asc' },
                    include: {
                        hearingCounsel: {
                            select: { id: true, role: true, user: { select: { name: true } } },
                        },
                        attendance: {
                            select: {
                                memberId: true,
                                attended: true,
                                member: { select: { role: true, user: { select: { name: true } } } },
                            },
                        },
                    },
                },
                documents: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
                tasks: {
                    orderBy: { dueDate: 'asc' },
                    take: 5,
                    include: {
                        assignedTo: {
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

        const rbac = await requirePermission(caseData.workspaceId, 'cases.read')
        if (isErrorResponse(rbac)) return rbac

        // caseData already includes courtZone (scalar field) and court.zones (via court: true)
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

        const existingCase = await prisma.case.findUnique({
            where: { id },
            select: { workspaceId: true },
        })

        if (!existingCase) {
            return NextResponse.json({ error: 'Case not found' }, { status: 404 })
        }

        const rbac = await requirePermission(existingCase.workspaceId, 'cases.update')
        if (isErrorResponse(rbac)) return rbac

        if (body.mainCounselId && body.mainCounselId !== session.user.id) {
            const assignRbac = await requirePermission(existingCase.workspaceId, 'cases.assign')
            if (isErrorResponse(assignRbac)) return assignRbac
        }

        // Validate courtZone against the selected court's zones if both are provided
        if (body.courtZone && body.courtId) {
            const court = await prisma.court.findUnique({
                where: { id: body.courtId },
                select: { zones: true },
            })
            const zones = court?.zones as Array<{ name: string }> | null
            const validZone = zones?.some(z => z.name === body.courtZone)
            if (!validZone) {
                return NextResponse.json(
                    { error: `Zone "${body.courtZone}" does not exist for the selected court` },
                    { status: 400 }
                )
            }
        }

        // If courtId is being cleared or changed, also clear courtZone unless a new one is supplied
        const courtZoneValue = (() => {
            if (!body.courtId) return null               // court cleared → zone must be null
            if (body.courtZone === '') return null        // explicitly cleared
            if (body.courtZone) return body.courtZone    // new value provided
            return null                                  // not supplied → clear it
        })()

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
                courtZone: courtZoneValue,   // ← NEW
                mainCounselId: body.mainCounselId || null,
            },
            include: {
                client: true,
                mainCounsel: true,
                court: true,
            },
        })

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

// DELETE /api/cases/[id] - Delete a case — unchanged
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

        const rbac = await requirePermission(existingCase.workspaceId, 'cases.delete')
        if (isErrorResponse(rbac)) return rbac

        await prisma.case.delete({ where: { id } })

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