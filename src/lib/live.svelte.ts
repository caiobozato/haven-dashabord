import type { HaState } from '#lib/ha/types.js';

export type LiveStatus = {
	ha: 'connecting' | 'open' | 'closed' | 'unauthorized';
	seeded: boolean;
	lastEventAt: string | null;
};

type EntityMap = Record<string, HaState>;

class LiveState {
	/** Entity states, keyed by entity_id. Replaced wholesale on each batch. */
	entities = $state.raw<EntityMap>({});
	status = $state.raw<LiveStatus>({ ha: 'connecting', seeded: false, lastEventAt: null });
	/** True once the SSE stream is connected. */
	connected = $state(false);
	/** Entity ids with an in-flight service call. */
	busy = $state.raw<Record<string, boolean>>({});

	#started = false;
	#source: EventSource | null = null;

	hydrate(states: HaState[] | EntityMap) {
		const next: EntityMap = { ...this.entities };
		if (Array.isArray(states)) {
			for (const state of states) next[state.entity_id] = state;
		} else {
			Object.assign(next, states);
		}
		this.entities = next;
	}

	start() {
		if (this.#started || typeof window === 'undefined') return;
		this.#started = true;

		const source = new EventSource('/api/state');
		this.#source = source;

		source.addEventListener('open', () => {
			this.connected = true;
		});

		source.addEventListener('error', () => {
			this.connected = false;
			this.status = { ...this.status, ha: 'closed' };
		});

		source.addEventListener('snapshot', (event) => {
			const data = JSON.parse((event as MessageEvent).data) as {
				entities: HaState[];
				status: LiveStatus;
			};
			this.hydrate(data.entities);
			this.status = data.status;
			this.connected = true;
		});

		source.addEventListener('changes', (event) => {
			const changed = JSON.parse((event as MessageEvent).data) as HaState[];
			this.hydrate(changed);
		});

		source.addEventListener('status', (event) => {
			this.status = JSON.parse((event as MessageEvent).data) as LiveStatus;
		});
	}

	stop() {
		this.#source?.close();
		this.#source = null;
		this.#started = false;
	}

	get(entityId: string | undefined): HaState | undefined {
		return entityId ? this.entities[entityId] : undefined;
	}

	get all(): HaState[] {
		return Object.values(this.entities);
	}

	async setBusy(entityId: string, value: boolean) {
		this.busy = { ...this.busy, [entityId]: value };
	}
}

export const live = new LiveState();
