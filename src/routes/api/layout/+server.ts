import { json } from '@sveltejs/kit';
import { readLayout, sanitize, writeLayout } from '#lib/server/pinned.js';

export const prerender = false;

export async function GET() {
	return json(await readLayout());
}

export async function PUT({ request }: { request: Request }) {
	const body = await request.json().catch(() => ({}));
	const layout = sanitize(body);
	await writeLayout(layout);
	return json(layout);
}
