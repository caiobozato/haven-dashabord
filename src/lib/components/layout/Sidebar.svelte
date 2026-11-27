<script lang="ts">
	import {
		ChevronsUpDown,
		House,
		LayoutDashboard,
		MonitorSmartphone,
		ShieldCheck
	} from '@lucide/svelte';
	import { config } from '#lib/config.js';
	import { live } from '#lib/live.svelte.js';
	import { offlineEntities } from '#lib/ha/health.js';

	let { onNavigate }: { onNavigate?: () => void } = $props();

	// "All systems online" is derived, not decoration: an entity that HA reports as
	// unavailable counts as offline, as does a dropped connection.
	let offlineCount = $derived(offlineEntities(live.all).length);
	let haDown = $derived(live.status.ha !== 'open');
	let healthy = $derived(!haDown && offlineCount === 0);

	let statusLabel = $derived(
		haDown
			? 'Reconnecting to Home Assistant'
			: offlineCount === 0
				? 'All systems online'
				: `${offlineCount} ${offlineCount === 1 ? 'device' : 'devices'} offline`
	);
</script>

<div class="flex h-full flex-col gap-6 border-r border-border bg-sidebar px-3 py-4">
	<!-- Brand -->
	<a href="/" class="flex items-center gap-2.5 rounded-lg px-2 py-1" onclick={onNavigate}>
		<span class="grid size-7 place-items-center rounded-[8px] bg-primary text-primary-foreground">
			<House size={16} strokeWidth={2} />
		</span>
		<span class="flex flex-col leading-none">
			<span class="text-[15px] font-semibold tracking-[-0.2px] text-foreground">Haven</span>
			<span class="mt-0.5 text-[11px] text-muted-foreground">Home OS</span>
		</span>
	</a>

	<!-- Navigation -->
	<nav class="flex flex-col gap-0.5 px-2">
		<a
			href="/"
			onclick={onNavigate}
			class="flex items-center gap-2.5 rounded-[7px] bg-muted px-2 py-2.5 text-[13.5px] font-semibold text-foreground lg:py-[7px]"
			aria-current="page"
		>
			<LayoutDashboard size={16} strokeWidth={1.75} />
			Dashboard
		</a>

		<a
			href="/display"
			onclick={onNavigate}
			class="flex items-center gap-2.5 rounded-[7px] px-2 py-2.5 text-[13.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:py-[7px]"
		>
			<MonitorSmartphone size={16} strokeWidth={1.75} />
			Smart display
		</a>
	</nav>

	<div class="flex-1"></div>

	<!-- Connection status -->
	<div class="flex items-center gap-2 rounded-[8px] border border-border bg-white px-2.5 py-2">
		<ShieldCheck size={14} strokeWidth={1.75} class={healthy ? 'text-success' : 'text-warning'} />
		<span class="flex-1 truncate text-[11.5px] font-medium text-foreground">{statusLabel}</span>
		<span
			class="size-1.5 shrink-0 rounded-full {healthy ? 'bg-success' : 'bg-warning'}"
			class:animate-pulse={!healthy}
		></span>
	</div>

	<!-- User -->
	<div class="flex items-center gap-2.5 rounded-lg px-1 py-1.5">
		<span
			class="grid size-[30px] shrink-0 place-items-center rounded-full bg-[#EDE9FE] text-[11px] font-semibold text-[#5B21B6]"
		>
			{config.ownerInitials}
		</span>
		<span class="flex min-w-0 flex-1 flex-col leading-none">
			<span class="truncate text-[12.5px] font-semibold text-foreground">{config.ownerName}</span>
			<span class="mt-1 truncate text-[11px] text-muted-foreground">{config.homeName}</span>
		</span>
		<ChevronsUpDown size={14} class="shrink-0 text-subtle-foreground" />
	</div>
</div>
