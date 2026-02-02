'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    FileText, Search, Briefcase, User, Calendar,
    Loader2, AlertCircle, Download, Eye, File,
    FileImage, FileVideo, FileSpreadsheet, ArrowLeft
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

type Document = {
    id: string
    fileName: string
    fileType: string
    fileSize: number
    category: string
    description: string | null
    createdAt: string
    case: { id: string; title: string; caseNumber: string }
    uploadedBy: { id: string; name: string }
}

const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return FileImage
    if (fileType.includes('video')) return FileVideo
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileSpreadsheet
    return File
}

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const categoryColors: Record<string, string> = {
    PLEADING: 'bg-blue-500/10 text-blue-400',
    EVIDENCE: 'bg-green-500/10 text-green-400',
    CONTRACT: 'bg-purple-500/10 text-purple-400',
    CORRESPONDENCE: 'bg-amber-500/10 text-amber-400',
    ORDER: 'bg-red-500/10 text-red-400',
    OTHER: 'bg-slate-500/10 text-slate-400',
}

export default function DocumentsPage() {
    const router = useRouter()
    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')

    useEffect(() => {
        fetchDocuments()
    }, [])

    const fetchDocuments = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (search) params.append('search', search)

            const res = await fetch(`/api/documents?${params.toString()}`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setDocuments(data.documents)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        fetchDocuments()
    }

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/dashboard')}
                        className="rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            Documents
                        </h1>
                        <p className="text-muted-foreground mt-1">Manage case documents and files</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card className="glass-card">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{documents.length}</p>
                                <p className="text-xs text-muted-foreground">Total Documents</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                {['PLEADING', 'EVIDENCE', 'CONTRACT'].map(cat => (
                    <Card key={cat} className="glass-card">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg ${categoryColors[cat].replace('text-', 'bg-').replace('400', '500/10')} flex items-center justify-center`}>
                                    <File className={`w-5 h-5 ${categoryColors[cat].split(' ')[1]}`} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{documents.filter(d => d.category === cat).length}</p>
                                    <p className="text-xs text-muted-foreground">{cat.charAt(0) + cat.slice(1).toLowerCase()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Search */}
            <Card className="glass-card mb-6">
                <CardContent className="p-4">
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search documents..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button type="submit" variant="outline">Search</Button>
                    </form>
                </CardContent>
            </Card>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : error ? (
                <Card className="glass-card">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                        <p className="text-destructive">{error}</p>
                    </CardContent>
                </Card>
            ) : documents.length === 0 ? (
                <Card className="glass-card">
                    <CardContent className="p-12 text-center">
                        <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-semibold mb-2">No documents found</h3>
                        <p className="text-muted-foreground">Documents uploaded to cases will appear here.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {documents.map(doc => {
                        const FileIcon = getFileIcon(doc.fileType)
                        return (
                            <Card
                                key={doc.id}
                                className="glass-card hover:border-primary/30 transition-all"
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                                            <FileIcon className="w-6 h-6 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium truncate">{doc.fileName}</h4>
                                            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Briefcase className="w-4 h-4" />
                                                    {doc.case.caseNumber}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <User className="w-4 h-4" />
                                                    {doc.uploadedBy.name}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {formatDate(doc.createdAt)}
                                                </span>
                                                <span>{formatFileSize(doc.fileSize)}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={categoryColors[doc.category] || categoryColors.OTHER}>
                                                {doc.category}
                                            </Badge>
                                            <Button size="icon" variant="ghost">
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost">
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
