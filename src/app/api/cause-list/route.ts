import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { startOfDay, endOfDay, parseISO, addDays } from 'date-fns'

// GET /api/cause-list - Get hearings for a specific date (defaults to today)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const dateParam = searchParams.get('date')

        // Parse date or default to today
        const targetDate = dateParam ? parseISO(dateParam) : new Date()
        const dayStart = startOfDay(targetDate)
        const dayEnd = endOfDay(targetDate)

        // Get user's workspaces
        const memberships = await prisma.workspaceMember.findMany({
            where: { userId: session.user.id },
            select: { workspaceId: true },
        })
        const workspaceIds = memberships.map(m => m.workspaceId)

        // Fetch hearings for the specified date
        const hearings = await prisma.hearing.findMany({
            where: {
                hearingDate: {
                    gte: dayStart,
                    lte: dayEnd,
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
                        priority: true,
                        court: {
                            select: {
                                id: true,
                                courtName: true,
                                courtType: true,
                                city: true,
                            },
                        },
                        client: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: [
                { hearingTime: 'asc' },
                { hearingDate: 'asc' },
            ],
        })

        // Get week's hearing counts for calendar view
        const weekStart = startOfDay(addDays(targetDate, -3))
        const weekEnd = endOfDay(addDays(targetDate, 3))

        const weekHearings = await prisma.hearing.groupBy({
            by: ['hearingDate'],
            where: {
                hearingDate: {
                    gte: weekStart,
                    lte: weekEnd,
                },
                case: {
                    workspaceId: { in: workspaceIds },
                },
            },
            _count: true,
        })

        const hearingsByDate = weekHearings.reduce((acc, item) => {
            const dateKey = item.hearingDate.toISOString().split('T')[0]
            acc[dateKey] = item._count
            return acc
        }, {} as Record<string, number>)

        return NextResponse.json({
            hearings,
            date: targetDate.toISOString(),
            hearingsByDate,
            totalForDay: hearings.length,
        })
    } catch (error) {
        console.error('Failed to fetch cause list:', error)
        return NextResponse.json(
            { error: 'Failed to fetch cause list' },
            { status: 500 }
        )
    }
}
