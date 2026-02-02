'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    ArrowLeft,
    Building2,
    Sparkles,
} from 'lucide-react'

export default function NewWorkspacePage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setIsCreating(true)
        setError(null)

        try {
            const response = await fetch('/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description: description || null }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to create workspace')
            }

            const data = await response.json()
            router.push(`/workspaces/${data.workspace.id}`)
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error'
            setError(errorMessage)
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <MainLayout>
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/workspaces')}
                        className="hover:bg-secondary"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Create New Workspace</h1>
                        <p className="text-muted-foreground">
                            Set up a new workspace for your team
                        </p>
                    </div>
                </div>

                {/* Form Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <CardTitle>Workspace Details</CardTitle>
                                <CardDescription>
                                    Enter the information for your new workspace
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreate} className="space-y-6">
                            {error && (
                                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Workspace Name <span className="text-destructive">*</span>
                                </label>
                                <Input
                                    placeholder="e.g., Smith & Associates"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={isCreating}
                                    required
                                    className="h-12"
                                />
                                <p className="text-xs text-muted-foreground">
                                    This will be the display name for your workspace
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Description
                                </label>
                                <Input
                                    placeholder="Brief description of this workspace"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={isCreating}
                                    className="h-12"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Optional: Add context about this workspace
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.push('/workspaces')}
                                    className="flex-1"
                                    disabled={isCreating}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                                    disabled={isCreating || !name.trim()}
                                >
                                    <Sparkles className="w-4 h-4" />
                                    {isCreating ? 'Creating...' : 'Create Workspace'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Info Card */}
                <Card className="bg-secondary/30 border-dashed">
                    <CardContent className="p-6">
                        <h3 className="font-medium mb-2">What happens next?</h3>
                        <ul className="text-sm text-muted-foreground space-y-2">
                            <li>• You'll be added as the workspace owner with full admin access</li>
                            <li>• You can invite team members and assign them roles</li>
                            <li>• All cases, clients, and documents will be organized in this workspace</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    )
}
