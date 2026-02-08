import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/stats - Get dashboard statistics (Admin only)
export async function GET() {
    try {
        const { getAdminSession } = await import('@/lib/admin-session')
        const admin = await getAdminSession()

        if (!admin) {
            return NextResponse.json(
                { error: 'Admin authentication required' },
                { status: 401 }
            )
        }

        // Fetch statistics
        const [totalCourts, totalUsers, courtsWithDisplayBoards] = await Promise.all([
            prisma.court.count(),
            prisma.user.count(),
            prisma.court.count({
                where: {
                    displayBoardUrl: {
                        not: null,
                    },
                },
            }),
        ])

        return NextResponse.json({
            totalCourts,
            totalUsers,
            courtsWithDisplayBoards,
        })
    } catch (error) {
        console.error('Error fetching stats:', error)
        return NextResponse.json(
            { error: 'Failed to fetch statistics' },
            { status: 500 }
        )
    }
}
