import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/display-board - Get display board data for relevant courts
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const courtId = searchParams.get('courtId')
        const courtNumber = searchParams.get('courtNumber')

        // If specific court requested
        if (courtId) {
            const displayData = await prisma.displayBoardCache.findMany({
                where: {
                    courtId,
                    ...(courtNumber ? { courtNumber } : {}),
                },
                include: {
                    court: {
                        select: {
                            id: true,
                            courtName: true,
                            displayBoardUrl: true,
                        },
                    },
                },
                orderBy: { courtNumber: 'asc' },
            })

            return NextResponse.json({ displayData })
        }

        // Get user's workspaces
        const memberships = await prisma.workspaceMember.findMany({
            where: { userId: session.user.id },
            select: { workspaceId: true },
        })
        const workspaceIds = memberships.map(m => m.workspaceId)

        // Get today's hearings for the user
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const todayHearings = await prisma.hearing.findMany({
            where: {
                hearingDate: {
                    gte: today,
                    lt: tomorrow,
                },
                case: {
                    workspaceId: { in: workspaceIds },
                },
            },
            include: {
                case: {
                    select: {
                        id: true,
                        caseNumber: true,
                        title: true,
                        courtId: true,
                        court: {
                            select: {
                                id: true,
                                courtName: true,
                                displayBoardUrl: true,
                            },
                        },
                    },
                },
            },
        })

        // Get unique court IDs and court numbers from today's hearings
        const courtInfo = todayHearings
            .filter(h => h.case.courtId)
            .map(h => ({
                courtId: h.case.courtId!,
                courtNumber: h.courtNumber,
                caseNumber: h.case.caseNumber,
                caseTitle: h.case.title,
                court: h.case.court,
            }))

        // Get display board data for relevant courts
        const courtIds = [...new Set(courtInfo.map(c => c.courtId))]
        const displayData = await prisma.displayBoardCache.findMany({
            where: {
                courtId: { in: courtIds },
            },
            include: {
                court: {
                    select: {
                        id: true,
                        courtName: true,
                        displayBoardUrl: true,
                    },
                },
            },
            orderBy: [
                { courtId: 'asc' },
                { courtNumber: 'asc' },
            ],
        })

        // Match display data with user's hearings
        const relevantDisplayData = displayData.filter(d =>
            courtInfo.some(c => c.courtId === d.courtId && c.courtNumber === d.courtNumber)
        )

        return NextResponse.json({
            displayData: relevantDisplayData,
            userHearings: courtInfo,
            allCourtData: displayData,
        })
    } catch (error) {
        console.error('Failed to fetch display board data:', error)
        return NextResponse.json(
            { error: 'Failed to fetch display board data' },
            { status: 500 }
        )
    }
}

// POST /api/display-board - Update display board cache (called by scraper/webhook)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { courtId, entries } = body

        if (!courtId || !entries || !Array.isArray(entries)) {
            return NextResponse.json(
                { error: 'courtId and entries array are required' },
                { status: 400 }
            )
        }

        // Verify court exists
        const court = await prisma.court.findUnique({
            where: { id: courtId },
        })

        if (!court) {
            return NextResponse.json({ error: 'Court not found' }, { status: 404 })
        }

        // Upsert display board entries
        const results = await Promise.all(
            entries.map(async (entry: {
                courtNumber: string
                itemNumber?: string
                caseNumber?: string
                caseTitle?: string
                status?: string
                judgeName?: string
                rawData?: unknown
            }) => {
                return prisma.displayBoardCache.upsert({
                    where: {
                        courtId_courtNumber: {
                            courtId,
                            courtNumber: entry.courtNumber,
                        },
                    },
                    update: {
                        itemNumber: entry.itemNumber || null,
                        caseNumber: entry.caseNumber || null,
                        caseTitle: entry.caseTitle || null,
                        status: entry.status || null,
                        judgeName: entry.judgeName || null,
                        rawData: entry.rawData || null,
                        lastUpdated: new Date(),
                    },
                    create: {
                        courtId,
                        courtNumber: entry.courtNumber,
                        itemNumber: entry.itemNumber || null,
                        caseNumber: entry.caseNumber || null,
                        caseTitle: entry.caseTitle || null,
                        status: entry.status || null,
                        judgeName: entry.judgeName || null,
                        rawData: entry.rawData || null,
                    },
                })
            })
        )

        return NextResponse.json({ updated: results.length, entries: results })
    } catch (error) {
        console.error('Failed to update display board cache:', error)
        return NextResponse.json(
            { error: 'Failed to update display board cache' },
            { status: 500 }
        )
    }
}
