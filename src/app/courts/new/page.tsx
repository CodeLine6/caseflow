'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
    Building2,
    ArrowLeft,
    Loader2,
    Monitor,
    MapPin,
    Globe,
} from 'lucide-react'
import Link from 'next/link'

const courtTypes = [
    { value: 'SUPREME', label: 'Supreme Court' },
    { value: 'HIGH', label: 'High Court' },
    { value: 'DISTRICT', label: 'District Court' },
    { value: 'TRIBUNAL', label: 'Tribunal' },
    { value: 'FAMILY', label: 'Family Court' },
    { value: 'CONSUMER', label: 'Consumer Court' },
    { value: 'OTHER', label: 'Other' },
]

export default function NewCourtPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        courtName: '',
        courtType: '',
        address: '',
        city: '',
        state: '',
        displayBoardUrl: '',
    })

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!formData.courtName || !formData.courtType) {
            setError('Court name and type are required')
            return
        }

        try {
            setLoading(true)
            const response = await fetch('/api/courts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    address: formData.address || null,
                    city: formData.city || null,
                    state: formData.state || null,
                    displayBoardUrl: formData.displayBoardUrl || null,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create court')
            }

            router.push('/courts')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <MainLayout>
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/courts">
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-white" />
                            </div>
                            Add New Court
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Register a new court in the system
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Court Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {error && (
                                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Court Name */}
                            <div className="space-y-2">
                                <Label htmlFor="courtName">Court Name *</Label>
                                <Input
                                    id="courtName"
                                    placeholder="e.g., Delhi High Court"
                                    value={formData.courtName}
                                    onChange={(e) => handleChange('courtName', e.target.value)}
                                    required
                                />
                            </div>

                            {/* Court Type */}
                            <div className="space-y-2">
                                <Label htmlFor="courtType">Court Type *</Label>
                                <Select
                                    value={formData.courtType}
                                    onValueChange={(value) => handleChange('courtType', value)}
                                >
                                    <SelectTrigger id="courtType">
                                        <SelectValue placeholder="Select court type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {courtTypes.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Location Section */}
                            <div className="pt-4 border-t">
                                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    Location
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            placeholder="e.g., New Delhi"
                                            value={formData.city}
                                            onChange={(e) => handleChange('city', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="state">State</Label>
                                        <Input
                                            id="state"
                                            placeholder="e.g., Delhi"
                                            value={formData.state}
                                            onChange={(e) => handleChange('state', e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 mt-4">
                                    <Label htmlFor="address">Full Address</Label>
                                    <Textarea
                                        id="address"
                                        placeholder="Full court address..."
                                        value={formData.address}
                                        onChange={(e) => handleChange('address', e.target.value)}
                                        rows={2}
                                    />
                                </div>
                            </div>

                            {/* Display Board Section */}
                            <div className="pt-4 border-t">
                                <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
                                    <Monitor className="w-4 h-4" />
                                    Display Board Integration
                                </h3>
                                <div className="space-y-2">
                                    <Label htmlFor="displayBoardUrl">Display Board URL</Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="displayBoardUrl"
                                                className="pl-10"
                                                placeholder="https://court.gov.in/display-board"
                                                value={formData.displayBoardUrl}
                                                onChange={(e) => handleChange('displayBoardUrl', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Link to the court's online display board showing live case status
                                        (e.g., https://delhihighcourt.nic.in/app/physical-display-board)
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => router.push('/courts')}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Court'
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </MainLayout>
    )
}
