import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission, isErrorResponse } from '@/lib/rbac'
import { getSignedUrl, deleteFromStorage, STORAGE_BUCKET } from '@/lib/supabase'

// GET /api/documents/[id] - Get a single document
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const document = await prisma.document.findUnique({
            where: { id },
            include: {
                case: { select: { id: true, title: true, caseNumber: true, workspaceId: true } },
                uploadedBy: { select: { id: true, name: true } },
            },
        })

        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        // Check documents.read permission
        const rbac = await requirePermission(document.case.workspaceId, 'documents.read')
        if (isErrorResponse(rbac)) return rbac

        // Generate a short-lived signed download URL if the file is in Supabase Storage
        let signedUrl: string | null = null
        if (document.fileUrl?.startsWith(STORAGE_BUCKET + '/')) {
            const storagePath = document.fileUrl.slice(STORAGE_BUCKET.length + 1)
            try {
                signedUrl = await getSignedUrl(storagePath, 3600)
            } catch (e) {
                console.error('Failed to generate signed URL:', e)
            }
        }

        return NextResponse.json({ document: { ...document, signedUrl } })
    } catch (error) {
        console.error('Error fetching document:', error)
        return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
    }
}

// GET /api/documents/[id]/download - Download a document
export async function HEAD(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return new NextResponse(null, { status: 401 })
        }

        const { id } = await params

        const document = await prisma.document.findUnique({
            where: { id },
            include: {
                case: { select: { workspaceId: true } },
            },
        })

        if (!document) {
            return new NextResponse(null, { status: 404 })
        }

        // Check documents.download permission
        const rbac = await requirePermission(document.case.workspaceId, 'documents.download')
        if (isErrorResponse(rbac)) return rbac

        return new NextResponse(null, { status: 200 })
    } catch (error) {
        console.error('Error checking document download permission:', error)
        return new NextResponse(null, { status: 500 })
    }
}

// DELETE /api/documents/[id] - Delete a document
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const document = await prisma.document.findUnique({
            where: { id },
            include: {
                case: { select: { workspaceId: true } },
            },
        })

        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 })
        }

        // Check documents.delete permission
        const rbac = await requirePermission(document.case.workspaceId, 'documents.delete')
        if (isErrorResponse(rbac)) return rbac

        // Delete from Supabase Storage (non-fatal if it fails)
        if (document.fileUrl?.startsWith(STORAGE_BUCKET + '/')) {
            const storagePath = document.fileUrl.slice(STORAGE_BUCKET.length + 1)
            try {
                await deleteFromStorage(storagePath)
            } catch (e) {
                console.error('Failed to delete file from storage:', e)
            }
        }

        await prisma.document.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting document:', error)
        return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
    }
}
