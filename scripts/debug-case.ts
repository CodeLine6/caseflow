
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const caseId = 'cmlew79if0001rdmkii0f0u7y'
    console.log(`Fetching case ${caseId}...`)

    try {
        const caseData = await prisma.case.findUnique({
            where: { id: caseId },
            include: {
                client: true,
                mainCounsel: true,
                court: true,
                workspace: true,
                hearings: { take: 1 },
                documents: { take: 1 },
                tasks: { take: 1 },
            }
        })

        if (!caseData) {
            console.log('Case not found')
        } else {
            console.log('Case found successfully:')
            console.log(JSON.stringify(caseData, null, 2))
        }
    } catch (error) {
        console.error('Error fetching case:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
