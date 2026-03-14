// src/app/api/courts/[id]/route.ts
// Full replacement — adds zones support to GET and PATCH

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/courts/[id] - Get a single court
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const courtId = parseInt(id, 10)

        if (isNaN(courtId)) {
            return NextResponse.json({ error: 'Invalid court ID' }, { status: 400 })
        }

        const court = await prisma.court.findUnique({
            where: { id: courtId },
        })

        if (!court) {
            return NextResponse.json({ error: 'Court not found' }, { status: 404 })
        }

        return NextResponse.json(court)
    } catch (error) {
        console.error('Error fetching court:', error)
        return NextResponse.json({ error: 'Failed to fetch court' }, { status: 500 })
    }
}

// PATCH /api/courts/[id] - Update a court (Admin only)
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const courtId = parseInt(id, 10)

        if (isNaN(courtId)) {
            return NextResponse.json({ error: 'Invalid court ID' }, { status: 400 })
        }

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
            return NextResponse.json(
                { error: 'Court name and type are required' },
                { status: 400 }
            )
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

        const court = await prisma.court.update({
            where: { id: courtId },
            data: {
                courtName,
                courtType,
                address: address || null,
                city: city || null,
                state: state || null,
                displayBoardUrl: displayBoardUrl || null,
                // null clears zones; undefined leaves them unchanged; array updates them
                zones: zones === null ? null : zones && zones.length > 0 ? zones : undefined,
            },
        })

        return NextResponse.json(court)
    } catch (error) {
        console.error('Error updating court:', error)
        return NextResponse.json({ error: 'Failed to update court' }, { status: 500 })
    }
}

// DELETE /api/courts/[id] - Delete a court (Admin only)
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const courtId = parseInt(id, 10)

        if (isNaN(courtId)) {
            return NextResponse.json({ error: 'Invalid court ID' }, { status: 400 })
        }

        const { getAdminSession } = await import('@/lib/admin-session')
        const admin = await getAdminSession()

        if (!admin) {
            return NextResponse.json(
                { error: 'Admin authentication required' },
                { status: 401 }
            )
        }

        await prisma.court.delete({
            where: { id: courtId },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting court:', error)
        return NextResponse.json({ error: 'Failed to delete court' }, { status: 500 })
    }
}