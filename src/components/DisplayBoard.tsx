'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
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
    Wifi,
    WifiOff,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface DisplayBoardEntry {
    id?: string
    courtNumber: string
    itemNumber: string | null
    caseNumber: string | null
    caseTitle: string | null
    status: string | null
    judgeName: string | null
    lastUpdated?: string
    court?: {
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

interface DisplayUpdateEvent {
    courtId: string
    courtName: string
    entries: DisplayBoardEntry[]
    timestamp: string
}

interface DisplayBoardProps {
    className?: string
}

const SCRAPER_URL = process.env.NEXT_PUBLIC_SCRAPER_URL || 'http://localhost:3001'

export default function DisplayBoard({ className }: DisplayBoardProps) {
    const [displayData, setDisplayData] = useState<Record<string, DisplayBoardEntry[]>>({})
    const [userHearings, setUserHearings] = useState<UserHearing[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [refreshing, setRefreshing] = useState(false)
    const [connected, setConnected] = useState(false)
    const socketRef = useRef<Socket | null>(null)

    // Fetch initial data and user hearings from API
    const fetchDisplayBoard = useCallback(async (showRefreshing = false) => {
        try {
            if (showRefreshing) setRefreshing(true)
            const response = await fetch('/api/display-board')
            if (response.ok) {
                const data = await response.json()

                // Convert array to court-keyed object
                const byCourtId: Record<string, DisplayBoardEntry[]> = {}
                if (data.displayData) {
                    data.displayData.forEach((entry: DisplayBoardEntry) => {
                        const courtId = entry.court?.id
                        if (courtId) {
                            if (!byCourtId[courtId]) byCourtId[courtId] = []
                            byCourtId[courtId].push(entry)
                        }
                    })
                }

                setDisplayData(byCourtId)
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

    // Connect to Socket.io for real-time updates
    useEffect(() => {
        fetchDisplayBoard()
    }, [fetchDisplayBoard])

    useEffect(() => {
        if (userHearings.length === 0) return

        // Get unique court IDs
        const courtIds = [...new Set(userHearings.map(h => h.courtId))]

        // Connect to scraper service
        const socket = io(SCRAPER_URL, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        })
        socketRef.current = socket

        socket.on('connect', () => {
            console.log('Connected to scraper service')
            setConnected(true)
            // Subscribe to relevant courts
            socket.emit('subscribe', courtIds)
        })

        socket.on('disconnect', () => {
            console.log('Disconnected from scraper service')
            setConnected(false)
        })

        socket.on('display-update', (data: DisplayUpdateEvent) => {
            console.log('Received display update:', data.courtId)
            setDisplayData(prev => ({
                ...prev,
                [data.courtId]: data.entries.map(e => ({
                    ...e,
                    lastUpdated: data.timestamp,
                    court: {
                        id: data.courtId,
                        courtName: data.courtName,
                        displayBoardUrl: null
                    }
                }))
            }))
        })

        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err)
            setConnected(false)
        })

        return () => {
            socket.disconnect()
        }
    }, [userHearings])

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
    const isUserHearing = (entry: DisplayBoardEntry, courtId: string) => {
        return userHearings.some(
            h => h.courtId === courtId && h.courtNumber === entry.courtNumber
        )
    }

    // Flatten display data for rendering
    const allEntries = Object.entries(displayData).flatMap(([courtId, entries]) =>
        entries.map(entry => ({ ...entry, _courtId: courtId }))
    )

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
                    <Badge variant="outline" className={cn(
                        'gap-1',
                        connected ? 'text-green-500' : 'text-muted-foreground'
                    )}>
                        {connected ? (
                            <><Wifi className="w-3 h-3" /> Live</>
                        ) : (
                            <><WifiOff className="w-3 h-3" /> Offline</>
                        )}
                    </Badge>
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
                ) : allEntries.length === 0 ? (
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
                        {allEntries.map((entry, idx) => {
                            const isMyHearing = isUserHearing(entry, entry._courtId)
                            return (
                                <div
                                    key={`${entry._courtId}-${entry.courtNumber}-${idx}`}
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
                                            <p className="font-medium text-lg">{entry.court?.courtName}</p>
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
                                            {entry.lastUpdated && (
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDistanceToNow(new Date(entry.lastUpdated), { addSuffix: true })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {entry.court?.displayBoardUrl && (
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
