<script lang="ts">
	import { onMount } from 'svelte';
	import { Leaf } from '@lucide/svelte';
	import PageHeader from '#lib/components/layout/PageHeader.svelte';
	import CameraCard from '#lib/components/cards/CameraCard.svelte';
	import WeatherCard from '#lib/components/cards/WeatherCard.svelte';
	import ClimateCard from '#lib/components/cards/ClimateCard.svelte';
	import AcDetailSheet from '#lib/components/dialogs/AcDetailSheet.svelte';
	import AddDeviceDialog from '#lib/components/dialogs/AddDeviceDialog.svelte';
	import { Skeleton } from '#lib/components/ui/skeleton/index.js';
	import { live } from '#lib/live.svelte.js';
	import { registry } from '#lib/registry.svelte.js';
	import { layout, spansFor } from '#lib/layout.svelte.js';
	import { ui } from '#lib/ui.svelte.js';
	import { config } from '#lib/config.js';
	import { offlineEntities } from '#lib/ha/health.js';
	import {
		cameraView,
		climateView,
		greeting,
		weatherView,
		type CameraView,
		type ClimateView,
		type WeatherView
	} from '#lib/ha/derive.js';

	let now = $state(new Date());
	onMount(() => {
		void registry.load();
		void layout.load();
		const timer = setInterval(() => (now = new Date()), 30_000);
		return () => clearInterval(timer);
	});

	let ready = $derived(live.status.seeded);

	/* ---------- views keyed by entity ---------- */
	let cameraViews = $derived(
		Object.fromEntries(
			layout.items
				.filter((item) => item.id.startsWith('camera.'))
				.map((item) => [
					item.id,
					cameraView(live.get(item.id), {
						name: registry.roomFor(item.id) ?? undefined,
						model: registry.modelFor(item.id) ?? undefined
					})
				])
		) as Record<string, CameraView | null>
	);

	let weatherViews = $derived(
		Object.fromEntries(
			layout.items
				.filter((item) => item.id.startsWith('weather.'))
				.map((item) => [item.id, weatherView(live.get(item.id))])
		) as Record<string, WeatherView | null>
	);

	let climateViews = $derived(
		Object.fromEntries(
			layout.items
				.filter((item) => item.id.startsWith('climate.'))
				.map((item) => [
					item.id,
					climateView(live.get(item.id), { name: registry.roomFor(item.id) ?? undefined })
				])
		) as Record<string, ClimateView | null>
	);

	let allClimates = $derived(
		Object.values(climateViews).filter((view): view is ClimateView => view !== null)
	);
	let activeCount = $derived(allClimates.filter((view) => view.isOn).length);
	let ecoOn = $derived(allClimates.some((view) => view.presetMode === 'eco'));

	let sunNextSetting = $derived(live.get('sun.sun')?.attributes.next_setting as string | undefined);

	/* ---------- status line ---------- */
	let offlineCount = $derived(offlineEntities(live.all).length);

	let subtitle = $derived(
		[
			`${config.homeName} · ${
				live.status.ha !== 'open'
					? 'reconnecting to Home Assistant'
					: offlineCount === 0
						? 'everything is running smoothly'
						: `${offlineCount} ${offlineCount === 1 ? 'device' : 'devices'} offline`
			}`,
			allClimates.length
				? `${allClimates.length} units · ${activeCount} active`
				: null,
			ecoOn ? 'Eco mode on' : null
		]
			.filter(Boolean)
			.join(' · ')
	);

	/* ---------- drag to move ---------- */
	let draggingId = $state<string | null>(null);
	let overId = $state<string | null>(null);

	function startReorder(event: PointerEvent, entityId: string) {
		// Never stack gestures: a second pointerdown while a drag is live would
		// leave an orphaned listener that fires on the next unrelated click.
		if (draggingId) return;
		event.preventDefault();
		event.stopPropagation();
		draggingId = entityId;
		overId = null;

		const onMove = (moveEvent: PointerEvent) => {
			const element = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
			const card = element?.closest('[data-card-id]') as HTMLElement | null;
			overId = card?.dataset.cardId ?? null;
		};

		const finish = () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', finish);
			window.removeEventListener('pointercancel', finish);

			if (draggingId && overId && draggingId !== overId) {
				layout.move(draggingId, overId);
			}
			draggingId = null;
			overId = null;
		};

		window.addEventListener('pointermove', onMove, { passive: true });
		window.addEventListener('pointerup', finish);
		window.addEventListener('pointercancel', finish);
	}

	/* ---------- detail sheet ---------- */
	let selectedId = $state<string | null>(null);
	let detailOpen = $state(false);

	function openDetail(view: ClimateView) {
		selectedId = view.entityId;
		detailOpen = true;
	}

	let selectedLive = $derived(selectedId ? climateViews[selectedId] ?? null : null);
</script>

<div class="flex flex-col gap-6 px-5 py-6 sm:px-6 lg:px-8 lg:py-7">
	<PageHeader
		title={`${greeting(now, config.timeZone)}, ${config.ownerName}`}
		{subtitle}
		onAdd={() => (ui.addDeviceOpen = true)}
	/>

	{#if !ready}
		<div class="dash-grid">
			{#each [{ span: 8 }, { span: 4 }, { span: 6 }, { span: 6 }, { span: 6 }, { span: 6 }] as item, index (index)}
				<div class="dash-item" style={`--span:${item.span}`}>
					<Skeleton class="h-[280px] rounded-[10px]" />
				</div>
			{/each}
		</div>
	{:else}
		<div class="dash-grid">
			{#each layout.items as item (item.id)}
				<div
					class="dash-item rounded-[10px] transition-all {draggingId === item.id
						? 'opacity-40'
						: ''} {overId === item.id && draggingId !== item.id
						? 'ring-2 ring-primary/25'
						: ''}"
					data-card-id={item.id}
					style={`--span:${item.span}`}
				>
					{#if item.id.startsWith('camera.')}
						{@const camera = cameraViews[item.id]}
						{#if camera}
							<CameraCard
								{camera}
								span={item.span}
								sizeOptions={spansFor(item.id)}
								onSpanChange={(span) => layout.setSpan(item.id, span)}
								onRemove={() => layout.togglePin(item.id)}
								onReorderStart={(event) => startReorder(event, item.id)}
							/>
						{/if}
					{:else if item.id.startsWith('weather.')}
						{@const weather = weatherViews[item.id]}
						{#if weather}
							<WeatherCard
								{weather}
								{sunNextSetting}
								span={item.span}
								sizeOptions={spansFor(item.id)}
								onSpanChange={(span) => layout.setSpan(item.id, span)}
								onRemove={() => layout.togglePin(item.id)}
								onReorderStart={(event) => startReorder(event, item.id)}
							/>
						{/if}
					{:else}
						{@const climate = climateViews[item.id]}
						{#if climate}
							<ClimateCard
								{climate}
								model={registry.modelFor(item.id) ?? 'Climate'}
								span={item.span}
								sizeOptions={spansFor(item.id)}
								onSpanChange={(span) => layout.setSpan(item.id, span)}
								onRemove={() => layout.togglePin(item.id)}
								onDetail={() => openDetail(climate)}
								onReorderStart={(event) => startReorder(event, item.id)}
							/>
						{/if}
					{/if}
				</div>
			{/each}
		</div>

		{#if !layout.items.length}
			<p class="text-[12.5px] text-muted-foreground">
				Nothing pinned yet — use “Add device” to put something on the dashboard.
			</p>
		{/if}
	{/if}

	{#if ecoOn}
		<span class="sr-only">Eco mode is on</span>
	{/if}
</div>

{#if selectedLive}
	<AcDetailSheet
		climate={selectedLive}
		model={registry.modelFor(selectedLive.entityId) ?? 'Climate'}
		bind:open={detailOpen}
	/>
{/if}

<AddDeviceDialog bind:open={ui.addDeviceOpen} />

<style>
	/* One free grid: every card spans N of 12 columns and the rows fill
	   themselves. Below 768px every card goes full width. */
	.dash-grid {
		display: grid;
		grid-template-columns: repeat(12, minmax(0, 1fr));
		gap: 16px;
		align-items: stretch;
	}

	.dash-item {
		grid-column: span var(--span, 6);
		min-width: 0;
	}

	@media (max-width: 767px) {
		.dash-item {
			grid-column: span 12;
		}
	}
</style>
