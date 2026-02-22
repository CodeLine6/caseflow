import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission, isErrorResponse, filterWorkspacesByPermission } from '@/lib/rbac'
import { uploadToStorage, STORAGE_BUCKET } from '@/lib/supabase'
import { DocumentCategory } from '@prisma/client'

// GET /api/documents - List documents
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const caseId = searchParams.get('caseId')
        const search = searchParams.get('search')

        // Filter to workspaces where user has documents.read permission
        const allowedWorkspaceIds = await filterWorkspacesByPermission(session.user.id, 'documents.read')

        const whereClause: Record<string, unknown> = {
            case: { workspaceId: { in: allowedWorkspaceIds } },
        }

        if (caseId) whereClause.caseId = caseId
        if (search) {
            whereClause.OR = [
                { filename: { contains: search, mode: 'insensitive' } },
                { originalName: { contains: search, mode: 'insensitive' } },
            ]
        }

        const documents = await prisma.document.findMany({
            where: whereClause,
            include: {
                case: { select: { id: true, title: true, caseNumber: true } },
                uploadedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        })

        const mappedDocuments = documents.map(d => ({
            ...d,
            fileName: d.originalName || d.filename,
            fileType: d.mimeType || 'application/octet-stream',
            fileSize: d.fileSize || 0,
            category: d.documentType,
            description: null,
        }))

        return NextResponse.json({ documents: mappedDocuments })
    } catch (error) {
        console.error('Error fetching documents:', error)
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }
}

// POST /api/documents - Upload a file to Supabase Storage and create DB record
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Parse multipart form data
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const caseId = formData.get('caseId') as string | null
        const category = formData.get('category') as string | null

        if (!file || !caseId) {
            return NextResponse.json({ error: 'File and case ID are required' }, { status: 400 })
        }

        // Validate case exists and get workspace
        const caseData = await prisma.case.findUnique({
            where: { id: caseId },
            select: { workspaceId: true },
        })

        if (!caseData) {
            return NextResponse.json({ error: 'Case not found' }, { status: 404 })
        }

        // Check RBAC permission
        const rbac = await requirePermission(caseData.workspaceId, 'documents.upload')
        if (isErrorResponse(rbac)) return rbac

        // Read file into buffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Build a unique storage path: workspaceId/caseId/timestamp_filename
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${caseData.workspaceId}/${caseId}/${Date.now()}_${sanitizedName}`

        // Upload to Supabase Storage
        await uploadToStorage(buffer, storagePath, file.type || 'application/octet-stream')

        // Construct the storage URL (path only — we generate signed URLs on download)
        const fileUrl = `${STORAGE_BUCKET}/${storagePath}`

        // Save document record to DB
        const document = await prisma.document.create({
            data: {
                filename: sanitizedName,
                originalName: file.name,
                fileUrl,
                mimeType: file.type || 'application/octet-stream',
                fileSize: file.size,
                documentType: (category as DocumentCategory) || 'OTHER',
                caseId,
                uploadedById: session.user.id,
            },
            include: {
                case: { select: { id: true, title: true, caseNumber: true } },
                uploadedBy: { select: { id: true, name: true } },
            },
        })

        return NextResponse.json(document, { status: 201 })
    } catch (error) {
        console.error('Error uploading document:', error)
        return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 })
    }
}
