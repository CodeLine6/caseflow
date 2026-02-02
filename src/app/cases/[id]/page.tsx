'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
    Briefcase, ArrowLeft, Edit, Trash2, Calendar, Users,
    Scale, FileText, Clock, CheckCircle, AlertCircle,
    Plus, Loader2, Save, X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type CaseData = {
    id: string
    caseNumber: string
    title: string
    description: string | null
    caseCategory: string
    caseType: string
    status: string
    priority: string
    filingDate: string
    opposingParty: string | null
    opposingCounsel: string | null
    caseValue: number | null
    client: { id: string; name: string } | null
    mainCounsel: { id: string; name: string; avatar: string | null } | null
    court: { id: string; courtName: string; courtType: string } | null
    hearings: Array<{ id: string; hearingDate: string; purpose: string; status: string }>
    documents: Array<{ id: string; fileName: string; createdAt: string }>
    tasks: Array<{ id: string; title: string; status: string; dueDate: string | null }>
    _count: { hearings: number; documents: number; tasks: number }
}

const statusConfig: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: 'Active', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    PENDING: { label: 'Pending', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    CLOSED: { label: 'Closed', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
    APPEALED: { label: 'Appealed', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    DISMISSED: { label: 'Dismissed', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    SETTLED: { label: 'Settled', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
    HIGH: { label: 'High', color: 'bg-red-500/10 text-red-400' },
    MEDIUM: { label: 'Medium', color: 'bg-amber-500/10 text-amber-400' },
    LOW: { label: 'Low', color: 'bg-green-500/10 text-green-400' },
}

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [caseData, setCaseData] = useState<CaseData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [isEditing, setIsEditing] = useState(false)
    const [editData, setEditData] = useState<Partial<CaseData>>({})
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        fetchCase()
    }, [id])

    const fetchCase = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/cases/${id}`)
            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to fetch case')
            }

            setCaseData(data)
            setEditData(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            const res = await fetch(`/api/cases/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editData),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to update case')
            }

            const updated = await res.json()
            setCaseData(updated)
            setIsEditing(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this case? This action cannot be undone.')) {
            return
        }

        try {
            setDeleting(true)
            const res = await fetch(`/api/cases/${id}`, { method: 'DELETE' })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to delete case')
            }

            router.push('/cases')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete')
            setDeleting(false)
        }
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error || !caseData) {
        return (
            <div className="min-h-screen bg-background p-8">
                <Card className="glass-card max-w-md mx-auto">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                        <p className="text-destructive mb-4">{error || 'Case not found'}</p>
                        <Button onClick={() => router.push('/cases')}>Back to Cases</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const status = statusConfig[caseData.status] || statusConfig.ACTIVE
    const priority = priorityConfig[caseData.priority] || priorityConfig.MEDIUM

    return (
        <div className="min-h-screen bg-background p-8">
            {/* Background */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
            </div>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
                <div className="flex items-start gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full mt-1">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                <Briefcase className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">{caseData.title}</h1>
                                <p className="text-muted-foreground">{caseData.caseNumber}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                            <Badge className={status.color}>{status.label}</Badge>
                            <Badge className={priority.color}>{priority.label} Priority</Badge>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    {isEditing ? (
                        <>
                            <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={saving}>
                                <X className="w-4 h-4 mr-2" />Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-primary to-accent text-white">
                                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Save
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setIsEditing(true)}>
                                <Edit className="w-4 h-4 mr-2" />Edit
                            </Button>
                            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                                {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                Delete
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                Case Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isEditing ? (
                                <>
                                    <div className="space-y-2">
                                        <Label>Title</Label>
                                        <Input
                                            value={editData.title || ''}
                                            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Description</Label>
                                        <textarea
                                            value={editData.description || ''}
                                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                            rows={4}
                                            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm resize-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Status</Label>
                                            <select
                                                value={editData.status || ''}
                                                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                                            >
                                                {Object.entries(statusConfig).map(([key, val]) => (
                                                    <option key={key} value={key}>{val.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Priority</Label>
                                            <select
                                                value={editData.priority || ''}
                                                onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                                                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                                            >
                                                {Object.entries(priorityConfig).map(([key, val]) => (
                                                    <option key={key} value={key}>{val.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {caseData.description && (
                                        <p className="text-muted-foreground">{caseData.description}</p>
                                    )}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Category:</span>
                                            <span className="ml-2 font-medium">{caseData.caseCategory}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Type:</span>
                                            <span className="ml-2 font-medium">{caseData.caseType}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Filing Date:</span>
                                            <span className="ml-2 font-medium">{formatDate(caseData.filingDate)}</span>
                                        </div>
                                        {caseData.caseValue && (
                                            <div>
                                                <span className="text-muted-foreground">Value:</span>
                                                <span className="ml-2 font-medium">₹{caseData.caseValue.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Hearings */}
                    <Card className="glass-card">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-primary" />
                                Hearings ({caseData._count.hearings})
                            </CardTitle>
                            <Button size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-1" />Add
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {caseData.hearings.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No hearings scheduled</p>
                            ) : (
                                <div className="space-y-2">
                                    {caseData.hearings.map(h => (
                                        <div key={h.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                                            <div>
                                                <p className="font-medium">{h.purpose}</p>
                                                <p className="text-sm text-muted-foreground">{formatDate(h.hearingDate)}</p>
                                            </div>
                                            <Badge variant="outline">{h.status}</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Tasks */}
                    <Card className="glass-card">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-primary" />
                                Tasks ({caseData._count.tasks})
                            </CardTitle>
                            <Button size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-1" />Add
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {caseData.tasks.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No tasks assigned</p>
                            ) : (
                                <div className="space-y-2">
                                    {caseData.tasks.map(t => (
                                        <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                                            <div>
                                                <p className="font-medium">{t.title}</p>
                                                {t.dueDate && <p className="text-sm text-muted-foreground">Due: {formatDate(t.dueDate)}</p>}
                                            </div>
                                            <Badge variant="outline">{t.status}</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                Parties
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {caseData.client && (
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase">Client</p>
                                    <p className="font-medium">{caseData.client.name}</p>
                                </div>
                            )}
                            {caseData.opposingParty && (
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase">Opposing Party</p>
                                    <p className="font-medium">{caseData.opposingParty}</p>
                                </div>
                            )}
                            {caseData.opposingCounsel && (
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase">Opposing Counsel</p>
                                    <p className="font-medium">{caseData.opposingCounsel}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {caseData.court && (
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Scale className="w-5 h-5 text-primary" />
                                    Court
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="font-medium">{caseData.court.courtName}</p>
                                <p className="text-sm text-muted-foreground">{caseData.court.courtType}</p>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                Documents ({caseData._count.documents})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {caseData.documents.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No documents</p>
                            ) : (
                                <div className="space-y-2">
                                    {caseData.documents.map(d => (
                                        <div key={d.id} className="text-sm p-2 rounded bg-secondary/50">
                                            {d.fileName}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <Button size="sm" variant="outline" className="w-full mt-3">
                                <Plus className="w-4 h-4 mr-1" />Upload
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
