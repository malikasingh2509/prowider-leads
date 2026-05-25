import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { assignProviders } from '@/lib/allocation'
import { broadcastLeadUpdate } from '@/lib/events'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const count = Math.min(parseInt(body.count ?? '10'), 20)

    const services = await prisma.service.findMany()
    if (services.length === 0) {
      return NextResponse.json({ error: 'No services found. Run seed first.' }, { status: 400 })
    }

    const timestamp = Date.now()

    // Fire all lead creations simultaneously to test concurrency
    const promises = Array.from({ length: count }, async (_, i) => {
      const service = services[i % services.length]
      const phone = `TEST${timestamp}${String(i).padStart(3, '0')}`

      try {
        const result = await prisma.$transaction(
          async (tx) => {
            const lead = await tx.lead.create({
              data: {
                customerName: `Test Customer ${i + 1}`,
                phone,
                city: 'Test City',
                serviceId: service.id,
                description: `Concurrency test lead #${i + 1}`,
              },
            })

            const providers = await assignProviders(tx, lead.id, service.id)
            return { lead, providers }
          },
          { isolationLevel: 'Serializable', timeout: 30000 }
        )

        broadcastLeadUpdate({
          type: 'lead-update',
          leadId: result.lead.id,
          serviceId: service.id,
          assignedProviderIds: result.providers,
        })

        return { success: true, leadId: result.lead.id, providers: result.providers }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    })

    const results = await Promise.all(promises)
    const successCount = results.filter((r) => r.success).length

    return NextResponse.json({
      total: count,
      succeeded: successCount,
      failed: count - successCount,
      results,
    })
  } catch (error) {
    console.error('Generate leads error:', error)
    return NextResponse.json({ error: 'Failed to generate leads' }, { status: 500 })
  }
}
