import { ensureLive, store } from '#lib/server/state-store.js';

export const prerender = false;

export async function GET({ request }: { request: Request }) {
	await ensureLive();

	const encoder = new TextEncoder();
	let cleanup = () => {};

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			const send = (event: string, data: unknown) => {
				try {
					controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
				} catch {
					cleanup();
				}
			};

			send('snapshot', { entities: store.snapshot(), status: store.status });

			const unsubscribe = store.subscribe((changed) => send('changes', changed));
			const unsubscribeStatus = store.subscribeStatus((status) => send('status', status));
			const heartbeat = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(': heartbeat\n\n'));
				} catch {
					cleanup();
				}
			}, 15_000);

			cleanup = () => {
				clearInterval(heartbeat);
				unsubscribe();
				unsubscribeStatus();
				try {
					controller.close();
				} catch {
					/* already closed */
				}
			};

			request.signal.addEventListener('abort', cleanup);
		},
		cancel() {
			cleanup();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
}
