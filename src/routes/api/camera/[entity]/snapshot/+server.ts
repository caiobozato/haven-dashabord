import { fetchSnapshot } from '#lib/server/ha.js';

export const prerender = false;

export async function GET({ params }: { params: { entity: string } }) {
	const entityId = params.entity;

	if (!/^(camera|image)\./.test(entityId)) {
		return new Response('Not a camera entity', { status: 400 });
	}

	try {
		const upstream = await fetchSnapshot(entityId);
		const body = await upstream.arrayBuffer();
		return new Response(body, {
			headers: {
				'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
				'Cache-Control': 'no-store'
			}
		});
	} catch {
		return new Response('Snapshot unavailable', { status: 502 });
	}
}
