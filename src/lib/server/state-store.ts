import { getStates } from '#lib/server/ha.js';
import { haSocket, type SocketStatus } from '#lib/server/ha-ws.js';
import type {
	HaArea,
	HaDevice,
	HaEntityRegistryEntry,
	HaFloor,
	HaState
} from '#lib/ha/types.js';

export type Registry = {
	areas: HaArea[];
	floors: HaFloor[];
	devices: HaDevice[];
	entities: HaEntityRegistryEntry[];
	loadedAt: number;
};

export type LiveStatus = {
	ha: SocketStatus;
	seeded: boolean;
	lastEventAt: string | null;
};

type Subscriber = (changed: HaState[]) => void;
type StatusSubscriber = (status: LiveStatus) => void;

const REGISTRY_TTL = 60_000;

class StateStore {
	private entities = new Map<string, HaState>();
	private registry: Registry | null = null;
	private registryPromise: Promise<Registry> | null = null;
	private subscribers = new Set<Subscriber>();
	private statusSubscribers = new Set<StatusSubscriber>();
	private queue = new Map<string, HaState>();
	private flushTimer: ReturnType<typeof setTimeout> | null = null;
	private started = false;
	private seeded = false;
	private lastEventAt: string | null = null;

	status: LiveStatus = { ha: 'closed', seeded: false, lastEventAt: null };

	async ensureStarted(): Promise<void> {
		if (this.started) return;
		this.started = true;

		haSocket.onStatus((status) => this.setStatus({ ha: status }));

		haSocket.onEvent((message) => {
			if (message.type !== 'event') return;
			const event = message.event as
				| { event_type?: string; data?: { entity_id?: string; new_state?: HaState | null } }
				| undefined;
			if (event?.event_type !== 'state_changed') return;

			const entityId = event.data?.entity_id;
			const newState = event.data?.new_state;
			if (!entityId) return;

			if (newState) {
				this.entities.set(entityId, newState);
				this.queue.set(entityId, newState);
			} else {
				this.entities.delete(entityId);
			}
			this.lastEventAt = new Date().toISOString();
			this.scheduleFlush();
		});

		haSocket.onOpen(() => {
			void this.seed();
			void haSocket.request('subscribe_events', { event_type: 'state_changed' });
		});

		try {
			await this.seed();
			await haSocket.connect();
			await haSocket.request('subscribe_events', { event_type: 'state_changed' });
		} catch (error) {
			console.error('[state] initial connection failed, retrying in background', error);
		}
	}

	private async seed() {
		try {
			const states = await getStates();
			const next = new Map<string, HaState>();
			for (const state of states) next.set(state.entity_id, state);
			this.entities = next;
			this.seeded = true;
			this.setStatus({ seeded: true, lastEventAt: this.lastEventAt });
			this.emitAll();
		} catch (error) {
			console.error('[state] seed failed', error);
		}
	}

	private scheduleFlush() {
		if (this.flushTimer) return;
		this.flushTimer = setTimeout(() => {
			this.flushTimer = null;
			const changed = [...this.queue.values()];
			this.queue.clear();
			if (!changed.length) return;
			for (const subscriber of this.subscribers) subscriber(changed);
		}, 120);
	}

	private emitAll() {
		const all = [...this.entities.values()];
		for (const subscriber of this.subscribers) subscriber(all);
	}

	private setStatus(patch: Partial<LiveStatus>) {
		this.status = { ...this.status, ...patch, lastEventAt: this.lastEventAt };
		for (const subscriber of this.statusSubscribers) subscriber(this.status);
	}

	snapshot(): HaState[] {
		return [...this.entities.values()];
	}

	get(entityId: string): HaState | undefined {
		return this.entities.get(entityId);
	}

	subscribe(subscriber: Subscriber): () => void {
		this.subscribers.add(subscriber);
		return () => this.subscribers.delete(subscriber);
	}

	subscribeStatus(subscriber: StatusSubscriber): () => void {
		this.statusSubscribers.add(subscriber);
		return () => this.statusSubscribers.delete(subscriber);
	}

	async getRegistry(force = false): Promise<Registry> {
		const fresh = this.registry && Date.now() - this.registry.loadedAt < REGISTRY_TTL;
		if (!force && fresh) return this.registry!;
		if (this.registryPromise) return this.registryPromise;

		this.registryPromise = (async () => {
			const [areas, floors, devices, entities] = await Promise.all([
				haSocket.request<HaArea[]>('config/area_registry/list'),
				haSocket.request<HaFloor[]>('config/floor_registry/list').catch(() => []),
				haSocket.request<HaDevice[]>('config/device_registry/list'),
				haSocket.request<HaEntityRegistryEntry[]>('config/entity_registry/list')
			]);
			this.registry = {
				areas: areas ?? [],
				floors: floors ?? [],
				devices: devices ?? [],
				entities: entities ?? [],
				loadedAt: Date.now()
			};
			return this.registry;
		})().finally(() => {
			this.registryPromise = null;
		});

		return this.registryPromise;
	}
}

const globalKey = Symbol.for('haven.state.store');
type GlobalWithStore = typeof globalThis & { [globalKey]?: StateStore };

export const store: StateStore =
	(globalThis as GlobalWithStore)[globalKey] ?? new StateStore();

(globalThis as GlobalWithStore)[globalKey] = store;

export function ensureLive(): Promise<void> {
	return store.ensureStarted();
}
