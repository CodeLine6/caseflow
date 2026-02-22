import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission, isErrorResponse, filterWorkspacesByPermission } from '@/lib/rbac'
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

        // Determine view scope from permissions:
        // cases.read   → view all cases in workspace
        // cases.readOwn → view only cases user is associated with
        const [allWorkspaceIds, ownWorkspaceIds] = await Promise.all([
            filterWorkspacesByPermission(session.user.id, 'cases.read'),
            filterWorkspacesByPermission(session.user.id, 'cases.readOwn'),
        ])
        const hasViewAll = allWorkspaceIds.length > 0
        const allowedWorkspaceIds = hasViewAll ? allWorkspaceIds : ownWorkspaceIds
        if (allowedWorkspaceIds.length === 0) {
            return NextResponse.json({ cases: [] })
        }

        // Build query filters
        const whereClause: Prisma.CaseWhereInput = {
            workspaceId: workspaceId && allowedWorkspaceIds.includes(workspaceId)
                ? { in: [workspaceId] }
                : { in: allowedWorkspaceIds },
        }

        if (status) {
            whereClause.status = status as Prisma.EnumCaseStatusFilter
        }

        if (category) {
            whereClause.caseCategory = category as Prisma.EnumCaseCategoryFilter
        }

        // If user only has readOwn (not read), scope results to associated cases
        const mineConditions: Prisma.CaseWhereInput[] | undefined = !hasViewAll ? [
            { mainCounselId: session.user.id },
            { hearings: { some: { hearingCounsel: { userId: session.user.id } } } },
            { hearings: { some: { attendance: { some: { member: { userId: session.user.id } } } } } },
        ] : undefined

        if (search) {
            const searchConditions: Prisma.CaseWhereInput[] = [
                { title: { contains: search, mode: 'insensitive' } },
                { caseNumber: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ]
            if (mineConditions) {
                whereClause.AND = [
                    { OR: mineConditions },
                    { OR: searchConditions },
                ]
            } else {
                whereClause.OR = searchConditions
            }
        } else if (mineConditions) {
            whereClause.OR = mineConditions
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
                hearings: {
                    orderBy: { hearingDate: 'desc' },
                    take: 1,
                    select: {
                        hearingDate: true,
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

        // Check RBAC permission
        const rbac = await requirePermission(workspaceId, 'cases.create')
        if (isErrorResponse(rbac)) return rbac

        // If assigning counsel to someone other than self, check cases.assign
        if (mainCounselId && mainCounselId !== session.user.id) {
            const assignRbac = await requirePermission(workspaceId, 'cases.assign')
            if (isErrorResponse(assignRbac)) return assignRbac
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
                mainCounselId: mainCounselId || session.user.id,
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
