'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Shield, Building2, LogOut, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AdminSession {
    id: string
    email: string
    name: string
    role: 'SUPER_ADMIN' | 'ADMIN'
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const [admin, setAdmin] = useState<AdminSession | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        checkAdminSession()
    }, [])

    const checkAdminSession = async () => {
        try {
            const response = await fetch('/api/admin/session')
            const data = await response.json()

            if (!data.admin && pathname !== '/admin/login') {
                router.push('/admin/login')
                return
            }

            setAdmin(data.admin)
        } catch (error) {
            console.error('Failed to check admin session:', error)
            if (pathname !== '/admin/login') {
                router.push('/admin/login')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        try {
            await fetch('/api/admin/logout', { method: 'POST' })
            router.push('/admin/login')
            router.refresh()
        } catch (error) {
            console.error('Logout failed:', error)
        }
    }

    // Show loading state while checking session
    if (loading && pathname !== '/admin/login') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        )
    }

    // No layout for login page
    if (pathname === '/admin/login') {
        return children
    }

    // Admin layout with navigation
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b bg-gradient-to-r from-amber-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
                <div className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold">Admin Portal</h1>
                            <p className="text-xs text-muted-foreground">System Management</p>
                        </div>
                    </div>

                    {admin && (
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium">{admin.name}</p>
                                <p className="text-xs text-muted-foreground">{admin.role}</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleLogout}
                                className="gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </Button>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="px-6 pb-3">
                    <div className="flex gap-2">
                        <Link href="/admin/dashboard">
                            <Button
                                variant={pathname === '/admin/dashboard' ? 'secondary' : 'ghost'}
                                size="sm"
                            >
                                Dashboard
                            </Button>
                        </Link>
                        <Link href="/admin/courts">
                            <Button
                                variant={pathname.startsWith('/admin/courts') ? 'secondary' : 'ghost'}
                                size="sm"
                                className="gap-2"
                            >
                                <Building2 className="w-4 h-4" />
                                Courts
                            </Button>
                        </Link>
                    </div>
                </nav>
            </header>

            {/* Main Content */}
            <main className="container mx-auto p-6">
                {children}
            </main>
        </div>
    )
}
