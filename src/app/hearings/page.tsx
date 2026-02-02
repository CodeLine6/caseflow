'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Calendar, Plus, Clock, Scale, Briefcase,
    Loader2, AlertCircle, CheckCircle, ArrowLeft
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Hearing = {
    id: string
    hearingDate: string
    purpose: string
    status: string
    notes: string | null
    case: { id: string; title: string; caseNumber: string }
    court: { id: string; courtName: string } | null
}

const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-500/10 text-blue-400',
    COMPLETED: 'bg-green-500/10 text-green-400',
    ADJOURNED: 'bg-amber-500/10 text-amber-400',
    CANCELLED: 'bg-red-500/10 text-red-400',
}

export default function HearingsPage() {
    const router = useRouter()
    const [hearings, setHearings] = useState<Hearing[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showUpcoming, setShowUpcoming] = useState(true)

    useEffect(() => {
        fetchHearings()
    }, [showUpcoming])

    const fetchHearings = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (showUpcoming) params.append('upcoming', 'true')

            const res = await fetch(`/api/hearings?${params.toString()}`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setHearings(data.hearings)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-IN', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
    }

    const formatTime = (date: string) => {
        return new Date(date).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    // Group by date
    const groupedHearings = hearings.reduce((acc, h) => {
        const date = new Date(h.hearingDate).toDateString()
        if (!acc[date]) acc[date] = []
        acc[date].push(h)
        return acc
    }, {} as Record<string, Hearing[]>)

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/dashboard')}
                        className="rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-white" />
                            </div>
                            Hearings
                        </h1>
                        <p className="text-muted-foreground mt-1">Track all your court hearings</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={showUpcoming ? 'default' : 'outline'}
                        onClick={() => setShowUpcoming(true)}
                        size="sm"
                    >
                        Upcoming
                    </Button>
                    <Button
                        variant={!showUpcoming ? 'default' : 'outline'}
                        onClick={() => setShowUpcoming(false)}
                        size="sm"
                    >
                        All
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card className="glass-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{hearings.length}</p>
                                <p className="text-xs text-muted-foreground">Total Hearings</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{hearings.filter(h => h.status === 'SCHEDULED').length}</p>
                                <p className="text-xs text-muted-foreground">Scheduled</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{hearings.filter(h => h.status === 'COMPLETED').length}</p>
                                <p className="text-xs text-muted-foreground">Completed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{hearings.filter(h => h.status === 'ADJOURNED').length}</p>
                                <p className="text-xs text-muted-foreground">Adjourned</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : error ? (
                <Card className="glass-card">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                        <p className="text-destructive">{error}</p>
                    </CardContent>
                </Card>
            ) : hearings.length === 0 ? (
                <Card className="glass-card">
                    <CardContent className="p-12 text-center">
                        <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-semibold mb-2">No hearings found</h3>
                        <p className="text-muted-foreground">
                            {showUpcoming ? 'No upcoming hearings scheduled.' : 'No hearings recorded yet.'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedHearings).map(([date, dayHearings]) => (
                        <div key={date}>
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-primary" />
                                {formatDate(dayHearings[0].hearingDate)}
                            </h3>
                            <div className="space-y-3">
                                {dayHearings.map(hearing => (
                                    <Card
                                        key={hearing.id}
                                        className="glass-card hover:border-primary/30 transition-all cursor-pointer"
                                        onClick={() => router.push(`/cases/${hearing.case.id}`)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-16 text-center">
                                                        <p className="text-lg font-bold text-primary">{formatTime(hearing.hearingDate)}</p>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold">{hearing.purpose}</h4>
                                                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                                            <Briefcase className="w-4 h-4" />
                                                            <span>{hearing.case.caseNumber} - {hearing.case.title}</span>
                                                        </div>
                                                        {hearing.court && (
                                                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                                                <Scale className="w-4 h-4" />
                                                                <span>{hearing.court.courtName}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <Badge className={statusColors[hearing.status] || statusColors.SCHEDULED}>
                                                    {hearing.status}
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
