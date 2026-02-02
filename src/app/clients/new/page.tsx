'use client'

import { useState } from 'react'
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
        address: '',
        contactPerson: '',
        clientType: 'INDIVIDUAL',
        notes: '',
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const workspaceRes = await fetch('/api/workspaces')
            const workspaceData = await workspaceRes.json()

            if (!workspaceRes.ok || !workspaceData.workspaces?.length) {
                throw new Error('No workspace found')
            }

            const res = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    workspaceId: workspaceData.workspaces[0].id,
                }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to create client')

            router.push('/clients')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
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

            <form onSubmit={handleSubmit}>
                <Card className="glass-card max-w-2xl">
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
                                <Label htmlFor="phone">Phone</Label>
                                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Input id="address" name="address" value={formData.address} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contactPerson">Contact Person</Label>
                            <Input id="contactPerson" name="contactPerson" value={formData.contactPerson} onChange={handleChange} />
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
                            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-primary to-accent text-white gap-2">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {loading ? 'Creating...' : 'Create Client'}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    )
}
