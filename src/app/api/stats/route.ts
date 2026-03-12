import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { filterWorkspacesByPermission } from '@/lib/rbac'
import { getISTStartOfDay } from '@/lib/timezone'

// GET /api/stats - Get dashboard stats scoped to workspace + permissions
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userId = session.user.id

        // Allow explicit workspaceId override via query param; fall back to session default
        const { searchParams } = new URL(request.url)
        const requestedWorkspaceId = searchParams.get('workspaceId') || session.user.defaultWorkspaceId

        // ── Cases scope ──────────────────────────────────────────────────────────
        const [caseReadAll, caseReadOwn] = await Promise.all([
            filterWorkspacesByPermission(userId, 'cases.read'),
            filterWorkspacesByPermission(userId, 'cases.readOwn'),
        ])
        const caseHasViewAll = requestedWorkspaceId
            ? caseReadAll.includes(requestedWorkspaceId)
            : caseReadAll.length > 0
        const caseAllowedIds = requestedWorkspaceId
            ? (caseHasViewAll
                ? (caseReadAll.includes(requestedWorkspaceId) ? [requestedWorkspaceId] : [])
                : (caseReadOwn.includes(requestedWorkspaceId) ? [requestedWorkspaceId] : []))
            : (caseHasViewAll ? caseReadAll : caseReadOwn)

        // ── Hearings scope ───────────────────────────────────────────────────────
        const [hearingReadAll, hearingReadOwn] = await Promise.all([
            filterWorkspacesByPermission(userId, 'hearings.read'),
            filterWorkspacesByPermission(userId, 'hearings.readOwn'),
        ])
        const hearingHasViewAll = requestedWorkspaceId
            ? hearingReadAll.includes(requestedWorkspaceId)
            : hearingReadAll.length > 0
        const hearingAllowedIds = requestedWorkspaceId
            ? (hearingHasViewAll
                ? (hearingReadAll.includes(requestedWorkspaceId) ? [requestedWorkspaceId] : [])
                : (hearingReadOwn.includes(requestedWorkspaceId) ? [requestedWorkspaceId] : []))
            : (hearingHasViewAll ? hearingReadAll : hearingReadOwn)

        // ── Documents scope ──────────────────────────────────────────────────────
        const docAllowedIds = await filterWorkspacesByPermission(userId, 'documents.read')
        const docScopedIds = requestedWorkspaceId
            ? docAllowedIds.filter(id => id === requestedWorkspaceId)
            : docAllowedIds

        // If user has no access at all, return zeros
        if (caseAllowedIds.length === 0 && hearingAllowedIds.length === 0) {
            return NextResponse.json({
                stats: { totalCases: 0, activeCases: 0, upcomingHearings: 0, totalDocuments: 0 },
                changes: { totalCases: null, activeCases: null, upcomingHearings: null, totalDocuments: null },
            })
        }

        // ── Mine filter for cases ────────────────────────────────────────────────
        // Applied when user does NOT have full .read in their target workspace(s)
        const caseMineConditions = !caseHasViewAll ? [
            { mainCounselId: userId },
            { hearings: { some: { hearingCounsel: { userId } } } },
            { hearings: { some: { attendance: { some: { member: { userId } } } } } },
        ] : undefined

        const caseWhereBase = {
            workspaceId: { in: caseAllowedIds },
            ...(caseMineConditions ? { OR: caseMineConditions } : {}),
        }

        // ── Mine filter for hearings ─────────────────────────────────────────────
        const hearingMineConditions = !hearingHasViewAll ? [
            { case: { mainCounselId: userId } },
            { hearingCounsel: { userId } },
            { attendance: { some: { member: { userId } } } },
        ] : undefined

        const today = getISTStartOfDay()

        const [totalCases, activeCases, upcomingHearings, totalDocuments] = await Promise.all([
            caseAllowedIds.length > 0
                ? prisma.case.count({ where: caseWhereBase })
                : Promise.resolve(0),
            caseAllowedIds.length > 0
                ? prisma.case.count({ where: { ...caseWhereBase, status: 'ACTIVE' } })
                : Promise.resolve(0),
            hearingAllowedIds.length > 0
                ? prisma.hearing.count({
                    where: {
                        case: { workspaceId: { in: hearingAllowedIds } },
                        hearingDate: { gte: today },
                        ...(hearingMineConditions ? { OR: hearingMineConditions } : {}),
                    },
                })
                : Promise.resolve(0),
            docScopedIds.length > 0
                ? prisma.document.count({ where: { case: { workspaceId: { in: docScopedIds } } } })
                : Promise.resolve(0),
        ])

        // ── Snapshot (only for single concrete workspace) ────────────────────────
        const snapshotWorkspaceId = requestedWorkspaceId
        let lastWeekSnapshot = null

        if (snapshotWorkspaceId) {
            await prisma.statsSnapshot.upsert({
                where: { workspaceId_date: { workspaceId: snapshotWorkspaceId, date: today } },
                update: { totalCases, activeCases, upcomingHearings, totalDocuments },
                create: { workspaceId: snapshotWorkspaceId, date: today, totalCases, activeCases, upcomingHearings, totalDocuments },
            })

            const lastWeek = new Date(today)
            lastWeek.setDate(lastWeek.getDate() - 7)

            lastWeekSnapshot = await prisma.statsSnapshot.findUnique({
                where: { workspaceId_date: { workspaceId: snapshotWorkspaceId, date: lastWeek } },
            })
        }

        const calculateChange = (current: number, previous: number | null | undefined): number | null => {
            if (previous === null || previous === undefined || previous === 0) {
                return current > 0 ? 100 : null
            }
            return Math.round(((current - previous) / previous) * 100)
        }

        return NextResponse.json({
            stats: { totalCases, activeCases, upcomingHearings, totalDocuments },
            changes: {
                totalCases: calculateChange(totalCases, lastWeekSnapshot?.totalCases),
                activeCases: calculateChange(activeCases, lastWeekSnapshot?.activeCases),
                upcomingHearings: upcomingHearings - (lastWeekSnapshot?.upcomingHearings || 0),
                totalDocuments: totalDocuments - (lastWeekSnapshot?.totalDocuments || 0),
            },
            lastWeekSnapshot: lastWeekSnapshot ? {
                totalCases: lastWeekSnapshot.totalCases,
                activeCases: lastWeekSnapshot.activeCases,
                upcomingHearings: lastWeekSnapshot.upcomingHearings,
                totalDocuments: lastWeekSnapshot.totalDocuments,
            } : null,
        })
    } catch (error) {
        console.error('Failed to fetch stats:', error)
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }
}
