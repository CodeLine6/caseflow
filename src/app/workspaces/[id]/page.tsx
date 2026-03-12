'use client'

import { useEffect, useState, use } from 'react'
import { getSafeErrorMessage } from '@/lib/api-error'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
    ArrowLeft,
    Building2,
    Users,
    Briefcase,
    Calendar,
    Settings,
    Crown,
    UserPlus,
    Trash2,
    Mail,
    Shield,
    MoreVertical,
    Check,
    X,
    AlertTriangle,
    Save,
    ChevronDown,
    ChevronRight,
    Loader2,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { usePermissions } from '@/hooks/usePermissions'
import { PERMISSIONS, PERMISSION_GROUPS, ROLE_PERMISSIONS, TRI_STATE_PERMISSIONS } from '@/lib/permissions'
import type { Permission } from '@/lib/permissions'

interface Member {
    id: string
    userId: string
    role: 'ADMIN' | 'MANAGER' | 'MEMBER' | 'ASSISTANT' | 'INTERN'
    user: {
        id: string
        name: string
        email: string
        avatar: string | null
    }
    customPermissions: { action: string; granted: boolean }[]
    createdAt: string
}

interface Workspace {
    id: string
    name: string
    slug: string
    description: string | null
    logo: string | null
    ownerId: string
    owner: {
        id: string
        name: string
        email: string
    }
    members: Member[]
    _count: {
        cases: number
        members: number
        clients: number
    }
    createdAt: string
}

const ROLE_COLORS: Record<string, string> = {
    ADMIN: 'bg-red-500/10 text-red-500 border-red-500/20',
    MANAGER: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    MEMBER: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    ASSISTANT: 'bg-green-500/10 text-green-500 border-green-500/20',
    INTERN: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

const ROLES = ['MANAGER', 'MEMBER', 'ASSISTANT', 'INTERN'] as const

export default function WorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const { data: session } = useSession()
    const [workspace, setWorkspace] = useState<Workspace | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'settings'>('overview')

    // Invite modal state
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<typeof ROLES[number]>('MEMBER')
    const [isInviting, setIsInviting] = useState(false)

    // Settings state
    const [editName, setEditName] = useState('')
    const [editDescription, setEditDescription] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    // Delete state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')
    const [isDeleting, setIsDeleting] = useState(false)

    const isOwner = workspace?.ownerId === session?.user?.id
    const currentMember = workspace?.members.find(m => m.userId === session?.user?.id)
    const { can } = usePermissions()
    const canManageMembers = can('workspace.members') || isOwner
    const canManageSettings = can('workspace.manage') || isOwner
    const canInvite = can('workspace.invite') || canManageMembers

    // Custom permission overrides state
    const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null)
    const [pendingPerms, setPendingPerms] = useState<Record<string, { action: string; granted: boolean }[]>>({})
    const [savingPerms, setSavingPerms] = useState<string | null>(null)

    useEffect(() => {
        fetchWorkspace()
    }, [id])

    useEffect(() => {
        if (workspace) {
            setEditName(workspace.name)
            setEditDescription(workspace.description || '')
        }
    }, [workspace])

    const fetchWorkspace = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/workspaces/${id}`)
            if (!response.ok) {
                throw new Error('Failed to fetch workspace')
            }
            const data = await response.json()
            setWorkspace(data.workspace)
        } catch (err: unknown) {
            setError(getSafeErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const handleInviteMember = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inviteEmail.trim()) return

        setIsInviting(true)
        try {
            const response = await fetch(`/api/workspaces/${id}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to invite member')
            }

            await fetchWorkspace()
            setShowInviteModal(false)
            setInviteEmail('')
            setInviteRole('MEMBER')
        } catch (err: unknown) {
            setError(getSafeErrorMessage(err))
        } finally {
            setIsInviting(false)
        }
    }

    const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
        try {
            const response = await fetch(`/api/workspaces/${id}/members/${memberId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            })

            if (!response.ok) {
                throw new Error('Failed to update member role')
            }

            await fetchWorkspace()
        } catch (err: unknown) {
            setError(getSafeErrorMessage(err))
        }
    }

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm('Are you sure you want to remove this member?')) return

        try {
            const response = await fetch(`/api/workspaces/${id}/members/${memberId}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                throw new Error('Failed to remove member')
            }

            await fetchWorkspace()
        } catch (err: unknown) {
            setError(getSafeErrorMessage(err))
        }
    }

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            const response = await fetch(`/api/workspaces/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName, description: editDescription }),
            })

            if (!response.ok) {
                throw new Error('Failed to update workspace')
            }

            await fetchWorkspace()
        } catch (err: unknown) {
            setError(getSafeErrorMessage(err))
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteWorkspace = async () => {
        if (deleteConfirmText !== workspace?.name) return

        setIsDeleting(true)
        try {
            const response = await fetch(`/api/workspaces/${id}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                throw new Error('Failed to delete workspace')
            }

            router.push('/workspaces')
        } catch (err: unknown) {
            setError(getSafeErrorMessage(err))
        } finally {
            setIsDeleting(false)
        }
    }

    if (loading) {
        return (
            <MainLayout>
                <div className="space-y-6 animate-pulse">
                    <div className="h-8 w-48 bg-secondary rounded-lg" />
                    <div className="h-64 bg-secondary rounded-xl" />
                </div>
            </MainLayout>
        )
    }

    if (error || !workspace) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center py-12">
                    <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Error</h2>
                    <p className="text-muted-foreground">{error || 'Workspace not found'}</p>
                    <Button onClick={() => router.push('/workspaces')} className="mt-4">
                        Back to Workspaces
                    </Button>
                </div>
            </MainLayout>
        )
    }

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/workspaces')}
                            className="hover:bg-secondary"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-2xl font-bold">{workspace.name}</h1>
                                    {isOwner && (
                                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                                            <Crown className="w-3 h-3 mr-1" />
                                            Owner
                                        </Badge>
                                    )}
                                </div>
                                {workspace.description && (
                                    <p className="text-muted-foreground text-sm">{workspace.description}</p>
                                )}
                            </div>
                        </div>
                    </div>
                    {canInvite && (
                        <Button
                            onClick={() => setShowInviteModal(true)}
                            className="gap-2"
                            variant="gradient"
                        >
                            <UserPlus className="w-4 h-4" />
                            Invite Member
                        </Button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-border pb-2">
                    {(['overview', 'members', 'settings'] as const)
                        .filter((tab) => {
                            if (tab === 'members') return canManageMembers
                            if (tab === 'settings') return canManageSettings
                            return true
                        })
                        .map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                    activeTab === tab
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-secondary"
                                )}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{workspace._count.members}</p>
                                        <p className="text-sm text-muted-foreground">Team Members</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                        <Briefcase className="w-5 h-5 text-indigo-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{workspace._count.cases}</p>
                                        <p className="text-sm text-muted-foreground">Total Cases</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{workspace._count.clients}</p>
                                        <p className="text-sm text-muted-foreground">Clients</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="md:col-span-3">
                            <CardHeader>
                                <CardTitle>Workspace Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Owner</p>
                                        <p className="font-medium">{workspace.owner.name}</p>
                                        <p className="text-sm text-muted-foreground">{workspace.owner.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Created</p>
                                        <p className="font-medium">
                                            {new Date(workspace.createdAt).toLocaleDateString('en-IN', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                timeZone: 'Asia/Kolkata',
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === 'members' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Team Members ({workspace.members.length})
                            </CardTitle>
                            <CardDescription>
                                Manage your workspace team and their roles
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {workspace.members.map((member) => {
                                    const isMemberOwner = member.userId === workspace.ownerId
                                    const isSelf = member.userId === session?.user?.id
                                    const isExpanded = expandedMemberId === member.id
                                    const hasPendingPerms = !!pendingPerms[member.id]

                                    return (
                                        <div
                                            key={member.id}
                                            className="rounded-lg border border-border overflow-hidden"
                                        >
                                            {/* Member Row */}
                                            <div className="flex items-center justify-between p-4 bg-secondary/50 hover:bg-secondary transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium">
                                                        {member.user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-medium">{member.user.name}</p>
                                                            {isMemberOwner && (
                                                                <Crown className="w-4 h-4 text-amber-500" />
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">{member.user.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {canManageMembers && !isMemberOwner && !isSelf ? (
                                                        <>
                                                            <select
                                                                value={member.role}
                                                                onChange={(e) => handleUpdateMemberRole(member.id, e.target.value)}
                                                                className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm"
                                                            >
                                                                {ROLES.map((role) => (
                                                                    <option key={role} value={role}>
                                                                        {role}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRemoveMember(member.id)}
                                                                className="text-destructive hover:bg-destructive/10"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                            {/* Expand custom permissions */}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setExpandedMemberId(isExpanded ? null : member.id)}
                                                                title="Custom permission overrides"
                                                            >
                                                                {isExpanded ? (
                                                                    <ChevronDown className="w-4 h-4" />
                                                                ) : (
                                                                    <ChevronRight className="w-4 h-4" />
                                                                )}
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Badge className={ROLE_COLORS[member.role]}>
                                                            {member.role}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Custom Permission Overrides Panel */}
                                            {isExpanded && canManageMembers && !isMemberOwner && (
                                                <div className="border-t border-border p-4 bg-card/50">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-2">
                                                            <Shield className="w-4 h-4 text-primary" />
                                                            <span className="text-sm font-medium">Custom Permission Overrides</span>
                                                        </div>
                                                        {hasPendingPerms && (
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => {
                                                                        setPendingPerms(prev => {
                                                                            const next = { ...prev }
                                                                            delete next[member.id]
                                                                            return next
                                                                        })
                                                                    }}
                                                                >
                                                                    <X className="w-3 h-3 mr-1" /> Discard
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="gradient"
                                                                    disabled={savingPerms === member.id}
                                                                    onClick={async () => {
                                                                        setSavingPerms(member.id)
                                                                        try {
                                                                            const res = await fetch(`/api/workspaces/${id}/members/${member.id}`, {
                                                                                method: 'PUT',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({ customPermissions: pendingPerms[member.id] }),
                                                                            })
                                                                            if (res.ok) {
                                                                                setPendingPerms(prev => {
                                                                                    const next = { ...prev }
                                                                                    delete next[member.id]
                                                                                    return next
                                                                                })
                                                                                await fetchWorkspace()
                                                                            }
                                                                        } catch (err) {
                                                                            console.error('Failed to save permissions:', err)
                                                                        } finally {
                                                                            setSavingPerms(null)
                                                                        }
                                                                    }}
                                                                >
                                                                    {savingPerms === member.id ? (
                                                                        <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Saving</>
                                                                    ) : (
                                                                        <><Save className="w-3 h-3 mr-1" /> Save</>
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-4">
                                                        {Object.entries(PERMISSION_GROUPS).map(([group, actions]) => {
                                                            return (
                                                                <div key={group}>
                                                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                                                        {group}
                                                                    </h4>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {(actions as readonly string[]).map(action => {
                                                                            // Hide .readOwn actions from the grid — they are
                                                                            // controlled indirectly via the .read tri-state badge
                                                                            if (Object.values(TRI_STATE_PERMISSIONS).includes(action as Permission)) return null

                                                                            const roleDefaults = ROLE_PERMISSIONS[member.role] || []
                                                                            const hasRoleDefault = roleDefaults.includes(action as Permission)
                                                                            const customPerms = pendingPerms[member.id] ?? (member.customPermissions || [])
                                                                            const override = customPerms.find(cp => cp.action === action)

                                                                            // Tri-state for .read permissions that have a .readOwn variant
                                                                            const ownAction = TRI_STATE_PERMISSIONS[action as Permission]
                                                                            const isTriState = !!ownAction

                                                                            // Determine tri-state: 'all' | 'own' | 'disabled' | null
                                                                            let triState: 'all' | 'own' | 'disabled' | null = null
                                                                            if (isTriState) {
                                                                                const hasRead = override
                                                                                    ? override.granted
                                                                                    : hasRoleDefault
                                                                                const ownOverride = customPerms.find(cp => cp.action === ownAction)
                                                                                const hasOwnDefault = roleDefaults.includes(ownAction)
                                                                                const hasReadOwn = ownOverride
                                                                                    ? ownOverride.granted
                                                                                    : hasOwnDefault

                                                                                if (hasRead) triState = 'all'
                                                                                else if (hasReadOwn) triState = 'own'
                                                                                else triState = 'disabled'
                                                                            }

                                                                            // For normal permissions: derive state from override + role default
                                                                            let state: 'role' | 'granted' | 'revoked' | 'none' = 'none'
                                                                            if (!isTriState) {
                                                                                if (override) {
                                                                                    state = override.granted ? 'granted' : 'revoked'
                                                                                } else if (hasRoleDefault) {
                                                                                    state = 'role'
                                                                                }
                                                                            }

                                                                            const label = PERMISSIONS[action as Permission]?.replace(/^[A-Z]/, (m: string) => m.toLowerCase()) || action

                                                                            // Styling for tri-state badges
                                                                            let bgClass = 'bg-secondary/50 text-muted-foreground border-border'
                                                                            let icon = null

                                                                            if (isTriState) {
                                                                                if (triState === 'all') {
                                                                                    bgClass = 'bg-green-500/15 text-green-400 border-green-500/40 ring-1 ring-green-500/20'
                                                                                    icon = <Check className="w-3 h-3" />
                                                                                } else if (triState === 'own') {
                                                                                    bgClass = 'bg-blue-500/15 text-blue-400 border-blue-500/40 ring-1 ring-blue-500/20'
                                                                                    icon = <Users className="w-3 h-3" />
                                                                                } else {
                                                                                    bgClass = 'bg-secondary/50 text-muted-foreground border-border line-through'
                                                                                    icon = <X className="w-3 h-3" />
                                                                                }
                                                                            } else {
                                                                                if (state === 'role') {
                                                                                    bgClass = 'bg-primary/10 text-primary border-primary/30'
                                                                                    icon = <Check className="w-3 h-3" />
                                                                                } else if (state === 'granted') {
                                                                                    bgClass = 'bg-green-500/15 text-green-400 border-green-500/40 ring-1 ring-green-500/20'
                                                                                    icon = <Check className="w-3 h-3" />
                                                                                } else if (state === 'revoked') {
                                                                                    bgClass = 'bg-red-500/15 text-red-400 border-red-500/40 ring-1 ring-red-500/20 line-through'
                                                                                    icon = <X className="w-3 h-3" />
                                                                                }
                                                                            }

                                                                            // MANAGER skips 'View Own' — only cycles All ↔ Disabled
                                                                            // All other roles (ADMIN, MEMBER, ASSISTANT, INTERN) support all three states
                                                                            const supportsOwnState = member.role !== 'MANAGER'

                                                                            // Tri-state click handler
                                                                            const handleTriStateClick = () => {
                                                                                const current = pendingPerms[member.id] ?? (member.customPermissions || []).map(cp => ({ action: cp.action, granted: cp.granted }))
                                                                                const copy = current.filter(cp => cp.action !== action && cp.action !== ownAction)

                                                                                if (triState === 'all') {
                                                                                    if (supportsOwnState) {
                                                                                        // → View Own: revoke .read, grant .readOwn
                                                                                        copy.push({ action, granted: false })
                                                                                        copy.push({ action: ownAction!, granted: true })
                                                                                    } else {
                                                                                        // MANAGER/ADMIN: skip own, go straight to Disabled
                                                                                        copy.push({ action, granted: false })
                                                                                        copy.push({ action: ownAction!, granted: false })
                                                                                    }
                                                                                } else if (triState === 'own') {
                                                                                    // → Disabled: revoke both
                                                                                    copy.push({ action, granted: false })
                                                                                    copy.push({ action: ownAction!, granted: false })
                                                                                } else {
                                                                                    // disabled → View All: explicitly grant .read
                                                                                    copy.push({ action, granted: true })
                                                                                    copy.push({ action: ownAction!, granted: false })
                                                                                }

                                                                                setPendingPerms(prev => ({ ...prev, [member.id]: copy }))
                                                                            }

                                                                            // Normal toggle click handler
                                                                            const handleNormalClick = () => {
                                                                                const current = pendingPerms[member.id] ?? (member.customPermissions || []).map(cp => ({ action: cp.action, granted: cp.granted }))
                                                                                const copy = [...current]
                                                                                const idx = copy.findIndex(cp => cp.action === action)

                                                                                if (idx >= 0) {
                                                                                    if (copy[idx].granted) {
                                                                                        copy[idx] = { action, granted: false }
                                                                                    } else {
                                                                                        copy.splice(idx, 1)
                                                                                    }
                                                                                } else {
                                                                                    copy.push({ action, granted: !hasRoleDefault })
                                                                                }

                                                                                setPendingPerms(prev => ({ ...prev, [member.id]: copy }))
                                                                            }

                                                                            // Tri-state label suffix
                                                                            const triLabel = isTriState
                                                                                ? triState === 'all' ? ' (all)'
                                                                                    : triState === 'own' ? ' (own)'
                                                                                        : ''
                                                                                : ''

                                                                            return (
                                                                                <button
                                                                                    key={action}
                                                                                    onClick={isTriState ? handleTriStateClick : handleNormalClick}
                                                                                    title={isTriState ? `Click to cycle: View All → View Own → Disabled` : undefined}
                                                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-all cursor-pointer hover:opacity-80 ${bgClass}`}
                                                                                >
                                                                                    {icon}
                                                                                    {label}{triLabel}
                                                                                </button>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>

                                                    {/* Legend */}
                                                    <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-border">
                                                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <span className="w-3 h-3 rounded bg-primary/10 border border-primary/30" /> Role default
                                                        </span>
                                                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <span className="w-3 h-3 rounded bg-green-500/15 border border-green-500/40 ring-1 ring-green-500/20" /> Granted / View all
                                                        </span>
                                                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <span className="w-3 h-3 rounded bg-blue-500/15 border border-blue-500/40 ring-1 ring-blue-500/20" /> View own
                                                        </span>
                                                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <span className="w-3 h-3 rounded bg-red-500/15 border border-red-500/40 ring-1 ring-red-500/20" /> Revoked
                                                        </span>
                                                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <span className="w-3 h-3 rounded bg-secondary/50 border border-border" /> Not granted
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="w-5 h-5" />
                                    Workspace Settings
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSaveSettings} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Workspace Name</label>
                                        <Input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            disabled={!canManageSettings}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Description</label>
                                        <Input
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            disabled={!canManageSettings}
                                        />
                                    </div>
                                    {canManageSettings && (
                                        <Button type="submit" disabled={isSaving} className="gap-2">
                                            <Save className="w-4 h-4" />
                                            {isSaving ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                    )}
                                </form>
                            </CardContent>
                        </Card>

                        {isOwner && (
                            <Card className="border-destructive/50">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-destructive">
                                        <AlertTriangle className="w-5 h-5" />
                                        Danger Zone
                                    </CardTitle>
                                    <CardDescription>
                                        Irreversible and destructive actions
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {!showDeleteConfirm ? (
                                        <Button
                                            variant="destructive"
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete Workspace
                                        </Button>
                                    ) : (
                                        <div className="space-y-4 p-4 bg-destructive/10 rounded-lg">
                                            <p className="text-sm">
                                                This action cannot be undone. This will permanently delete the
                                                <strong> {workspace.name}</strong> workspace and all associated data.
                                            </p>
                                            <p className="text-sm">
                                                Please type <strong>{workspace.name}</strong> to confirm.
                                            </p>
                                            <Input
                                                value={deleteConfirmText}
                                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                                placeholder={workspace.name}
                                            />
                                            <div className="flex gap-3">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => {
                                                        setShowDeleteConfirm(false)
                                                        setDeleteConfirmText('')
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    onClick={handleDeleteWorkspace}
                                                    disabled={deleteConfirmText !== workspace.name || isDeleting}
                                                >
                                                    {isDeleting ? 'Deleting...' : 'Delete Workspace'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* Invite Modal */}
                {showInviteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setShowInviteModal(false)}
                        />
                        <Card className="relative z-10 w-full max-w-md mx-4 animate-fade-in-up">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <UserPlus className="w-5 h-5" />
                                    Invite Team Member
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowInviteModal(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleInviteMember} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            Email Address <span className="text-destructive">*</span>
                                        </label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                type="email"
                                                placeholder="colleague@example.com"
                                                value={inviteEmail}
                                                onChange={(e) => setInviteEmail(e.target.value)}
                                                className="pl-10"
                                                disabled={isInviting}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Role</label>
                                        <select
                                            value={inviteRole}
                                            onChange={(e) => setInviteRole(e.target.value as typeof ROLES[number])}
                                            className="w-full bg-secondary border border-border rounded-lg px-3 py-2"
                                            disabled={isInviting}
                                        >
                                            {ROLES.map((role) => (
                                                <option key={role} value={role}>
                                                    {role}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setShowInviteModal(false)}
                                            className="flex-1"
                                            disabled={isInviting}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="flex-1"
                                            variant="gradient"
                                            disabled={isInviting || !inviteEmail.trim()}
                                        >
                                            {isInviting ? 'Inviting...' : 'Send Invite'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </MainLayout>
    )
}
