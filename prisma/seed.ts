import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create Services
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

  // Create 8 Providers
  for (let i = 1; i <= 8; i++) {
    await prisma.provider.upsert({
      where: { name: `Provider ${i}` },
      update: {},
      create: { name: `Provider ${i}`, monthlyQuota: 10 },
    })
  }

  console.log('✅ Providers created')

  // Create AllocationState for each service (tracks round-robin position)
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
  })
