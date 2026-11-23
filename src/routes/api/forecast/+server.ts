import { json } from '@sveltejs/kit';
import { getForecast } from '#lib/server/ha.js';

export const prerender = false;

type CacheEntry = { at: number; value: { daily: unknown[]; hourly: unknown[] } };
const TTL = 10 * 60_000;
const cache = new Map<string, CacheEntry>();

export async function GET({ url }: { url: URL }) {
	const entityId = url.searchParams.get('entity') ?? 'weather.home';

	const cached = cache.get(entityId);
	if (cached && Date.now() - cached.at < TTL) {
		return json(cached.value);
	}

	try {
		const [daily, hourly] = await Promise.all([
			getForecast(entityId, 'daily'),
			getForecast(entityId, 'hourly')
		]);
		const value = { daily, hourly };
		cache.set(entityId, { at: Date.now(), value });
		return json(value);
	} catch (error) {
		return json({ error: (error as Error).message, daily: [], hourly: [] }, { status: 502 });
	}
}
