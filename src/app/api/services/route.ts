import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const services = await prisma.service.findMany({ orderBy: { id: 'asc' } })
  return NextResponse.json(services)
}
