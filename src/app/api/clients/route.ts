import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission, isErrorResponse, filterWorkspacesByPermission } from '@/lib/rbac'
import { ClientType } from '@prisma/client'

// GET /api/clients - List all clients
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const workspaceId = searchParams.get('workspaceId')
        const search = searchParams.get('search')

        // Filter to workspaces where user has clients.read permission
        const allowedWorkspaceIds = await filterWorkspacesByPermission(session.user.id, 'clients.read')

        const whereClause: Record<string, unknown> = {
            workspaceId: workspaceId && allowedWorkspaceIds.includes(workspaceId)
                ? workspaceId
                : { in: allowedWorkspaceIds },
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ]
        }

        const clients = await prisma.client.findMany({
            where: whereClause,
            include: {
                _count: { select: { cases: true } },
            },
            orderBy: { name: 'asc' },
        })

        // Map to expected format for frontend
        const mappedClients = clients.map(c => ({
            ...c,
            phone: c.contactNumber,
            alternateNumber: c.alternateNumber,
        }))

        return NextResponse.json({ clients: mappedClients })
    } catch (error) {
        console.error('Error fetching clients:', error)
        return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
    }
}

// POST /api/clients - Create a new client
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { workspaceId, name, email, phone, alternateNumber, address, contactPerson, clientType, notes } = body

        if (!workspaceId || !name) {
            return NextResponse.json({ error: 'Workspace ID and name are required' }, { status: 400 })
        }

        // Check RBAC permission
        const rbac = await requirePermission(workspaceId, 'clients.create')
        if (isErrorResponse(rbac)) return rbac

        const client = await prisma.client.create({
            data: {
                name,
                email,
                contactNumber: phone,
                alternateNumber,
                address,
                company: contactPerson, // Using company field for contact person
                clientType: (clientType as ClientType) || 'INDIVIDUAL',
                notes,
                workspaceId,
            },
        })

        return NextResponse.json(client, { status: 201 })
    } catch (error) {
        console.error('Error creating client:', error)
        return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
    }
}
