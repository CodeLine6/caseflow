/**
 * Sanitize an error for display to users.
 * Known API error patterns (e.g., "Failed to ...", "... is required") pass through.
 * Raw/technical errors (Prisma, network, stack traces) are replaced with a generic message.
 */
export function getSafeErrorMessage(
    error: unknown,
    fallback = 'An unexpected error occurred. Please try again.'
): string {
    const message = error instanceof Error ? error.message : String(error)

    // Known safe patterns from our API routes
    const safePatterns = [
        /^Failed to /,
        /^Invalid /,
        /required$/i,
        /^Unauthorized/,
        /^Not a member/,
        /^No .* selected/,
        /already exists/i,
        /must be at least/,
        /has expired/,
        /not found/i,
        /not allowed/i,
        /^Please /,
        /^An account/,
        /^Email and password/,
        /^You (do not|don't|cannot|can't)/i,
        /^Access denied/i,
        /is inactive/i,
        /^Scraping/,
        /limit/i,
        /^Token/,
    ]

    if (safePatterns.some(pattern => pattern.test(message))) {
        return message
    }

    return fallback
}
