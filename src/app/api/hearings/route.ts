import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { HearingType } from '@prisma/client'

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

        const memberships = await prisma.workspaceMember.findMany({
            where: { userId: session.user.id },
            select: { workspaceId: true },
        })
        const workspaceIds = memberships.map(m => m.workspaceId)

        const whereClause: Record<string, unknown> = {
            case: { workspaceId: { in: workspaceIds } },
        }

        if (caseId) whereClause.caseId = caseId
        if (upcoming === 'true') {
            whereClause.hearingDate = { gte: new Date() }
        }

        const hearings = await prisma.hearing.findMany({
            where: whereClause,
            include: {
                case: { select: { id: true, title: true, caseNumber: true } },
            },
            orderBy: { hearingDate: 'asc' },
        })

        // Map to expected format for frontend
        const mappedHearings = hearings.map(h => ({
            ...h,
            purpose: h.description || h.hearingType,
            court: null, // Court info would need a join through case
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
        const { caseId, hearingDate, purpose, hearingType, courtNumber, notes, status } = body

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

        const membership = await prisma.workspaceMember.findFirst({
            where: { workspaceId: caseData.workspaceId, userId: session.user.id },
        })

        if (!membership) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const hearing = await prisma.hearing.create({
            data: {
                caseId,
                hearingDate: new Date(hearingDate),
                hearingType: (hearingType as HearingType) || 'OTHER',
                description: purpose,
                courtNumber: courtNumber || 'TBD',
                notes,
                status: status || 'SCHEDULED',
                createdById: session.user.id,
            },
            include: { case: true },
        })

        return NextResponse.json(hearing, { status: 201 })
    } catch (error) {
        console.error('Error creating hearing:', error)
        return NextResponse.json({ error: 'Failed to create hearing' }, { status: 500 })
    }
}
