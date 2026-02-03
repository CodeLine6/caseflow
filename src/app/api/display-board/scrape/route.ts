import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import * as cheerio from 'cheerio'

interface DisplayBoardEntry {
    courtNumber: string
    itemNumber: string | null
    caseNumber: string | null
    caseTitle: string | null
    judgeName: string | null
    vcLink: string | null
    status: string
}

interface ScrapingResult {
    courtId: string
    courtName: string
    success: boolean
    entriesCount: number
    error?: string
}

// Parser configurations for different court display board formats
type ParserType = 'delhi_hc' | 'generic_table' | 'json_api'

interface ParserConfig {
    type: ParserType
    tableSelector?: string
    columnMapping?: {
        court?: number
        item?: number
        judge?: number
        caseNo?: number
        title?: number
        vcLink?: number
    }
}

// Detect parser type based on URL pattern
function detectParser(url: string): ParserConfig {
    // Delhi High Court
    if (url.includes('delhihighcourt.nic.in')) {
        return {
            type: 'delhi_hc',
            tableSelector: 'table tbody tr',
            columnMapping: { court: 0, item: 1, judge: 2, caseNo: 3, title: 4, vcLink: 5 }
        }
    }
    // Bombay High Court pattern (example)
    if (url.includes('bombayhighcourt.')) {
        return {
            type: 'generic_table',
            tableSelector: 'table.display-board tbody tr',
            columnMapping: { court: 0, item: 1, caseNo: 2, title: 3, judge: 4 }
        }
    }
    // Madras High Court pattern (example)
    if (url.includes('mhc.gov.in') || url.includes('hcmadras.')) {
        return {
            type: 'generic_table',
            tableSelector: 'table tbody tr',
            columnMapping: { court: 0, item: 1, caseNo: 2, title: 3, judge: 4 }
        }
    }
    // Karnataka High Court pattern (example)
    if (url.includes('karnatakajudiciary.') || url.includes('hckarnataka.')) {
        return {
            type: 'generic_table',
            tableSelector: 'table tbody tr',
            columnMapping: { court: 0, item: 1, caseNo: 2, title: 3, judge: 4 }
        }
    }
    // Default generic table parser
    return {
        type: 'generic_table',
        tableSelector: 'table tbody tr',
        columnMapping: { court: 0, item: 1, caseNo: 2, title: 3, judge: 4 }
    }
}

// Parse display board based on detected format
function parseDisplayBoard(html: string, config: ParserConfig): DisplayBoardEntry[] {
    const $ = cheerio.load(html)
    const entries: DisplayBoardEntry[] = []
    const mapping = config.columnMapping || {}

    $(config.tableSelector || 'table tbody tr').each((_, row) => {
        const cells = $(row).find('td')
        if (cells.length >= 4) {
            const courtNumber = mapping.court !== undefined ? $(cells[mapping.court]).text().trim() : ''
            const itemNumber = mapping.item !== undefined ? $(cells[mapping.item]).text().trim() : ''
            const judgeName = mapping.judge !== undefined ? $(cells[mapping.judge]).text().trim() : ''
            const caseNumber = mapping.caseNo !== undefined ? $(cells[mapping.caseNo]).text().trim() : ''
            const caseTitle = mapping.title !== undefined ? $(cells[mapping.title]).text().trim() : ''
            const vcLink = mapping.vcLink !== undefined ? $(cells[mapping.vcLink]).find('a').attr('href') || null : null

            // Skip header rows or empty rows
            if (courtNumber && !courtNumber.toLowerCase().includes('court') && courtNumber !== 'S.No') {
                entries.push({
                    courtNumber: courtNumber.replace(/[^\d]/g, '') || courtNumber, // Extract just the number if possible
                    itemNumber: ['*', '-', 'NA', ''].includes(itemNumber) ? null : itemNumber,
                    caseNumber: ['NA', '-', ''].includes(caseNumber) ? null : caseNumber,
                    caseTitle: ['NA', '-', ''].includes(caseTitle) ? null : caseTitle,
                    judgeName: ['NA', '-', ''].includes(judgeName) ? null : judgeName,
                    vcLink: vcLink === 'NA' ? null : vcLink,
                    status: itemNumber && !['*', '-', 'NA', ''].includes(itemNumber) ? 'IN PROGRESS' : 'WAITING',
                })
            }
        }
    })

    return entries
}

// Scrape a single court's display board
async function scrapeCourt(court: { id: string; courtName: string; displayBoardUrl: string }): Promise<ScrapingResult> {
    try {
        const config = detectParser(court.displayBoardUrl)

        const response = await fetch(court.displayBoardUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Cache-Control': 'no-cache',
            },
        })

        if (!response.ok) {
            return {
                courtId: court.id,
                courtName: court.courtName,
                success: false,
                entriesCount: 0,
                error: `HTTP ${response.status}: ${response.statusText}`
            }
        }

        const html = await response.text()
        const entries = parseDisplayBoard(html, config)

        if (entries.length === 0) {
            return {
                courtId: court.id,
                courtName: court.courtName,
                success: false,
                entriesCount: 0,
                error: 'No entries found - page structure may be different'
            }
        }

        // Upsert entries to cache
        await Promise.all(
            entries.map(async (entry) => {
                return prisma.displayBoardCache.upsert({
                    where: {
                        courtId_courtNumber: {
                            courtId: court.id,
                            courtNumber: entry.courtNumber,
                        },
                    },
                    update: {
                        itemNumber: entry.itemNumber,
                        caseNumber: entry.caseNumber,
                        caseTitle: entry.caseTitle,
                        judgeName: entry.judgeName,
                        status: entry.status,
                        lastUpdated: new Date(),
                        rawData: entry,
                    },
                    create: {
                        courtId: court.id,
                        courtNumber: entry.courtNumber,
                        itemNumber: entry.itemNumber,
                        caseNumber: entry.caseNumber,
                        caseTitle: entry.caseTitle,
                        judgeName: entry.judgeName,
                        status: entry.status,
                        rawData: entry,
                    },
                })
            })
        )

        return {
            courtId: court.id,
            courtName: court.courtName,
            success: true,
            entriesCount: entries.length
        }
    } catch (error) {
        return {
            courtId: court.id,
            courtName: court.courtName,
            success: false,
            entriesCount: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
        }
    }
}

// POST /api/display-board/scrape - Scrape display boards
// Body: { courtId?: string, scrapeAll?: boolean }
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { courtId, scrapeAll, url } = body

        // Get courts to scrape
        let courtsToScrape: { id: string; courtName: string; displayBoardUrl: string }[] = []

        if (scrapeAll) {
            // Scrape all courts with display board URLs
            const courts = await prisma.court.findMany({
                where: {
                    displayBoardUrl: { not: null },
                },
                select: {
                    id: true,
                    courtName: true,
                    displayBoardUrl: true,
                },
            })
            courtsToScrape = courts.filter(c => c.displayBoardUrl) as typeof courtsToScrape
        } else if (courtId) {
            // Scrape specific court
            const court = await prisma.court.findUnique({
                where: { id: courtId },
                select: {
                    id: true,
                    courtName: true,
                    displayBoardUrl: true,
                },
            })

            if (!court) {
                return NextResponse.json({ error: 'Court not found' }, { status: 404 })
            }

            const displayUrl = url || court.displayBoardUrl
            if (!displayUrl) {
                return NextResponse.json({
                    error: 'No display board URL configured for this court'
                }, { status: 400 })
            }

            courtsToScrape = [{ ...court, displayBoardUrl: displayUrl }]
        } else {
            return NextResponse.json({
                error: 'Either courtId or scrapeAll is required'
            }, { status: 400 })
        }

        if (courtsToScrape.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No courts with display board URLs found',
                results: []
            })
        }

        // Scrape all courts (with some concurrency control)
        const results: ScrapingResult[] = []
        const batchSize = 3 // Scrape 3 courts at a time to avoid overwhelming

        for (let i = 0; i < courtsToScrape.length; i += batchSize) {
            const batch = courtsToScrape.slice(i, i + batchSize)
            const batchResults = await Promise.all(batch.map(scrapeCourt))
            results.push(...batchResults)
        }

        const successful = results.filter(r => r.success)
        const failed = results.filter(r => !r.success)

        return NextResponse.json({
            success: true,
            message: `Scraped ${successful.length}/${results.length} courts successfully`,
            summary: {
                total: results.length,
                successful: successful.length,
                failed: failed.length,
                totalEntries: successful.reduce((sum, r) => sum + r.entriesCount, 0)
            },
            results,
        })
    } catch (error) {
        console.error('Failed to scrape display boards:', error)
        return NextResponse.json(
            {
                error: 'Failed to scrape display boards',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}

// GET /api/display-board/scrape - Get courts available for scraping
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const courtId = searchParams.get('courtId')

        if (courtId) {
            // Get cache entries for specific court
            const cacheEntries = await prisma.displayBoardCache.findMany({
                where: { courtId },
                orderBy: { courtNumber: 'asc' },
            })

            const court = await prisma.court.findUnique({
                where: { id: courtId },
                select: {
                    id: true,
                    courtName: true,
                    displayBoardUrl: true,
                },
            })

            return NextResponse.json({
                court,
                entries: cacheEntries,
                lastUpdated: cacheEntries[0]?.lastUpdated || null,
            })
        }

        // List all courts with display board URLs
        const courts = await prisma.court.findMany({
            where: {
                displayBoardUrl: { not: null },
            },
            select: {
                id: true,
                courtName: true,
                courtType: true,
                city: true,
                displayBoardUrl: true,
                _count: {
                    select: { displayBoard: true },
                },
            },
            orderBy: { courtName: 'asc' },
        })

        // Get last update times for each court
        const courtsWithStatus = await Promise.all(
            courts.map(async (court) => {
                const lastEntry = await prisma.displayBoardCache.findFirst({
                    where: { courtId: court.id },
                    orderBy: { lastUpdated: 'desc' },
                    select: { lastUpdated: true },
                })
                return {
                    ...court,
                    cachedEntries: court._count.displayBoard,
                    lastUpdated: lastEntry?.lastUpdated || null,
                }
            })
        )

        return NextResponse.json({
            courts: courtsWithStatus,
            totalCourts: courts.length,
        })
    } catch (error) {
        console.error('Failed to get scrape status:', error)
        return NextResponse.json(
            { error: 'Failed to get scrape status' },
            { status: 500 }
        )
    }
}
