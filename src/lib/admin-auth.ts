import { prisma } from './prisma'
import { hashPassword, verifyPassword } from './auth'

export interface AdminSession {
    id: string
    email: string
    name: string
    role: 'SUPER_ADMIN' | 'ADMIN'
}

/**
 * Authenticate admin credentials
 */
export async function authenticateAdmin(
    email: string,
    password: string
): Promise<AdminSession | null> {
    const admin = await prisma.admin.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            isActive: true,
        },
    })

    if (!admin || !admin.isActive) {
        return null
    }

    const isValid = await verifyPassword(password, admin.password)
    if (!isValid) {
        return null
    }

    return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
    }
}

/**
 * Get admin by ID
 */
export async function getAdminById(id: string): Promise<AdminSession | null> {
    const admin = await prisma.admin.findUnique({
        where: { id },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
        },
    })

    if (!admin || !admin.isActive) {
        return null
    }

    return {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
    }
}

/**
 * Check if user has admin access
 */
export async function isAdmin(adminId: string): Promise<boolean> {
    const admin = await prisma.admin.findUnique({
        where: { id: adminId },
        select: { isActive: true },
    })
    return admin?.isActive ?? false
}
