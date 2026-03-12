'use client'

import { getSafeErrorMessage } from '@/lib/api-error'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    FileText, Upload, AlertCircle, ArrowLeft, Loader2
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

export default function NewDocumentPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
            <NewDocumentContent />
        </Suspense>
    )
}

function NewDocumentContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const caseIdParam = searchParams.get('caseId')

    const [loading, setLoading] = useState(false)
    const [loadingCases, setLoadingCases] = useState(true)
    const [error, setError] = useState('')
    const [cases, setCases] = useState<Case[]>([])
    const [file, setFile] = useState<File | null>(null)

    const [formData, setFormData] = useState({
        caseId: caseIdParam || '',
        description: '',
        category: 'EVIDENCE',
    })

    useEffect(() => {
        fetchCases()
    }, [])

    const fetchCases = async () => {
        try {
            const res = await fetch('/api/cases')
            const data = await res.json()
            if (res.ok) setCases(data.cases || [])
        } catch (err) {
            console.error('Failed to load cases:', err)
        } finally {
            setLoadingCases(false)
        }
    }

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (!file) {
            setError('Please select a file to upload')
            return
        }

        if (!formData.caseId) {
            setError('Please select a case')
            return
        }

        try {
            setLoading(true)

            // Create FormData for file upload
            const data = new FormData()
            data.append('file', file)
            data.append('caseId', formData.caseId)
            data.append('description', formData.description)
            data.append('category', formData.category)

            const res = await fetch('/api/documents', {
                method: 'POST',
                body: data,
            })

            const result = await res.json()

            if (!res.ok) {
                throw new Error(result.error || 'Failed to upload document')
            }

            router.push('/documents')
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

            <div className="max-w-2xl mx-auto">
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
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            Upload Document
                        </h1>
                        <p className="text-muted-foreground mt-1">Upload files related to your cases</p>
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
                            <CardTitle>Document Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="file">Select File *</Label>
                                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-secondary/50 transition-colors">
                                    <Input
                                        id="file"
                                        type="file"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <Label htmlFor="file" className="cursor-pointer">
                                        <div className="flex flex-col items-center gap-2">
                                            <Upload className="w-8 h-8 text-muted-foreground" />
                                            <span className="text-sm font-medium">
                                                {file ? file.name : 'Click to upload or drag and drop'}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                PDF, DOCX, JPG up to 10MB
                                            </span>
                                        </div>
                                    </Label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="caseId">Related Case *</Label>
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
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category">Category</Label>
                                    <select
                                        id="category"
                                        value={formData.category}
                                        onChange={(e) => handleChange('category', e.target.value)}
                                        className="w-full p-3 border rounded-lg bg-background"
                                    >
                                        <option value="EVIDENCE">Evidence</option>
                                        <option value="PLEADING">Pleading</option>
                                        <option value="ORDER">Order</option>
                                        <option value="JUDGMENT">Judgment</option>
                                        <option value="CORRESPONDENCE">Correspondence</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    placeholder="Brief description of the document contents"
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3 mt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload Document
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
