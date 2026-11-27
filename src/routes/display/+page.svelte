<script lang="ts">
	import { onMount } from 'svelte';
	import { LayoutDashboard, Maximize, Minimize, Moon } from '@lucide/svelte';
	import DisplayClock from '#lib/components/display/DisplayClock.svelte';
	import ClimateTile from '#lib/components/display/ClimateTile.svelte';
	import LightTile from '#lib/components/display/LightTile.svelte';
	import AcDetailSheet from '#lib/components/dialogs/AcDetailSheet.svelte';
	import { config } from '#lib/config.js';
	import { night } from '#lib/display/night.svelte.js';
	import { wakeLock } from '#lib/display/wake-lock.svelte.js';
	import { toggleLight } from '#lib/ha/actions.js';
	import {
		climateView,
		lightView,
		weatherView,
		type ClimateView,
		type LightView
	} from '#lib/ha/derive.js';
	import { offlineEntities } from '#lib/ha/health.js';
	import { layout } from '#lib/layout.svelte.js';
	import { live } from '#lib/live.svelte.js';
	import { registry } from '#lib/registry.svelte.js';

	let now = $state(new Date());
	let high = $state<number | undefined>(undefined);
	let low = $state<number | undefined>(undefined);
	let isFullscreen = $state(false);
	let detailOpen = $state(false);
	let selectedId = $state<string | null>(null);

	/* ---------- optimistic light toggles ---------- */
	let lightOverrides = $state<Record<string, boolean>>({});
	const overrideTimers = new Map<string, ReturnType<typeof setTimeout>>();

	/* ---------- derived views ---------- */
	let weather = $derived(weatherView(live.get(config.weather)));

	let climateViews = $derived(
		layout.items
			.filter((item) => item.id.startsWith('climate.'))
			.map((item) =>
				climateView(live.get(item.id), { name: registry.roomFor(item.id) ?? undefined })
			)
			.filter((view): view is ClimateView => view !== null)
	);

	let lightViews = $derived.by(() => {
		const auto = config.lights.length === 0;
		const ids = auto
			? live.all
					.filter((entity) => entity.entity_id.startsWith('light.'))
					.map((entity) => entity.entity_id)
			: config.lights;

		return ids
			.map((id) => {
				const state = live.get(id);
				if (!state || state.state === 'unavailable') return null;
				if (auto) {
					const entry = registry.entryFor(id);
					if (entry?.hidden_by || entry?.disabled_by) return null;
				}
				const view = lightView(state, { room: registry.roomFor(id) });
				return view ? { ...view, isOn: lightOverrides[id] ?? view.isOn } : null;
			})
			.filter((view): view is LightView => view !== null)
			.sort(
				(a, b) =>
					(a.room ?? '').localeCompare(b.room ?? '') || a.name.localeCompare(b.name)
			)
			.slice(0, 16);
	});

	let lightsOn = $derived(lightViews.filter((light) => light.isOn).length);
	let climatesOn = $derived(climateViews.filter((view) => view.isOn).length);

	let selectedClimate = $derived(
		selectedId ? (climateViews.find((view) => view.entityId === selectedId) ?? null) : null
	);

	/* ---------- status ---------- */
	let haOnline = $derived(live.status.ha === 'open');
	let offlineCount = $derived(offlineEntities(live.all).length);
	let statusLabel = $derived(
		!haOnline ? 'Offline' : offlineCount ? `${offlineCount} offline` : 'Live'
	);
	let statusHealthy = $derived(haOnline && offlineCount === 0);

	/* ---------- actions ---------- */
	function openDetail(climate: ClimateView) {
		selectedId = climate.entityId;
		detailOpen = true;
	}

	function toggleLightView(light: LightView) {
		const next = !light.isOn;
		lightOverrides = { ...lightOverrides, [light.entityId]: next };

		clearTimeout(overrideTimers.get(light.entityId));
		overrideTimers.set(
			light.entityId,
			setTimeout(() => {
				const copy = { ...lightOverrides };
				delete copy[light.entityId];
				lightOverrides = copy;
				overrideTimers.delete(light.entityId);
			}, 1500)
		);

		void toggleLight(light.entityId);
	}

	async function toggleFullscreen() {
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
			else if (document.documentElement.requestFullscreen) {
				await document.documentElement.requestFullscreen();
			}
		} catch {
			/* the browser declined; the kiosk still works without it */
		}
	}

	function syncFullscreen() {
		isFullscreen = Boolean(document.fullscreenElement);
	}

	/* ---------- lifecycle ---------- */
	onMount(() => {
		void registry.load();
		void layout.load();

		night.start();
		wakeLock.start();
		document.documentElement.classList.add('dark');
		syncFullscreen();
		document.addEventListener('fullscreenchange', syncFullscreen);

		const clockTimer = setInterval(() => (now = new Date()), 1000);

		let cancelled = false;
		const loadForecast = () => {
			fetch(`/api/forecast?entity=${encodeURIComponent(config.weather)}`)
				.then((response) => response.json())
				.then(
					(data: {
						daily?: Array<{ temperature?: number; templow?: number }>;
					}) => {
						if (cancelled) return;
						high = data.daily?.[0]?.temperature;
						low = data.daily?.[0]?.templow;
					}
				)
				.catch(() => undefined);
		};
		loadForecast();
		const forecastTimer = setInterval(loadForecast, 10 * 60_000);

		return () => {
			cancelled = true;
			clearInterval(clockTimer);
			clearInterval(forecastTimer);
			for (const timer of overrideTimers.values()) clearTimeout(timer);
			overrideTimers.clear();

			night.stop();
			wakeLock.stop();
			document.removeEventListener('fullscreenchange', syncFullscreen);
			document.documentElement.classList.remove('dark');
		};
	});
</script>

<svelte:head>
	<title>Haven · Display</title>
	<meta name="theme-color" content="#000000" />
	<meta name="color-scheme" content="dark" />
</svelte:head>

<div class="display" class:night={night.active}>
	<div class="left">
		<div class="left-main">
			<DisplayClock {now} {weather} {high} {low} />
		</div>

		<footer class="left-footer">
			<div class="status">
				<span class="chip" title={`Home Assistant: ${statusLabel}`}>
					<span class="dot" class:ok={statusHealthy} class:warn={!statusHealthy}></span>
					{statusLabel}
				</span>
				<span class="chip" title={wakeLock.label}>
					<span
						class="dot"
						class:ok={wakeLock.active}
						class:warn={!wakeLock.active}
					></span>
					{wakeLock.active ? 'Awake' : wakeLock.supported ? 'Awake…' : 'No wake lock'}
				</span>
			</div>

			<div class="actions">
				<button
					type="button"
					class="action"
					class:active={night.active}
					onclick={() => night.cycle()}
					aria-label={`Night mode: ${night.label}. Tap to change.`}
					title={`Night mode: ${night.label}`}
				>
					<Moon size={16} strokeWidth={1.9} />
					<span class="action-label">{night.label}</span>
					{#if night.mode === 'auto'}
						<span class="auto-dot" aria-hidden="true"></span>
					{/if}
				</button>

				<button
					type="button"
					class="action icon-only"
					onclick={toggleFullscreen}
					aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
					title={isFullscreen ? 'Exit full screen' : 'Full screen'}
				>
					{#if isFullscreen}
						<Minimize size={16} strokeWidth={1.9} />
					{:else}
						<Maximize size={16} strokeWidth={1.9} />
					{/if}
				</button>

				<a class="action icon-only" href="/" aria-label="Open dashboard" title="Dashboard">
					<LayoutDashboard size={16} strokeWidth={1.9} />
				</a>
			</div>
		</footer>
	</div>

	<section class="controls" aria-label="Home controls">
		{#if !live.status.seeded}
			<div class="loading">
				<p class="section-title">Connecting</p>
				<p class="empty">Waiting for Home Assistant…</p>
			</div>
		{:else}
			<div class="section">
				<div class="section-head">
					<h2 class="section-title">Lights</h2>
					<span class="section-meta">
						{lightsOn}/{lightViews.length} on
					</span>
				</div>

				{#if lightViews.length}
					<div class="light-strip">
						{#each lightViews as light (light.entityId)}
							<LightTile
								{light}
								busy={Boolean(live.busy[light.entityId])}
								onToggle={() => toggleLightView(light)}
							/>
						{/each}
					</div>
				{:else}
					<p class="empty">No lights found in Home Assistant.</p>
				{/if}
			</div>

			<div class="section section-grow">
				<div class="section-head">
					<h2 class="section-title">Air conditioning</h2>
					<span class="section-meta">{climatesOn}/{climateViews.length} on</span>
				</div>

				{#if climateViews.length}
					<div class="climate-grid">
						{#each climateViews as climate (climate.entityId)}
							<ClimateTile {climate} onDetail={() => openDetail(climate)} />
						{/each}
					</div>
				{:else}
					<p class="empty">No climate units pinned. Add one from the dashboard.</p>
				{/if}
			</div>
		{/if}
	</section>

	<div class="veil" aria-hidden="true"></div>
</div>

{#if selectedClimate}
	<AcDetailSheet
		climate={selectedClimate}
		model={registry.modelFor(selectedClimate.entityId) ?? 'Climate'}
		bind:open={detailOpen}
	/>
{/if}

<style>
	.display {
		position: fixed;
		inset: 0;
		display: grid;
		grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.22fr);
		gap: clamp(14px, 2.2vw, 28px);
		height: 100dvh;
		padding-top: max(12px, env(safe-area-inset-top));
		padding-right: max(18px, env(safe-area-inset-right));
		padding-bottom: max(12px, env(safe-area-inset-bottom));
		padding-left: max(18px, env(safe-area-inset-left));
		overflow: hidden;
		background: #000;
		color: #f5f5f5;
		color-scheme: dark;
		overscroll-behavior: none;
		user-select: none;
		-webkit-user-select: none;
		touch-action: manipulation;
	}

	.left {
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 0;
		min-height: 0;
	}

	.left-main {
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.left-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
		min-height: 44px;
	}

	.status {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 24px;
		padding: 0 8px;
		border: 1px solid #1e1e1e;
		border-radius: 999px;
		background: #0b0b0b;
		font-size: 9.5px;
		font-weight: 550;
		letter-spacing: 0.25px;
		text-transform: uppercase;
		color: #8a8a8a;
		white-space: nowrap;
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: #525252;
	}

	.dot.ok {
		background: #4ade80;
		box-shadow: 0 0 8px rgba(74, 222, 128, 0.45);
	}

	.dot.warn {
		background: #fbbf24;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.action {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 44px;
		min-width: 44px;
		padding: 0 12px;
		border: 1px solid #222;
		border-radius: 12px;
		background: #0c0c0c;
		color: #a3a3a3;
		font-size: 11px;
		font-weight: 600;
		text-decoration: none;
		touch-action: manipulation;
		transition:
			background-color 120ms ease,
			border-color 120ms ease,
			color 120ms ease;
	}

	.action:active {
		background: #1a1a1a;
	}

	.action:focus-visible {
		outline: 2px solid #7dd3fc;
		outline-offset: 2px;
	}

	.action.active {
		border-color: rgba(129, 140, 248, 0.45);
		background: rgba(129, 140, 248, 0.12);
		color: #c7d2fe;
	}

	.auto-dot {
		position: absolute;
		top: 7px;
		right: 7px;
		width: 4px;
		height: 4px;
		border-radius: 999px;
		background: #a5b4fc;
	}

	.action-label {
		display: none;
	}

	@media (min-width: 1000px) {
		.action-label {
			display: inline;
		}
	}

	.icon-only {
		width: 44px;
		padding: 0;
	}

	.controls {
		display: flex;
		flex-direction: column;
		gap: 8px;
		min-width: 0;
		min-height: 0;
		height: 100%;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: none;
	}

	.controls::-webkit-scrollbar {
		display: none;
	}

	.section {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.section-grow {
		flex: 1;
		min-height: 0;
	}

	.section-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
		padding: 0 2px;
	}

	.section-title {
		margin: 0;
		font-size: 10px;
		font-weight: 650;
		letter-spacing: 0.13em;
		text-transform: uppercase;
		color: #6b6b6b;
	}

	.section-meta {
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.05em;
		color: #4f4f4f;
		white-space: nowrap;
	}

	.light-strip {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: minmax(148px, 1fr);
		gap: 8px;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		scrollbar-width: none;
		padding-bottom: 1px;
	}

	.light-strip::-webkit-scrollbar {
		display: none;
	}

	.climate-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(215px, 1fr));
		gap: 8px;
		min-width: 0;
	}

	.empty {
		margin: 0;
		padding: 10px 2px;
		font-size: 12px;
		color: #5f5f5f;
	}

	.loading {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.veil {
		position: fixed;
		inset: 0;
		z-index: 80;
		pointer-events: none;
		background: #000;
		opacity: 0;
		transition: opacity 420ms ease;
	}

	.display.night .veil {
		opacity: 0.55;
	}

	/* Portrait phones/tablets: clock on top, controls below. */
	@media (max-width: 760px), (orientation: portrait) {
		.display {
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: auto minmax(0, 1fr);
			gap: 12px;
		}

		.left {
			gap: 10px;
		}

		.left-main {
			overflow: visible;
		}

		.controls {
			height: auto;
		}

		.light-strip {
			grid-auto-columns: minmax(150px, 1fr);
		}
	}

	/* Very short landscape windows (desktop dev tools, small phones). */
	@media (orientation: landscape) and (max-height: 400px) {
		.display {
			padding-top: max(8px, env(safe-area-inset-top));
			padding-bottom: max(8px, env(safe-area-inset-bottom));
			gap: 14px;
		}

		.section {
			gap: 4px;
		}

		.section-head {
			padding: 0;
		}
	}
</style>
