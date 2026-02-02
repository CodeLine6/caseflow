import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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

        const memberships = await prisma.workspaceMember.findMany({
            where: { userId: session.user.id },
            select: { workspaceId: true },
        })
        const workspaceIds = memberships.map(m => m.workspaceId)

        const whereClause: Record<string, unknown> = {
            case: { workspaceId: { in: workspaceIds } },
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

        // Map to expected format for frontend
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

// POST /api/documents - Create document record (file upload handled separately)
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { caseId, fileName, fileType, fileSize, filePath, category } = body

        if (!caseId || !fileName || !filePath) {
            return NextResponse.json({ error: 'Case ID, file name, and file path are required' }, { status: 400 })
        }

        const caseData = await prisma.case.findUnique({
            where: { id: caseId },
            select: { workspaceId: true },
        })

        if (!caseData) {
            return NextResponse.json({ error: 'Case not found' }, { status: 404 })
        }

        const membership = await prisma.workspaceMember.findFirst({
            where: { workspaceId: caseData.workspaceId, userId: session.user.id },
        })

        if (!membership) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const document = await prisma.document.create({
            data: {
                filename: fileName.replace(/\s+/g, '_').toLowerCase(),
                originalName: fileName,
                fileUrl: filePath,
                mimeType: fileType || 'application/octet-stream',
                fileSize: fileSize || 0,
                documentType: (category as DocumentCategory) || 'OTHER',
                caseId,
                uploadedById: session.user.id,
            },
            include: { case: true, uploadedBy: true },
        })

        return NextResponse.json(document, { status: 201 })
    } catch (error) {
        console.error('Error creating document:', error)
        return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
    }
}
