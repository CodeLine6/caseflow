'use client'

import { formatTime12h } from '@/lib/timezone'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import MainLayout from '@/components/layout/MainLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Briefcase,
    Scale,
    AlertCircle,
    Users,
    UserCheck,
    X,
    Loader2,
    Check,
    CheckCircle,
    Gavel,
} from 'lucide-react'
import Link from 'next/link'
import { format, addDays, subDays, isToday, isSameDay } from 'date-fns'
import DisplayBoard from '@/components/DisplayBoard'
import { usePermissions } from '@/hooks/usePermissions'
import { PermissionGate } from '@/components/PermissionGate'

interface AttendanceRecord {
    memberId: string
    attended: boolean
    member: {
        userId: string
        role: string
        user: { name: string }
    }
}

interface Hearing {
    id: string
    hearingDate: string
    hearingTime: string | null
    hearingType: string
    status: string
    courtNumber: string
    judgeName: string | null
    description: string | null
    case: {
        id: string
        caseNumber: string
        title: string
        priority: string
        workspaceId: string
        court: {
            id: string
            courtName: string
            courtType: string
            city: string | null
        } | null
    }
    hearingCounsel?: {
        id: string
        userId: string
        role: string
        user: { name: string }
    } | null
    attendance?: AttendanceRecord[]
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
    const { can } = usePermissions()
    const { data: session } = useSession()

    // Counsel attendance modal state
    const [counselModalHearing, setCounselModalHearing] = useState<Hearing | null>(null)
    const [counselSelfAttended, setCounselSelfAttended] = useState(false)
    const [accompaniedChecked, setAccompaniedChecked] = useState<Record<string, boolean>>({})
    const [outcomeForm, setOutcomeForm] = useState({ outcome: '', orderLink: '', nextDate: '', remarks: '' })
    const [modalLoading, setModalLoading] = useState(false)
    const [modalSaving, setModalSaving] = useState(false)
    const [modalError, setModalError] = useState<string | null>(null)

    // Whether the currently selected date is today
    const isTodaySelected = isToday(selectedDate)

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

    const getUserRole = (hearing: Hearing) => {
        const userId = session?.user?.id
        if (!userId) return 'none' as const
        if (hearing.hearingCounsel?.userId === userId) return 'counsel' as const
        if (hearing.attendance?.some(a => a.member.userId === userId)) return 'accompanying' as const
        return 'none' as const
    }

    const openCounselModal = (hearing: Hearing) => {
        setCounselModalHearing(hearing)
        setModalError(null)
        setModalLoading(false)
        setModalSaving(false)

        const isSelfAttended = hearing.attendance?.some(
            a => a.memberId === hearing.hearingCounsel?.id && a.attended
        ) ?? false
        setCounselSelfAttended(isSelfAttended)

        const checked: Record<string, boolean> = {}
        hearing.attendance?.forEach(a => {
            if (a.memberId !== hearing.hearingCounsel?.id) {
                checked[a.memberId] = a.attended
            }
        })
        setAccompaniedChecked(checked)
        setOutcomeForm({ outcome: '', orderLink: '', nextDate: '', remarks: '' })
    }

    const saveCounselAttendance = async () => {
        if (!counselModalHearing) return
        setModalSaving(true)
        setModalError(null)

        try {
            const accompaniedAttendance = Object.entries(accompaniedChecked)
                .map(([memberId, attended]) => ({ memberId, attended }))

            const res = await fetch(`/api/hearings/${counselModalHearing.id}/attendance`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    counselAttended: counselSelfAttended,
                    accompaniedAttendance,
                    outcome: outcomeForm.outcome || undefined,
                    orderLink: outcomeForm.orderLink || undefined,
                    nextDateOfHearing: outcomeForm.nextDate || undefined,
                    additionalRemarks: outcomeForm.remarks || undefined,
                }),
            })

            if (res.ok) {
                const data = await res.json()
                setHearings(prev => prev.map(h =>
                    h.id === counselModalHearing.id
                        ? {
                            ...h,
                            attendance: data.attendance,
                            status: data.hearing?.status || h.status,
                        }
                        : h
                ))
                setCounselModalHearing(null)
            } else {
                const data = await res.json()
                setModalError(data.error || 'Failed to save attendance')
            }
        } catch (err) {
            setModalError('Network error — please try again')
        } finally {
            setModalSaving(false)
        }
    }

    const markSelfPresent = async (hearingId: string) => {
        try {
            const res = await fetch(`/api/hearings/${hearingId}/attendance`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ markSelf: true }),
            })

            if (res.ok) {
                const data = await res.json()
                setHearings(prev => prev.map(h =>
                    h.id === hearingId ? { ...h, attendance: data.attendance } : h
                ))
            }
        } catch (err) {
            console.error('Failed to mark self present:', err)
        }
    }

    const goToPreviousDay = () => setSelectedDate(prev => subDays(prev, 1))
    const goToNextDay = () => setSelectedDate(prev => addDays(prev, 1))
    const goToToday = () => setSelectedDate(new Date())

    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(subDays(selectedDate, 3), i))

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
                        className={cn(isTodaySelected && 'bg-primary/10')}
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
                    isTodaySelected ? 'lg:grid-cols-[1fr_400px]' : 'grid-cols-1'
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
                                    <PermissionGate permission="hearings.create">
                                        <Link href="/hearings/new">
                                            <Button variant="outline">Schedule a Hearing</Button>
                                        </Link>
                                    </PermissionGate>
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
                                                        {/* Court Number (replaces hearing time) */}
                                                        <div className="flex flex-col items-center min-w-[80px] p-3 bg-secondary/50 rounded-lg">
                                                            <Briefcase className="w-5 h-5 text-primary mb-1" />
                                                            <span className="text-lg font-bold">
                                                                #{hearing.courtNumber}
                                                            </span>
                                                            {hearing.hearingTime && (
                                                                <span className="text-xs text-muted-foreground mt-0.5">
                                                                    {formatTime12h(hearing.hearingTime)}
                                                                </span>
                                                            )}
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

                                                                {/* Judge Name */}
                                                                {hearing.judgeName && (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Gavel className="w-4 h-4" />
                                                                        <span>{hearing.judgeName}</span>
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

                                                <div className="flex flex-col gap-2 items-end">
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

                                                    {/* Attendance indicator */}
                                                    {hearing.attendance && hearing.attendance.filter(a => a.attended).length > 0 && (
                                                        <div className="flex items-center gap-1 text-xs text-green-500">
                                                            <UserCheck className="w-3.5 h-3.5" />
                                                            <span>{hearing.attendance.filter(a => a.attended).length} attended</span>
                                                        </div>
                                                    )}

                                                    {/* 
                                                      CHANGE: Attendance CTAs are only shown when the selected date 
                                                      is TODAY. For past/future hearings they are hidden entirely.
                                                    */}
                                                    {isTodaySelected && (() => {
                                                        const role = getUserRole(hearing)

                                                        // Hearing counsel: full attendance modal
                                                        if (role === 'counsel' && hearing.status !== 'COMPLETED') {
                                                            return (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="gap-1.5 text-xs"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        openCounselModal(hearing)
                                                                    }}
                                                                >
                                                                    <Users className="w-3.5 h-3.5" />
                                                                    Mark Attendance
                                                                </Button>
                                                            )
                                                        }

                                                        // Completed hearing with counsel
                                                        if (role === 'counsel' && hearing.status === 'COMPLETED') {
                                                            return (
                                                                <span className="text-xs text-green-500 flex items-center gap-1">
                                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                                    Completed
                                                                </span>
                                                            )
                                                        }

                                                        // Accompanying counsel: self-mark toggle
                                                        if (role === 'accompanying') {
                                                            const myRecord = hearing.attendance?.find(
                                                                a => a.member.userId === session?.user?.id
                                                            )
                                                            if (myRecord?.attended) {
                                                                return (
                                                                    <span className="text-xs text-green-500 flex items-center gap-1">
                                                                        <UserCheck className="w-3.5 h-3.5" />
                                                                        Present
                                                                    </span>
                                                                )
                                                            }
                                                            return (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="gap-1.5 text-xs"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        markSelfPresent(hearing.id)
                                                                    }}
                                                                >
                                                                    <UserCheck className="w-3.5 h-3.5" />
                                                                    Mark Present
                                                                </Button>
                                                            )
                                                        }

                                                        if (!hearing.hearingCounsel && can('hearings.update' as any) && hearing.status !== 'COMPLETED') {
                                                            return (
                                                                <span className="text-xs text-muted-foreground">
                                                                    No counsel assigned
                                                                </span>
                                                            )
                                                        }

                                                        return null
                                                    })()}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Display Board - Only show for today */}
                    {isTodaySelected && (
                        <div className="lg:sticky lg:top-6 h-fit">
                            <DisplayBoard />
                        </div>
                    )}
                </div>

                {/* Counsel Attendance Modal */}
                {counselModalHearing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setCounselModalHearing(null)}
                        />
                        <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-5 border-b border-border">
                                <div>
                                    <h3 className="text-lg font-semibold">Mark Attendance</h3>
                                    <p className="text-sm text-muted-foreground mt-0.5">
                                        {counselModalHearing.case.caseNumber} — {counselModalHearing.case.title}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setCounselModalHearing(null)}
                                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                                {modalError && (
                                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        {modalError}
                                    </div>
                                )}

                                {/* Self attendance */}
                                <div>
                                    <p className="text-sm font-medium mb-2">Your Attendance</p>
                                    <label
                                        className={cn(
                                            'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all',
                                            counselSelfAttended
                                                ? 'bg-green-500/10 border border-green-500/30'
                                                : 'bg-secondary/30 border border-transparent hover:bg-secondary/50'
                                        )}
                                    >
                                        <div className={cn(
                                            'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0',
                                            counselSelfAttended
                                                ? 'bg-green-500 border-green-500'
                                                : 'border-muted-foreground/40'
                                        )}>
                                            {counselSelfAttended && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={counselSelfAttended}
                                            onChange={(e) => setCounselSelfAttended(e.target.checked)}
                                        />
                                        <div>
                                            <p className="font-medium text-sm">I attended this hearing</p>
                                            <p className="text-xs text-muted-foreground">
                                                This will mark the hearing as completed
                                            </p>
                                        </div>
                                    </label>
                                </div>

                                {/* Accompanying counsels */}
                                {counselModalHearing.attendance && counselModalHearing.attendance.filter(a => a.memberId !== counselModalHearing.hearingCounsel?.id).length > 0 && (
                                    <div>
                                        <p className="text-sm font-medium mb-2">Accompanying Counsels</p>
                                        <div className="space-y-2">
                                            {counselModalHearing.attendance
                                                .filter(a => a.memberId !== counselModalHearing.hearingCounsel?.id)
                                                .map((record) => {
                                                    const isChecked = !!accompaniedChecked[record.memberId]
                                                    return (
                                                        <label
                                                            key={record.memberId}
                                                            className={cn(
                                                                'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all',
                                                                isChecked
                                                                    ? 'bg-primary/10 border border-primary/30'
                                                                    : 'bg-secondary/30 border border-transparent hover:bg-secondary/50'
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0',
                                                                isChecked
                                                                    ? 'bg-primary border-primary'
                                                                    : 'border-muted-foreground/40'
                                                            )}>
                                                                {isChecked && <Check className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only"
                                                                checked={isChecked}
                                                                onChange={(e) => {
                                                                    setAccompaniedChecked(prev => ({
                                                                        ...prev,
                                                                        [record.memberId]: e.target.checked,
                                                                    }))
                                                                }}
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-sm truncate">
                                                                    {record.member.user.name}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {record.member.role.charAt(0) + record.member.role.slice(1).toLowerCase()}
                                                                </p>
                                                            </div>
                                                        </label>
                                                    )
                                                })}
                                        </div>
                                    </div>
                                )}

                                {/* Outcome form — only shown when counsel marks self attended */}
                                {counselSelfAttended && (
                                    <div className="space-y-3 pt-3 border-t border-border">
                                        <p className="text-sm font-medium">Hearing Outcome</p>

                                        <div className="space-y-1.5">
                                            <label className="text-xs text-muted-foreground">Outcome</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Adjourned, Dismissed, Order passed..."
                                                value={outcomeForm.outcome}
                                                onChange={(e) => setOutcomeForm(prev => ({ ...prev, outcome: e.target.value }))}
                                                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs text-muted-foreground">Order Link</label>
                                            <input
                                                type="url"
                                                placeholder="https://..."
                                                value={outcomeForm.orderLink}
                                                onChange={(e) => setOutcomeForm(prev => ({ ...prev, orderLink: e.target.value }))}
                                                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs text-muted-foreground">Next Date of Hearing</label>
                                            <input
                                                type="date"
                                                value={outcomeForm.nextDate}
                                                onChange={(e) => setOutcomeForm(prev => ({ ...prev, nextDate: e.target.value }))}
                                                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                                            />
                                            {outcomeForm.nextDate && (
                                                <p className="text-xs text-primary">A follow-up hearing will be auto-created</p>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs text-muted-foreground">Additional Remarks</label>
                                            <textarea
                                                rows={2}
                                                placeholder="Any additional notes..."
                                                value={outcomeForm.remarks}
                                                onChange={(e) => setOutcomeForm(prev => ({ ...prev, remarks: e.target.value }))}
                                                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm resize-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-end gap-2 p-5 border-t border-border">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCounselModalHearing(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={saveCounselAttendance}
                                    disabled={modalSaving}
                                >
                                    {modalSaving ? (
                                        <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Saving...</>
                                    ) : (
                                        'Save Attendance'
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    )
}