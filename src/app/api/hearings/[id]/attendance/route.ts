import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/hearings/[id]/attendance - Get attendance for a hearing
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
            select: {
                case: { select: { workspaceId: true } },
                attendance: {
                    select: {
                        memberId: true,
                        attended: true,
                        notes: true,
                        member: {
                            select: {
                                userId: true,
                                role: true,
                                user: { select: { name: true } },
                            },
                        },
                    },
                },
                hearingCounsel: {
                    select: {
                        id: true,
                        userId: true,
                        user: { select: { name: true } },
                    },
                },
            },
        })

        if (!hearing) {
            return NextResponse.json({ error: 'Hearing not found' }, { status: 404 })
        }

        return NextResponse.json({
            attendance: hearing.attendance,
            hearingCounsel: hearing.hearingCounsel,
        })
    } catch (error) {
        console.error('Error fetching attendance:', error)
        return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 })
    }
}

// PUT /api/hearings/[id]/attendance - Two flows:
// 1. Counsel flow: { counselAttended, accompaniedAttendance[], outcome, orderLink, nextDateOfHearing, additionalRemarks }
// 2. Self-mark flow: { markSelf: true }
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

        // Fetch hearing with all needed relations
        const hearing = await prisma.hearing.findUnique({
            where: { id },
            include: {
                case: { select: { workspaceId: true } },
                hearingCounsel: { select: { id: true, userId: true } },
                attendance: { select: { memberId: true, attended: true } },
            },
        })

        if (!hearing) {
            return NextResponse.json({ error: 'Hearing not found' }, { status: 404 })
        }

        // Verify user is a workspace member
        const membership = await prisma.workspaceMember.findFirst({
            where: {
                workspaceId: hearing.case.workspaceId,
                userId: session.user.id,
            },
            select: { id: true, role: true },
        })

        if (!membership) {
            return NextResponse.json({ error: 'Not a workspace member' }, { status: 403 })
        }

        // ==================== SELF-MARK FLOW ====================
        if (body.markSelf === true) {
            // Any workspace member who is in the attendance list can self-mark
            // (Bug 3 fix: no hearings.update permission needed)
            const isAccompanying = hearing.attendance.some(
                a => a.memberId === membership.id
            )

            if (!isAccompanying) {
                return NextResponse.json(
                    { error: 'You are not listed as accompanying counsel for this hearing' },
                    { status: 403 }
                )
            }

            // Upsert single record (Bug 2 fix: no race condition)
            await prisma.hearingAttendance.update({
                where: {
                    hearingId_memberId: {
                        hearingId: id,
                        memberId: membership.id,
                    },
                },
                data: { attended: true },
            })

            // Fetch and return updated attendance
            const updated = await fetchAttendance(id)
            return NextResponse.json({ attendance: updated })
        }

        // ==================== COUNSEL FLOW ====================
        // Verify caller IS the hearing counsel
        if (!hearing.hearingCounsel || hearing.hearingCounsel.userId !== session.user.id) {
            return NextResponse.json(
                { error: 'Only the hearing counsel can mark full attendance' },
                { status: 403 }
            )
        }

        const {
            counselAttended,
            accompaniedAttendance,
            outcome,
            orderLink,
            nextDateOfHearing,
            additionalRemarks,
        } = body as {
            counselAttended: boolean
            accompaniedAttendance?: Array<{ memberId: string; attended: boolean }>
            outcome?: string
            orderLink?: string
            nextDateOfHearing?: string
            additionalRemarks?: string
        }

        // All in one transaction (Bug 8 fix)
        const result = await prisma.$transaction(async (tx) => {
            // (Bug 4 fix) Upsert counsel's own attendance record
            await tx.hearingAttendance.upsert({
                where: {
                    hearingId_memberId: {
                        hearingId: id,
                        memberId: hearing.hearingCounsel!.id,
                    },
                },
                update: { attended: counselAttended },
                create: {
                    hearingId: id,
                    memberId: hearing.hearingCounsel!.id,
                    attended: counselAttended,
                },
            })

            // (Bug 2 fix) Upsert each accompanying counsel — no deleteMany
            if (accompaniedAttendance && accompaniedAttendance.length > 0) {
                for (const record of accompaniedAttendance) {
                    await tx.hearingAttendance.upsert({
                        where: {
                            hearingId_memberId: {
                                hearingId: id,
                                memberId: record.memberId,
                            },
                        },
                        update: { attended: record.attended },
                        create: {
                            hearingId: id,
                            memberId: record.memberId,
                            attended: record.attended,
                        },
                    })
                }
            }

            // Update hearing status + outcome fields when counsel marks attendance
            const hearingUpdate: Record<string, unknown> = {}
            if (counselAttended) {
                hearingUpdate.status = 'COMPLETED'
            }
            if (outcome !== undefined) hearingUpdate.outcome = outcome || null
            if (orderLink !== undefined) hearingUpdate.orderLink = orderLink || null
            if (additionalRemarks !== undefined) hearingUpdate.additionalRemarks = additionalRemarks || null

            let updatedHearing = null
            if (Object.keys(hearingUpdate).length > 0) {
                updatedHearing = await tx.hearing.update({
                    where: { id },
                    data: hearingUpdate,
                    select: {
                        id: true,
                        status: true,
                        outcome: true,
                        orderLink: true,
                        additionalRemarks: true,
                        caseId: true,
                        hearingTime: true,
                        hearingType: true,
                        description: true,
                        judgeName: true,
                        courtNumber: true,
                        courtItemNumber: true,
                    },
                })
            }

            // (Bug 13 fix) Create follow-up hearing if next date provided
            if (nextDateOfHearing && updatedHearing) {
                await tx.hearing.create({
                    data: {
                        caseId: updatedHearing.caseId,
                        hearingDate: new Date(`${nextDateOfHearing}T12:00:00+05:30`),
                        hearingTime: updatedHearing.hearingTime,
                        hearingType: updatedHearing.hearingType,
                        description: updatedHearing.description,
                        judgeName: updatedHearing.judgeName,
                        courtNumber: updatedHearing.courtNumber,
                        courtItemNumber: updatedHearing.courtItemNumber,
                        hearingCounselId: hearing.hearingCounsel!.id,
                        notes: `Follow-up from hearing on ${new Date(hearing.hearingDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
                        createdById: session.user.id,
                    },
                })
            }

            return updatedHearing
        })

        // Fetch and return updated attendance
        const updated = await fetchAttendance(id)
        return NextResponse.json({
            attendance: updated,
            hearing: result,
        })
    } catch (error) {
        console.error('Error updating attendance:', error)
        return NextResponse.json({ error: 'Failed to update attendance' }, { status: 500 })
    }
}

// Helper to fetch formatted attendance
async function fetchAttendance(hearingId: string) {
    return prisma.hearingAttendance.findMany({
        where: { hearingId },
        select: {
            memberId: true,
            attended: true,
            member: {
                select: {
                    userId: true,
                    role: true,
                    user: { select: { name: true } },
                },
            },
        },
    })
}
