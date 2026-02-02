'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Users, Plus, Search, Building2, Mail, Phone,
    Briefcase, Loader2, AlertCircle, ArrowLeft
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type Client = {
    id: string
    name: string
    email: string | null
    phone: string | null
    address: string | null
    clientType: string
    _count: { cases: number }
}

export default function ClientsPage() {
    const router = useRouter()
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')

    useEffect(() => {
        fetchClients()
    }, [])

    const fetchClients = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (search) params.append('search', search)

            const res = await fetch(`/api/clients?${params.toString()}`)
            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Failed to fetch clients')
            setClients(data.clients)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        fetchClients()
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
            </div>

            {/* Header */}
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
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            Clients
                        </h1>
                        <p className="text-muted-foreground mt-1">Manage your clients and contacts</p>
                    </div>
                </div>
                <Button
                    className="bg-gradient-to-r from-primary to-accent text-white gap-2"
                    onClick={() => router.push('/clients/new')}
                >
                    <Plus className="w-4 h-4" />
                    Add Client
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card className="glass-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{clients.length}</p>
                                <p className="text-xs text-muted-foreground">Total Clients</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{clients.filter(c => c.clientType === 'CORPORATE').length}</p>
                                <p className="text-xs text-muted-foreground">Corporate</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                <Briefcase className="w-5 h-5 text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{clients.reduce((acc, c) => acc + c._count.cases, 0)}</p>
                                <p className="text-xs text-muted-foreground">Total Cases</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <Card className="glass-card mb-6">
                <CardContent className="p-4">
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search by name or email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button type="submit" variant="outline">Search</Button>
                    </form>
                </CardContent>
            </Card>

            {/* Clients List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : error ? (
                <Card className="glass-card">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                        <p className="text-destructive">{error}</p>
                        <Button onClick={fetchClients} className="mt-4">Retry</Button>
                    </CardContent>
                </Card>
            ) : clients.length === 0 ? (
                <Card className="glass-card">
                    <CardContent className="p-12 text-center">
                        <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-semibold mb-2">No clients found</h3>
                        <p className="text-muted-foreground mb-6">Get started by adding your first client.</p>
                        <Button
                            className="bg-gradient-to-r from-primary to-accent text-white gap-2"
                            onClick={() => router.push('/clients/new')}
                        >
                            <Plus className="w-4 h-4" />
                            Add First Client
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clients.map((client) => (
                        <Card
                            key={client.id}
                            className="glass-card hover:border-primary/30 transition-all cursor-pointer"
                            onClick={() => router.push(`/clients/${client.id}`)}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                                        {client.clientType === 'CORPORATE' ? (
                                            <Building2 className="w-6 h-6 text-primary" />
                                        ) : (
                                            <Users className="w-6 h-6 text-primary" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold truncate">{client.name}</h3>
                                        <Badge variant="outline" className="mt-1 text-xs">
                                            {client.clientType}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                                    {client.email && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4" />
                                            <span className="truncate">{client.email}</span>
                                        </div>
                                    )}
                                    {client.phone && (
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4" />
                                            <span>{client.phone}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="w-4 h-4" />
                                        <span>{client._count.cases} cases</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
