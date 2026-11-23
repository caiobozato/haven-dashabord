import { toast } from 'svelte-sonner';
import { live } from '#lib/live.svelte.js';

type ServiceData = Record<string, unknown> & { entity_id?: string | string[] };

/**
 * Calls a Home Assistant service through the server proxy.
 * Optimistic UI is handled by the caller; failures surface as a toast.
 */
export async function callService(
	domain: string,
	service: string,
	data: ServiceData
): Promise<boolean> {
	const entityIds = Array.isArray(data.entity_id)
		? data.entity_id
		: data.entity_id
			? [data.entity_id]
			: [];

	for (const entityId of entityIds) await live.setBusy(entityId, true);

	try {
		const response = await fetch(`/api/service/${domain}/${service}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});

		if (!response.ok) {
			const body = (await response.json().catch(() => null)) as { error?: string } | null;
			toast.error('Home Assistant rejected the command', {
				description: body?.error ?? `HTTP ${response.status}`
			});
			return false;
		}
		return true;
	} catch (error) {
		toast.error('Could not reach Home Assistant', {
			description: (error as Error).message
		});
		return false;
	} finally {
		for (const entityId of entityIds) await live.setBusy(entityId, false);
	}
}

export function setHvacMode(entityId: string, mode: string) {
	return callService('climate', 'set_hvac_mode', { entity_id: entityId, hvac_mode: mode });
}

export function setTemperature(entityId: string, temperature: number) {
	return callService('climate', 'set_temperature', { entity_id: entityId, temperature });
}

export function setFanMode(entityId: string, fanMode: string) {
	return callService('climate', 'set_fan_mode', { entity_id: entityId, fan_mode: fanMode });
}

export function setPresetMode(entityId: string, presetMode: string) {
	return callService('climate', 'set_preset_mode', { entity_id: entityId, preset_mode: presetMode });
}

export function setSwingMode(entityId: string, swingMode: string) {
	return callService('climate', 'set_swing_mode', { entity_id: entityId, swing_mode: swingMode });
}

export function turnOff(entityId: string) {
	return callService('climate', 'turn_off', { entity_id: entityId });
}

export function turnOn(entityId: string) {
	return callService('climate', 'turn_on', { entity_id: entityId });
}
