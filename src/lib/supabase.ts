import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_KEY!

// Server-side client — used in API routes for storage operations
export const supabase = createClient(supabaseUrl, supabaseKey)

export const STORAGE_BUCKET = 'documents'

/**
 * Upload a file buffer to Supabase Storage.
 * Returns the storage path (used to generate signed URLs later).
 */
export async function uploadToStorage(
    buffer: Buffer,
    storagePath: string,
    mimeType: string
): Promise<string> {
    const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
            contentType: mimeType,
            upsert: false,
        })

    if (error) throw new Error(`Storage upload failed: ${error.message}`)
    return storagePath
}

/**
 * Generate a short-lived signed URL for downloading a file.
 * Default expiry: 1 hour (3600 seconds).
 */
export async function getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, expiresIn)

    if (error || !data?.signedUrl) throw new Error(`Failed to generate signed URL: ${error?.message}`)
    return data.signedUrl
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFromStorage(storagePath: string): Promise<void> {
    const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath])

    if (error) throw new Error(`Storage delete failed: ${error.message}`)
}
