import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { getServerSession } from 'next-auth'
import type { NextAuthOptions, Session } from 'next-auth'
import type { WorkspaceRole } from '@prisma/client'
import CredentialsProvider from 'next-auth/providers/credentials'

// Shared auth options for NextAuth - used by API routes and server components
export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Please enter email and password')
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    include: {
                        workspaces: {
                            include: {
                                workspace: {
                                    select: {
                                        id: true,
                                        name: true,
                                        slug: true,
                                    },
                                },
                            },
                        },
                    },
                })

                if (!user || !user.isActive) {
                    throw new Error('Invalid credentials or account is inactive')
                }

                const isValid = await bcrypt.compare(credentials.password, user.password)

                if (!isValid) {
                    throw new Error('Invalid credentials')
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.avatar,
                    defaultWorkspaceId: user.defaultWorkspaceId,
                }
            },
        }),
    ],
    pages: {
        signIn: '/login',
        error: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id
                token.defaultWorkspaceId = user.defaultWorkspaceId
            }

            if (trigger === 'update' && session?.defaultWorkspaceId) {
                token.defaultWorkspaceId = session.defaultWorkspaceId
            }

            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string
                session.user.defaultWorkspaceId = token.defaultWorkspaceId as string | null
            }
            return session
        },
    },
    events: {
        async signIn({ user }) {
            if (user.id) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { updatedAt: new Date() },
                })
            }
        },
    },
    debug: process.env.NODE_ENV === 'development',
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
}

export async function createUser(email: string, password: string, name: string) {
    const hashedPassword = await hashPassword(password)

    return prisma.user.create({
        data: {
            email,
            password: hashedPassword,
            name,
        },
    })
}

export async function getUserByEmail(email: string) {
    return prisma.user.findUnique({
        where: { email },
    })
}

export async function getUserById(id: string) {
    return prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            specialization: true,
            contactNumber: true,
            isActive: true,
            defaultWorkspaceId: true,
            createdAt: true,
        },
    })
}

// Get the current user's session and workspace context
export async function getAuth(authOptions: NextAuthOptions): Promise<{
    userId: string | null
    workspaceId: string | null
    session: Session | null
}> {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
        return { userId: null, workspaceId: null, session: null }
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { defaultWorkspaceId: true },
    })

    return {
        userId: session.user.id,
        workspaceId: user?.defaultWorkspaceId ?? null,
        session,
    }
}

// Get user's role in a specific workspace
export async function getUserWorkspaceRole(
    userId: string,
    workspaceId: string
): Promise<WorkspaceRole | null> {
    const member = await prisma.workspaceMember.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId,
                userId,
            },
        },
        select: { role: true },
    })

    return member?.role ?? null
}

// Check if user is a member of a workspace
export async function isWorkspaceMember(userId: string, workspaceId: string): Promise<boolean> {
    const member = await prisma.workspaceMember.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId,
                userId,
            },
        },
    })

    return !!member
}

// Get all workspaces a user belongs to
export async function getUserWorkspaces(userId: string) {
    return prisma.workspaceMember.findMany({
        where: { userId },
        include: {
            workspace: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    logo: true,
                },
            },
        },
    })
}
