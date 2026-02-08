'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Building2, MapPin, Phone, Scale, Loader2, AlertCircle, Plus, Pencil, Trash2
} from 'lucide-react'
import Link from 'next/link'
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

export default function AdminCourtsPage() {
    const router = useRouter()
    const [courts, setCourts] = useState<Court[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [deleting, setDeleting] = useState<string | null>(null)

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

    const handleDelete = async (courtId: string, courtName: string) => {
        if (!confirm(`Are you sure you want to delete "${courtName}"? This action cannot be undone.`)) {
            return
        }

        try {
            setDeleting(courtId)
            const response = await fetch(`/api/courts/${courtId}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                throw new Error('Failed to delete court')
            }

            // Refresh the list
            await fetchCourts()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete court')
        } finally {
            setDeleting(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Courts Management</h1>
                    <p className="text-muted-foreground mt-1">Manage all courts in the system</p>
                </div>
                <Link href="/admin/courts/new">
                    <Button className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                        <Plus className="w-4 h-4" />
                        New Court
                    </Button>
                </Link>
            </div>

            {error && (
                <Card className="border-destructive">
                    <CardContent className="p-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        <span>{error}</span>
                    </CardContent>
                </Card>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                </div>
            ) : courts.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No courts yet</h3>
                        <p className="text-muted-foreground mb-4">
                            Create your first court to get started
                        </p>
                        <Link href="/admin/courts/new">
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Create First Court
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courts.map((court) => (
                        <Card key={court.id} className="hover:border-amber-500/30 transition-all">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg mb-1">{court.courtName}</h3>
                                        <Badge className={courtTypeColors[court.courtType] || courtTypeColors.OTHER}>
                                            {court.courtType}
                                        </Badge>
                                    </div>
                                    <Scale className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
                                </div>

                                <div className="space-y-2 mb-4">
                                    {court.address && (
                                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                            <span className="line-clamp-2">{court.address}</span>
                                        </div>
                                    )}
                                    {court.city && (
                                        <div className="text-sm text-muted-foreground">
                                            {court.city}{court.state && `, ${court.state}`}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pt-3 border-t">
                                    <Link href={`/admin/courts/${court.id}/edit`} className="flex-1">
                                        <Button variant="outline" size="sm" className="w-full gap-2">
                                            <Pencil className="w-4 h-4" />
                                            Edit
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDelete(court.id, court.courtName)}
                                        disabled={deleting === court.id}
                                    >
                                        {deleting === court.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
