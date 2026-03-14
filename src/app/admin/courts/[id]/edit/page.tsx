'use client'

import { getSafeErrorMessage } from '@/lib/api-error'
import { use, useState, useEffect } from 'react'
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
    AlertCircle,
    Plus,
    X,
    LayoutGrid,
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

interface Zone {
    name: string
    courtNumbers: string
}

export default function EditAdminCourtPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: courtId } = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        courtName: '',
        courtType: '',
        address: '',
        city: '',
        state: '',
        displayBoardUrl: '',
    })

    const [zones, setZones] = useState<Zone[]>([])
    const [newZoneName, setNewZoneName] = useState('')
    const [newZoneCourts, setNewZoneCourts] = useState('')

    useEffect(() => {
        if (courtId) {
            fetchCourt()
        }
    }, [courtId])

    const fetchCourt = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/courts/${courtId}`)

            if (!response.ok) {
                throw new Error('Failed to fetch court')
            }

            const data = await response.json()
            setFormData({
                courtName: data.courtName || '',
                courtType: data.courtType || '',
                address: data.address || '',
                city: data.city || '',
                state: data.state || '',
                displayBoardUrl: data.displayBoardUrl || '',
            })
            // Load existing zones if any
            if (Array.isArray(data.zones)) {
                setZones(data.zones)
            }
        } catch (err) {
            setError(getSafeErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const addZone = () => {
        const name = newZoneName.trim()
        if (!name) return
        if (zones.some(z => z.name.toLowerCase() === name.toLowerCase())) {
            setError('A zone with this name already exists')
            return
        }
        setZones(prev => [...prev, { name, courtNumbers: newZoneCourts.trim() }])
        setNewZoneName('')
        setNewZoneCourts('')
        setError('')
    }

    const removeZone = (index: number) => {
        setZones(prev => prev.filter((_, i) => i !== index))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!courtId) {
            setError('Court ID is missing')
            return
        }

        if (!formData.courtName || !formData.courtType) {
            setError('Court name and type are required')
            return
        }

        try {
            setSaving(true)
            const response = await fetch(`/api/courts/${courtId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    address: formData.address || null,
                    city: formData.city || null,
                    state: formData.state || null,
                    displayBoardUrl: formData.displayBoardUrl || null,
                    zones: zones.length > 0 ? zones : null,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update court')
            }

            router.push('/admin/courts')
        } catch (err) {
            setError(getSafeErrorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        )
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
                        Edit Court
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Update court information
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

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* ── Court Information ── */}
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

                {/* ── Court Zones ── */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <LayoutGrid className="w-5 h-5" />
                            Court Zones
                            <span className="text-sm font-normal text-muted-foreground ml-1">(optional)</span>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Zones group court rooms into physical sections. They appear as options
                            when creating or editing a case assigned to this court.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Existing zones */}
                        {zones.length > 0 && (
                            <div className="space-y-2">
                                {zones.map((zone, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 border border-border"
                                    >
                                        <div>
                                            <p className="font-medium text-sm">{zone.name}</p>
                                            {zone.courtNumbers && (
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Courts: {zone.courtNumbers}
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={() => removeZone(index)}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add zone row */}
                        <div className="flex flex-col gap-3 p-4 rounded-lg border border-dashed border-border bg-secondary/20">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Add a Zone
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label htmlFor="zoneName" className="text-xs">Zone Name</Label>
                                    <Input
                                        id="zoneName"
                                        placeholder="e.g., Zone A"
                                        value={newZoneName}
                                        onChange={(e) => setNewZoneName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') { e.preventDefault(); addZone() }
                                        }}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="zoneCourts" className="text-xs">
                                        Court Room Numbers
                                        <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                                    </Label>
                                    <Input
                                        id="zoneCourts"
                                        placeholder="e.g., 1, 2, 3, DB"
                                        value={newZoneCourts}
                                        onChange={(e) => setNewZoneCourts(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') { e.preventDefault(); addZone() }
                                        }}
                                    />
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="self-start gap-2"
                                onClick={addZone}
                                disabled={!newZoneName.trim()}
                            >
                                <Plus className="w-4 h-4" />
                                Add Zone
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <Link href="/admin/courts">
                        <Button type="button" variant="outline">
                            Cancel
                        </Button>
                    </Link>
                    <Button
                        type="submit"
                        disabled={saving}
                        className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}