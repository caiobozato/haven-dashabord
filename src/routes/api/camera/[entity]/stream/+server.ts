import { fetchCameraStream } from '#lib/server/ha.js';

export const prerender = false;

export async function GET({ params, request }: { params: { entity: string }; request: Request }) {
	const entityId = params.entity;

	if (!/^camera\./.test(entityId)) {
		return new Response('Not a camera entity', { status: 400 });
	}

	try {
		const upstream = await fetchCameraStream(entityId, request.signal);
		return new Response(upstream.body, {
			headers: {
				'Content-Type': upstream.headers.get('content-type') ?? 'multipart/x-mixed-replace',
				'Cache-Control': 'no-store, no-transform',
				Connection: 'keep-alive',
				'X-Accel-Buffering': 'no'
			}
		});
	} catch {
		return new Response('Stream unavailable', { status: 502 });
	}
}
