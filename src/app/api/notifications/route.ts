import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const unreadOnly = searchParams.get('unread') === 'true'
        const rawLimit = parseInt(searchParams.get('limit') || '10')
        const limit = (!rawLimit || rawLimit < 1 || rawLimit > 100) ? 10 : rawLimit

        const notifications = await prisma.notification.findMany({
            where: {
                userId: session.user.id,
                ...(unreadOnly ? { read: false } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        })

        const unreadCount = await prisma.notification.count({
            where: {
                userId: session.user.id,
                read: false,
            },
        })

        return NextResponse.json({ notifications, unreadCount })
    } catch (error) {
        console.error('Failed to fetch notifications:', error)
        return NextResponse.json(
            { error: 'Failed to fetch notifications' },
            { status: 500 }
        )
    }
}

// POST /api/notifications - Create a notification (internal use)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { type, title, message, link } = await request.json()

        if (!type || !title || !message) {
            return NextResponse.json(
                { error: 'type, title, and message are required' },
                { status: 400 }
            )
        }

        const notification = await prisma.notification.create({
            data: {
                userId: session.user.id,
                type,
                title,
                message,
                link: link || null,
            },
        })

        return NextResponse.json({ notification }, { status: 201 })
    } catch (error) {
        console.error('Failed to create notification:', error)
        return NextResponse.json(
            { error: 'Failed to create notification' },
            { status: 500 }
        )
    }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let notificationIds: string[] | undefined
        let markAll: boolean | undefined
        try {
            const body = await request.json()
            notificationIds = body.notificationIds
            markAll = body.markAll
        } catch {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
        }

        if (!markAll && (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0)) {
            return NextResponse.json({ error: 'markAll or notificationIds array is required' }, { status: 400 })
        }

        if (markAll) {
            await prisma.notification.updateMany({
                where: {
                    userId: session.user.id,
                    read: false,
                },
                data: { read: true },
            })
        } else if (notificationIds && notificationIds.length > 0) {
            await prisma.notification.updateMany({
                where: {
                    id: { in: notificationIds },
                    userId: session.user.id,
                },
                data: { read: true },
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to update notifications:', error)
        return NextResponse.json(
            { error: 'Failed to update notifications' },
            { status: 500 }
        )
    }
}
