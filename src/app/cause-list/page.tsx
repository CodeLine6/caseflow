'use client'

import { useState, useEffect } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    MapPin,
    Briefcase,
    Scale,
    Users,
    AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { format, addDays, subDays, isToday, isSameDay, parseISO } from 'date-fns'
import DisplayBoard from '@/components/DisplayBoard'

interface Hearing {
    id: string
    hearingDate: string
    hearingTime: string | null
    hearingType: string
    status: string
    courtNumber: string
    description: string | null
    case: {
        id: string
        caseNumber: string
        title: string
        priority: string
        court: {
            id: string
            courtName: string
            courtType: string
            city: string | null
        } | null
        client: {
            id: string
            name: string
        } | null
    }
}

const priorityColors: Record<string, string> = {
    HIGH: 'border-l-red-500',
    MEDIUM: 'border-l-yellow-500',
    LOW: 'border-l-green-500',
    URGENT: 'border-l-purple-500',
}

const statusBadgeVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    SCHEDULED: 'default',
    COMPLETED: 'secondary',
    ADJOURNED: 'outline',
    CANCELLED: 'destructive',
}

export default function CauseListPage() {
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [hearings, setHearings] = useState<Hearing[]>([])
    const [hearingsByDate, setHearingsByDate] = useState<Record<string, number>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchCauseList()
    }, [selectedDate])

    const fetchCauseList = async () => {
        try {
            setLoading(true)
            setError(null)
            const dateStr = format(selectedDate, 'yyyy-MM-dd')
            const response = await fetch(`/api/cause-list?date=${dateStr}`)

            if (!response.ok) {
                throw new Error('Failed to fetch cause list')
            }

            const data = await response.json()
            setHearings(data.hearings || [])
            setHearingsByDate(data.hearingsByDate || {})
        } catch (err) {
            console.error('Error fetching cause list:', err)
            setError('Failed to load cause list')
        } finally {
            setLoading(false)
        }
    }

    const goToPreviousDay = () => setSelectedDate(prev => subDays(prev, 1))
    const goToNextDay = () => setSelectedDate(prev => addDays(prev, 1))
    const goToToday = () => setSelectedDate(new Date())

    // Generate week dates for the mini calendar strip
    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(subDays(selectedDate, 3), i))

    const formatHearingTime = (time: string | null) => {
        if (!time) return 'Time TBD'
        return time
    }

    return (
        <MainLayout>
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Calendar className="w-8 h-8 text-primary" />
                            Cause List
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            View scheduled hearings and court appearances
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={goToToday}
                        className={cn(isToday(selectedDate) && 'bg-primary/10')}
                    >
                        Today
                    </Button>
                </div>

                {/* Date Navigator */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <Button variant="ghost" size="icon" onClick={goToPreviousDay}>
                                <ChevronLeft className="w-5 h-5" />
                            </Button>

                            <div className="flex items-center gap-2">
                                {weekDates.map((date) => {
                                    const dateKey = format(date, 'yyyy-MM-dd')
                                    const count = hearingsByDate[dateKey] || 0
                                    const isSelected = isSameDay(date, selectedDate)
                                    const today = isToday(date)

                                    return (
                                        <button
                                            key={dateKey}
                                            onClick={() => setSelectedDate(date)}
                                            className={cn(
                                                'flex flex-col items-center p-3 rounded-xl transition-all min-w-[70px]',
                                                isSelected
                                                    ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                                                    : 'hover:bg-secondary',
                                                today && !isSelected && 'ring-2 ring-primary/50'
                                            )}
                                        >
                                            <span className="text-xs font-medium opacity-70">
                                                {format(date, 'EEE')}
                                            </span>
                                            <span className="text-xl font-bold mt-1">
                                                {format(date, 'd')}
                                            </span>
                                            {count > 0 && (
                                                <span className={cn(
                                                    'text-xs mt-1 px-2 py-0.5 rounded-full',
                                                    isSelected
                                                        ? 'bg-primary-foreground/20'
                                                        : 'bg-primary/10 text-primary'
                                                )}>
                                                    {count} {count === 1 ? 'hearing' : 'hearings'}
                                                </span>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>

                            <Button variant="ghost" size="icon" onClick={goToNextDay}>
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="text-center mt-4 text-lg font-semibold">
                            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                        </div>
                    </CardContent>
                </Card>

                {/* Two-column layout: Hearings + Display Board (for today only) */}
                <div className={cn(
                    'grid gap-6',
                    isToday(selectedDate) ? 'lg:grid-cols-[1fr_400px]' : 'grid-cols-1'
                )}>
                    {/* Hearings List */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Scale className="w-5 h-5 text-muted-foreground" />
                            Hearings for {format(selectedDate, 'MMMM d, yyyy')}
                            {hearings.length > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {hearings.length} {hearings.length === 1 ? 'hearing' : 'hearings'}
                                </Badge>
                            )}
                        </h2>

                        {loading ? (
                            <div className="space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <Card key={i} className="animate-pulse">
                                        <CardContent className="p-6">
                                            <div className="h-6 w-48 bg-secondary rounded mb-3" />
                                            <div className="h-4 w-32 bg-secondary rounded mb-2" />
                                            <div className="h-4 w-64 bg-secondary rounded" />
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : error ? (
                            <Card>
                                <CardContent className="p-8 text-center">
                                    <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                                    <p className="text-destructive">{error}</p>
                                    <Button variant="outline" className="mt-4" onClick={fetchCauseList}>
                                        Try Again
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : hearings.length === 0 ? (
                            <Card>
                                <CardContent className="p-12 text-center">
                                    <Calendar className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium mb-2">No hearings scheduled</h3>
                                    <p className="text-muted-foreground mb-4">
                                        There are no court hearings scheduled for {format(selectedDate, 'MMMM d, yyyy')}
                                    </p>
                                    <Link href="/hearings/new">
                                        <Button variant="outline">Schedule a Hearing</Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {hearings.map((hearing) => (
                                    <Card
                                        key={hearing.id}
                                        className={cn(
                                            'border-l-4 hover:shadow-lg transition-all',
                                            priorityColors[hearing.case.priority] || 'border-l-gray-500'
                                        )}
                                    >
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-start gap-4">
                                                        {/* Time */}
                                                        <div className="flex flex-col items-center min-w-[80px] p-3 bg-secondary/50 rounded-lg">
                                                            <Clock className="w-5 h-5 text-primary mb-1" />
                                                            <span className="text-lg font-bold">
                                                                {formatHearingTime(hearing.hearingTime)}
                                                            </span>
                                                        </div>

                                                        {/* Details */}
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Badge variant="outline" className="font-mono">
                                                                    {hearing.case.caseNumber}
                                                                </Badge>
                                                                <Badge variant={statusBadgeVariants[hearing.status] || 'secondary'}>
                                                                    {hearing.status}
                                                                </Badge>
                                                            </div>

                                                            <Link
                                                                href={`/cases/${hearing.case.id}`}
                                                                className="text-lg font-semibold hover:text-primary transition-colors"
                                                            >
                                                                {hearing.case.title}
                                                            </Link>

                                                            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                                                                {hearing.case.court && (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <MapPin className="w-4 h-4" />
                                                                        <span>
                                                                            {hearing.case.court.courtName}
                                                                            {hearing.case.court.city && `, ${hearing.case.court.city}`}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                <div className="flex items-center gap-1.5">
                                                                    <Briefcase className="w-4 h-4" />
                                                                    <span>Court #{hearing.courtNumber}</span>
                                                                </div>

                                                                {hearing.case.client && (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Users className="w-4 h-4" />
                                                                        <span>{hearing.case.client.name}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {hearing.description && (
                                                                <p className="mt-3 text-sm text-muted-foreground">
                                                                    {hearing.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <Badge
                                                        className={cn(
                                                            'justify-center',
                                                            hearing.case.priority === 'HIGH' && 'bg-red-500/10 text-red-500',
                                                            hearing.case.priority === 'URGENT' && 'bg-purple-500/10 text-purple-500',
                                                            hearing.case.priority === 'MEDIUM' && 'bg-yellow-500/10 text-yellow-500',
                                                            hearing.case.priority === 'LOW' && 'bg-green-500/10 text-green-500'
                                                        )}
                                                    >
                                                        {hearing.case.priority}
                                                    </Badge>
                                                    <Badge variant="secondary">{hearing.hearingType}</Badge>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Display Board - Only show for today */}
                    {isToday(selectedDate) && (
                        <div className="lg:sticky lg:top-6 h-fit">
                            <DisplayBoard />
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    )
}
