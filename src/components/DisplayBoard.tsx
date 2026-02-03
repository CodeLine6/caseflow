'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
    Monitor,
    RefreshCw,
    ExternalLink,
    AlertCircle,
    Clock,
    Hash,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface DisplayBoardEntry {
    id: string
    courtNumber: string
    itemNumber: string | null
    caseNumber: string | null
    caseTitle: string | null
    status: string | null
    judgeName: string | null
    lastUpdated: string
    court: {
        id: string
        courtName: string
        displayBoardUrl: string | null
    }
}

interface UserHearing {
    courtId: string
    courtNumber: string
    caseNumber: string
    caseTitle: string
    court: {
        id: string
        courtName: string
        displayBoardUrl: string | null
    } | null
}

interface DisplayBoardProps {
    className?: string
}

export default function DisplayBoard({ className }: DisplayBoardProps) {
    const [displayData, setDisplayData] = useState<DisplayBoardEntry[]>([])
    const [userHearings, setUserHearings] = useState<UserHearing[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState(false)
    const [autoRefresh, setAutoRefresh] = useState(true)

    const fetchDisplayBoard = useCallback(async (showRefreshing = false) => {
        try {
            if (showRefreshing) setRefreshing(true)
            const response = await fetch('/api/display-board')
            if (response.ok) {
                const data = await response.json()
                setDisplayData(data.displayData || [])
                setUserHearings(data.userHearings || [])
                setError(null)
            } else {
                setError('Failed to fetch display board data')
            }
        } catch (err) {
            console.error('Error fetching display board:', err)
            setError('Failed to connect to server')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        fetchDisplayBoard()
    }, [fetchDisplayBoard])

    // Auto-refresh every 60 seconds
    useEffect(() => {
        if (!autoRefresh) return
        const interval = setInterval(() => fetchDisplayBoard(), 60000)
        return () => clearInterval(interval)
    }, [autoRefresh, fetchDisplayBoard])

    const getStatusColor = (status: string | null) => {
        if (!status) return 'bg-gray-500/10 text-gray-500'
        const s = status.toUpperCase()
        if (s.includes('PROGRESS') || s.includes('HEARING')) return 'bg-green-500/10 text-green-500'
        if (s.includes('BREAK') || s.includes('PAUSE')) return 'bg-yellow-500/10 text-yellow-500'
        if (s.includes('RESERVED') || s.includes('JUDGMENT')) return 'bg-blue-500/10 text-blue-500'
        if (s.includes('CLOSED') || s.includes('END')) return 'bg-red-500/10 text-red-500'
        return 'bg-gray-500/10 text-gray-500'
    }

    // Check if user has a matching hearing
    const isUserHearing = (entry: DisplayBoardEntry) => {
        return userHearings.some(
            h => h.courtId === entry.court.id && h.courtNumber === entry.courtNumber
        )
    }

    if (loading) {
        return (
            <Card className={className}>
                <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-6 w-48 bg-secondary rounded" />
                        <div className="h-20 bg-secondary rounded" />
                        <div className="h-20 bg-secondary rounded" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (userHearings.length === 0) {
        return (
            <Card className={className}>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Monitor className="w-5 h-5 text-primary" />
                        Live Court Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <Monitor className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No hearings scheduled for today</p>
                        <p className="text-sm mt-1">Court status will appear when you have upcoming hearings</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-primary" />
                    Live Court Status
                </CardTitle>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={cn(autoRefresh && 'text-green-500')}
                    >
                        <Clock className="w-4 h-4 mr-1" />
                        {autoRefresh ? 'Auto' : 'Paused'}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchDisplayBoard(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {error ? (
                    <div className="text-center py-6">
                        <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                        <p className="text-destructive">{error}</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => fetchDisplayBoard(true)}>
                            Retry
                        </Button>
                    </div>
                ) : displayData.length === 0 ? (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground mb-4">
                            Your scheduled court rooms for today:
                        </p>
                        {userHearings.map((hearing, idx) => (
                            <div
                                key={idx}
                                className="p-4 rounded-lg border border-border bg-secondary/20"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium">{hearing.court?.courtName || 'Unknown Court'}</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Court #{hearing.courtNumber} • {hearing.caseNumber}
                                        </p>
                                    </div>
                                    <Badge variant="outline">Awaiting Data</Badge>
                                </div>
                                {hearing.court?.displayBoardUrl && (
                                    <a
                                        href={hearing.court.displayBoardUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        View Live Display Board
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {displayData.map((entry) => {
                            const isMyHearing = isUserHearing(entry)
                            return (
                                <div
                                    key={entry.id}
                                    className={cn(
                                        'p-4 rounded-lg border transition-all',
                                        isMyHearing
                                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                            : 'border-border bg-secondary/20'
                                    )}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="font-mono">
                                                    Court #{entry.courtNumber}
                                                </Badge>
                                                {entry.itemNumber && (
                                                    <Badge variant="outline" className="gap-1">
                                                        <Hash className="w-3 h-3" />
                                                        Item {entry.itemNumber}
                                                    </Badge>
                                                )}
                                                {isMyHearing && (
                                                    <Badge className="bg-primary text-primary-foreground">
                                                        Your Case
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="font-medium text-lg">{entry.court.courtName}</p>
                                            {entry.caseNumber && (
                                                <p className="text-sm">
                                                    <span className="text-muted-foreground">Case:</span>{' '}
                                                    <span className="font-mono">{entry.caseNumber}</span>
                                                </p>
                                            )}
                                            {entry.caseTitle && (
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {entry.caseTitle}
                                                </p>
                                            )}
                                            {entry.judgeName && (
                                                <p className="text-sm text-muted-foreground">
                                                    Hon'ble {entry.judgeName}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right space-y-2">
                                            <Badge className={getStatusColor(entry.status)}>
                                                {entry.status || 'Unknown'}
                                            </Badge>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(entry.lastUpdated), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                    {entry.court.displayBoardUrl && (
                                        <a
                                            href={entry.court.displayBoardUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-3"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            View Full Display Board
                                        </a>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
