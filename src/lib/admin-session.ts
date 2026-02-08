import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { getAdminById } from '@/lib/admin-auth'

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'admin-secret-key')

/**
 * Get current admin session from cookie
 */
export async function getAdminSession() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('admin-token')?.value

        if (!token) {
            return null
        }

        // Verify JWT
        const { payload } = await jwtVerify(token, JWT_SECRET)

        if (payload.type !== 'admin') {
            return null
        }

        // Get fresh admin data
        const admin = await getAdminById(payload.id as string)
        return admin
    } catch (error) {
        console.error('Error getting admin session:', error)
        return null
    }
}

/**
 * Require admin authentication for API routes
 */
export async function requireAdmin() {
    const admin = await getAdminSession()
    
    if (!admin) {
        return NextResponse.json(
            { error: 'Admin authentication required' },
            { status: 401 }
        )
    }
    
    return admin
}
