'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    CheckSquare, Clock, AlertCircle, CheckCircle,
    Briefcase, User, Loader2, Circle, ArrowLeft
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Task = {
    id: string
    title: string
    description: string | null
    status: string
    priority: string
    dueDate: string | null
    case: { id: string; title: string; caseNumber: string } | null
    assignee: { id: string; name: string; avatar: string | null } | null
}

// Match Prisma TaskStatus enum
const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    PENDING: { icon: Circle, color: 'text-slate-400', label: 'Pending' },
    IN_PROGRESS: { icon: Clock, color: 'text-blue-400', label: 'In Progress' },
    UNDER_REVIEW: { icon: AlertCircle, color: 'text-amber-400', label: 'Under Review' },
    COMPLETED: { icon: CheckCircle, color: 'text-green-400', label: 'Completed' },
    OVERDUE: { icon: AlertCircle, color: 'text-red-400', label: 'Overdue' },
}

const priorityColors: Record<string, string> = {
    HIGH: 'bg-red-500/10 text-red-400',
    MEDIUM: 'bg-amber-500/10 text-amber-400',
    LOW: 'bg-green-500/10 text-green-400',
}

export default function TasksPage() {
    const router = useRouter()
    const [tasks, setTasks] = useState<Task[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    useEffect(() => {
        fetchTasks()
    }, [statusFilter])

    const fetchTasks = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (statusFilter) params.append('status', statusFilter)

            const res = await fetch(`/api/tasks?${params.toString()}`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setTasks(data.tasks)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
        })
    }

    const isOverdue = (date: string | null, status: string) => {
        if (!date || status === 'COMPLETED') return false
        return new Date(date) < new Date()
    }

    // Group by status
    const groupedTasks = tasks.reduce((acc, t) => {
        if (!acc[t.status]) acc[t.status] = []
        acc[t.status].push(t)
        return acc
    }, {} as Record<string, Task[]>)

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
                                <CheckSquare className="w-5 h-5 text-white" />
                            </div>
                            Tasks
                        </h1>
                        <p className="text-muted-foreground mt-1">Manage your tasks and assignments</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                    >
                        <option value="">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="UNDER_REVIEW">Under Review</option>
                        <option value="COMPLETED">Completed</option>
                    </select>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                {Object.entries(statusConfig).map(([status, config]) => {
                    const StatusIcon = config.icon
                    const count = tasks.filter(t => t.status === status).length
                    return (
                        <Card key={status} className="glass-card">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center`}>
                                        <StatusIcon className={`w-5 h-5 ${config.color}`} />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">{count}</p>
                                        <p className="text-xs text-muted-foreground">{config.label}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
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
            ) : tasks.length === 0 ? (
                <Card className="glass-card">
                    <CardContent className="p-12 text-center">
                        <CheckSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-semibold mb-2">No tasks found</h3>
                        <p className="text-muted-foreground">Tasks will appear here when assigned to cases.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {['PENDING', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED'].map((status) => {
                        const config = statusConfig[status]
                        const StatusIcon = config.icon
                        const statusTasks = groupedTasks[status] || []
                        return (
                            <div key={status}>
                                <div className="flex items-center gap-2 mb-4">
                                    <StatusIcon className={`w-5 h-5 ${config.color}`} />
                                    <h3 className="font-semibold">{config.label}</h3>
                                    <Badge variant="outline" className="ml-auto">{statusTasks.length}</Badge>
                                </div>
                                <div className="space-y-3">
                                    {statusTasks.map(task => (
                                        <Card
                                            key={task.id}
                                            className="glass-card hover:border-primary/30 transition-all cursor-pointer"
                                            onClick={() => task.case && router.push(`/cases/${task.case.id}`)}
                                        >
                                            <CardContent className="p-4">
                                                <h4 className="font-medium mb-2">{task.title}</h4>
                                                <div className="space-y-2 text-sm">
                                                    {task.case && (
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <Briefcase className="w-4 h-4" />
                                                            <span className="truncate">{task.case.caseNumber}</span>
                                                        </div>
                                                    )}
                                                    {task.assignee && (
                                                        <div className="flex items-center gap-2 text-muted-foreground">
                                                            <User className="w-4 h-4" />
                                                            <span>{task.assignee.name}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center justify-between">
                                                        <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                                                        {task.dueDate && (
                                                            <span className={`text-xs ${isOverdue(task.dueDate, task.status) ? 'text-red-400' : 'text-muted-foreground'}`}>
                                                                {formatDate(task.dueDate)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
