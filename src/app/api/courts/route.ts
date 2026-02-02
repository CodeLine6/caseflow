import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/courts - List all courts
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
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

// POST /api/courts - Create a new court
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { courtName, courtType, address, city, state } = body

        if (!courtName || !courtType) {
            return NextResponse.json({ error: 'Court name and type are required' }, { status: 400 })
        }

        const court = await prisma.court.create({
            data: {
                courtName,
                courtType,
                address,
                city,
                state,
            },
        })

        return NextResponse.json(court, { status: 201 })
    } catch (error) {
        console.error('Error creating court:', error)
        return NextResponse.json({ error: 'Failed to create court' }, { status: 500 })
    }
}
