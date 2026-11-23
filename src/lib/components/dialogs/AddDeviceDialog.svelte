<script lang="ts">
	import { Camera, Check, CloudSun, Thermometer } from '@lucide/svelte';
	import * as Dialog from '#lib/components/ui/dialog/index.js';
	import { live } from '#lib/live.svelte.js';
	import { registry } from '#lib/registry.svelte.js';
	import { layout } from '#lib/layout.svelte.js';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let query = $state('');
	const id = 'add-device-search';

	type Row = { entityId: string; name: string; meta: string; icon: typeof Camera };

	function nameFor(entityId: string): string {
		return (
			registry.roomFor(entityId) ??
			(live.get(entityId)?.attributes.friendly_name as string | undefined) ??
			entityId
		);
	}

	let cameras = $derived(
		live.all.filter((entity) => entity.entity_id.startsWith('camera.')).map<Row>((entity) => ({
			entityId: entity.entity_id,
			name: nameFor(entity.entity_id),
			meta: registry.modelFor(entity.entity_id) ?? 'Camera',
			icon: Camera
		}))
	);

	let climates = $derived(
		live.all.filter((entity) => entity.entity_id.startsWith('climate.')).map<Row>((entity) => ({
			entityId: entity.entity_id,
			name: nameFor(entity.entity_id),
			meta: registry.modelFor(entity.entity_id) ?? 'Climate',
			icon: Thermometer
		}))
	);

	let weathers = $derived(
		live.all.filter((entity) => entity.entity_id.startsWith('weather.')).map<Row>((entity) => ({
			entityId: entity.entity_id,
			name:
				(live.get(entity.entity_id)?.attributes.friendly_name as string | undefined) ??
				entity.entity_id,
			meta: 'Weather provider',
			icon: CloudSun
		}))
	);

	function filter(rows: Row[]): Row[] {
		const needle = query.trim().toLowerCase();
		if (!needle) return rows;
		return rows.filter(
			(row) =>
				row.name.toLowerCase().includes(needle) || row.entityId.toLowerCase().includes(needle)
		);
	}

	let filteredCameras = $derived(filter(cameras));
	let filteredClimates = $derived(filter(climates));
	let filteredWeathers = $derived(filter(weathers));

	let pinnedCount = $derived(layout.items.length);

	let groups = $derived([
		{ key: 'cameras', label: 'Cameras', rows: filteredCameras },
		{ key: 'climate', label: 'Climate', rows: filteredClimates },
		{ key: 'weather', label: 'Weather', rows: filteredWeathers }
	]);
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="w-[560px] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[560px]">
		<Dialog.Header class="gap-1.5 px-6 pb-4 pt-5">
			<Dialog.Title class="text-[17px] font-semibold tracking-[-0.3px]">Add device</Dialog.Title>
			<Dialog.Description class="text-[13px] leading-relaxed text-muted-foreground">
				Everything here comes straight from Home Assistant — {pinnedCount} cards on the
				dashboard.
			</Dialog.Description>
		</Dialog.Header>

		<div class="h-px w-full bg-border"></div>

		<div class="flex flex-col gap-4 px-6 pb-5 pt-4">
			<div class="relative">
				<input
					id={id}
					type="text"
					bind:value={query}
					placeholder="Search by name, model or room"
					class="h-[38px] w-full rounded-lg border border-border bg-white px-3 text-[13px] outline-none placeholder:text-subtle-foreground focus:border-border-strong"
				/>
			</div>

			<div class="flex flex-col gap-4">
				{#each groups as group (group.key)}
					{#if group.rows.length}
						<div class="flex flex-col gap-2">
							<span class="text-[11.5px] font-semibold tracking-[0.2px] text-muted-foreground">
								{group.label}
							</span>

							{#each group.rows as row (row.entityId)}
								{@const pinned = layout.isPinned(row.entityId)}

								<button
									type="button"
									onclick={() => layout.togglePin(row.entityId)}
									class="flex items-center gap-3 rounded-[9px] border px-3 py-2.5 text-left transition-colors {pinned
										? 'border-primary bg-[#FAFAFA]'
										: 'border-border bg-white hover:border-border-strong'}"
								>
									<span class="grid size-[34px] shrink-0 place-items-center rounded-[8px] bg-muted">
										<row.icon size={16} strokeWidth={1.75} />
									</span>

									<span class="flex min-w-0 flex-1 flex-col leading-none">
										<span class="truncate text-[13px] font-semibold text-foreground">
											{row.name}
										</span>
										<span class="mt-1 truncate text-[11px] text-muted-foreground">
											{row.meta} · {row.entityId}
										</span>
									</span>

									<span
										class="grid size-[18px] shrink-0 place-items-center rounded-full border transition-colors {pinned
											? 'border-primary bg-primary text-primary-foreground'
											: 'border-border-strong bg-white'}"
									>
										{#if pinned}
											<Check size={11} strokeWidth={2.5} />
										{/if}
									</span>
								</button>
							{/each}
						</div>
					{/if}
				{/each}

				{#if !filteredCameras.length && !filteredClimates.length && !filteredWeathers.length}
					<p class="py-6 text-center text-[12px] text-muted-foreground">No entities match.</p>
				{/if}
			</div>
		</div>

		<div class="h-px w-full bg-border"></div>

		<Dialog.Footer
			class="flex flex-row items-center justify-between gap-3 border-0 px-6 py-3.5 sm:justify-between"
		>
			<span class="text-[11.5px] text-muted-foreground">
				{pinnedCount} pinned · {cameras.length + climates.length + weathers.length} available
			</span>
			<button
				type="button"
				onclick={() => (open = false)}
				class="h-[34px] rounded-lg bg-primary px-3.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
			>
				Done
			</button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
