import { NextRequest } from 'next/server'
import { emitter } from '@/lib/events'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send initial ping so client knows connection is open
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'))

      const handler = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // Client already disconnected
        }
      }

      emitter.on('lead-update', handler)

      // Keep-alive ping every 25s (prevents proxy timeouts)
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'))
        } catch {
          clearInterval(keepAlive)
        }
      }, 25000)

      req.signal.addEventListener('abort', () => {
        emitter.off('lead-update', handler)
        clearInterval(keepAlive)
        try {
          controller.close()
        } catch {
          // already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
