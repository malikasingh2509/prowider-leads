import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { idempotencyKey, providerId } = body

    if (!idempotencyKey) {
      return NextResponse.json({ error: 'idempotencyKey is required' }, { status: 400 })
    }

    // ── Idempotency Check ──
    // If this key was already processed, return success without doing anything
    const existing = await prisma.webhookEvent.findUnique({
      where: { id: idempotencyKey },
    })

    if (existing) {
      return NextResponse.json({
        success: true,
        idempotent: true,
        message: 'Webhook already processed. No changes made.',
        processedAt: existing.processedAt,
      })
    }

    // ── Process the webhook ──
    // Reset quota: if providerId given, reset that provider only; else reset all
    await prisma.$transaction(async (tx) => {
      // Record the event first (prevents duplicate processing even under concurrency)
      await tx.webhookEvent.create({
        data: {
          id: idempotencyKey,
          action: 'reset-quota',
        },
      })

      if (providerId) {
        await tx.provider.update({
          where: { id: parseInt(providerId) },
          data: { monthlyQuota: 10 },
        })
      } else {
        // Reset ALL providers
        await tx.provider.updateMany({
          data: { monthlyQuota: 10 },
        })
      }
    })

    return NextResponse.json({
      success: true,
      idempotent: false,
      message: providerId
        ? `Quota reset for Provider ${providerId}`
        : 'Quota reset for all providers',
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
