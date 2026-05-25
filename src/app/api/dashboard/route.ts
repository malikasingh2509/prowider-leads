import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const providers = await prisma.provider.findMany({
      orderBy: { id: 'asc' },
      include: {
        assignments: {
          include: {
            lead: {
              include: { service: true },
            },
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
    })

    const formatted = providers.map((p) => ({
      id: p.id,
      name: p.name,
      monthlyQuota: p.monthlyQuota,
      leadsCount: p.assignments.length,
      leads: p.assignments.map((a) => ({
        leadId: a.leadId,
        customerName: a.lead.customerName,
        phone: a.lead.phone,
        city: a.lead.city,
        service: a.lead.service.name,
        description: a.lead.description,
        assignedAt: a.assignedAt,
      })),
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Dashboard fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
