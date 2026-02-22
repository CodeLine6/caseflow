import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseISO, addDays } from 'date-fns'
import { getISTStartOfDay, getISTEndOfDay, formatISTDate } from '@/lib/timezone'

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
        const dayStart = getISTStartOfDay(targetDate)
        const dayEnd = getISTEndOfDay(targetDate)

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
        const weekStart = getISTStartOfDay(addDays(targetDate, -3))
        const weekEnd = getISTEndOfDay(addDays(targetDate, 3))

        const weekHearings = await prisma.hearing.findMany({
            where: {
                hearingDate: {
                    gte: weekStart,
                    lte: weekEnd,
                },
                case: {
                    workspaceId: { in: workspaceIds },
                },
            },
            select: { hearingDate: true },
        })

        // Count hearings per day using IST dates
        const hearingsByDate = weekHearings.reduce((acc, item) => {
            const dateKey = formatISTDate(new Date(item.hearingDate))
            acc[dateKey] = (acc[dateKey] || 0) + 1
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
