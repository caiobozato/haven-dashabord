import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { HAVEN_DATA_DIR } from '$app/env/private';
import { config } from '#lib/config.js';

/** A card on the dashboard: any entity id plus how many of the 12 columns it spans. */
export type DashItem = {
	id: string;
	span: number;
};

export type PinnedLayout = {
	items: DashItem[];
};

export const ALLOWED_SPANS = [3, 4, 6, 8, 12] as const;
const ID_PATTERN = /^(camera|climate|weather)\.[a-z0-9_]+$/;

export function defaultSpanFor(id: string): number {
	if (id.startsWith('camera.')) return 8;
	if (id.startsWith('weather.')) return 4;
	return 6;
}

export const DEFAULT_LAYOUT: PinnedLayout = {
	items: [
		...config.cameras.map((id) => ({ id, span: 8 })),
		...(config.weather ? [{ id: config.weather, span: 4 }] : []),
		...config.climate.map((id) => ({ id, span: 6 }))
	]
};

function filePath(): string {
	return path.resolve(HAVEN_DATA_DIR || 'data', 'pinned.json');
}

/** Legacy shape: `{ cameras[], climate[], weather, wide[] }`. */
type LegacyLayout = {
	cameras?: unknown;
	climate?: unknown;
	weather?: unknown;
	wide?: unknown;
};

function fromLegacy(legacy: LegacyLayout): DashItem[] {
	const list = (value: unknown) =>
		Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

	const wide = list(legacy.wide);
	const items: DashItem[] = [];

	for (const id of list(legacy.cameras)) items.push({ id, span: 8 });
	const weather = typeof legacy.weather === 'string' ? legacy.weather : null;
	if (weather) items.push({ id: weather, span: 4 });
	for (const id of list(legacy.climate)) {
		items.push({ id, span: wide.includes(id) ? 12 : 6 });
	}

	return items;
}

export async function readLayout(): Promise<PinnedLayout> {
	try {
		const raw = await readFile(filePath(), 'utf8');
		const parsed = JSON.parse(raw) as Partial<PinnedLayout> & LegacyLayout;

		if (Array.isArray(parsed.items)) return sanitize({ items: parsed.items });
		// Migrate the pre-grid layout once, then keep writing the new shape.
		return sanitize({ items: fromLegacy(parsed) });
	} catch {
		return DEFAULT_LAYOUT;
	}
}

export async function writeLayout(layout: PinnedLayout): Promise<void> {
	const target = filePath();
	await mkdir(path.dirname(target), { recursive: true });
	await writeFile(target, JSON.stringify(layout, null, '\t'), 'utf8');
}

export function sanitize(input: unknown): PinnedLayout {
	const value = (input ?? {}) as { items?: unknown };
	const items = Array.isArray(value.items) ? value.items : [];

	const seen = new Set<string>();
	const cleaned: DashItem[] = [];

	for (const entry of items) {
		if (!entry || typeof entry !== 'object') continue;
		const { id, span } = entry as { id?: unknown; span?: unknown };
		if (typeof id !== 'string' || !ID_PATTERN.test(id) || seen.has(id)) continue;

		const numeric = typeof span === 'number' ? span : defaultSpanFor(id);
		const snapped = ALLOWED_SPANS.reduce((best, candidate) =>
			Math.abs(candidate - numeric) < Math.abs(best - numeric) ? candidate : best
		);

		seen.add(id);
		cleaned.push({ id, span: snapped });
	}

	return { items: cleaned };
}
