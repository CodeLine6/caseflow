import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get workspaces where user is a member
        const memberships = await prisma.workspaceMember.findMany({
            where: { userId: session.user.id },
            include: {
                workspace: {
                    include: {
                        owner: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                        _count: {
                            select: {
                                cases: true,
                                members: true,
                            },
                        },
                    },
                },
            },
        })

        const workspaces = memberships.map((m) => ({
            id: m.workspace.id,
            name: m.workspace.name,
            slug: m.workspace.slug,
            description: m.workspace.description,
            logo: m.workspace.logo,
            ownerId: m.workspace.ownerId,
            owner: m.workspace.owner,
            _count: m.workspace._count,
            createdAt: m.workspace.createdAt,
            role: m.role,
        }))

        return NextResponse.json({ workspaces })
    } catch (error) {
        console.error('Error fetching workspaces:', error)
        return NextResponse.json(
            { error: 'Failed to fetch workspaces' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name, description } = await request.json()

        if (!name) {
            return NextResponse.json(
                { error: 'Name is required' },
                { status: 400 }
            )
        }

        // Auto-generate slug from name
        const baseSlug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')

        // Check if slug exists and make it unique if needed
        let slug = baseSlug
        let counter = 1
        while (await prisma.workspace.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`
            counter++
        }

        // Create workspace and add user as admin
        const workspace = await prisma.workspace.create({
            data: {
                name,
                slug,
                description: description || null,
                ownerId: session.user.id,
                members: {
                    create: {
                        userId: session.user.id,
                        role: 'ADMIN',
                    },
                },
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        cases: true,
                        members: true,
                    },
                },
            },
        })

        // Set as default workspace if user doesn't have one
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { defaultWorkspaceId: true },
        })

        if (!user?.defaultWorkspaceId) {
            await prisma.user.update({
                where: { id: session.user.id },
                data: {
                    defaultWorkspaceId: workspace.id,
                },
            })
        }

        return NextResponse.json({ workspace }, { status: 201 })
    } catch (error) {
        console.error('Error creating workspace:', error)
        return NextResponse.json(
            { error: 'Failed to create workspace' },
            { status: 500 }
        )
    }
}
