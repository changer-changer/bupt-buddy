export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          )
        } catch {
          // stream closed
        }
      }

      send({ type: 'connected', time: Date.now() })

      const interval = setInterval(() => {
        send({ type: 'heartbeat', time: Date.now() })
      }, 30000)

      // Keep-alive
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': \n\n'))
        } catch {
          clearInterval(interval)
          clearInterval(keepAlive)
        }
      }, 15000)

      // Cleanup on client disconnect
      const cleanup = () => {
        clearInterval(interval)
        clearInterval(keepAlive)
        try {
          controller.close()
        } catch {
          // already closed
        }
      }

      request.signal.addEventListener('abort', cleanup)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
