import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/custom-case-values?fieldType=CATEGORY|TYPE
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const fieldType = searchParams.get('fieldType')
        const workspaceId = searchParams.get('workspaceId')

        if (!fieldType || !['CATEGORY', 'TYPE'].includes(fieldType)) {
            return NextResponse.json({ error: 'Invalid fieldType' }, { status: 400 })
        }

        if (!workspaceId) {
            return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
        }

        // Verify user has access to this workspace
        const isMember = await prisma.workspace.findFirst({
            where: {
                id: workspaceId,
                OR: [
                    { ownerId: session.user.id },
                    { members: { some: { userId: session.user.id } } }
                ]
            },
            select: { id: true }
        })

        if (!isMember) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
        }

        // Fetch custom values for this workspace and field type
        const customValues = await prisma.customCaseValue.findMany({
            where: {
                workspaceId,
                fieldType
            },
            orderBy: [
                { usageCount: 'desc' },
                { value: 'asc' }
            ],
            select: {
                value: true,
                usageCount: true
            }
        })

        return NextResponse.json({ values: customValues })
    } catch (error) {
        console.error('Error fetching custom case values:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST /api/custom-case-values
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { fieldType, value, workspaceId } = body

        if (!fieldType || !['CATEGORY', 'TYPE'].includes(fieldType)) {
            return NextResponse.json({ error: 'Invalid fieldType' }, { status: 400 })
        }

        if (!value || typeof value !== 'string' || !value.trim()) {
            return NextResponse.json({ error: 'Invalid value' }, { status: 400 })
        }

        if (!workspaceId) {
            return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
        }

        // Verify user has access to this workspace
        const workspace = await prisma.workspace.findFirst({
            where: {
                id: workspaceId,
                OR: [
                    { ownerId: session.user.id },
                    { members: { some: { userId: session.user.id } } }
                ]
            }
        })

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
        }

        // Upsert the custom value (increment usage count if exists)
        const customValue = await prisma.customCaseValue.upsert({
            where: {
                workspaceId_fieldType_value: {
                    workspaceId,
                    fieldType,
                    value: value.trim()
                }
            },
            update: {
                usageCount: { increment: 1 }
            },
            create: {
                workspaceId,
                fieldType,
                value: value.trim(),
                usageCount: 1
            }
        })

        return NextResponse.json({ customValue })
    } catch (error) {
        console.error('Error saving custom case value:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
