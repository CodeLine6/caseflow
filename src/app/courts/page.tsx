'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Building2, MapPin, Phone, Scale, Loader2, AlertCircle, ArrowLeft
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Court = {
    id: string
    courtName: string
    courtType: string
    address: string | null
    city: string | null
    state: string | null
    _count?: { cases: number }
}

const courtTypeColors: Record<string, string> = {
    DISTRICT: 'bg-blue-500/10 text-blue-400',
    HIGH: 'bg-purple-500/10 text-purple-400',
    SUPREME: 'bg-red-500/10 text-red-400',
    TRIBUNAL: 'bg-amber-500/10 text-amber-400',
    FAMILY: 'bg-pink-500/10 text-pink-400',
    CONSUMER: 'bg-green-500/10 text-green-400',
    OTHER: 'bg-slate-500/10 text-slate-400',
}

export default function CourtsPage() {
    const router = useRouter()
    const [courts, setCourts] = useState<Court[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetchCourts()
    }, [])

    const fetchCourts = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/courts')
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setCourts(data.courts)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

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
                                <Building2 className="w-5 h-5 text-white" />
                            </div>
                            Courts
                        </h1>
                        <p className="text-muted-foreground mt-1">Manage court information</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card className="glass-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{courts.length}</p>
                                <p className="text-xs text-muted-foreground">Total Courts</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                {['DISTRICT', 'HIGH', 'SUPREME'].map(type => (
                    <Card key={type} className="glass-card">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg ${courtTypeColors[type].replace('text-', 'bg-').replace('400', '500/10')} flex items-center justify-center`}>
                                    <Scale className={`w-5 h-5 ${courtTypeColors[type].split(' ')[1]}`} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{courts.filter(c => c.courtType === type).length}</p>
                                    <p className="text-xs text-muted-foreground">{type.charAt(0) + type.slice(1).toLowerCase()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
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
            ) : courts.length === 0 ? (
                <Card className="glass-card">
                    <CardContent className="p-12 text-center">
                        <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-semibold mb-2">No courts found</h3>
                        <p className="text-muted-foreground">Courts will appear here when added to the system.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courts.map(court => (
                        <Card key={court.id} className="glass-card hover:border-primary/30 transition-all">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="font-semibold">{court.courtName}</h3>
                                    <Badge className={courtTypeColors[court.courtType] || courtTypeColors.OTHER}>
                                        {court.courtType}
                                    </Badge>
                                </div>
                                {(court.address || court.city) && (
                                    <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
                                        <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                        <span>{[court.address, court.city, court.state].filter(Boolean).join(', ')}</span>
                                    </div>
                                )}
                                {court._count && (
                                    <div className="text-sm text-muted-foreground">
                                        {court._count.cases} active cases
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
