'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Briefcase, Plus, Search, Filter, FileText,
    Calendar, Users, ChevronDown, Scale, AlertCircle,
    Clock, CheckCircle, XCircle, Loader2, ArrowLeft
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type Case = {
    id: string
    caseNumber: string
    title: string
    description: string | null
    caseCategory: string
    caseType: string
    status: string
    priority: string
    filingDate: string
    client: {
        id: string
        name: string
    } | null
    mainCounsel: {
        id: string
        name: string
        avatar: string | null
    } | null
    court: {
        id: string
        courtName: string
        courtType: string
    } | null
    _count: {
        hearings: number
        documents: number
        tasks: number
    }
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    ACTIVE: { label: 'Active', icon: Clock, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    PENDING: { label: 'Pending', icon: AlertCircle, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    CLOSED: { label: 'Closed', icon: CheckCircle, color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
    APPEALED: { label: 'Appealed', icon: Scale, color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    DISMISSED: { label: 'Dismissed', icon: XCircle, color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    SETTLED: { label: 'Settled', icon: CheckCircle, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
    HIGH: { label: 'High', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    MEDIUM: { label: 'Medium', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    LOW: { label: 'Low', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
}

const categoryConfig: Record<string, string> = {
    CIVIL: 'Civil',
    CRIMINAL: 'Criminal',
    FAMILY: 'Family',
    CORPORATE: 'Corporate',
    TAX: 'Tax',
    LABOR: 'Labor',
    PROPERTY: 'Property',
    CONSUMER: 'Consumer',
    OTHER: 'Other',
}

export default function CasesPage() {
    const router = useRouter()
    const [cases, setCases] = useState<Case[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')

    useEffect(() => {
        fetchCases()
    }, [statusFilter, categoryFilter])

    const fetchCases = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (statusFilter) params.append('status', statusFilter)
            if (categoryFilter) params.append('category', categoryFilter)
            if (searchQuery) params.append('search', searchQuery)

            const res = await fetch(`/api/cases?${params.toString()}`)
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to fetch cases')
            }

            setCases(data.cases)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        fetchCases()
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
    }

    // Stats
    const stats = {
        total: cases.length,
        active: cases.filter(c => c.status === 'ACTIVE').length,
        pending: cases.filter(c => c.status === 'PENDING').length,
        highPriority: cases.filter(c => c.priority === 'HIGH').length,
    }

    return (
        <div className="min-h-screen bg-background p-8">
            {/* Background decorations */}
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
                                <Briefcase className="w-5 h-5 text-white" />
                            </div>
                            Cases
                        </h1>
                        <p className="text-muted-foreground mt-1">Manage and track all your legal cases</p>
                    </div>
                </div>
                <Button
                    className="bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 gap-2"
                    onClick={() => router.push('/cases/new')}
                >
                    <Plus className="w-4 h-4" />
                    New Case
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card className="glass-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Briefcase className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.total}</p>
                                <p className="text-xs text-muted-foreground">Total Cases</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.active}</p>
                                <p className="text-xs text-muted-foreground">Active Cases</p>
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
                                <p className="text-2xl font-bold">{stats.pending}</p>
                                <p className="text-xs text-muted-foreground">Pending</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                                <Scale className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.highPriority}</p>
                                <p className="text-xs text-muted-foreground">High Priority</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="glass-card mb-6">
                <CardContent className="p-4">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search by case number, title, or description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-3">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-4 py-2 rounded-lg bg-secondary border border-border text-sm"
                            >
                                <option value="">All Status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="PENDING">Pending</option>
                                <option value="CLOSED">Closed</option>
                                <option value="APPEALED">Appealed</option>
                                <option value="SETTLED">Settled</option>
                            </select>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="px-4 py-2 rounded-lg bg-secondary border border-border text-sm"
                            >
                                <option value="">All Categories</option>
                                {Object.entries(categoryConfig).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                            <Button type="submit" variant="outline" className="gap-2">
                                <Filter className="w-4 h-4" />
                                Apply
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Cases List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : error ? (
                <Card className="glass-card">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                        <p className="text-destructive">{error}</p>
                        <Button onClick={fetchCases} className="mt-4">Retry</Button>
                    </CardContent>
                </Card>
            ) : cases.length === 0 ? (
                <Card className="glass-card">
                    <CardContent className="p-12 text-center">
                        <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-semibold mb-2">No cases found</h3>
                        <p className="text-muted-foreground mb-6">
                            {searchQuery || statusFilter || categoryFilter
                                ? 'Try adjusting your filters to find cases.'
                                : 'Get started by creating your first case.'}
                        </p>
                        <Button
                            className="bg-gradient-to-r from-primary to-accent text-white gap-2"
                            onClick={() => router.push('/cases/new')}
                        >
                            <Plus className="w-4 h-4" />
                            Create First Case
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {cases.map((caseItem) => {
                        const status = statusConfig[caseItem.status] || statusConfig.ACTIVE
                        const priority = priorityConfig[caseItem.priority] || priorityConfig.MEDIUM
                        const StatusIcon = status.icon

                        return (
                            <Card
                                key={caseItem.id}
                                className="glass-card hover:border-primary/30 transition-all cursor-pointer"
                                onClick={() => router.push(`/cases/${caseItem.id}`)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                        {/* Main Info */}
                                        <div className="flex-1">
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                    <Briefcase className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-lg hover:text-primary transition-colors">
                                                        {caseItem.title}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {caseItem.caseNumber} • {categoryConfig[caseItem.caseCategory] || caseItem.caseCategory}
                                                    </p>
                                                </div>
                                            </div>
                                            {caseItem.description && (
                                                <p className="text-sm text-muted-foreground line-clamp-2 ml-13">
                                                    {caseItem.description}
                                                </p>
                                            )}

                                            {/* Meta info */}
                                            <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                                                {caseItem.client && (
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-4 h-4" />
                                                        {caseItem.client.name}
                                                    </span>
                                                )}
                                                {caseItem.court && (
                                                    <span className="flex items-center gap-1">
                                                        <Scale className="w-4 h-4" />
                                                        {caseItem.court.courtName}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    Filed: {formatDate(caseItem.filingDate)}
                                                </span>
                                            </div>

                                            {/* Counts */}
                                            <div className="flex gap-4 mt-3">
                                                <span className="text-xs text-muted-foreground">
                                                    {caseItem._count.hearings} hearings
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {caseItem._count.documents} documents
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {caseItem._count.tasks} tasks
                                                </span>
                                            </div>
                                        </div>

                                        {/* Badges */}
                                        <div className="flex flex-row md:flex-col gap-2 items-start">
                                            <Badge className={`${status.color} gap-1`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {status.label}
                                            </Badge>
                                            <Badge className={priority.color}>
                                                {priority.label} Priority
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
