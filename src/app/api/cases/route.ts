import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

// GET /api/cases - List all cases for the user's workspace
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const workspaceId = searchParams.get('workspaceId')
        const status = searchParams.get('status')
        const category = searchParams.get('category')
        const search = searchParams.get('search')

        // Get user's workspace memberships
        const memberships = await prisma.workspaceMember.findMany({
            where: { userId: session.user.id },
            select: { workspaceId: true },
        })

        const workspaceIds = memberships.map((m: { workspaceId: string }) => m.workspaceId)

        // Build query filters
        const whereClause: Prisma.CaseWhereInput = {
            workspaceId: workspaceId ? { in: [workspaceId] } : { in: workspaceIds },
        }

        if (status) {
            whereClause.status = status as Prisma.EnumCaseStatusFilter
        }

        if (category) {
            whereClause.caseCategory = category as Prisma.EnumCaseCategoryFilter
        }

        if (search) {
            whereClause.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { caseNumber: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ]
        }

        const cases = await prisma.case.findMany({
            where: whereClause,
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                mainCounsel: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    },
                },
                court: {
                    select: {
                        id: true,
                        courtName: true,
                        courtType: true,
                    },
                },
                _count: {
                    select: {
                        hearings: true,
                        documents: true,
                        tasks: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        })

        return NextResponse.json({ cases })
    } catch (error) {
        console.error('Error fetching cases:', error)
        return NextResponse.json(
            { error: 'Failed to fetch cases' },
            { status: 500 }
        )
    }
}

// POST /api/cases - Create a new case
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            workspaceId,
            title,
            caseNumber,
            description,
            caseCategory,
            caseType,
            priority,
            filingDate,
            opposingParty,
            opposingCounsel,
            caseValue,
            clientId,
            courtId,
            mainCounselId,
        } = body

        // Validate required fields
        if (!workspaceId || !title || !caseNumber || !caseCategory || !filingDate) {
            return NextResponse.json(
                { error: 'Missing required fields: workspaceId, title, caseNumber, caseCategory, filingDate' },
                { status: 400 }
            )
        }

        // Check if user has access to this workspace
        const membership = await prisma.workspaceMember.findFirst({
            where: {
                workspaceId,
                userId: session.user.id,
            },
        })

        if (!membership) {
            return NextResponse.json(
                { error: 'You do not have access to this workspace' },
                { status: 403 }
            )
        }

        // Check if case number is unique
        const existingCase = await prisma.case.findUnique({
            where: { caseNumber },
        })

        if (existingCase) {
            return NextResponse.json(
                { error: 'A case with this number already exists' },
                { status: 409 }
            )
        }

        // Create the case
        const newCase = await prisma.case.create({
            data: {
                title,
                caseNumber,
                description,
                caseCategory,
                caseType: caseType || 'OTHER',
                priority: priority || 'MEDIUM',
                filingDate: new Date(filingDate),
                opposingParty,
                opposingCounsel,
                caseValue: caseValue ? parseFloat(caseValue) : null,
                workspaceId,
                createdById: session.user.id,
                clientId,
                courtId,
                mainCounselId,
            },
            include: {
                client: true,
                mainCounsel: true,
                court: true,
            },
        })

        // Create audit log
        await prisma.auditLog.create({
            data: {
                action: 'CREATE',
                entity: 'cases',
                entityId: newCase.id,
                userId: session.user.id,
                workspaceId,
                metadata: { title, caseNumber },
            },
        })

        return NextResponse.json(newCase, { status: 201 })
    } catch (error) {
        console.error('Error creating case:', error)
        return NextResponse.json(
            { error: 'Failed to create case' },
            { status: 500 }
        )
    }
}
