import { json } from '@sveltejs/kit';
import { ensureLive, store } from '#lib/server/state-store.js';

export const prerender = false;

export async function GET() {
	await ensureLive();
	try {
		const registry = await store.getRegistry();
		return json({
			areas: registry.areas,
			floors: registry.floors,
			devices: registry.devices,
			entities: registry.entities,
			loadedAt: registry.loadedAt
		});
	} catch (error) {
		return json(
			{ areas: [], floors: [], devices: [], entities: [], error: (error as Error).message },
			{ status: 502 }
		);
	}
}
