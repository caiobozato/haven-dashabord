import type { HaState } from '#lib/ha/types.js';

/**
 * Entities Home Assistant can no longer reach.
 *
 * `unknown` is deliberately excluded: for people, buttons, event entities and TTS
 * it is a normal resting state, not an outage. `unavailable` means HA lost the
 * device, which is the thing worth a warning.
 */
const DEVICE_DOMAINS = new Set([
	'camera',
	'climate',
	'light',
	'switch',
	'fan',
	'cover',
	'media_player',
	'vacuum',
	'humidifier',
	'lock',
	'sensor',
	'binary_sensor'
]);

export function isOffline(entity: HaState): boolean {
	return entity.state === 'unavailable';
}

export function offlineEntities(entities: HaState[]): HaState[] {
	return entities.filter(
		(entity) => isOffline(entity) && DEVICE_DOMAINS.has(entity.entity_id.split('.')[0])
	);
}

export function domainOf(entityId: string): string {
	return entityId.split('.')[0];
}
