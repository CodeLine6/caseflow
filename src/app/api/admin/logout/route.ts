import { NextResponse } from 'next/server'

// POST /api/admin/logout - Admin logout
export async function POST() {
    const response = NextResponse.json({ success: true })
    
    // Clear admin session cookie
    response.cookies.delete('admin-token')
    
    return response
}
