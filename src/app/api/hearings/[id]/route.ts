import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission, isErrorResponse } from '@/lib/rbac'
import { Prisma } from '@prisma/client'

// GET /api/hearings/[id] - Get hearing details
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const hearing = await prisma.hearing.findUnique({
            where: { id },
            include: {
                case: {
                    select: {
                        id: true,
                        caseNumber: true,
                        title: true,
                        workspaceId: true,
                        mainCounselId: true,
                    }
                },
                createdBy: {
                    select: { id: true, name: true }
                },
                hearingCounsel: {
                    select: { id: true, userId: true, role: true, user: { select: { name: true } } }
                },
                attendance: {
                    select: {
                        memberId: true,
                        attended: true,
                        member: { select: { userId: true, role: true, user: { select: { name: true } } } }
                    }
                },
            }
        })

        if (!hearing) {
            return NextResponse.json({ error: 'Hearing not found' }, { status: 404 })
        }

        // Check hearings.read permission
        const rbac = await requirePermission(hearing.case.workspaceId, 'hearings.read')
        if (isErrorResponse(rbac)) return rbac

        return NextResponse.json({ hearing })
    } catch (error) {
        console.error('Error fetching hearing:', error)
        return NextResponse.json({ error: 'Failed to fetch hearing' }, { status: 500 })
    }
}

// PUT /api/hearings/[id] - Update hearing
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            hearingDate,
            hearingTime,
            hearingType,
            judgeName,
            notes,
            outcome,
            status,
            courtNumber,
            courtItemNumber,
            hearingCounselId,
            accompaniedByIds,
            nextDateOfHearing,
            orderLink,
            additionalRemarks,
        } = body

        // Fetch existing hearing
        const hearing = await prisma.hearing.findUnique({
            where: { id },
            include: {
                case: { select: { id: true, workspaceId: true } },
            }
        })

        if (!hearing) {
            return NextResponse.json({ error: 'Hearing not found' }, { status: 404 })
        }

        // Check RBAC permission
        const rbac = await requirePermission(hearing.case.workspaceId, 'hearings.update')
        if (isErrorResponse(rbac)) return rbac

        // If changing hearing date, also check hearings.schedule
        if (hearingDate) {
            const scheduleRbac = await requirePermission(hearing.case.workspaceId, 'hearings.schedule')
            if (isErrorResponse(scheduleRbac)) return scheduleRbac
        }

        // Build update data
        const updateData: Prisma.HearingUpdateInput = {
            hearingDate: hearingDate ? new Date(hearingDate) : undefined,
            hearingTime: hearingTime !== undefined ? (hearingTime || null) : undefined,
            hearingType: hearingType || undefined,
            judgeName: judgeName !== undefined ? (judgeName || null) : undefined,
            notes: notes !== undefined ? (notes || null) : undefined,
            outcome: outcome !== undefined ? (outcome || null) : undefined,
            status: status || undefined,
            courtNumber: courtNumber || undefined,
            courtItemNumber: courtItemNumber !== undefined ? (courtItemNumber || null) : undefined,
            orderLink: orderLink !== undefined ? (orderLink || null) : undefined,
            additionalRemarks: additionalRemarks !== undefined ? (additionalRemarks || null) : undefined,
        }

        // Handle hearing counsel
        if (hearingCounselId !== undefined) {
            if (hearingCounselId) {
                updateData.hearingCounsel = { connect: { id: hearingCounselId } }
            } else {
                updateData.hearingCounsel = { disconnect: true }
            }
        }

        const updatedHearing = await prisma.hearing.update({
            where: { id },
            data: updateData,
            include: {
                case: {
                    select: { id: true, caseNumber: true, title: true }
                },
                hearingCounsel: {
                    select: { id: true, user: { select: { name: true } } }
                },
                attendance: {
                    select: {
                        id: true,
                        memberId: true,
                        attended: true,
                        member: { select: { user: { select: { name: true } } } }
                    }
                },
            }
        })

        // Handle accompaniedByIds — delete old, create new (in transaction)
        if (accompaniedByIds !== undefined) {
            await prisma.$transaction(async (tx) => {
                await tx.hearingAttendance.deleteMany({
                    where: { hearingId: id }
                })

                if (accompaniedByIds.length > 0) {
                    await tx.hearingAttendance.createMany({
                        data: accompaniedByIds.map((memberId: string) => ({
                            hearingId: id,
                            memberId,
                            attended: false,
                        }))
                    })
                }
            })
        }

        // Handle nextDateOfHearing — auto-create follow-up hearing
        if (nextDateOfHearing) {
            await prisma.hearing.create({
                data: {
                    caseId: updatedHearing.caseId,
                    hearingDate: new Date(`${nextDateOfHearing}T12:00:00+05:30`),
                    hearingTime: updatedHearing.hearingTime,
                    hearingType: updatedHearing.hearingType,
                    judgeName: updatedHearing.judgeName,
                    courtNumber: updatedHearing.courtNumber,
                    courtItemNumber: updatedHearing.courtItemNumber,
                    notes: `Auto-generated follow-up hearing from hearing ${updatedHearing.id}`,
                    createdById: session.user.id,
                    hearingCounselId: updatedHearing.hearingCounsel?.id || null,
                },
            })
        }

        return NextResponse.json({
            message: 'Hearing updated successfully',
            hearing: updatedHearing,
        })
    } catch (error) {
        console.error('Error updating hearing:', error)
        return NextResponse.json({ error: 'Failed to update hearing' }, { status: 500 })
    }
}

// DELETE /api/hearings/[id] - Delete hearing
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const hearing = await prisma.hearing.findUnique({
            where: { id },
            select: {
                case: { select: { workspaceId: true } }
            }
        })

        if (!hearing) {
            return NextResponse.json({ error: 'Hearing not found' }, { status: 404 })
        }

        // Check RBAC permission (only ADMIN/MANAGER have hearings.delete by default)
        const rbac = await requirePermission(hearing.case.workspaceId, 'hearings.delete')
        if (isErrorResponse(rbac)) return rbac

        await prisma.hearing.delete({ where: { id } })

        return NextResponse.json({ message: 'Hearing deleted successfully' })
    } catch (error) {
        console.error('Error deleting hearing:', error)
        return NextResponse.json({ error: 'Failed to delete hearing' }, { status: 500 })
    }
}
