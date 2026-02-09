
import { prisma } from '../src/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'

async function main() {
    const now = new Date()
    console.log('Server Time (now):', now.toString())
    console.log('Server Time (ISO):', now.toISOString())

    const todayManual = new Date()
    todayManual.setHours(0, 0, 0, 0)
    const tomorrowManual = new Date(todayManual)
    tomorrowManual.setDate(tomorrowManual.getDate() + 1)

    console.log('Manual Today Start:', todayManual.toString())
    console.log('Manual Tomorrow Start:', tomorrowManual.toString())

    const dayStart = startOfDay(now)
    const dayEnd = endOfDay(now)

    console.log('date-fns Start:', dayStart.toString())
    console.log('date-fns End:', dayEnd.toString())

    const hearings = await prisma.hearing.findMany({
        include: { case: true }
    })

    console.log('\n--- ALL HEARINGS ---')
    hearings.forEach(h => {
        console.log(`ID: ${h.id}, Date: ${h.hearingDate.toISOString()}, Court#: ${h.courtNumber}, Case: ${h.case.caseNumber}, CourtID: ${h.case.courtId}`)

        const inManualRange = h.hearingDate >= todayManual && h.hearingDate < tomorrowManual
        const inFnsRange = h.hearingDate >= dayStart && h.hearingDate <= dayEnd

        console.log(`  Included in Manual Range? ${inManualRange}`)
        console.log(`  Included in date-fns Range? ${inFnsRange}`)
    })
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
