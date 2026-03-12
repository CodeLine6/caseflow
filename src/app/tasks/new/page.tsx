'use client'

import { getSafeErrorMessage } from '@/lib/api-error'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    CheckCircle, Calendar, Briefcase, User,
    Loader2, AlertCircle, ArrowLeft, Save
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Case = {
    id: string
    title: string
    caseNumber: string
}

type User = {
    id: string
    name: string
}

export default function NewTaskPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
            <NewTaskContent />
        </Suspense>
    )
}

function NewTaskContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const caseIdParam = searchParams.get('caseId')

    const [loading, setLoading] = useState(false)
    const [loadingResources, setLoadingResources] = useState(true)
    const [error, setError] = useState('')
    const [cases, setCases] = useState<Case[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
    const [workspaceError, setWorkspaceError] = useState('')

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        dueDate: '',
        priority: 'MEDIUM',
        status: 'PENDING',
        caseId: caseIdParam || '',
        assignedToId: '',
    })

    useEffect(() => {
        async function validateWorkspace() {
            try {
                const res = await fetch('/api/workspaces')
                const data = await res.json()
                const workspaces = data.workspaces || []

                if (workspaces.length === 0) {
                    setWorkspaceError('No workspace found. Please create a workspace first.')
                    return
                }

                const stored = localStorage.getItem('activeWorkspaceId')
                const match = workspaces.find((ws: { id: string }) => ws.id === stored)

                if (match) {
                    setActiveWorkspaceId(match.id)
                } else {
                    setActiveWorkspaceId(workspaces[0].id)
                    localStorage.setItem('activeWorkspaceId', workspaces[0].id)
                }
            } catch {
                setWorkspaceError('Failed to load workspaces. Please try again.')
            }
        }
        validateWorkspace()
        fetchResources()
    }, [])

    const fetchResources = async () => {
        try {
            const [casesRes, usersRes] = await Promise.all([
                fetch('/api/cases'),
                fetch('/api/users') // Assuming this endpoint exists, or we might need to fetch workspace members
            ])

            const casesData = await casesRes.json()
            // For now, let's assume we can assign to any user, or we might need to refine this later
            // If /api/users doesn't exist, we might fail here. Let's check if we can get workspace members instead.
            // For MVP, maybe just fetch cases correctly.

            if (casesRes.ok) setCases(casesData.cases || [])

        } catch (err) {
            console.error('Failed to load resources:', err)
        } finally {
            setLoadingResources(false)
        }
    }

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!activeWorkspaceId) {
            setError(workspaceError || 'No active workspace selected. Please select a workspace from the sidebar first.')
            return
        }

        if (!formData.title) {
            setError('Please enter a task title')
            return
        }

        try {
            setLoading(true)
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    workspaceId: activeWorkspaceId,
                    dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create task')
            }

            router.push('/tasks')
        } catch (err) {
            setError(getSafeErrorMessage(err))
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

            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                            Create New Task
                        </h1>
                        <p className="text-muted-foreground mt-1">Add a new task to your workspace</p>
                    </div>
                </div>

                {error && (
                    <Card className="glass-card border-destructive/50 mb-6">
                        <CardContent className="p-4 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                            <p className="text-destructive">{error}</p>
                        </CardContent>
                    </Card>
                )}

                {workspaceError ? (
                    <Card className="glass-card">
                        <CardContent className="p-12 text-center space-y-4">
                            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                            <h2 className="text-xl font-semibold">{workspaceError}</h2>
                            <p className="text-muted-foreground">You need to be a member of a workspace before creating a task.</p>
                            <Button variant="gradient" onClick={() => router.push('/workspaces')}>
                                Go to Workspaces
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle>Task Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Task Title *</Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => handleChange('title', e.target.value)}
                                        placeholder="e.g., Review case documents"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        placeholder="Add details about this task..."
                                        rows={3}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="dueDate">Due Date</Label>
                                        <Input
                                            id="dueDate"
                                            type="datetime-local"
                                            value={formData.dueDate}
                                            onChange={(e) => handleChange('dueDate', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="priority">Priority</Label>
                                        <select
                                            id="priority"
                                            value={formData.priority}
                                            onChange={(e) => handleChange('priority', e.target.value)}
                                            className="w-full p-3 border rounded-lg bg-background"
                                        >
                                            <option value="LOW">Low</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HIGH">High</option>
                                            <option value="URGENT">Urgent</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="caseId">Related Case (Optional)</Label>
                                    <select
                                        id="caseId"
                                        value={formData.caseId}
                                        onChange={(e) => handleChange('caseId', e.target.value)}
                                        className="w-full p-3 border rounded-lg bg-background"
                                    >
                                        <option value="">No Case</option>
                                        {cases.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.caseNumber} - {c.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end gap-3 mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Create Task
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
