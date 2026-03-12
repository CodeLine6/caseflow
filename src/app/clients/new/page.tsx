'use client'

import { getSafeErrorMessage } from '@/lib/api-error'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Users, ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function NewClientPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        alternateNumber: '',
        address: '',
        contactPerson: '',
        clientType: 'INDIVIDUAL',
        notes: '',
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
    const [workspaceError, setWorkspaceError] = useState('')

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
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        if (!activeWorkspaceId) {
            setError(workspaceError || 'No active workspace selected. Please select a workspace from the sidebar first.')
            setLoading(false)
            return
        }

        try {
            const res = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    workspaceId: activeWorkspaceId,
                }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to create client')

            router.push('/clients')
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

            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        New Client
                    </h1>
                    <p className="text-muted-foreground mt-1">Add a new client to your workspace</p>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <p className="text-destructive">{error}</p>
                </div>
            )}

            {workspaceError ? (
                <Card className="glass-card">
                    <CardContent className="p-12 text-center space-y-4">
                        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                        <h2 className="text-xl font-semibold">{workspaceError}</h2>
                        <p className="text-muted-foreground">You need to be a member of a workspace before adding a client.</p>
                        <Button variant="gradient" onClick={() => router.push('/workspaces')}>
                            Go to Workspaces
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <form onSubmit={handleSubmit}>
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle>Client Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name *</Label>
                                    <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="clientType">Type</Label>
                                    <select
                                        id="clientType"
                                        name="clientType"
                                        value={formData.clientType}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                                    >
                                        <option value="INDIVIDUAL">Individual</option>
                                        <option value="CORPORATE">Corporate</option>
                                        <option value="GOVERNMENT">Government</option>
                                        <option value="NGO">NGO</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contactPerson">Contact Person</Label>
                                    <Input id="contactPerson" name="contactPerson" value={formData.contactPerson} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Contact Number</Label>
                                    <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="alternateNumber">Alternate Number</Label>
                                    <Input id="alternateNumber" name="alternateNumber" value={formData.alternateNumber} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <Input id="address" name="address" value={formData.address} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm resize-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button type="submit" disabled={loading} variant="gradient" className="gap-2">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {loading ? 'Creating...' : 'Create Client'}
                                </Button>
                                <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            )}
        </div>
    )
}
