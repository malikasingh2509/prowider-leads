import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

// Manually load .env for the seed script
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const val = match[2].trim().replace(/^"|"$/g, '')
      process.env[key] = val
    }
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  console.log('🌱 Seeding database...')

  const service1 = await prisma.service.upsert({
    where: { name: 'Service 1' },
    update: {},
    create: { name: 'Service 1' },
  })
  const service2 = await prisma.service.upsert({
    where: { name: 'Service 2' },
    update: {},
    create: { name: 'Service 2' },
  })
  const service3 = await prisma.service.upsert({
    where: { name: 'Service 3' },
    update: {},
    create: { name: 'Service 3' },
  })

  console.log('✅ Services created')

  for (let i = 1; i <= 8; i++) {
    await prisma.provider.upsert({
      where: { name: `Provider ${i}` },
      update: {},
      create: { name: `Provider ${i}`, monthlyQuota: 10 },
    })
  }

  console.log('✅ Providers created')

  for (const service of [service1, service2, service3]) {
    await prisma.allocationState.upsert({
      where: { serviceId: service.id },
      update: {},
      create: { serviceId: service.id, lastProviderIndex: -1 },
    })
  }

  console.log('✅ Allocation states initialized')
  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
