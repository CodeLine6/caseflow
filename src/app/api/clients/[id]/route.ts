import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission, isErrorResponse } from '@/lib/rbac'
import { ClientType } from '@prisma/client'

// GET /api/clients/[id] - Get a single client
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

        const client = await prisma.client.findUnique({
            where: { id },
            include: {
                cases: { select: { id: true, title: true, caseNumber: true, status: true } },
                _count: { select: { cases: true } },
            },
        })

        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }

        // Check clients.read permission
        const rbac = await requirePermission(client.workspaceId, 'clients.read')
        if (isErrorResponse(rbac)) return rbac

        return NextResponse.json({ client })
    } catch (error) {
        console.error('Error fetching client:', error)
        return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 })
    }
}

// PUT /api/clients/[id] - Update a client
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()

        const existingClient = await prisma.client.findUnique({
            where: { id },
            select: { workspaceId: true },
        })

        if (!existingClient) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }

        // Check clients.update permission
        const rbac = await requirePermission(existingClient.workspaceId, 'clients.update')
        if (isErrorResponse(rbac)) return rbac

        const updatedClient = await prisma.client.update({
            where: { id },
            data: {
                name: body.name,
                email: body.email,
                contactNumber: body.phone,
                alternateNumber: body.alternateNumber,
                address: body.address,
                company: body.contactPerson,
                clientType: body.clientType ? (body.clientType as ClientType) : undefined,
                notes: body.notes,
            },
        })

        return NextResponse.json({ client: updatedClient })
    } catch (error) {
        console.error('Error updating client:', error)
        return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
    }
}

// DELETE /api/clients/[id] - Delete a client
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const client = await prisma.client.findUnique({
            where: { id },
            select: { workspaceId: true },
        })

        if (!client) {
            return NextResponse.json({ error: 'Client not found' }, { status: 404 })
        }

        // Check clients.delete permission
        const rbac = await requirePermission(client.workspaceId, 'clients.delete')
        if (isErrorResponse(rbac)) return rbac

        await prisma.client.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting client:', error)
        return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
    }
}
