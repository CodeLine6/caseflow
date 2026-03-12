'use client'

import { getSafeErrorMessage } from '@/lib/api-error'
import { formatTime12h } from '@/lib/timezone'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import {
    Calendar, Plus, Clock, Scale, Briefcase, Gavel, User,
    Loader2, AlertCircle, CheckCircle, ArrowLeft, Users
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PermissionGate } from '@/components/PermissionGate'

type Hearing = {
    id: string
    hearingDate: string
    hearingTime: string | null
    hearingType: string
    purpose: string
    description: string | null
    status: string
    courtNumber: string
    courtItemNumber: string | null
    judgeName: string | null
    notes: string | null
    outcome: string | null
    orderLink: string | null
    additionalRemarks: string | null
    case: {
        id: string
        title: string
        caseNumber: string
        court?: { courtName: string } | null
    }
    hearingCounsel?: {
        id: string
        user: { name: string }
        role: string
    } | null
    attendance?: Array<{
        memberId: string
        attended: boolean
        member: { user: { name: string }; role: string }
    }>
}

const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-500/10 text-blue-400',
    COMPLETED: 'bg-green-500/10 text-green-400',
    ADJOURNED: 'bg-amber-500/10 text-amber-400',
    POSTPONED: 'bg-amber-500/10 text-amber-400',
    CANCELLED: 'bg-red-500/10 text-red-400',
}

const typeLabels: Record<string, string> = {
    PRELIMINARY: 'Preliminary',
    EVIDENCE: 'Evidence',
    ARGUMENT: 'Argument',
    FINAL: 'Final',
    INTERIM: 'Interim',
    OTHER: 'Other',
}

export default function HearingsPage() {
    const router = useRouter()
    const [hearings, setHearings] = useState<Hearing[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showUpcoming, setShowUpcoming] = useState(false)

    useEffect(() => {
        fetchHearings()
    }, [showUpcoming])

    const fetchHearings = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            const wsId = localStorage.getItem('activeWorkspaceId')
            if (wsId) params.append('workspaceId', wsId)
            if (showUpcoming) params.append('upcoming', 'true')

            const res = await fetch(`/api/hearings?${params.toString()}`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setHearings(data.hearings)
        } catch (err) {
            setError(getSafeErrorMessage(err))
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
            timeZone: 'Asia/Kolkata',
        })
    }

    const formatTime = (date: string) => {
        return new Date(date).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Kolkata',
        })
    }

    // Group by date
    const groupedHearings = hearings.reduce((acc, h) => {
        const date = new Date(h.hearingDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
        if (!acc[date]) acc[date] = []
        acc[date].push(h)
        return acc
    }, {} as Record<string, Hearing[]>)

    return (
        <MainLayout>
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
                                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary to-accent flex items-center justify-center">
                                    <Calendar className="w-5 h-5 text-white" />
                                </div>
                                Hearings
                            </h1>
                            <p className="text-muted-foreground mt-1">Track all your court hearings</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                            All Dates
                        </Button>
                        <PermissionGate permission="hearings.create">
                            <Button
                                onClick={() => router.push('/hearings/new')}
                                size="sm"
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                Schedule Hearing
                            </Button>
                        </PermissionGate>
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
                                    <p className="text-2xl font-bold">{hearings.filter(h => h.status === 'ADJOURNED' || h.status === 'POSTPONED').length}</p>
                                    <p className="text-xs text-muted-foreground">Adjourned / Postponed</p>
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
                            <p className="text-muted-foreground mb-4">
                                {showUpcoming ? 'No upcoming hearings scheduled.' : 'No hearings recorded yet.'}
                            </p>
                            <Button onClick={() => router.push('/hearings/new')}>
                                <Plus className="w-4 h-4 mr-1" />
                                Schedule First Hearing
                            </Button>
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
                                                        <div className="w-16 text-center flex-shrink-0">
                                                            <p className="text-lg font-bold text-primary">
                                                                {formatTime12h(hearing.hearingTime) || formatTime(hearing.hearingDate)}
                                                            </p>
                                                            <Badge variant="outline" className="text-[10px] mt-1">
                                                                {typeLabels[hearing.hearingType] || hearing.hearingType}
                                                            </Badge>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <h4 className="font-semibold">{hearing.purpose || hearing.description || `${hearing.hearingType} Hearing`}</h4>
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                <Briefcase className="w-4 h-4 flex-shrink-0" />
                                                                <span>{hearing.case.caseNumber} - {hearing.case.title}</span>
                                                            </div>
                                                            {hearing.case.court && (
                                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                    <Scale className="w-4 h-4 flex-shrink-0" />
                                                                    <span>{hearing.case.court.courtName}</span>
                                                                    {hearing.courtNumber && (
                                                                        <span className="text-xs">• Court {hearing.courtNumber}</span>
                                                                    )}
                                                                    {hearing.courtItemNumber && (
                                                                        <span className="text-xs">• Item {hearing.courtItemNumber}</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {!hearing.case.court && hearing.courtNumber && (
                                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                    <Scale className="w-4 h-4 flex-shrink-0" />
                                                                    <span>Court {hearing.courtNumber}</span>
                                                                    {hearing.courtItemNumber && (
                                                                        <span className="text-xs">• Item {hearing.courtItemNumber}</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className="flex flex-wrap gap-3 mt-1">
                                                                {hearing.judgeName && (
                                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                        <Gavel className="w-3.5 h-3.5 flex-shrink-0" />
                                                                        <span>{hearing.judgeName}</span>
                                                                    </div>
                                                                )}
                                                                {hearing.hearingCounsel && (
                                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                        <User className="w-3.5 h-3.5 flex-shrink-0" />
                                                                        <span>{hearing.hearingCounsel.user.name}</span>
                                                                    </div>
                                                                )}
                                                                {hearing.attendance && hearing.attendance.length > 0 && (
                                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                        <Users className="w-3.5 h-3.5 flex-shrink-0" />
                                                                        <span>{hearing.attendance.length} attending</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {hearing.outcome && (
                                                                <p className="text-xs text-green-400 mt-1">
                                                                    Outcome: {hearing.outcome}
                                                                </p>
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
        </MainLayout>
    )
}
