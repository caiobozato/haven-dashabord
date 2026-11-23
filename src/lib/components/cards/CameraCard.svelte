<script lang="ts">
	import { onMount } from 'svelte';
	import { Cctv, Copy, Download, ExternalLink, Maximize2, Pause, Play, X } from '@lucide/svelte';
	import { HA_PUBLIC_URL } from '$app/env/public';
	import { page } from '$app/state';
	import type { CameraView } from '#lib/ha/derive.js';
	import { clockLabel } from '#lib/ha/derive.js';
	import { config } from '#lib/config.js';
	import { toast } from 'svelte-sonner';
	import CardMenu from '#lib/components/layout/CardMenu.svelte';
	import DragHandle from '#lib/components/layout/DragHandle.svelte';

	let {
		camera,
		span,
		sizeOptions,
		onSpanChange,
		onRemove,
		onReorderStart
	}: {
		camera: CameraView;
		span: number;
		sizeOptions: number[];
		onSpanChange: (span: number) => void;
		onRemove: () => void;
		onReorderStart: (event: PointerEvent) => void;
	} = $props();

	let expanded = $state(false);
	// `?stream=off` forces still-image mode: handy on a weak link, and it lets
	// screenshot tooling capture the page without an endless MJPEG response.
	let streamDisabled = $derived(page.url.searchParams.get('stream') === 'off');
	let imgFailed = $state(false);
	// Live MJPEG is the default, but an RTSP camera can wedge and leave HA
	// serving an empty stream. This lets you drop to stills without a reload.
	let preferStill = $state(false);
	let snapshotFallback = $state<string | null>(null);
	let now = $state(new Date());

	onMount(() => {
		const timer = setInterval(() => (now = new Date()), 1000);
		return () => clearInterval(timer);
	});

	let stillMode = $derived(imgFailed || streamDisabled || preferStill);

	// Fall back to a periodically refreshed still if the camera cannot stream.
	$effect(() => {
		if (!stillMode) {
			snapshotFallback = null;
			return;
		}
		const refresh = () => (snapshotFallback = `${camera.snapshotUrl}?t=${Date.now()}`);
		refresh();
		const timer = setInterval(refresh, 5000);
		return () => clearInterval(timer);
	});

	let source = $derived(stillMode ? (snapshotFallback ?? camera.snapshotUrl) : camera.streamUrl);
	let timestamp = $derived(clockLabel(now, config.timeZone));

	async function downloadSnapshot() {
		try {
			const response = await fetch(`${camera.snapshotUrl}?t=${Date.now()}`);
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `${camera.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.jpg`;
			link.click();
			URL.revokeObjectURL(url);
		} catch {
			toast.error('Could not download the snapshot');
		}
	}

	async function copyEntityId() {
		await navigator.clipboard.writeText(camera.entityId);
		toast.success('Entity ID copied', { description: camera.entityId });
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') expanded = false;
	}
</script>

<svelte:window onkeydown={onKeydown} />

<section
	class="flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[10px] border border-border bg-card"
>
	<header class="flex h-12 shrink-0 items-center justify-between gap-3 px-3.5 py-2.5">
		<div class="flex min-w-0 items-center gap-2.5">
			<DragHandle name={camera.name} onDragPointerDown={onReorderStart} />
			<Cctv size={15} class="shrink-0 text-foreground" strokeWidth={1.75} />
			<div class="flex min-w-0 flex-col leading-none">
				<span class="truncate text-[13.5px] font-semibold text-foreground">{camera.name}</span>
				<span class="mt-1 truncate text-[11px] text-muted-foreground">{camera.subtitle}</span>
			</div>
		</div>

		<div class="flex shrink-0 items-center gap-1">
			<button
				type="button"
				onclick={() => (expanded = true)}
				class="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				aria-label="Expand camera"
			>
				<Maximize2 size={14} strokeWidth={1.75} />
			</button>

			<CardMenu
				name={camera.name}
				{span}
				options={sizeOptions}
				onSelect={onSpanChange}
				{onRemove}
			>
				{#snippet extra()}
					<button
						type="button"
						class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] hover:bg-muted"
						onclick={downloadSnapshot}
					>
						<Download size={13} /> Download snapshot
					</button>
					<button
						type="button"
						class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] hover:bg-muted"
						onclick={copyEntityId}
					>
						<Copy size={13} /> Copy entity ID
					</button>
					<button
						type="button"
						class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] hover:bg-muted"
						onclick={() => (preferStill = !preferStill)}
					>
						{#if preferStill}
							<Play size={13} /> Use live stream
						{:else}
							<Pause size={13} /> Use snapshots
						{/if}
					</button>
					<a
						href={`${HA_PUBLIC_URL}/history?entity_id=${camera.entityId}`}
						target="_blank"
						rel="noreferrer"
						class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] hover:bg-muted"
					>
						<ExternalLink size={13} /> Open in Home Assistant
					</a>
				{/snippet}
			</CardMenu>
		</div>
	</header>

	<!-- Feed -->
	<div
		class="relative min-h-[220px] flex-1 overflow-hidden bg-[#0b0b0b] sm:aspect-[16/9] sm:min-h-0 sm:max-h-[440px]"
	>
		<img
			src={source}
			alt={`${camera.name} live view`}
			class="absolute inset-0 size-full object-cover"
			onerror={() => (imgFailed = true)}
		/>

		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 h-[150px] bg-gradient-to-t from-black/85 via-black/35 to-transparent"
		></div>

		<div
			class="absolute left-3.5 top-3.5 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm"
		>
			<span class="size-1.5 rounded-full bg-[#EF4444]" class:animate-pulse={!stillMode}></span>
			<span class="text-[10px] font-semibold tracking-[0.6px] text-white">
				{stillMode ? 'STILL' : 'LIVE'}
			</span>
		</div>

		<div class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3.5">
			<span class="rounded-md bg-black/40 px-2 py-1 text-[10.5px] text-white/80 backdrop-blur-sm">
				Today · {timestamp}
			</span>
		</div>
	</div>
</section>

{#if expanded}
	<div
		class="fixed inset-0 z-50 flex flex-col bg-black/90 p-4 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		aria-label={`${camera.name} live view`}
	>
		<div class="mb-3 flex items-center justify-between">
			<div class="flex flex-col leading-none">
				<span class="text-[14px] font-semibold text-white">{camera.name}</span>
				<span class="mt-1 text-[11px] text-white/50">{camera.subtitle}</span>
			</div>
			<button
				type="button"
				class="grid size-9 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20"
				onclick={() => (expanded = false)}
				aria-label="Close"
			>
				<X size={18} />
			</button>
		</div>
		<div class="relative flex-1 overflow-hidden rounded-xl bg-black">
			<img src={source} alt={`${camera.name} live view`} class="size-full object-contain" />
			<div
				class="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-black/60 px-2 py-1"
			>
				<span class="size-1.5 rounded-full bg-[#EF4444]" class:animate-pulse={!stillMode}></span>
				<span class="text-[10px] font-semibold tracking-[0.6px] text-white">
					{stillMode ? 'STILL' : 'LIVE'}
				</span>
			</div>
		</div>
	</div>
{/if}
