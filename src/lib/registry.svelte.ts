import type { HaArea, HaDevice, HaEntityRegistryEntry, HaFloor } from '#lib/ha/types.js';

type RegistryPayload = {
	areas: HaArea[];
	floors: HaFloor[];
	devices: HaDevice[];
	entities: HaEntityRegistryEntry[];
};

class RegistryState {
	areas = $state.raw<HaArea[]>([]);
	floors = $state.raw<HaFloor[]>([]);
	devices = $state.raw<HaDevice[]>([]);
	entities = $state.raw<HaEntityRegistryEntry[]>([]);
	loaded = $state(false);

	#promise: Promise<void> | null = null;

	load(force = false): Promise<void> {
		if (this.loaded && !force) return Promise.resolve();
		if (this.#promise) return this.#promise;

		this.#promise = fetch('/api/registry')
			.then((response) => response.json() as Promise<RegistryPayload>)
			.then((data) => {
				this.areas = data.areas ?? [];
				this.floors = data.floors ?? [];
				this.devices = data.devices ?? [];
				this.entities = data.entities ?? [];
				this.loaded = true;
			})
			.catch(() => undefined)
			.finally(() => {
				this.#promise = null;
			});

		return this.#promise;
	}

	entryFor(entityId: string): HaEntityRegistryEntry | undefined {
		return this.entities.find((entry) => entry.entity_id === entityId);
	}

	deviceFor(entityId: string): HaDevice | undefined {
		const entry = this.entryFor(entityId);
		if (!entry?.device_id) return undefined;
		return this.devices.find((device) => device.id === entry.device_id);
	}

	areaIdFor(entityId: string): string | undefined {
		const entry = this.entryFor(entityId);
		if (!entry) return undefined;
		if (entry.area_id) return entry.area_id;
		return this.deviceFor(entityId)?.area_id ?? undefined;
	}

	areaName(areaId: string | undefined): string | undefined {
		if (!areaId) return undefined;
		return this.areas.find((area) => area.area_id === areaId)?.name;
	}

	/** Human room name for an entity, e.g. "Quarto Vitória". */
	roomFor(entityId: string): string | undefined {
		return this.areaName(this.areaIdFor(entityId));
	}

	/** Manufacturer model, e.g. "Daikin Smart AC Series". */
	modelFor(entityId: string): string | undefined {
		const device = this.deviceFor(entityId);
		if (!device) return undefined;

		const model = device.model ?? device.model_id ?? undefined;
		const manufacturer = device.manufacturer ?? undefined;

		if (model && manufacturer && !model.toLowerCase().includes(manufacturer.toLowerCase())) {
			return `${manufacturer} ${model}`;
		}
		return model ?? manufacturer ?? device.name ?? undefined;
	}
}

export const registry = new RegistryState();
