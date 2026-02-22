'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, Activity, Loader2 } from 'lucide-react'

interface DashboardStats {
    totalCourts: number
    totalUsers: number
    courtsWithDisplayBoards: number
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        try {
            const response = await fetch('/api/admin/stats')

            if (!response.ok) {
                throw new Error('Failed to fetch stats')
            }

            const data = await response.json()
            setStats(data)
        } catch (error) {
            console.error('Failed to fetch stats:', error)
            setStats(null)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        )
    }
    if (!stats) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="text-red-500 text-center">
                    <p className="font-semibold">Failed to load dashboard statistics</p>
                    <p className="text-sm text-muted-foreground mt-1">Please check your connection and try again</p>
                </div>
                <button
                    onClick={() => { setLoading(true); fetchStats() }}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                >
                    Retry
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground mt-1">System overview and statistics</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Courts</CardTitle>
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalCourts || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Courts in system
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Active users
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Display Boards</CardTitle>
                        <Activity className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.courtsWithDisplayBoards || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            With display board URLs
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Welcome Message */}
            <Card>
                <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-2">Welcome to CaseFlow Admin Portal</h2>
                    <p className="text-muted-foreground">
                        Use the navigation above to manage courts and system settings.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
