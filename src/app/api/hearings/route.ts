import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission, isErrorResponse, filterWorkspacesByPermission } from '@/lib/rbac'
import { HearingType } from '@prisma/client'
import { getISTStartOfDay } from '@/lib/timezone'

// GET /api/hearings - List hearings
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const caseId = searchParams.get('caseId')
        const upcoming = searchParams.get('upcoming')
        const workspaceId = searchParams.get('workspaceId')

        // Determine view scope from permissions:
        // hearings.read    → view all hearings in workspace
        // hearings.readOwn → view only hearings user is associated with
        const [allWorkspaceIds, ownWorkspaceIds] = await Promise.all([
            filterWorkspacesByPermission(session.user.id, 'hearings.read'),
            filterWorkspacesByPermission(session.user.id, 'hearings.readOwn'),
        ])
        const hasViewAll = allWorkspaceIds.length > 0
        const allowedWorkspaceIds = hasViewAll ? allWorkspaceIds : ownWorkspaceIds
        if (allowedWorkspaceIds.length === 0) {
            return NextResponse.json({ hearings: [] })
        }
        const workspaceIds = workspaceId && allowedWorkspaceIds.includes(workspaceId) ? [workspaceId] : allowedWorkspaceIds

        const whereClause: Record<string, unknown> = {
            case: { workspaceId: { in: workspaceIds } },
        }

        if (caseId) whereClause.caseId = caseId
        if (upcoming === 'true') {
            whereClause.hearingDate = { gte: getISTStartOfDay() }
        }

        // If user only has readOwn, scope to hearings they are associated with
        if (!hasViewAll) {
            whereClause.OR = [
                { hearingCounsel: { userId: session.user.id } },
                { attendance: { some: { member: { userId: session.user.id } } } },
                { case: { mainCounselId: session.user.id } },
            ]
        }

        const hearings = await prisma.hearing.findMany({
            where: whereClause,
            include: {
                case: { select: { id: true, title: true, caseNumber: true, court: { select: { courtName: true } } } },
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
            },
            orderBy: { hearingDate: 'asc' },
        })

        // Map to expected format for frontend
        const mappedHearings = hearings.map(h => ({
            ...h,
            purpose: h.description || h.hearingType,
        }))

        return NextResponse.json({ hearings: mappedHearings })
    } catch (error) {
        console.error('Error fetching hearings:', error)
        return NextResponse.json({ error: 'Failed to fetch hearings' }, { status: 500 })
    }
}

// POST /api/hearings - Create hearing
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            caseId,
            hearingDate,
            hearingTime,
            purpose,
            hearingType,
            courtNumber,
            courtItemNumber,
            judgeName,
            notes,
            status,
            hearingCounselId,
            accompaniedByIds,
            nextDateOfHearing,
            orderLink,
            additionalRemarks,
        } = body

        if (!caseId || !hearingDate) {
            return NextResponse.json({ error: 'Case ID and hearing date are required' }, { status: 400 })
        }

        // Verify case access
        const caseData = await prisma.case.findUnique({
            where: { id: caseId },
            select: { workspaceId: true },
        })

        if (!caseData) {
            return NextResponse.json({ error: 'Case not found' }, { status: 404 })
        }

        // Check RBAC permission
        const rbac = await requirePermission(caseData.workspaceId, 'hearings.create')
        if (isErrorResponse(rbac)) return rbac

        const hearing = await prisma.hearing.create({
            data: {
                caseId,
                hearingDate: new Date(hearingDate), // already includes +05:30 from frontend
                hearingTime: hearingTime || null,
                hearingType: (hearingType as HearingType) || 'OTHER',
                description: purpose,
                courtNumber: courtNumber || 'TBD',
                courtItemNumber: courtItemNumber || null,
                judgeName: judgeName || null,
                notes: notes || null,
                status: status || 'SCHEDULED',
                createdById: session.user.id,
                hearingCounselId: hearingCounselId || null,
                orderLink: orderLink || null,
                additionalRemarks: additionalRemarks || null,
                // Create attendance records for accompanied members
                attendance: {
                    create: accompaniedByIds?.map((memberId: string) => ({
                        memberId,
                        attended: false,
                    })) || [],
                },
            },
            include: {
                case: { select: { id: true, caseNumber: true, title: true } },
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
            },
        })

        // Auto-create follow-up hearing if nextDateOfHearing is provided
        if (nextDateOfHearing) {
            await prisma.hearing.create({
                data: {
                    caseId,
                    hearingDate: new Date(`${nextDateOfHearing}T12:00:00+05:30`),
                    hearingTime: hearing.hearingTime,
                    hearingType: hearing.hearingType,
                    judgeName: hearing.judgeName,
                    courtNumber: hearing.courtNumber,
                    courtItemNumber: hearing.courtItemNumber,
                    notes: `Auto-generated follow-up hearing from hearing ${hearing.id}`,
                    createdById: session.user.id,
                    hearingCounselId: hearing.hearingCounselId,
                },
            })
        }

        return NextResponse.json(hearing, { status: 201 })
    } catch (error) {
        console.error('Error creating hearing:', error)
        return NextResponse.json({ error: 'Failed to create hearing' }, { status: 500 })
    }
}
