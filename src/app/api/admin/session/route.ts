import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { getAdminById } from '@/lib/admin-auth'

if (!process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET environment variable is required')
}
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)

export async function GET() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('admin-token')?.value

        if (!token) {
            return NextResponse.json({ admin: null }, { status: 200 })
        }

        // Verify JWT
        const { payload } = await jwtVerify(token, JWT_SECRET)

        if (payload.type !== 'admin') {
            return NextResponse.json({ admin: null }, { status: 200 })
        }

        // Get fresh admin data
        const admin = await getAdminById(payload.id as string)

        if (!admin) {
            return NextResponse.json({ admin: null }, { status: 200 })
        }

        return NextResponse.json({ admin })
    } catch (error) {
        console.error('Admin session error:', error)
        return NextResponse.json({ admin: null }, { status: 200 })
    }
}
