import { config } from '#lib/config.js';

export type DashItem = {
	id: string;
	span: number;
};

export type PinnedLayout = {
	items: DashItem[];
};

export const SPANS = [3, 4, 6, 8, 12] as const;

const SIZE_LABELS: Record<number, string> = {
	3: 'Quarter',
	4: 'Third',
	6: 'Half',
	8: 'Two-thirds',
	12: 'Full'
};

export function sizeLabel(span: number): string {
	return SIZE_LABELS[span] ?? `${span}/12`;
}

export function defaultSpanFor(id: string): number {
	if (id.startsWith('camera.')) return 8;
	if (id.startsWith('weather.')) return 4;
	return 6;
}

/** Widths offered per card type — the camera is unreadable below half. */
export function spansFor(id: string): number[] {
	if (id.startsWith('camera.')) return [6, 8, 12];
	// Weather reads badly stretched: its tiles and forecast rows are built for ~365px.
	if (id.startsWith('weather.')) return [4, 6];
	return [3, 4, 6, 12];
}

const DEFAULTS: PinnedLayout = {
	items: [
		...config.cameras.map((id) => ({ id, span: 8 })),
		...(config.weather ? [{ id: config.weather, span: 4 }] : []),
		...config.climate.map((id) => ({ id, span: 6 }))
	]
};

class LayoutState {
	items = $state.raw<DashItem[]>(DEFAULTS.items);
	loaded = $state(false);

	#promise: Promise<void> | null = null;

	load(force = false): Promise<void> {
		if (this.loaded && !force) return Promise.resolve();
		if (this.#promise) return this.#promise;

		this.#promise = fetch('/api/layout')
			.then((response) => response.json() as Promise<PinnedLayout>)
			.then((data) => {
				this.items = data.items?.length ? data.items : DEFAULTS.items;
				this.loaded = true;
			})
			.catch(() => undefined)
			.finally(() => {
				this.#promise = null;
			});

		return this.#promise;
	}

	async save(items: DashItem[]) {
		this.items = items;
		await fetch('/api/layout', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ items })
		}).catch(() => undefined);
	}

	isPinned(entityId: string): boolean {
		return this.items.some((item) => item.id === entityId);
	}

	spanOf(entityId: string): number {
		return this.items.find((item) => item.id === entityId)?.span ?? defaultSpanFor(entityId);
	}

	/** Add or remove a card. New cards keep their domain's natural width. */
	togglePin(entityId: string) {
		const exists = this.isPinned(entityId);
		const items = exists
			? this.items.filter((item) => item.id !== entityId)
			: [...this.items, { id: entityId, span: defaultSpanFor(entityId) }];
		void this.save(items);
	}

	setSpan(entityId: string, span: number) {
		void this.save(
			this.items.map((item) => (item.id === entityId ? { ...item, span } : item))
		);
	}

	/** Drag `draggedId` into the slot occupied by `targetId`. */
	move(draggedId: string, targetId: string) {
		if (draggedId === targetId) return;

		const items = [...this.items];
		const from = items.findIndex((item) => item.id === draggedId);
		const to = items.findIndex((item) => item.id === targetId);
		if (from < 0 || to < 0) return;

		const [moved] = items.splice(from, 1);
		items.splice(to, 0, moved);
		void this.save(items);
	}

	reset() {
		void this.save(DEFAULTS.items);
	}
}

export const layout = new LayoutState();
