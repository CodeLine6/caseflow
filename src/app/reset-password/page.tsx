'use client'

import { getSafeErrorMessage } from '@/lib/api-error'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Briefcase, Lock, AlertCircle, CheckCircle, Check } from 'lucide-react'

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Lock className="w-8 h-8 animate-pulse text-primary" /></div>}>
            <ResetPasswordContent />
        </Suspense>
    )
}

function ResetPasswordContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        if (!token) {
            setError('Invalid or missing reset token')
        }
    }, [token])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            setLoading(false)
            return
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters')
            setLoading(false)
            return
        }

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reset password')
            }

            setSuccess(true)
            setTimeout(() => {
                router.push('/login')
            }, 2000)
        } catch (err) {
            setError(getSafeErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const passwordRequirements = [
        { text: 'At least 8 characters', met: password.length >= 8 },
        { text: 'Contains a number', met: /\d/.test(password) },
        { text: 'Passwords match', met: password === confirmPassword && confirmPassword.length > 0 },
    ]

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/20">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-destructive">Invalid Reset Link</p>
                                <p className="text-sm text-muted-foreground">
                                    This password reset link is invalid or has expired. Please request a new one.
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 text-center">
                            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                                Request New Reset Link
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/20">
            {/* Background decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
            </div>

            <Card className="w-full max-w-md relative animate-fade-in-up">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <Briefcase className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl">Reset Your Password</CardTitle>
                        <CardDescription className="mt-2">
                            Enter your new password below
                        </CardDescription>
                    </div>
                </CardHeader>

                <CardContent>
                    {success ? (
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-green-500">Password Reset Successful!</p>
                                    <p className="text-sm text-muted-foreground">
                                        Your password has been reset. Redirecting to login page...
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-sm text-destructive">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        type="password"
                                        placeholder="Create a strong password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Confirm Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        type="password"
                                        placeholder="Confirm your new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password requirements */}
                            <div className="space-y-1.5">
                                {passwordRequirements.map((req, i) => (
                                    <div key={i} className={`flex items-center gap-2 text-xs ${req.met ? 'text-green-500' : 'text-muted-foreground'}`}>
                                        <Check className={`w-3 h-3 ${req.met ? 'opacity-100' : 'opacity-30'}`} />
                                        {req.text}
                                    </div>
                                ))}
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                variant="gradient"
                                disabled={loading}
                            >
                                {loading ? 'Resetting Password...' : 'Reset Password'}
                            </Button>

                            <div className="text-center text-sm text-muted-foreground pt-2">
                                Remember your password?{' '}
                                <Link href="/login" className="text-primary hover:underline font-medium">
                                    Sign in
                                </Link>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
