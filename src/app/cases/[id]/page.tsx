'use client'

import { getSafeErrorMessage } from '@/lib/api-error'
import { formatTime12h } from '@/lib/timezone'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import {
    Briefcase, ArrowLeft, Edit, Trash2, Calendar, Users,
    Scale, FileText, Clock, CheckCircle, AlertCircle,
    Plus, Loader2, Save, X, User, Link as LinkIcon, ExternalLink
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MultiSelect } from '@/components/ui/multi-select'
import { TimePicker12h } from '@/components/ui/time-picker-12h'
import { PermissionGate } from '@/components/PermissionGate'

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
    clientId: string | null
    mainCounselId: string | null
    client: { id: string; name: string } | null
    mainCounsel: { id: string; name: string; avatar: string | null } | null
    court: { id: string; courtName: string; courtType: string } | null
    workspaceId: string
    hearings: HearingData[]
    documents: Array<{ id: string; fileName: string; createdAt: string }>
    tasks: Array<{ id: string; title: string; status: string; dueDate: string | null }>
    _count: { hearings: number; documents: number; tasks: number }
}

type HearingData = {
    id: string
    hearingDate: string
    hearingTime: string | null
    hearingType: string
    status: string
    purpose: string | null
    description: string | null
    judgeName: string | null
    courtNumber: string
    courtItemNumber: string | null
    notes: string | null
    outcome: string | null
    orderLink: string | null
    additionalRemarks: string | null
    hearingCounselId: string | null
    hearingCounsel: { id: string; role: string; user: { name: string } } | null
    attendance: Array<{ memberId: string; attended: boolean; member: { role: string; user: { name: string } } }>
}

type WorkspaceMember = {
    id: string
    role: string
    user: { id: string; name: string; email: string }
}

interface ClientOption {
    id: string
    name: string
    clientType: string
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
    const [clients, setClients] = useState<ClientOption[]>([])
    const [editingHearing, setEditingHearing] = useState<HearingData | null>(null)
    const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([])

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
            setError(getSafeErrorMessage(err))
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
                body: JSON.stringify({
                    title: editData.title,
                    description: editData.description,
                    status: editData.status,
                    priority: editData.priority,
                    opposingParty: editData.opposingParty,
                    opposingCounsel: editData.opposingCounsel,
                    clientId: editData.clientId || null,
                    mainCounselId: editData.mainCounselId || null,
                }),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to update case')
            }

            const updated = await res.json()
            setCaseData(updated)
            setIsEditing(false)
        } catch (err) {
            setError(getSafeErrorMessage(err))
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
            setError(getSafeErrorMessage(err))
            setDeleting(false)
        }
    }

    const fetchWorkspaceMembers = async (workspaceId: string) => {
        try {
            const res = await fetch(`/api/workspaces/${workspaceId}/members`)
            if (res.ok) {
                const data = await res.json()
                const filtered = (data.members || []).filter(
                    (m: WorkspaceMember) => m.role === 'MEMBER' || m.role === 'INTERN' || m.role === 'ADMIN'
                )
                setWorkspaceMembers(filtered)
            }
        } catch (err) {
            console.error('Failed to fetch workspace members:', err)
        }
    }

    const handleEditHearing = (hearing: HearingData) => {
        if (caseData?.workspaceId) {
            fetchWorkspaceMembers(caseData.workspaceId)
        }
        setEditingHearing(hearing)
    }

    const handleDeleteHearing = async (hearingId: string) => {
        if (!confirm('Are you sure you want to delete this hearing?')) return
        try {
            const res = await fetch(`/api/hearings/${hearingId}`, { method: 'DELETE' })
            if (res.ok) {
                fetchCase()
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to delete hearing')
            }
        } catch (err) {
            setError('Failed to delete hearing')
        }
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone: 'Asia/Kolkata',
        })
    }

    const hearingStatusColors: Record<string, string> = {
        SCHEDULED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        COMPLETED: 'bg-green-500/10 text-green-400 border-green-500/20',
        ADJOURNED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        POSTPONED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
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
                            <Button onClick={handleSave} disabled={saving} variant="gradient" className="gap-2">
                                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Save
                            </Button>
                        </>
                    ) : (
                        <>
                            <PermissionGate permission="cases.update">
                                <Button variant="outline" onClick={() => {
                                    setIsEditing(true)
                                    fetch('/api/clients').then(res => res.json()).then(data => {
                                        setClients(data.clients || [])
                                    }).catch(err => console.error('Failed to fetch clients:', err))
                                    if (caseData?.workspaceId) {
                                        fetchWorkspaceMembers(caseData.workspaceId)
                                    }
                                }}>
                                    <Edit className="w-4 h-4 mr-2" />Edit
                                </Button>
                            </PermissionGate>
                            <PermissionGate permission="cases.delete">
                                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                                    {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                    Delete
                                </Button>
                            </PermissionGate>
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
                            <PermissionGate permission="hearings.create">
                                <Button size="sm" variant="outline" onClick={() => router.push(`/hearings/new?caseId=${id}`)}>
                                    <Plus className="w-4 h-4 mr-1" />Add
                                </Button>
                            </PermissionGate>
                        </CardHeader>
                        <CardContent>
                            {caseData.hearings.length === 0 ? (
                                <p className="text-muted-foreground text-sm">No hearings scheduled</p>
                            ) : (
                                <div className="space-y-3">
                                    {caseData.hearings.map(h => (
                                        <div key={h.id} className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-medium">{h.description || h.hearingType}</p>
                                                        <Badge className={hearingStatusColors[h.status] || 'bg-slate-500/10 text-slate-400'}>
                                                            {h.status}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {formatDate(h.hearingDate)}
                                                        </span>
                                                        {h.hearingTime && (
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                {formatTime12h(h.hearingTime)}
                                                            </span>
                                                        )}
                                                        {h.courtNumber && (
                                                            <span className="flex items-center gap-1">
                                                                <Scale className="w-3.5 h-3.5" />
                                                                Court {h.courtNumber}
                                                                {h.courtItemNumber && ` / Item ${h.courtItemNumber}`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <PermissionGate permission="hearings.update">
                                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditHearing(h)}>
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </PermissionGate>
                                                    <PermissionGate permission="hearings.delete">
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteHearing(h.id)}>
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </PermissionGate>
                                                </div>
                                            </div>
                                            {/* Extra details */}
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-2">
                                                {h.judgeName && (
                                                    <div className="flex items-center gap-1">
                                                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <span className="text-muted-foreground">Judge:</span>
                                                        <span>{h.judgeName}</span>
                                                    </div>
                                                )}
                                                {h.hearingCounsel && (
                                                    <div className="flex items-center gap-1">
                                                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <span className="text-muted-foreground">Counsel:</span>
                                                        <span>{h.hearingCounsel.user.name}</span>
                                                    </div>
                                                )}
                                                {h.attendance.length > 0 && (
                                                    <div className="flex items-center gap-1 col-span-2">
                                                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <span className="text-muted-foreground">Accompanied:</span>
                                                        <span>{h.attendance.map(a => a.member.user.name).join(', ')}</span>
                                                    </div>
                                                )}
                                                {h.outcome && (
                                                    <div className="col-span-2">
                                                        <span className="text-muted-foreground">Outcome:</span>
                                                        <span className="ml-1">{h.outcome}</span>
                                                    </div>
                                                )}
                                                {h.orderLink && (
                                                    <div className="col-span-2">
                                                        <a href={h.orderLink} target="_blank" rel="noopener noreferrer" className="text-primary flex items-center gap-1 hover:underline">
                                                            <ExternalLink className="w-3.5 h-3.5" />
                                                            View Order
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                            {h.notes && (
                                                <p className="text-sm text-muted-foreground mt-2 italic">{h.notes}</p>
                                            )}
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
                            <PermissionGate permission="tasks.create">
                                <Button size="sm" variant="outline" onClick={() => router.push(`/tasks/new?caseId=${id}`)}>
                                    <Plus className="w-4 h-4 mr-1" />Add
                                </Button>
                            </PermissionGate>
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
                            {isEditing ? (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground uppercase">Main Counsel</Label>
                                        <select
                                            value={editData.mainCounselId || ''}
                                            onChange={(e) => setEditData({ ...editData, mainCounselId: e.target.value || null })}
                                            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                                        >
                                            <option value="">No counsel assigned</option>
                                            {workspaceMembers
                                                .filter(m => m.role === 'MEMBER' || m.role === 'ADMIN')
                                                .map(m => (
                                                    <option key={m.user.id} value={m.user.id}>
                                                        {m.user.name}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground uppercase">Client</Label>
                                        <select
                                            value={editData.clientId || ''}
                                            onChange={(e) => setEditData({ ...editData, clientId: e.target.value || null })}
                                            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                                        >
                                            <option value="">No client selected</option>
                                            {clients.map(client => (
                                                <option key={client.id} value={client.id}>
                                                    {client.name} ({client.clientType})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground uppercase">Opposing Party</Label>
                                        <Input
                                            value={editData.opposingParty || ''}
                                            onChange={(e) => setEditData({ ...editData, opposingParty: e.target.value })}
                                            placeholder="Opposing party name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground uppercase">Opposing Counsel</Label>
                                        <Input
                                            value={editData.opposingCounsel || ''}
                                            onChange={(e) => setEditData({ ...editData, opposingCounsel: e.target.value })}
                                            placeholder="Opposing counsel name"
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    {caseData.mainCounsel && (
                                        <div>
                                            <p className="text-xs text-muted-foreground uppercase">Main Counsel</p>
                                            <p className="font-medium">{caseData.mainCounsel.name}</p>
                                        </div>
                                    )}
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
                                    {!caseData.mainCounsel && !caseData.client && !caseData.opposingParty && !caseData.opposingCounsel && (
                                        <p className="text-muted-foreground text-sm">No parties assigned</p>
                                    )}
                                </>
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
                            <PermissionGate permission="documents.upload">
                                <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => router.push(`/documents/new?caseId=${id}`)}>
                                    <Plus className="w-4 h-4 mr-1" />Upload
                                </Button>
                            </PermissionGate>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Edit Hearing Modal */}
            {editingHearing && (
                <EditHearingModal
                    hearing={editingHearing}
                    members={workspaceMembers}
                    onClose={() => setEditingHearing(null)}
                    onSuccess={() => {
                        setEditingHearing(null)
                        fetchCase()
                    }}
                />
            )}
        </div>
    )
}

// ======================== EditHearingModal ========================

function EditHearingModal({
    hearing,
    members,
    onClose,
    onSuccess,
}: {
    hearing: HearingData
    members: WorkspaceMember[]
    onClose: () => void
    onSuccess: () => void
}) {
    const [formData, setFormData] = useState({
        hearingDate: hearing.hearingDate ? new Date(hearing.hearingDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '',
        hearingTime: hearing.hearingTime || '',
        purpose: hearing.purpose || hearing.description || '',
        hearingType: hearing.hearingType || 'OTHER',
        status: hearing.status || 'SCHEDULED',
        judgeName: hearing.judgeName || '',
        courtNumber: hearing.courtNumber || '',
        courtItemNumber: hearing.courtItemNumber || '',
        hearingCounselId: hearing.hearingCounselId || '',
        accompaniedByIds: hearing.attendance?.map(a => a.memberId) || [],
        notes: hearing.notes || '',
        outcome: hearing.outcome || '',
        orderLink: hearing.orderLink || '',
        additionalRemarks: hearing.additionalRemarks || '',
        nextDateOfHearing: '',
    })
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const memberOptions = members.map(m => ({
        label: `${m.user.name}${m.role === 'INTERN' ? ' (Intern)' : ''}`,
        value: m.id,
        role: m.role,
    }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError('')

        try {
            const res = await fetch(`/api/hearings/${hearing.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    hearingDate: new Date(
                        `${formData.hearingDate}T12:00:00+05:30`
                    ).toISOString(),
                    hearingCounselId: formData.hearingCounselId || null,
                    accompaniedByIds: formData.accompaniedByIds,
                    nextDateOfHearing: formData.nextDateOfHearing || null,
                }),
            })

            if (res.ok) {
                onSuccess()
            } else {
                const data = await res.json()
                setError(data.error || 'Failed to update hearing')
            }
        } catch (err) {
            setError('Failed to update hearing')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h3 className="text-xl font-semibold">Edit Hearing</h3>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {error && (
                    <div className="mx-6 mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Date & Time */}
                        <div className="space-y-2">
                            <Label>Hearing Date *</Label>
                            <Input
                                type="date"
                                value={formData.hearingDate}
                                onChange={(e) => setFormData({ ...formData, hearingDate: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Time</Label>
                            <TimePicker12h
                                value={formData.hearingTime}
                                onChange={(val) => setFormData({ ...formData, hearingTime: val })}
                            />
                        </div>
                    </div>

                    {/* Purpose */}
                    <div className="space-y-2">
                        <Label>Purpose *</Label>
                        <Input
                            value={formData.purpose}
                            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                            placeholder="e.g., Arguments, Evidence submission"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Type & Status */}
                        <div className="space-y-2">
                            <Label>Hearing Type</Label>
                            <select
                                value={formData.hearingType}
                                onChange={(e) => setFormData({ ...formData, hearingType: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                            >
                                <option value="PRELIMINARY">Preliminary</option>
                                <option value="EVIDENCE">Evidence</option>
                                <option value="ARGUMENT">Argument</option>
                                <option value="FINAL">Final</option>
                                <option value="INTERIM">Interim</option>
                                <option value="MOTION">Motion</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                            >
                                <option value="SCHEDULED">Scheduled</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="POSTPONED">Postponed</option>
                                <option value="ADJOURNED">Adjourned</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>

                        {/* Court Details */}
                        <div className="space-y-2">
                            <Label>Court Number</Label>
                            <Input
                                value={formData.courtNumber}
                                onChange={(e) => setFormData({ ...formData, courtNumber: e.target.value })}
                                placeholder="e.g., Courtroom 3"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Item Number</Label>
                            <Input
                                value={formData.courtItemNumber}
                                onChange={(e) => setFormData({ ...formData, courtItemNumber: e.target.value })}
                                placeholder="e.g., Item 5"
                            />
                        </div>

                        {/* Judge & Counsel */}
                        <div className="space-y-2">
                            <Label>Judge Name</Label>
                            <Input
                                value={formData.judgeName}
                                onChange={(e) => setFormData({ ...formData, judgeName: e.target.value })}
                                placeholder="Judge's name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Hearing Counsel</Label>
                            <select
                                value={formData.hearingCounselId}
                                onChange={(e) => setFormData({ ...formData, hearingCounselId: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                            >
                                <option value="">None</option>
                                {members.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.user.name} {m.role === 'INTERN' ? '(Intern)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Accompanied By & Order Link */}
                        <div className="space-y-2">
                            <Label>Accompanied By</Label>
                            <MultiSelect
                                options={memberOptions.filter(o => o.value !== formData.hearingCounselId)}
                                value={formData.accompaniedByIds}
                                onValueChange={(vals) => setFormData({ ...formData, accompaniedByIds: vals })}
                                placeholder="Select accompanying"
                            />
                        </div>
                    </div>

                    {formData.status === 'COMPLETED' && (
                        <>
                            {/* Order Link, Next Date & Outcome */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Order Link</Label>
                                    <Input
                                        type="url"
                                        value={formData.orderLink}
                                        onChange={(e) => setFormData({ ...formData, orderLink: e.target.value })}
                                        placeholder="Link to order"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Outcome</Label>
                                    <Input
                                        value={formData.outcome}
                                        onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                                        placeholder="Hearing outcome"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Next Hearing Date</Label>
                                    <Input
                                        type="date"
                                        value={formData.nextDateOfHearing}
                                        onChange={(e) => setFormData({ ...formData, nextDateOfHearing: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Full Width Fields */}
                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={3}
                                    placeholder="Additional notes..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Additional Remarks</Label>
                                <Textarea
                                    value={formData.additionalRemarks}
                                    onChange={(e) => setFormData({ ...formData, additionalRemarks: e.target.value })}
                                    rows={3}
                                    placeholder="Any additional remarks..."
                                />
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                            ) : (
                                <><Save className="w-4 h-4 mr-2" />Update Hearing</>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
