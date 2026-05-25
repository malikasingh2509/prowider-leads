import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { assignProviders } from '@/lib/allocation'
import { broadcastLeadUpdate } from '@/lib/events'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customerName, phone, city, serviceId, description } = body

    // ── Validate input ──
    if (!customerName || !phone || !city || !serviceId || !description) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const parsedServiceId = parseInt(serviceId)
    if (isNaN(parsedServiceId)) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 })
    }

    // ── Verify service exists ──
    const service = await prisma.service.findUnique({ where: { id: parsedServiceId } })
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // ── Create lead + assign providers in a single atomic transaction ──
    // The duplicate check (phone + serviceId) is enforced at DB level via @@unique
    let lead
    let assignedProviderIds: number[]

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // Create lead — will throw on duplicate (unique constraint)
          const newLead = await tx.lead.create({
            data: {
              customerName,
              phone,
              city,
              serviceId: parsedServiceId,
              description,
            },
          })

          // Assign providers using locked round-robin
          const providers = await assignProviders(tx, newLead.id, parsedServiceId)

          return { lead: newLead, providers }
        },
        {
          // Serializable isolation ensures full correctness under concurrency
          isolationLevel: 'Serializable',
          timeout: 15000,
        }
      )

      lead = result.lead
      assignedProviderIds = result.providers
    } catch (err: any) {
      // Unique constraint violation = duplicate lead
      if (err.code === 'P2002') {
        return NextResponse.json(
          { error: 'A lead for this phone number and service already exists.' },
          { status: 409 }
        )
      }
      throw err
    }

    // ── Broadcast real-time update to all open dashboards ──
    broadcastLeadUpdate({
      type: 'lead-update',
      leadId: lead.id,
      serviceId: parsedServiceId,
      assignedProviderIds,
    })

    return NextResponse.json(
      {
        success: true,
        leadId: lead.id,
        assignedProviders: assignedProviderIds,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Lead creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  const leads = await prisma.lead.findMany({
    include: {
      service: true,
      assignments: { include: { provider: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(leads)
}
