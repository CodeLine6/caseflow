'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Calendar, Clock, Scale, Briefcase,
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

type Court = {
    id: number
    courtName: string
}

export default function NewHearingPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const caseIdParam = searchParams.get('caseId')

    const [loading, setLoading] = useState(false)
    const [loadingCases, setLoadingCases] = useState(true)
    const [loadingCourts, setLoadingCourts] = useState(true)
    const [error, setError] = useState('')
    const [cases, setCases] = useState<Case[]>([])
    const [courts, setCourts] = useState<Court[]>([])

    const [formData, setFormData] = useState({
        caseId: caseIdParam || '',
        hearingDate: '',
        hearingTime: '',
        purpose: '',
        hearingType: 'OTHER',
        courtId: '',
        courtNumber: '',
        notes: '',
    })

    useEffect(() => {
        fetchCases()
        fetchCourts()
    }, [])

    const fetchCases = async () => {
        try {
            const res = await fetch('/api/cases')
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setCases(data.cases || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load cases')
        } finally {
            setLoadingCases(false)
        }
    }

    const fetchCourts = async () => {
        try {
            const res = await fetch('/api/courts')
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setCourts(data.courts || data)
        } catch (err) {
            console.error('Failed to load courts:', err)
        } finally {
            setLoadingCourts(false)
        }
    }

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!formData.caseId || !formData.hearingDate || !formData.purpose) {
            setError('Please fill in all required fields')
            return
        }

        try {
            setLoading(true)

            // Combine date and time
            const hearingDateTime = formData.hearingTime
                ? `${formData.hearingDate}T${formData.hearingTime}`
                : `${formData.hearingDate}T10:00`

            const res = await fetch('/api/hearings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    caseId: formData.caseId,
                    hearingDate: hearingDateTime,
                    purpose: formData.purpose,
                    hearingType: formData.hearingType,
                    courtNumber: formData.courtNumber || 'TBD',
                    notes: formData.notes || null,
                    status: 'SCHEDULED',
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create hearing')
            }

            router.push('/hearings')
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

            <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/hearings')}
                        className="rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-white" />
                            </div>
                            Schedule New Hearing
                        </h1>
                        <p className="text-muted-foreground mt-1">Add a new hearing to your case</p>
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

                <form onSubmit={handleSubmit}>
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle>Hearing Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Case Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="caseId" className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4" />
                                    Case *
                                </Label>
                                {loadingCases ? (
                                    <div className="flex items-center gap-2 p-3 border rounded-lg">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm text-muted-foreground">Loading cases...</span>
                                    </div>
                                ) : cases.length === 0 ? (
                                    <div className="p-4 border border-amber-500/50 bg-amber-500/5 rounded-lg">
                                        <p className="text-sm text-amber-600 dark:text-amber-400">
                                            You don't have access to any cases. Please create or get access to a case first.
                                        </p>
                                    </div>
                                ) : (
                                    <select
                                        id="caseId"
                                        value={formData.caseId}
                                        onChange={(e) => handleChange('caseId', e.target.value)}
                                        className="w-full p-3 border rounded-lg bg-background"
                                        required
                                    >
                                        <option value="">Select a case</option>
                                        {cases.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.caseNumber} - {c.title}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Date and Time */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="hearingDate" className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Date *
                                    </Label>
                                    <Input
                                        id="hearingDate"
                                        type="date"
                                        value={formData.hearingDate}
                                        onChange={(e) => handleChange('hearingDate', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="hearingTime" className="flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        Time
                                    </Label>
                                    <Input
                                        id="hearingTime"
                                        type="time"
                                        value={formData.hearingTime}
                                        onChange={(e) => handleChange('hearingTime', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Purpose */}
                            <div className="space-y-2">
                                <Label htmlFor="purpose">Purpose *</Label>
                                <Input
                                    id="purpose"
                                    value={formData.purpose}
                                    onChange={(e) => handleChange('purpose', e.target.value)}
                                    placeholder="e.g., Arguments, Evidence submission, Final hearing"
                                    required
                                />
                            </div>

                            {/* Hearing Type */}
                            <div className="space-y-2">
                                <Label htmlFor="hearingType">Hearing Type</Label>
                                <select
                                    id="hearingType"
                                    value={formData.hearingType}
                                    onChange={(e) => handleChange('hearingType', e.target.value)}
                                    className="w-full p-3 border rounded-lg bg-background"
                                >
                                    <option value="PRELIMINARY">Preliminary</option>
                                    <option value="ARGUMENT">Arguments</option>
                                    <option value="EVIDENCE">Evidence</option>
                                    <option value="FINAL">Final Hearing</option>
                                    <option value="INTERIM">Interim Application</option>
                                    <option value="MOTION">Motion</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            {/* Court Number */}
                            <div className="space-y-2">
                                <Label htmlFor="courtNumber" className="flex items-center gap-2">
                                    <Scale className="w-4 h-4" />
                                    Court Room Number
                                </Label>
                                <Input
                                    id="courtNumber"
                                    value={formData.courtNumber}
                                    onChange={(e) => handleChange('courtNumber', e.target.value)}
                                    placeholder="e.g., 1, 2, DB"
                                />
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => handleChange('notes', e.target.value)}
                                    placeholder="Any additional notes or reminders"
                                    rows={4}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3 mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push('/hearings')}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || loadingCases || cases.length === 0}>
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Scheduling...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Schedule Hearing
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
