'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
    AlertCircle,
} from 'lucide-react'
import Link from 'next/link'

const courtTypes = [
    { value: 'SUPREME', label: 'Supreme Court' },
    { value: 'HIGH', label: 'High Court' },
    { value: ' DISTRICT', label: 'District Court' },
    { value: 'TRIBUNAL', label: 'Tribunal' },
    { value: 'FAMILY', label: 'Family Court' },
    { value: 'CONSUMER', label: 'Consumer Court' },
    { value: 'OTHER', label: 'Other' },
]

export default function NewAdminCourtPage() {
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

            router.push('/admin/courts')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/courts">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        Add New Court
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Register a new court in the system
                    </p>
                </div>
            </div>

            {error && (
                <Card className="border-destructive">
                    <CardContent className="p-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        <span className="text-destructive">{error}</span>
                    </CardContent>
                </Card>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Court Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Court Name */}
                        <div className="space-y-2">
                            <Label htmlFor="courtName">
                                Court Name <span className="text-destructive">*</span>
                            </Label>
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
                            <Label htmlFor="courtType">
                                Court Type <span className="text-destructive">*</span>
                            </Label>
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

                        {/* Address */}
                        <div className="space-y-2">
                            <Label htmlFor="address" className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                Address
                            </Label>
                            <Textarea
                                id="address"
                                placeholder="Court address"
                                value={formData.address}
                                onChange={(e) => handleChange('address', e.target.value)}
                                rows={3}
                            />
                        </div>

                        {/* City & State */}
                        <div className="grid grid-cols-2 gap-4">
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

                        {/* Display Board URL */}
                        <div className="space-y-2">
                            <Label htmlFor="displayBoardUrl" className="flex items-center gap-2">
                                <Monitor className="w-4 h-4" />
                                Display Board URL
                            </Label>
                            <Input
                                id="displayBoardUrl"
                                type="url"
                                placeholder="https://example.com/display-board"
                                value={formData.displayBoardUrl}
                                onChange={(e) => handleChange('displayBoardUrl', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                URL to the court's online display board for scraping hearing data
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-6">
                    <Link href="/admin/courts">
                        <Button type="button" variant="outline">
                            Cancel
                        </Button>
                    </Link>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
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
            </form>
        </div>
    )
}
