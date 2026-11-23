import { json } from '@sveltejs/kit';
import { ensureLive, store } from '#lib/server/state-store.js';

export const prerender = false;

export async function GET() {
	await ensureLive();
	const entities = store.snapshot();

	const byDomain: Record<string, number> = {};
	for (const entity of entities) {
		const domain = entity.entity_id.split('.')[0];
		byDomain[domain] = (byDomain[domain] ?? 0) + 1;
	}

	return json({
		status: store.status,
		entityCount: entities.length,
		byDomain,
		climate: entities
			.filter((entity) => entity.entity_id.startsWith('climate.'))
			.map((entity) => ({
				entity_id: entity.entity_id,
				state: entity.state,
				temperature: entity.attributes.temperature,
				current_temperature: entity.attributes.current_temperature
			})),
		cameras: entities
			.filter((entity) => entity.entity_id.startsWith('camera.'))
			.map((entity) => ({
				entity_id: entity.entity_id,
				state: entity.state,
				attributes: Object.keys(entity.attributes)
			})),
		weather: entities
			.filter((entity) => entity.entity_id.startsWith('weather.'))
			.map((entity) => ({ entity_id: entity.entity_id, state: entity.state }))
	});
}
