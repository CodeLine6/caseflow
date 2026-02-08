import { PrismaClient } from '@prisma/client'
import * as readline from 'readline'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
})

function question(query: string): Promise<string> {
    return new Promise((resolve) => rl.question(query, resolve))
}

async function main() {
    console.log('\\n🔐 Create First Admin Account\\n')

    const email = await question('Enter admin email: ')
    const name = await question('Enter admin name: ')
    const password = await question('Enter password (min 8 characters): ')

    if (!email || !name || !password) {
        console.error('\\n❌ All fields are required')
        process.exit(1)
    }

    if (password.length < 8) {
        console.error('\\n❌ Password must be at least 8 characters')
        process.exit(1)
    }

    try {
        // Check if admin already exists
        const existing = await prisma.admin.findUnique({ where: { email } })
        if (existing) {
            console.error(`\\n❌ Admin with email ${email} already exists`)
            process.exit(1)
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Create admin
        const admin = await prisma.admin.create({
            data: {
                email,
                name,
                password: hashedPassword,
                role: 'SUPER_ADMIN',
            },
        })

        console.log('\\n✅ Admin account created successfully!')
        console.log(`\\nEmail: ${admin.email}`)
        console.log(`Name: ${admin.name}`)
        console.log(`Role: ${admin.role}`)
        console.log('\\nYou can now login at: http://localhost:3000/admin/login\\n')
    } catch (error) {
        console.error('\\n❌ Failed to create admin:', error)
        process.exit(1)
    } finally {
        await prisma.$disconnect()
        rl.close()
    }
}

main()
