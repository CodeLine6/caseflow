import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const { token, password } = await request.json()

        // Validation
        if (!token || !password) {
            return NextResponse.json(
                { error: 'Token and password are required' },
                { status: 400 }
            )
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: 'Password must be at least 8 characters' },
                { status: 400 }
            )
        }

        // Find user by reset token
        const user = await prisma.user.findUnique({
            where: { resetToken: token },
        })

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid or expired reset token' },
                { status: 400 }
            )
        }

        // Check if token has expired
        if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
            return NextResponse.json(
                { error: 'Reset token has expired. Please request a new password reset.' },
                { status: 400 }
            )
        }

        // Hash new password
        const hashedPassword = await hashPassword(password)

        // Update password and clear reset token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
            },
        })

        return NextResponse.json(
            { message: 'Password has been reset successfully. You can now log in with your new password.' },
            { status: 200 }
        )
    } catch (error) {
        console.error('Reset password error:', error)
        return NextResponse.json(
            { error: 'An error occurred while resetting your password' },
            { status: 500 }
        )
    }
}
