'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Briefcase, ArrowLeft, Save, Calendar, User, Scale,
    FileText, DollarSign, AlertCircle, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const categories = [
    { value: 'CIVIL', label: 'Civil' },
    { value: 'CRIMINAL', label: 'Criminal' },
    { value: 'FAMILY', label: 'Family' },
    { value: 'CORPORATE', label: 'Corporate' },
    { value: 'TAX', label: 'Tax' },
    { value: 'LABOR', label: 'Labor' },
    { value: 'PROPERTY', label: 'Property' },
    { value: 'CONSUMER', label: 'Consumer' },
    { value: 'OTHER', label: 'Other' },
]

const caseTypes = [
    { value: 'SUIT', label: 'Suit' },
    { value: 'PETITION', label: 'Petition' },
    { value: 'APPEAL', label: 'Appeal' },
    { value: 'REVISION', label: 'Revision' },
    { value: 'WRIT', label: 'Writ' },
    { value: 'EXECUTION', label: 'Execution' },
    { value: 'ARBITRATION', label: 'Arbitration' },
    { value: 'OTHER', label: 'Other' },
]

const priorities = [
    { value: 'HIGH', label: 'High', color: 'text-red-400' },
    { value: 'MEDIUM', label: 'Medium', color: 'text-amber-400' },
    { value: 'LOW', label: 'Low', color: 'text-green-400' },
]

export default function NewCasePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        title: '',
        caseNumber: '',
        description: '',
        caseCategory: 'CIVIL',
        caseType: 'SUIT',
        priority: 'MEDIUM',
        filingDate: new Date().toISOString().split('T')[0],
        opposingParty: '',
        opposingCounsel: '',
        caseValue: '',
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
            // First get the user's workspace
            const workspaceRes = await fetch('/api/workspaces')
            const workspaceData = await workspaceRes.json()

            if (!workspaceRes.ok || !workspaceData.workspaces?.length) {
                throw new Error('No workspace found. Please create a workspace first.')
            }

            const workspaceId = workspaceData.workspaces[0].id

            const res = await fetch('/api/cases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    workspaceId,
                    caseValue: formData.caseValue ? parseFloat(formData.caseValue) : null,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create case')
            }

            router.push(`/cases/${data.id}`)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background p-8">
            {/* Background decorations */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
            </div>

            {/* Header */}
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
                            <Briefcase className="w-5 h-5 text-white" />
                        </div>
                        New Case
                    </h1>
                    <p className="text-muted-foreground mt-1">Create a new legal case</p>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <p className="text-destructive">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Info */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-primary" />
                                    Case Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="title">Case Title *</Label>
                                        <Input
                                            id="title"
                                            name="title"
                                            value={formData.title}
                                            onChange={handleChange}
                                            placeholder="e.g., Smith vs. Johnson Property Dispute"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="caseNumber">Case Number *</Label>
                                        <Input
                                            id="caseNumber"
                                            name="caseNumber"
                                            value={formData.caseNumber}
                                            onChange={handleChange}
                                            placeholder="e.g., CASE-2024-0001"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Brief description of the case..."
                                        rows={4}
                                        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="caseCategory">Category *</Label>
                                        <select
                                            id="caseCategory"
                                            name="caseCategory"
                                            value={formData.caseCategory}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                                            required
                                        >
                                            {categories.map(cat => (
                                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="caseType">Type</Label>
                                        <select
                                            id="caseType"
                                            name="caseType"
                                            value={formData.caseType}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                                        >
                                            {caseTypes.map(type => (
                                                <option key={type.value} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="priority">Priority</Label>
                                        <select
                                            id="priority"
                                            name="priority"
                                            value={formData.priority}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                                        >
                                            {priorities.map(p => (
                                                <option key={p.value} value={p.value}>{p.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="w-5 h-5 text-primary" />
                                    Opposing Party
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="opposingParty">Opposing Party Name</Label>
                                        <Input
                                            id="opposingParty"
                                            name="opposingParty"
                                            value={formData.opposingParty}
                                            onChange={handleChange}
                                            placeholder="Name of the opposing party"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="opposingCounsel">Opposing Counsel</Label>
                                        <Input
                                            id="opposingCounsel"
                                            name="opposingCounsel"
                                            value={formData.opposingCounsel}
                                            onChange={handleChange}
                                            placeholder="Name of the opposing counsel"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card className="glass-card">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-primary" />
                                    Filing Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="filingDate">Filing Date *</Label>
                                    <Input
                                        id="filingDate"
                                        name="filingDate"
                                        type="date"
                                        value={formData.filingDate}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="caseValue">Case Value (₹)</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="caseValue"
                                            name="caseValue"
                                            type="number"
                                            value={formData.caseValue}
                                            onChange={handleChange}
                                            placeholder="0.00"
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass-card">
                            <CardContent className="p-6">
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-primary to-accent text-white gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Create Case
                                        </>
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full mt-2"
                                    onClick={() => router.back()}
                                >
                                    Cancel
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </form>
        </div>
    )
}
