import { json } from '@sveltejs/kit';
import { callService, HaError } from '#lib/server/ha.js';

export const prerender = false;

/** Service domains the dashboard is allowed to call. */
const ALLOWED_DOMAINS = new Set([
	'climate',
	'switch',
	'light',
	'fan',
	'cover',
	'media_player',
	'scene',
	'script',
	'button',
	'camera',
	'humidifier',
	'vacuum',
	'weather',
	'persistent_notification'
]);

export async function POST({ params, request }) {
	const path = (params.path ?? '').split('/').filter(Boolean);
	if (path.length !== 2) {
		return json({ error: 'Expected /api/service/<domain>/<service>' }, { status: 400 });
	}

	const [domain, service] = path;
	if (!ALLOWED_DOMAINS.has(domain)) {
		return json({ error: `Domain "${domain}" is not allowed` }, { status: 403 });
	}

	let body: Record<string, unknown> = {};
	try {
		body = (await request.json()) ?? {};
	} catch {
		body = {};
	}

	try {
		// No ?return_response here: Home Assistant rejects it for services that
		// do not declare a response, which is most action services.
		const result = await callService(domain, service, body, false);
		return json({ ok: true, result });
	} catch (error) {
		if (error instanceof HaError) {
			return json({ error: error.message, status: error.status }, { status: 502 });
		}
		return json({ error: (error as Error).message }, { status: 500 });
	}
}
