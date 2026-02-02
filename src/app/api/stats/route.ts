'use server'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/stats - Get dashboard stats with change percentages
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const workspaceId = session.user.defaultWorkspaceId

        if (!workspaceId) {
            return NextResponse.json({
                stats: {
                    totalCases: 0,
                    activeCases: 0,
                    upcomingHearings: 0,
                    totalDocuments: 0,
                },
                changes: {
                    totalCases: null,
                    activeCases: null,
                    upcomingHearings: null,
                    totalDocuments: null,
                }
            })
        }

        // Get current stats
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const [totalCases, activeCases, upcomingHearings, totalDocuments] = await Promise.all([
            prisma.case.count({ where: { workspaceId } }),
            prisma.case.count({ where: { workspaceId, status: 'ACTIVE' } }),
            prisma.hearing.count({
                where: {
                    case: { workspaceId },
                    hearingDate: { gte: today }
                }
            }),
            prisma.document.count({
                where: { case: { workspaceId } }
            }),
        ])

        // Get or create today's snapshot
        const todayDate = new Date()
        todayDate.setHours(0, 0, 0, 0)

        await prisma.statsSnapshot.upsert({
            where: {
                workspaceId_date: {
                    workspaceId,
                    date: todayDate,
                }
            },
            update: {
                totalCases,
                activeCases,
                upcomingHearings,
                totalDocuments,
            },
            create: {
                workspaceId,
                date: todayDate,
                totalCases,
                activeCases,
                upcomingHearings,
                totalDocuments,
            },
        })

        // Get last week's snapshot for comparison
        const lastWeek = new Date(todayDate)
        lastWeek.setDate(lastWeek.getDate() - 7)

        const lastWeekSnapshot = await prisma.statsSnapshot.findUnique({
            where: {
                workspaceId_date: {
                    workspaceId,
                    date: lastWeek,
                }
            }
        })

        // Calculate change percentages
        const calculateChange = (current: number, previous: number | null | undefined): number | null => {
            if (previous === null || previous === undefined || previous === 0) {
                return current > 0 ? 100 : null
            }
            return Math.round(((current - previous) / previous) * 100)
        }

        const changes = {
            totalCases: calculateChange(totalCases, lastWeekSnapshot?.totalCases),
            activeCases: calculateChange(activeCases, lastWeekSnapshot?.activeCases),
            upcomingHearings: upcomingHearings - (lastWeekSnapshot?.upcomingHearings || 0),
            totalDocuments: totalDocuments - (lastWeekSnapshot?.totalDocuments || 0),
        }

        return NextResponse.json({
            stats: {
                totalCases,
                activeCases,
                upcomingHearings,
                totalDocuments,
            },
            changes,
            lastWeekSnapshot: lastWeekSnapshot ? {
                date: lastWeek,
                totalCases: lastWeekSnapshot.totalCases,
                activeCases: lastWeekSnapshot.activeCases,
                upcomingHearings: lastWeekSnapshot.upcomingHearings,
                totalDocuments: lastWeekSnapshot.totalDocuments,
            } : null
        })
    } catch (error) {
        console.error('Failed to fetch stats:', error)
        return NextResponse.json(
            { error: 'Failed to fetch stats' },
            { status: 500 }
        )
    }
}
