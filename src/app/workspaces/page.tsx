'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import MainLayout from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
    Building2,
    Plus,
    Users,
    Briefcase,
    Calendar,
    Settings,
    Crown,
    UserCheck,
    Search,
    ArrowLeft,
    X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

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
    _count: {
        cases: number
        members: number
    }
    createdAt: string
}

export default function WorkspacesPage() {
    const router = useRouter()
    const { data: session } = useSession()
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newWorkspaceName, setNewWorkspaceName] = useState('')
    const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('')
    const [isCreating, setIsCreating] = useState(false)

    useEffect(() => {
        fetchWorkspaces()
    }, [])

    const fetchWorkspaces = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/workspaces')
            if (!response.ok) {
                throw new Error('Failed to fetch workspaces')
            }
            const data = await response.json()
            setWorkspaces(data.workspaces || [])
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error'
            setError(errorMessage)
            console.error('Failed to fetch workspaces:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newWorkspaceName.trim()) {
            return
        }

        setIsCreating(true)
        try {
            const response = await fetch('/api/workspaces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newWorkspaceName,
                    description: newWorkspaceDescription || null,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Failed to create workspace')
            }

            const data = await response.json()
            setWorkspaces(prev => [data.workspace, ...prev])
            setNewWorkspaceName('')
            setNewWorkspaceDescription('')
            setShowCreateModal(false)
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error'
            setError(errorMessage)
        } finally {
            setIsCreating(false)
        }
    }

    const filteredWorkspaces = workspaces.filter(workspace =>
        workspace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workspace.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const ownedWorkspaces = filteredWorkspaces.filter(w => w.ownerId === session?.user?.id)
    const memberWorkspaces = filteredWorkspaces.filter(w => w.ownerId !== session?.user?.id)

    if (loading) {
        return (
            <MainLayout>
                <div className="space-y-6 animate-pulse">
                    <div className="h-8 w-48 bg-secondary rounded-lg" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-48 bg-secondary rounded-xl" />
                        ))}
                    </div>
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
                            onClick={() => router.push('/dashboard')}
                            className="hover:bg-secondary"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold">Workspaces</h1>
                            <p className="text-muted-foreground mt-1">
                                Manage your legal practice workspaces
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => setShowCreateModal(true)}
                        className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                    >
                        <Plus className="w-4 h-4" />
                        New Workspace
                    </Button>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search workspaces..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {error && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                        {error}
                    </div>
                )}

                {/* Owned Workspaces */}
                {ownedWorkspaces.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Crown className="w-5 h-5 text-amber-500" />
                            Your Workspaces
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {ownedWorkspaces.map((workspace, index) => (
                                <WorkspaceCard
                                    key={workspace.id}
                                    workspace={workspace}
                                    isOwner={true}
                                    index={index}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Member Workspaces */}
                {memberWorkspaces.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-blue-500" />
                            Workspaces You&apos;re A Member Of
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {memberWorkspaces.map((workspace, index) => (
                                <WorkspaceCard
                                    key={workspace.id}
                                    workspace={workspace}
                                    isOwner={false}
                                    index={index}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {filteredWorkspaces.length === 0 && !loading && (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No workspaces found</h3>
                            <p className="text-muted-foreground text-center mb-4">
                                {searchQuery
                                    ? 'No workspaces match your search'
                                    : 'Create your first workspace to get started'}
                            </p>
                            {!searchQuery && (
                                <Button
                                    onClick={() => setShowCreateModal(true)}
                                    className="gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Create Workspace
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Create Workspace Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setShowCreateModal(false)}
                        />
                        <Card className="relative z-10 w-full max-w-md mx-4 animate-fade-in-up">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Create New Workspace</CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateWorkspace} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            Workspace Name <span className="text-destructive">*</span>
                                        </label>
                                        <Input
                                            placeholder="e.g., Smith & Associates"
                                            value={newWorkspaceName}
                                            onChange={(e) => setNewWorkspaceName(e.target.value)}
                                            disabled={isCreating}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            Description
                                        </label>
                                        <Input
                                            placeholder="Brief description of this workspace"
                                            value={newWorkspaceDescription}
                                            onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                                            disabled={isCreating}
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setShowCreateModal(false)}
                                            className="flex-1"
                                            disabled={isCreating}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600"
                                            disabled={isCreating || !newWorkspaceName.trim()}
                                        >
                                            {isCreating ? 'Creating...' : 'Create Workspace'}
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

function WorkspaceCard({
    workspace,
    isOwner,
    index,
}: {
    workspace: Workspace
    isOwner: boolean
    index: number
}) {
    return (
        <Link href={`/workspaces/${workspace.id}`}>
            <Card
                className={cn(
                    "animate-fade-in-up transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer h-full",
                    isOwner && "ring-1 ring-amber-500/20"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
            >
                <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        {isOwner ? (
                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                                <Crown className="w-3 h-3 mr-1" />
                                Owner
                            </Badge>
                        ) : (
                            <Badge variant="secondary">
                                <UserCheck className="w-3 h-3 mr-1" />
                                Member
                            </Badge>
                        )}
                    </div>

                    <h3 className="font-semibold text-lg mb-1 truncate">{workspace.name}</h3>
                    {workspace.description && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {workspace.description}
                        </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {workspace._count.members} members
                        </div>
                        <div className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {workspace._count.cases} cases
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                            Created {new Date(workspace.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
