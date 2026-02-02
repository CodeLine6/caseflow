'use client'

import { useEffect, useState } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatRelativeTime } from '@/lib/utils'
import {
    Briefcase,
    Scale,
    Calendar,
    FileText,
    Clock,
    ArrowUpRight,
    Plus,
    TrendingUp,
    TrendingDown,
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
    totalCases: number
    activeCases: number
    upcomingHearings: number
    totalDocuments: number
}

interface StatsChanges {
    totalCases: number | null
    activeCases: number | null
    upcomingHearings: number | null
    totalDocuments: number | null
}

interface RecentCase {
    id: string
    title: string
    caseNumber: string
    status: string
    priority: string
    clientName: string
    updatedAt: string
}

interface TodayHearing {
    id: string
    hearingTime: string
    hearingType: string
    courtNumber: string
    case: {
        id: string
        title: string
        caseNumber: string
    }
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats>({
        totalCases: 0,
        activeCases: 0,
        upcomingHearings: 0,
        totalDocuments: 0,
    })
    const [changes, setChanges] = useState<StatsChanges>({
        totalCases: null,
        activeCases: null,
        upcomingHearings: null,
        totalDocuments: null,
    })
    const [recentCases, setRecentCases] = useState<RecentCase[]>([])
    const [todayHearings, setTodayHearings] = useState<TodayHearing[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                // Fetch stats with change percentages
                const [statsRes, casesRes, hearingsRes] = await Promise.all([
                    fetch('/api/stats'),
                    fetch('/api/cases'),
                    fetch('/api/hearings'),
                ])

                const statsData = await statsRes.json()
                const casesData = await casesRes.json()
                const hearingsData = await hearingsRes.json()

                // Set stats and changes from API
                if (statsData.stats) {
                    setStats(statsData.stats)
                }
                if (statsData.changes) {
                    setChanges(statsData.changes)
                }

                const cases = casesData.cases || []
                const hearings = hearingsData.hearings || []

                // Set recent cases (last 5, sorted by updatedAt)
                const sortedCases = [...cases]
                    .sort((a: { updatedAt: string }, b: { updatedAt: string }) =>
                        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                    )
                    .slice(0, 5)
                    .map((c: { id: string; title: string; caseNumber: string; status: string; priority: string; client: { name: string } | null; updatedAt: string }) => ({
                        id: c.id,
                        title: c.title,
                        caseNumber: c.caseNumber,
                        status: c.status,
                        priority: c.priority,
                        clientName: c.client?.name || 'No Client',
                        updatedAt: c.updatedAt,
                    }))
                setRecentCases(sortedCases)

                // Filter today's hearings
                const todayStart = new Date()
                todayStart.setHours(0, 0, 0, 0)
                const todayEnd = new Date()
                todayEnd.setHours(23, 59, 59, 999)

                const todaysHearings = hearings
                    .filter((h: { hearingDate: string }) => {
                        const hearingDate = new Date(h.hearingDate)
                        return hearingDate >= todayStart && hearingDate <= todayEnd
                    })
                    .map((h: { id: string; hearingDate: string; purpose: string; court: { courtName: string } | null; case: { id: string; title: string; caseNumber: string } }) => ({
                        id: h.id,
                        hearingTime: new Date(h.hearingDate).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit'
                        }),
                        hearingType: h.purpose || 'HEARING',
                        courtNumber: h.court?.courtName || 'TBD',
                        case: {
                            id: h.case.id,
                            title: h.case.title,
                            caseNumber: h.case.caseNumber,
                        },
                    }))
                setTodayHearings(todaysHearings)
            } catch (error) {
                console.error('Failed to load dashboard:', error)
            } finally {
                setLoading(false)
            }
        }

        loadDashboard()
    }, [])

    const statCards = [
        {
            title: 'Total Cases',
            value: stats.totalCases,
            icon: Briefcase,
            color: 'from-indigo-500 to-purple-500',
            change: changes.totalCases,
            changeType: 'percent' as const,
        },
        {
            title: 'Active Cases',
            value: stats.activeCases,
            icon: Scale,
            color: 'from-emerald-500 to-teal-500',
            change: changes.activeCases,
            changeType: 'percent' as const,
        },
        {
            title: 'Upcoming Hearings',
            value: stats.upcomingHearings,
            icon: Calendar,
            color: 'from-amber-500 to-orange-500',
            change: changes.upcomingHearings,
            changeType: 'number' as const,
        },
        {
            title: 'Documents',
            value: stats.totalDocuments,
            icon: FileText,
            color: 'from-cyan-500 to-blue-500',
            change: changes.totalDocuments,
            changeType: 'number' as const,
        },
    ]

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            ACTIVE: 'default',
            PENDING: 'secondary',
            CLOSED: 'outline',
        }
        return variants[status] || 'default'
    }

    if (loading) {
        return (
            <MainLayout>
                <div className="space-y-6 animate-pulse">
                    <div className="h-8 w-48 bg-secondary rounded-lg" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-32 bg-secondary rounded-xl" />
                        ))}
                    </div>
                </div>
            </MainLayout>
        )
    }

    return (
        <MainLayout>
            <div className="space-y-8 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Dashboard</h1>
                        <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening today.</p>
                    </div>
                    <Link href="/cases/new">
                        <Button className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
                            <Plus className="w-4 h-4" />
                            New Case
                        </Button>
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((stat, index) => (
                        <Card key={stat.title} className={cn("animate-fade-in-up transition-all hover:-translate-y-1 hover:shadow-lg")} style={{ animationDelay: `${index * 100}ms` }}>
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">{stat.title}</p>
                                        <p className="text-3xl font-bold mt-2">{stat.value}</p>
                                        {stat.change !== null && stat.change !== undefined && (
                                            <div className={cn(
                                                "flex items-center gap-1 mt-2 text-sm",
                                                stat.change > 0 ? "text-green-500" : stat.change < 0 ? "text-red-500" : "text-muted-foreground"
                                            )}>
                                                {stat.change > 0 ? (
                                                    <TrendingUp className="w-3 h-3" />
                                                ) : stat.change < 0 ? (
                                                    <TrendingDown className="w-3 h-3" />
                                                ) : null}
                                                {stat.change > 0 ? '+' : ''}{stat.change}{stat.changeType === 'percent' ? '%' : ''}
                                                <span className="text-xs text-muted-foreground ml-1">vs last week</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                                        <stat.icon className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Cases */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Recent Cases</CardTitle>
                            <Link href="/cases">
                                <Button variant="ghost" size="sm" className="gap-1">
                                    View All
                                    <ArrowUpRight className="w-3 h-3" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            {recentCases.length > 0 ? (
                                <div className="space-y-4">
                                    {recentCases.map((caseItem) => (
                                        <Link
                                            key={caseItem.id}
                                            href={`/cases/${caseItem.id}`}
                                            className="block p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-all duration-200 hover:-translate-y-0.5"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <p className="font-medium">{caseItem.title}</p>
                                                    <p className="text-sm text-muted-foreground">{caseItem.caseNumber}</p>
                                                </div>
                                                <Badge variant={getStatusBadge(caseItem.status)}>
                                                    {caseItem.status}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                                                <span>{caseItem.clientName}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatRelativeTime(caseItem.updatedAt)}
                                                </span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <Briefcase className="w-12 h-12 text-muted-foreground/50 mb-3" />
                                    <p className="text-muted-foreground">No cases yet</p>
                                    <p className="text-sm text-muted-foreground/70 mt-1">Create your first case to get started</p>
                                    <Link href="/cases/new" className="mt-4">
                                        <Button size="sm" variant="outline" className="gap-1">
                                            <Plus className="w-3 h-3" />
                                            New Case
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Today's Hearings */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Today's Hearings</CardTitle>
                            <Link href="/cause-list">
                                <Button variant="ghost" size="sm" className="gap-1">
                                    View All
                                    <ArrowUpRight className="w-3 h-3" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            {todayHearings.length > 0 ? (
                                <div className="space-y-4">
                                    {todayHearings.map((hearing) => (
                                        <div
                                            key={hearing.id}
                                            className="p-4 rounded-lg bg-secondary/50 border-l-4 border-primary"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <p className="font-medium">{hearing.case.title}</p>
                                                    <p className="text-sm text-muted-foreground">{hearing.case.caseNumber}</p>
                                                </div>
                                                <Badge variant="secondary">{hearing.hearingType}</Badge>
                                            </div>
                                            <div className="flex items-center gap-4 mt-3 text-sm">
                                                <span className="flex items-center gap-1 text-primary font-medium">
                                                    <Clock className="w-3 h-3" />
                                                    {hearing.hearingTime}
                                                </span>
                                                <span className="text-muted-foreground">{hearing.courtNumber}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Calendar className="w-12 h-12 mx-auto opacity-50 mb-3" />
                                    <p>No hearings scheduled for today</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </MainLayout>
    )
}

