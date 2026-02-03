'use client'

import { useState, useEffect, useCallback } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
    Monitor,
    RefreshCw,
    ExternalLink,
    AlertCircle,
    CheckCircle,
    XCircle,
    Clock,
    Building2,
    Play,
    Loader2,
    ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface CourtWithDisplayBoard {
    id: string
    courtName: string
    courtType: string
    city: string | null
    displayBoardUrl: string | null
    cachedEntries: number
    lastUpdated: string | null
}

interface ScrapeResult {
    courtId: string
    courtName: string
    success: boolean
    entriesCount: number
    error?: string
}

export default function DisplayBoardsPage() {
    const [courts, setCourts] = useState<CourtWithDisplayBoard[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [scraping, setScraping] = useState<string | null>(null) // courtId being scraped
    const [scrapingAll, setScrapingAll] = useState(false)
    const [lastResults, setLastResults] = useState<ScrapeResult[] | null>(null)

    const fetchCourts = useCallback(async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/display-board/scrape')
            if (response.ok) {
                const data = await response.json()
                setCourts(data.courts || [])
                setError(null)
            } else {
                setError('Failed to fetch courts')
            }
        } catch (err) {
            setError('Failed to connect to server')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchCourts()
    }, [fetchCourts])

    const scrapeCourt = async (courtId: string) => {
        try {
            setScraping(courtId)
            const response = await fetch('/api/display-board/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courtId }),
            })
            const data = await response.json()
            if (data.success) {
                setLastResults(data.results)
                await fetchCourts() // Refresh the list
            } else {
                setError(data.error || 'Scraping failed')
            }
        } catch (err) {
            setError('Failed to scrape display board')
        } finally {
            setScraping(null)
        }
    }

    const scrapeAll = async () => {
        try {
            setScrapingAll(true)
            setLastResults(null)
            const response = await fetch('/api/display-board/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scrapeAll: true }),
            })
            const data = await response.json()
            if (data.success) {
                setLastResults(data.results)
                await fetchCourts() // Refresh the list
            } else {
                setError(data.error || 'Scraping failed')
            }
        } catch (err) {
            setError('Failed to scrape display boards')
        } finally {
            setScrapingAll(false)
        }
    }

    const getStatusBadge = (court: CourtWithDisplayBoard) => {
        if (!court.lastUpdated) {
            return <Badge variant="outline">Never Synced</Badge>
        }
        const lastUpdate = new Date(court.lastUpdated)
        const minutesAgo = (Date.now() - lastUpdate.getTime()) / 1000 / 60

        if (minutesAgo < 5) {
            return <Badge className="bg-green-500/10 text-green-500">Fresh</Badge>
        } else if (minutesAgo < 30) {
            return <Badge className="bg-yellow-500/10 text-yellow-500">Stale</Badge>
        } else {
            return <Badge className="bg-red-500/10 text-red-500">Outdated</Badge>
        }
    }

    return (
        <MainLayout>
            <div className="space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/courts">
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-3">
                                <Monitor className="w-8 h-8 text-primary" />
                                Display Board Management
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Manage and sync court display board data
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={fetchCourts}
                            disabled={loading}
                        >
                            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
                            Refresh
                        </Button>
                        <Button
                            onClick={scrapeAll}
                            disabled={scrapingAll || courts.length === 0}
                        >
                            {scrapingAll ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Scraping All...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Scrape All Courts
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Last Scrape Results */}
                {lastResults && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Last Scrape Results</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {lastResults.map((result) => (
                                    <div
                                        key={result.courtId}
                                        className={cn(
                                            'p-3 rounded-lg border flex items-center justify-between',
                                            result.success
                                                ? 'bg-green-500/5 border-green-500/20'
                                                : 'bg-red-500/5 border-red-500/20'
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            {result.success ? (
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-500" />
                                            )}
                                            <span className="font-medium text-sm">{result.courtName}</span>
                                        </div>
                                        {result.success ? (
                                            <Badge variant="secondary">{result.entriesCount} entries</Badge>
                                        ) : (
                                            <span className="text-xs text-red-500 truncate max-w-[150px]">
                                                {result.error}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Error State */}
                {error && (
                    <Card className="border-destructive">
                        <CardContent className="p-4 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-destructive" />
                            <span className="text-destructive">{error}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setError(null)}
                                className="ml-auto"
                            >
                                Dismiss
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Courts List */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <Card key={i} className="animate-pulse">
                                <CardContent className="p-6">
                                    <div className="h-6 w-48 bg-secondary rounded mb-3" />
                                    <div className="h-4 w-32 bg-secondary rounded mb-2" />
                                    <div className="h-4 w-64 bg-secondary rounded" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : courts.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold mb-2">No Courts with Display Boards</h3>
                            <p className="text-muted-foreground mb-4">
                                Add a display board URL when creating courts to enable live status tracking.
                            </p>
                            <Link href="/courts/new">
                                <Button>Add Court with Display Board</Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {courts.map((court) => (
                            <Card key={court.id} className="hover:border-primary/30 transition-all">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold text-lg">{court.courtName}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {court.courtType} • {court.city || 'Location not set'}
                                            </p>
                                        </div>
                                        {getStatusBadge(court)}
                                    </div>

                                    {court.displayBoardUrl && (
                                        <a
                                            href={court.displayBoardUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-3"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            {new URL(court.displayBoardUrl).hostname}
                                        </a>
                                    )}

                                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                                        <div className="text-sm text-muted-foreground">
                                            <span className="font-medium">{court.cachedEntries}</span> cached entries
                                            {court.lastUpdated && (
                                                <>
                                                    {' • '}
                                                    <Clock className="w-3 h-3 inline" />{' '}
                                                    {formatDistanceToNow(new Date(court.lastUpdated), { addSuffix: true })}
                                                </>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => scrapeCourt(court.id)}
                                            disabled={scraping === court.id || scrapingAll}
                                        >
                                            {scraping === court.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <RefreshCw className="w-4 h-4 mr-1" />
                                                    Sync
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Help Section */}
                <Card className="bg-secondary/20">
                    <CardContent className="p-5">
                        <h3 className="font-semibold mb-2">How Display Board Scraping Works</h3>
                        <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Add a display board URL when creating a court (e.g., Delhi HC display board)</li>
                            <li>• The scraper automatically detects the format based on the court's website</li>
                            <li>• Click "Sync" to fetch the latest data from a court's display board</li>
                            <li>• Use "Scrape All" to update all courts at once</li>
                            <li>• Data is cached and shown on the Cause List page alongside your hearings</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    )
}
