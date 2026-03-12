'use client'

import { getSafeErrorMessage } from '@/lib/api-error'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Briefcase, ArrowLeft, Save, Calendar, User, Scale,
    FileText, IndianRupee, AlertCircle, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PermissionGate } from '@/components/PermissionGate'

const categories = [
    { value: 'CIVIL', label: 'Civil' },
    { value: 'CRIMINAL', label: 'Criminal' },
    { value: 'FAMILY', label: 'Family' },
    { value: 'CORPORATE', label: 'Corporate' },
    { value: 'TAX', label: 'Tax' },
    { value: 'LABOR', label: 'Labor' },
    { value: 'CONSUMER', label: 'Consumer' },
    { value: 'OTHER', label: 'Other' },
]



const caseTypes = [
    { "value": "", "label": "Select" },
    { "value": "ADMIN.REPORT", "label": "ADMIN.REPORT" },
    { "value": "ARB.A.", "label": "ARB.A." },
    { "value": "ARB. A. (COMM.)", "label": "ARB. A. (COMM.)" },
    { "value": "ARB.P.", "label": "ARB.P." },
    { "value": "BAIL APPLN.", "label": "BAIL APPLN." },
    { "value": "CA", "label": "CA" },
    { "value": "CA (COMM.IPD-CR)", "label": "CA (COMM.IPD-CR)" },
    { "value": "C.A.(COMM.IPD-GI)", "label": "C.A.(COMM.IPD-GI)" },
    { "value": "C.A.(COMM.IPD-PAT)", "label": "C.A.(COMM.IPD-PAT)" },
    { "value": "C.A.(COMM.IPD-PV)", "label": "C.A.(COMM.IPD-PV)" },
    { "value": "C.A.(COMM.IPD-TM)", "label": "C.A.(COMM.IPD-TM)" },
    { "value": "CAVEAT(CO.)", "label": "CAVEAT(CO.)" },
    { "value": "CC(ARB.)", "label": "CC(ARB.)" },
    { "value": "CCP(CO.)", "label": "CCP(CO.)" },
    { "value": "CCP(REF)", "label": "CCP(REF)" },
    { "value": "CEAC", "label": "CEAC" },
    { "value": "CEAR", "label": "CEAR" },
    { "value": "CHAT.A.C.", "label": "CHAT.A.C." },
    { "value": "CHAT.A.REF", "label": "CHAT.A.REF" },
    { "value": "CMI", "label": "CMI" },
    { "value": "CM(M)", "label": "CM(M)" },
    { "value": "CM(M)-IPD", "label": "CM(M)-IPD" },
    { "value": "C.O.", "label": "C.O." },
    { "value": "CO.APP.", "label": "CO.APP." },
    { "value": "CO.APPL.(C)", "label": "CO.APPL.(C)" },
    { "value": "CO.APPL.(M)", "label": "CO.APPL.(M)" },
    { "value": "CO.A(SB)", "label": "CO.A(SB)" },
    { "value": "C.O.(COMM.IPD-CR)", "label": "C.O.(COMM.IPD-CR)" },
    { "value": "C.O.(COMM.IPD-GI)", "label": "C.O.(COMM.IPD-GI)" },
    { "value": "C.O.(COMM.IPD-PAT)", "label": "C.O.(COMM.IPD-PAT)" },
    { "value": "C.O. (COMM.IPD-TM)", "label": "C.O. (COMM.IPD-TM)" },
    { "value": "CO.EX.", "label": "CO.EX." },
    { "value": "CONT.APP.(C)", "label": "CONT.APP.(C)" },
    { "value": "CONT.CAS(C)", "label": "CONT.CAS(C)" },
    { "value": "CONT.CAS.(CRL)", "label": "CONT.CAS.(CRL)" },
    { "value": "CO.PET.", "label": "CO.PET." },
    { "value": "C.REF.(O)", "label": "C.REF.(O)" },
    { "value": "CRL.A.", "label": "CRL.A." },
    { "value": "CRL.L.P.", "label": "CRL.L.P." },
    { "value": "CRL.M.C.", "label": "CRL.M.C." },
    { "value": "CRL.M.(CO.)", "label": "CRL.M.(CO.)" },
    { "value": "CRL.M.I.", "label": "CRL.M.I." },
    { "value": "CRL.O.", "label": "CRL.O." },
    { "value": "CRL.O.(CO.)", "label": "CRL.O.(CO.)" },
    { "value": "CRL.REF.", "label": "CRL.REF." },
    { "value": "CRL.REV.P.", "label": "CRL.REV.P." },
    { "value": "CRL.REV.P.(MAT.)", "label": "CRL.REV.P.(MAT.)" },
    { "value": "CRL.REV.P.(NDPS)", "label": "CRL.REV.P.(NDPS)" },
    { "value": "CRL.REV.P.(NI)", "label": "CRL.REV.P.(NI)" },
    { "value": "C.R.P.", "label": "C.R.P." },
    { "value": "CRP-IPD", "label": "CRP-IPD" },
    { "value": "C.RULE", "label": "C.RULE" },
    { "value": "CS(COMM)", "label": "CS(COMM)" },
    { "value": "CS(COMM) INFRA", "label": "CS(COMM) INFRA" },
    { "value": "CS(OS)", "label": "CS(OS)" },
    { "value": "CS(OS) GP", "label": "CS(OS) GP" },
    { "value": "CUSAA", "label": "CUSAA" },
    { "value": "CUS.A.C.", "label": "CUS.A.C." },
    { "value": "CUS.A.R.", "label": "CUS.A.R." },
    { "value": "CUSTOM A.", "label": "CUSTOM A." },
    { "value": "DEATH SENTENCE REF.", "label": "DEATH SENTENCE REF." },
    { "value": "DEMO", "label": "DEMO" },
    { "value": "EDC", "label": "EDC" },
    { "value": "EDR", "label": "EDR" },
    { "value": "EFA(COMM)", "label": "EFA(COMM)" },
    { "value": "EFA(OS)", "label": "EFA(OS)" },
    { "value": "EFA(OS)  (COMM)", "label": "EFA(OS)  (COMM)" },
    { "value": "EFA(OS)(IPD)", "label": "EFA(OS)(IPD)" },
    { "value": "EL.PET.", "label": "EL.PET." },
    { "value": "ETR", "label": "ETR" },
    { "value": "EX.F.A.", "label": "EX.F.A." },
    { "value": "EX.P.", "label": "EX.P." },
    { "value": "EX.S.A.", "label": "EX.S.A." },
    { "value": "FAO", "label": "FAO" },
    { "value": "FAO (COMM)", "label": "FAO (COMM)" },
    { "value": "FAO-IPD", "label": "FAO-IPD" },
    { "value": "FAO(OS)", "label": "FAO(OS)" },
    { "value": "FAO(OS) (COMM)", "label": "FAO(OS) (COMM)" },
    { "value": "FAO(OS)(IPD)", "label": "FAO(OS)(IPD)" },
    { "value": "GCAC", "label": "GCAC" },
    { "value": "GCAR", "label": "GCAR" },
    { "value": "GTA", "label": "GTA" },
    { "value": "GTC", "label": "GTC" },
    { "value": "GTR", "label": "GTR" },
    { "value": "I.A.", "label": "I.A." },
    { "value": "I.P.A.", "label": "I.P.A." },
    { "value": "ITA", "label": "ITA" },
    { "value": "ITC", "label": "ITC" },
    { "value": "ITR", "label": "ITR" },
    { "value": "ITSA", "label": "ITSA" },
    { "value": "LA.APP.", "label": "LA.APP." },
    { "value": "LPA", "label": "LPA" },
    { "value": "MAC.APP.", "label": "MAC.APP." },
    { "value": "MAT.", "label": "MAT." },
    { "value": "MAT.APP.", "label": "MAT.APP." },
    { "value": "MAT.APP.(F.C.)", "label": "MAT.APP.(F.C.)" },
    { "value": "MAT.CASE", "label": "MAT.CASE" },
    { "value": "MAT.REF.", "label": "MAT.REF." },
    { "value": "MISC. APPEAL (FEMA)", "label": "MISC. APPEAL (FEMA)" },
    { "value": "MISC. APPEAL(PMLA)", "label": "MISC. APPEAL(PMLA)" },
    { "value": "OA", "label": "OA" },
    { "value": "OCJA", "label": "OCJA" },
    { "value": "O.M.P.", "label": "O.M.P." },
    { "value": "O.M.P. (COMM)", "label": "O.M.P. (COMM)" },
    { "value": "OMP (CONT.)", "label": "OMP (CONT.)" },
    { "value": "O.M.P. (E)", "label": "O.M.P. (E)" },
    { "value": "O.M.P. (E) (COMM.)", "label": "O.M.P. (E) (COMM.)" },
    { "value": "O.M.P.(EFA)(COMM.)", "label": "O.M.P.(EFA)(COMM.)" },
    { "value": "O.M.P. (ENF.)", "label": "O.M.P. (ENF.)" },
    { "value": "OMP (ENF.) (COMM.)", "label": "OMP (ENF.) (COMM.)" },
    { "value": "O.M.P.(I)", "label": "O.M.P.(I)" },
    { "value": "O.M.P.(I) (COMM.)", "label": "O.M.P.(I) (COMM.)" },
    { "value": "O.M.P. (J) (COMM.)", "label": "O.M.P. (J) (COMM.)" },
    { "value": "O.M.P. (MISC.)", "label": "O.M.P. (MISC.)" },
    { "value": "O.M.P.(MISC.)(COMM.)", "label": "O.M.P.(MISC.)(COMM.)" },
    { "value": "O.M.P.(T)", "label": "O.M.P.(T)" },
    { "value": "O.M.P. (T) (COMM.)", "label": "O.M.P. (T) (COMM.)" },
    { "value": "O.REF.", "label": "O.REF." },
    { "value": "RC.REV.", "label": "RC.REV." },
    { "value": "RC.S.A.", "label": "RC.S.A." },
    { "value": "RERA APPEAL", "label": "RERA APPEAL" },
    { "value": "REVIEW PET.", "label": "REVIEW PET." },
    { "value": "RFA", "label": "RFA" },
    { "value": "RFA(COMM)", "label": "RFA(COMM)" },
    { "value": "RFA-IPD", "label": "RFA-IPD" },
    { "value": "RFA(OS)", "label": "RFA(OS)" },
    { "value": "RFA(OS)(COMM)", "label": "RFA(OS)(COMM)" },
    { "value": "RFA(OS)(IPD)", "label": "RFA(OS)(IPD)" },
    { "value": "RSA", "label": "RSA" },
    { "value": "SCA", "label": "SCA" },
    { "value": "SDR", "label": "SDR" },
    { "value": "SERTA", "label": "SERTA" },
    { "value": "ST.APPL.", "label": "ST.APPL." },
    { "value": "STC", "label": "STC" },
    { "value": "ST.REF.", "label": "ST.REF." },
    { "value": "SUR.T.REF.", "label": "SUR.T.REF." },
    { "value": "TEST.CAS.", "label": "TEST.CAS." },
    { "value": "TR.P.(C)", "label": "TR.P.(C)" },
    { "value": "TR.P.(C.)", "label": "TR.P.(C.)" },
    { "value": "TR.P.(CRL.)", "label": "TR.P.(CRL.)" },
    { "value": "VAT APPEAL", "label": "VAT APPEAL" },
    { "value": "W.P.(C)", "label": "W.P.(C)" },
    { "value": "W.P.(C)-IPD", "label": "W.P.(C)-IPD" },
    { "value": "WP(C)(IPD)", "label": "WP(C)(IPD)" },
    { "value": "W.P.(CRL)", "label": "W.P.(CRL)" },
    { "value": "WTA", "label": "WTA" },
    { "value": "WTC", "label": "WTC" },
    { "value": "WTR", "label": "WTR" },
    { "value": "PLAINT", "label": "PLAINT" },
    { "value": "DISCHARGE_APPLICATION", "label": "DISCHARGE APPLICATION" },
    { "value": "OTHER", "label": "OTHER" }
]


const priorities = [
    { value: 'HIGH', label: 'High', color: 'text-red-400' },
    { value: 'MEDIUM', label: 'Medium', color: 'text-amber-400' },
    { value: 'LOW', label: 'Low', color: 'text-green-400' },
]


interface Court {
    id: number
    courtName: string
    courtType: string
}

interface ClientOption {
    id: string
    name: string
    clientType: string
}

interface MemberOption {
    userId: string
    userName: string
    role: string
}

export default function NewCasePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [courts, setCourts] = useState<Court[]>([])
    const [clients, setClients] = useState<ClientOption[]>([])
    const [members, setMembers] = useState<MemberOption[]>([])

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
        courtId: '',
        clientId: '',
        mainCounselId: '',
    })

    const [customCategory, setCustomCategory] = useState('')
    const [customCaseType, setCustomCaseType] = useState('')
    const [customCategorySuggestions, setCustomCategorySuggestions] = useState<string[]>([])
    const [customTypeSuggestions, setCustomTypeSuggestions] = useState<string[]>([])

    // Fetch courts and clients on mount
    useEffect(() => {
        const fetchCourts = async () => {
            try {
                const res = await fetch('/api/courts')
                if (res.ok) {
                    const data = await res.json()
                    setCourts(data.courts || [])
                }
            } catch (err) {
                console.error('Failed to fetch courts:', err)
            }
        }
        const fetchClients = async () => {
            try {
                const res = await fetch('/api/clients')
                if (res.ok) {
                    const data = await res.json()
                    setClients(data.clients || [])
                }
            } catch (err) {
                console.error('Failed to fetch clients:', err)
            }
        }
        fetchCourts()
        fetchClients()
    }, [])

    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
    const [workspaceError, setWorkspaceError] = useState('')

    // Fetch workspace members for main counsel selection
    useEffect(() => {
        if (!activeWorkspaceId) return
        const fetchMembers = async () => {
            try {
                const res = await fetch(`/api/workspaces/${activeWorkspaceId}/members`)
                if (res.ok) {
                    const data = await res.json()
                    const memberOptions = (data.members || [])
                        .filter((m: any) => m.role === 'ADMIN' || m.role === 'MEMBER')
                        .map((m: any) => ({
                            userId: m.user.id,
                            userName: m.user.name || m.user.email,
                            role: m.role,
                        }))
                    setMembers(memberOptions)
                }
            } catch (err) {
                console.error('Failed to fetch workspace members:', err)
            }
        }
        fetchMembers()
    }, [activeWorkspaceId])

    // Fetch custom value suggestions when OTHER is selected
    useEffect(() => {
        if (formData.caseCategory === 'OTHER' && activeWorkspaceId) {
            fetch(`/api/custom-case-values?fieldType=CATEGORY&workspaceId=${activeWorkspaceId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.values) {
                        setCustomCategorySuggestions(data.values.map((v: any) => v.value))
                    }
                })
                .catch(err => console.error('Failed to fetch custom categories:', err))
        }
    }, [formData.caseCategory, activeWorkspaceId])

    useEffect(() => {
        if (formData.caseType === 'OTHER' && activeWorkspaceId) {
            fetch(`/api/custom-case-values?fieldType=TYPE&workspaceId=${activeWorkspaceId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.values) {
                        setCustomTypeSuggestions(data.values.map((v: any) => v.value))
                    }
                })
                .catch(err => console.error('Failed to fetch custom types:', err))
        }
    }, [formData.caseType, activeWorkspaceId])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }


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
                    // Fallback to first workspace and update localStorage
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
            const workspaceId = activeWorkspaceId

            // Save custom values if OTHER was selected
            if (formData.caseCategory === 'OTHER' && customCategory.trim()) {
                await fetch('/api/custom-case-values', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fieldType: 'CATEGORY',
                        value: customCategory.trim(),
                        workspaceId
                    })
                })
            }

            if (formData.caseType === 'OTHER' && customCaseType.trim()) {
                await fetch('/api/custom-case-values', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fieldType: 'TYPE',
                        value: customCaseType.trim(),
                        workspaceId
                    })
                })
            }

            const res = await fetch('/api/cases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    workspaceId,
                    caseCategory: formData.caseCategory === 'OTHER' ? customCategory : formData.caseCategory,
                    caseType: formData.caseType === 'OTHER' ? customCaseType : formData.caseType,
                    caseValue: formData.caseValue ? parseFloat(formData.caseValue) : null,
                    courtId: formData.courtId ? parseInt(formData.courtId) : null,
                    clientId: formData.clientId || null,
                    mainCounselId: formData.mainCounselId || null,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create case')
            }

            router.push(`/cases/${data.id}`)
        } catch (err) {
            setError(getSafeErrorMessage(err))
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

            {workspaceError ? (
                <Card className="glass-card">
                    <CardContent className="p-12 text-center space-y-4">
                        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                        <h2 className="text-xl font-semibold">{workspaceError}</h2>
                        <p className="text-muted-foreground">You need to be a member of a workspace before creating a case.</p>
                        <Button variant="gradient" onClick={() => router.push('/workspaces')}>
                            Go to Workspaces
                        </Button>
                    </CardContent>
                </Card>
            ) : (
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

                                    {/* Custom Category Input */}
                                    {formData.caseCategory === 'OTHER' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="customCategory">Specify Category *</Label>
                                            <Input
                                                id="customCategory"
                                                value={customCategory}
                                                onChange={(e) => setCustomCategory(e.target.value)}
                                                placeholder="Enter custom category"
                                                list="category-suggestions"
                                                required
                                            />
                                            <datalist id="category-suggestions">
                                                {customCategorySuggestions.map((suggestion, idx) => (
                                                    <option key={idx} value={suggestion} />
                                                ))}
                                            </datalist>
                                        </div>
                                    )}

                                    {/* Custom Case Type Input */}
                                    {formData.caseType === 'OTHER' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="customCaseType">Specify Type *</Label>
                                            <Input
                                                id="customCaseType"
                                                value={customCaseType}
                                                onChange={(e) => setCustomCaseType(e.target.value)}
                                                placeholder="Enter custom case type"
                                                list="type-suggestions"
                                                required
                                            />
                                            <datalist id="type-suggestions">
                                                {customTypeSuggestions.map((suggestion, idx) => (
                                                    <option key={idx} value={suggestion} />
                                                ))}
                                            </datalist>
                                        </div>
                                    )}
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
                                        <Label htmlFor="courtId">Court</Label>
                                        <select
                                            id="courtId"
                                            name="courtId"
                                            value={formData.courtId}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                                        >
                                            <option value="">Select a court...</option>
                                            {courts.map(court => (
                                                <option key={court.id} value={court.id}>
                                                    {court.courtName} ({court.courtType})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="clientId">Client</Label>
                                        <select
                                            id="clientId"
                                            name="clientId"
                                            value={formData.clientId}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                                        >
                                            <option value="">Select a client...</option>
                                            {clients.map(client => (
                                                <option key={client.id} value={client.id}>
                                                    {client.name} ({client.clientType})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <PermissionGate permission="cases.assign">
                                        <div className="space-y-2">
                                            <Label htmlFor="mainCounselId">Main Counsel</Label>
                                            <select
                                                id="mainCounselId"
                                                name="mainCounselId"
                                                value={formData.mainCounselId}
                                                onChange={handleChange}
                                                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                                            >
                                                <option value="">Select counsel...</option>
                                                {members.map(member => (
                                                    <option key={member.userId} value={member.userId}>
                                                        {member.userName} ({member.role})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </PermissionGate>
                                    <div className="space-y-2">
                                        <Label htmlFor="caseValue">Case Value</Label>
                                        <div className="relative">
                                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                                        variant="gradient"
                                        className="w-full gap-2"
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
            )}
        </div>
    )
}
