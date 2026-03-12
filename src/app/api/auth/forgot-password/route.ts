import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const email = body.email?.toLowerCase().trim()

        // Validation
        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            )
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email },
        })

        // For security, always return success even if user doesn't exist
        // This prevents email enumeration attacks
        if (!user) {
            return NextResponse.json(
                { message: 'If an account exists with this email, a password reset link has been sent.' },
                { status: 200 }
            )
        }

        // Generate secure reset token
        const resetToken = crypto.randomBytes(32).toString('hex')
        const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

        // Store reset token in database
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpiry,
            },
        })

        // Send password reset email
        await sendPasswordResetEmail({
            email: user.email,
            resetToken,
            name: user.name,
        })

        return NextResponse.json(
            { message: 'If an account exists with this email, a password reset link has been sent.' },
            { status: 200 }
        )
    } catch (error) {
        console.error('Forgot password error:', error)
        return NextResponse.json(
            { error: 'An error occurred while processing your request' },
            { status: 500 }
        )
    }
}
