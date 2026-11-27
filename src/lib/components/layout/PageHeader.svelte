<script lang="ts">
	import { MonitorSmartphone, Plus } from '@lucide/svelte';
	import { ui } from '#lib/ui.svelte.js';

	let {
		title,
		subtitle,
		addLabel = 'Add device',
		onAdd
	}: {
		title: string;
		subtitle: string;
		addLabel?: string;
		onAdd?: () => void;
	} = $props();
</script>

<header class="flex flex-wrap items-center justify-between gap-4">
	<div class="flex min-w-0 items-center gap-3">
		<button
			type="button"
			class="-ml-1 grid size-10 shrink-0 place-items-center rounded-lg text-foreground transition-colors hover:bg-muted lg:hidden"
			onclick={() => (ui.mobileNavOpen = true)}
			aria-label="Open navigation"
		>
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			>
				<path d="M4 6h16M4 12h16M4 18h16" />
			</svg>
		</button>

		<div class="flex min-w-0 flex-col gap-1">
			<h1 class="truncate text-[24px] font-semibold tracking-[-0.6px] text-foreground">{title}</h1>
			<p class="truncate text-[13.5px] text-muted-foreground">{subtitle}</p>
		</div>
	</div>

	<div class="flex shrink-0 items-center gap-2">
		<a
			href="/display"
			class="grid size-10 place-items-center rounded-lg border border-border bg-white text-foreground transition-colors hover:bg-muted lg:size-[34px]"
			aria-label="Open smart display"
			title="Smart display"
		>
			<MonitorSmartphone size={15} strokeWidth={1.8} />
		</a>

		{#if onAdd}
			<button
				type="button"
				onclick={onAdd}
				class="flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90 lg:h-[34px]"
			>
				<Plus size={14} />
				<span class="hidden sm:inline">{addLabel}</span>
			</button>
		{/if}
	</div>
</header>
