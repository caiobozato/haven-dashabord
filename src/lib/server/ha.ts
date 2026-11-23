import { HA_TOKEN, HA_URL as HA_URL_ENV } from '$app/env/private';
import type { HaConfig, HaForecastEntry, HaState, WeatherForecastType } from '#lib/ha/types.js';

const HA_URL = (HA_URL_ENV || 'http://homeassistant.local:8123').replace(/\/+$/, '');
const TOKEN = HA_TOKEN ?? '';

if (!TOKEN) {
	console.warn('[ha] HA_TOKEN is not set — the dashboard will not be able to reach Home Assistant');
}

export class HaError extends Error {
	constructor(
		public status: number,
		public body: string
	) {
		super(`Home Assistant responded ${status}: ${body.slice(0, 200)}`);
		this.name = 'HaError';
	}
}

export function haUrl(path: string): string {
	return `${HA_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function haHeaders(extra?: HeadersInit): Headers {
	const headers = new Headers(extra);
	headers.set('Authorization', `Bearer ${TOKEN}`);
	if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
	return headers;
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
	const res = await fetch(haUrl(path), {
		...init,
		headers: haHeaders(init.headers)
	});
	if (!res.ok) throw new HaError(res.status, await res.text());
	return res;
}

export async function getStates(): Promise<HaState[]> {
	const res = await request('/api/states');
	return (await res.json()) as HaState[];
}

export async function getConfig(): Promise<HaConfig> {
	const res = await request('/api/config');
	return (await res.json()) as HaConfig;
}

export async function callService(
	domain: string,
	service: string,
	data: Record<string, unknown> = {},
	returnResponse = false
): Promise<unknown> {
	const res = await request(
		`/api/services/${domain}/${service}${returnResponse ? '?return_response' : ''}`,
		{ method: 'POST', body: JSON.stringify(data) }
	);
	return res.json().catch(() => null);
}

export async function getForecast(
	entityId: string,
	type: WeatherForecastType = 'daily'
): Promise<HaForecastEntry[]> {
	const body = (await callService(
		'weather',
		'get_forecasts',
		{ entity_id: entityId, type },
		true
	)) as { service_response?: Record<string, { forecast?: HaForecastEntry[] }> } | null;

	return body?.service_response?.[entityId]?.forecast ?? [];
}

/** Raw snapshot JPEG for a camera entity. */
export function fetchSnapshot(entityId: string): Promise<Response> {
	return request(`/api/camera_proxy/${entityId}`);
}

/** Raw multipart/x-mixed-replace stream for a camera entity. */
export function fetchCameraStream(entityId: string, signal?: AbortSignal): Promise<Response> {
	return request(`/api/camera_proxy_stream/${entityId}`, { signal });
}

export { HA_URL };
