'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Calendar, Clock, Scale, Briefcase,
    Loader2, AlertCircle, ArrowLeft, Save, User, Users, Link, FileText
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MultiSelect } from '@/components/ui/multi-select'
import { TimePicker12h } from '@/components/ui/time-picker-12h'

type Case = {
    id: string
    title: string
    caseNumber: string
    workspaceId?: string
}

type Court = {
    id: number
    courtName: string
}

type WorkspaceMember = {
    id: string
    role: string
    user: {
        id: string
        name: string
        email: string
    }
}

export default function NewHearingPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const caseIdParam = searchParams.get('caseId')

    const [loading, setLoading] = useState(false)
    const [loadingCases, setLoadingCases] = useState(true)
    const [loadingCourts, setLoadingCourts] = useState(true)
    const [loadingMembers, setLoadingMembers] = useState(false)
    const [error, setError] = useState('')
    const [cases, setCases] = useState<Case[]>([])
    const [courts, setCourts] = useState<Court[]>([])
    const [members, setMembers] = useState<WorkspaceMember[]>([])

    const [formData, setFormData] = useState({
        caseId: caseIdParam || '',
        hearingDate: '',
        hearingTime: '',
        purpose: '',
        hearingType: 'OTHER',
        courtId: '',
        courtNumber: '',
        courtItemNumber: '',
        judgeName: '',
        hearingCounselId: '',
        accompaniedByIds: [] as string[],
        notes: '',
        orderLink: '',
        additionalRemarks: '',
        nextDateOfHearing: '',
    })

    useEffect(() => {
        fetchCases()
        fetchCourts()
    }, [])

    // Fetch workspace members when case is selected
    useEffect(() => {
        if (formData.caseId) {
            fetchMembersForCase(formData.caseId)
        } else {
            setMembers([])
        }
    }, [formData.caseId])

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

    const fetchMembersForCase = async (caseId: string) => {
        setLoadingMembers(true)
        try {
            // Fetch case details to get workspaceId
            const caseRes = await fetch(`/api/cases/${caseId}`)
            if (!caseRes.ok) return
            const caseData = await caseRes.json()
            const workspaceId = caseData.case?.workspaceId || caseData.workspaceId
            if (!workspaceId) return

            // Fetch workspace members
            const membersRes = await fetch(`/api/workspaces/${workspaceId}/members`)
            if (!membersRes.ok) return
            const membersData = await membersRes.json()
            const filteredMembers = (membersData.members || []).filter(
                (m: WorkspaceMember) => m.role === 'MEMBER' || m.role === 'INTERN' || m.role === 'ADMIN'
            )
            setMembers(filteredMembers)
        } catch (err) {
            console.error('Failed to load workspace members:', err)
        } finally {
            setLoadingMembers(false)
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

            // Store hearingDate at IST noon to prevent UTC day-boundary crossing
            // The actual time is stored separately in hearingTime text field
            const hearingDateTime = `${formData.hearingDate}T12:00:00+05:30`

            const res = await fetch('/api/hearings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    caseId: formData.caseId,
                    hearingDate: hearingDateTime,
                    hearingTime: formData.hearingTime || null,
                    purpose: formData.purpose,
                    hearingType: formData.hearingType,
                    courtNumber: formData.courtNumber || 'TBD',
                    courtItemNumber: formData.courtItemNumber || null,
                    judgeName: formData.judgeName || null,
                    hearingCounselId: formData.hearingCounselId || null,
                    accompaniedByIds: formData.accompaniedByIds.length > 0 ? formData.accompaniedByIds : undefined,
                    notes: formData.notes || null,
                    orderLink: formData.orderLink || null,
                    additionalRemarks: formData.additionalRemarks || null,
                    nextDateOfHearing: formData.nextDateOfHearing || null,
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

    const memberOptions = members.map(m => ({
        label: `${m.user.name}${m.role === 'INTERN' ? ' (Intern)' : ''}`,
        value: m.id,
        role: m.role,
    }))

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
                                            You don&apos;t have access to any cases. Please create or get access to a case first.
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
                                    <TimePicker12h
                                        value={formData.hearingTime}
                                        onChange={(val) => handleChange('hearingTime', val)}
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

                            {/* Court Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <div className="space-y-2">
                                    <Label htmlFor="courtItemNumber">Item Number</Label>
                                    <Input
                                        id="courtItemNumber"
                                        value={formData.courtItemNumber}
                                        onChange={(e) => handleChange('courtItemNumber', e.target.value)}
                                        placeholder="e.g., Item 5"
                                    />
                                </div>
                            </div>

                            {/* Judge Name */}
                            <div className="space-y-2">
                                <Label htmlFor="judgeName" className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Judge Name
                                </Label>
                                <Input
                                    id="judgeName"
                                    value={formData.judgeName}
                                    onChange={(e) => handleChange('judgeName', e.target.value)}
                                    placeholder="Judge's name"
                                />
                            </div>

                            {/* Hearing Counsel & Accompanied By */}
                            {formData.caseId && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <User className="w-4 h-4" />
                                            Hearing Counsel
                                        </Label>
                                        {loadingMembers ? (
                                            <div className="flex items-center gap-2 p-3 border rounded-lg">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="text-sm text-muted-foreground">Loading...</span>
                                            </div>
                                        ) : (
                                            <select
                                                value={formData.hearingCounselId}
                                                onChange={(e) => handleChange('hearingCounselId', e.target.value)}
                                                className="w-full p-3 border rounded-lg bg-background"
                                            >
                                                <option value="">Select counsel</option>
                                                {members.map(m => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.user.name} {m.role === 'INTERN' ? '(Intern)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Users className="w-4 h-4" />
                                            Accompanied By
                                        </Label>
                                        {loadingMembers ? (
                                            <div className="flex items-center gap-2 p-3 border rounded-lg">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="text-sm text-muted-foreground">Loading...</span>
                                            </div>
                                        ) : (
                                            <MultiSelect
                                                options={memberOptions}
                                                value={formData.accompaniedByIds}
                                                onValueChange={(vals) => setFormData(prev => ({ ...prev, accompaniedByIds: vals }))}
                                                placeholder="Select accompanying"
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Order Link */}
                            <div className="space-y-2">
                                <Label htmlFor="orderLink" className="flex items-center gap-2">
                                    <Link className="w-4 h-4" />
                                    Order Link
                                </Label>
                                <Input
                                    id="orderLink"
                                    type="url"
                                    value={formData.orderLink}
                                    onChange={(e) => handleChange('orderLink', e.target.value)}
                                    placeholder="Link to order document"
                                />
                            </div>

                            {/* Next Hearing Date */}
                            <div className="space-y-2">
                                <Label htmlFor="nextDateOfHearing" className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Next Hearing Date
                                </Label>
                                <Input
                                    id="nextDateOfHearing"
                                    type="date"
                                    value={formData.nextDateOfHearing}
                                    onChange={(e) => handleChange('nextDateOfHearing', e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    If provided, a follow-up hearing will be automatically scheduled
                                </p>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="notes" className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Notes
                                </Label>
                                <Textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => handleChange('notes', e.target.value)}
                                    placeholder="Any additional notes or reminders"
                                    rows={3}
                                />
                            </div>

                            {/* Additional Remarks */}
                            <div className="space-y-2">
                                <Label htmlFor="additionalRemarks">Additional Remarks</Label>
                                <Textarea
                                    id="additionalRemarks"
                                    value={formData.additionalRemarks}
                                    onChange={(e) => handleChange('additionalRemarks', e.target.value)}
                                    placeholder="Any additional remarks..."
                                    rows={3}
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
