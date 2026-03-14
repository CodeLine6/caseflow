// src/app/api/courts/route.ts
// Replace the existing file with this version (adds zones support to GET and POST)

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/courts - List all courts
export async function GET() {
    try {
        const { getAdminSession } = await import('@/lib/admin-session')
        const session = await getServerSession(authOptions)
        const admin = await getAdminSession()

        if (!session?.user?.id && !admin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const courts = await prisma.court.findMany({
            include: {
                _count: { select: { cases: true } },
            },
            orderBy: { courtName: 'asc' },
        })

        return NextResponse.json({ courts })
    } catch (error) {
        console.error('Error fetching courts:', error)
        return NextResponse.json({ error: 'Failed to fetch courts' }, { status: 500 })
    }
}

// POST /api/courts - Create a new court (Admin only)
export async function POST(request: Request) {
    try {
        const { getAdminSession } = await import('@/lib/admin-session')
        const admin = await getAdminSession()

        if (!admin) {
            return NextResponse.json(
                { error: 'Admin authentication required' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { courtName, courtType, address, city, state, displayBoardUrl, zones } = body

        if (!courtName || !courtType) {
            return NextResponse.json({ error: 'Court name and type are required' }, { status: 400 })
        }

        // Validate zones if provided
        if (zones !== undefined && zones !== null) {
            if (!Array.isArray(zones)) {
                return NextResponse.json({ error: 'zones must be an array' }, { status: 400 })
            }
            for (const zone of zones) {
                if (!zone.name || typeof zone.name !== 'string') {
                    return NextResponse.json({ error: 'Each zone must have a name' }, { status: 400 })
                }
            }
        }

        const court = await prisma.court.create({
            data: {
                courtName,
                courtType,
                address: address || null,
                city: city || null,
                state: state || null,
                displayBoardUrl: displayBoardUrl || null,
                zones: zones && zones.length > 0 ? zones : undefined,
            },
        })

        return NextResponse.json(court, { status: 201 })
    } catch (error) {
        console.error('Error creating court:', error)
        return NextResponse.json({ error: 'Failed to create court' }, { status: 500 })
    }
}