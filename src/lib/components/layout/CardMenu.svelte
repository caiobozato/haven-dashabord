<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Check, Ellipsis } from '@lucide/svelte';
	import * as Popover from '#lib/components/ui/popover/index.js';
	import { sizeLabel } from '#lib/layout.svelte.js';

	let {
		name,
		span,
		options,
		onSelect,
		onRemove,
		extra,
		class: className = ''
	}: {
		name: string;
		span: number;
		options: number[];
		onSelect: (span: number) => void;
		onRemove: () => void;
		extra?: Snippet;
		class?: string;
	} = $props();

	let open = $state(false);
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				type="button"
				class="grid size-10 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:size-7 {className}"
				aria-label={`Card options for ${name}`}
			>
				<Ellipsis size={14} strokeWidth={2} />
			</button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content align="end" class="w-[196px] p-1">
		<span class="block px-2 pb-1 pt-1 text-[10.5px] font-medium tracking-[0.2px] text-muted-foreground">
			Width
		</span>
		{#each options as option (option)}
			<button
				type="button"
				onclick={() => {
					onSelect(option);
					open = false;
				}}
				class="flex w-full items-center gap-2 rounded-md px-2 py-2.5 text-[12.5px] hover:bg-muted lg:py-1.5"
			>
				<span class="flex-1 text-left">{sizeLabel(option)}</span>
				{#if span === option}
					<Check size={13} strokeWidth={2.5} />
				{/if}
			</button>
		{/each}

		{#if extra}
			<div class="my-1 h-px bg-border"></div>
			{@render extra()}
		{/if}

		<div class="my-1 h-px bg-border"></div>
		<button
			type="button"
			onclick={() => {
				onRemove();
				open = false;
			}}
			class="flex w-full items-center gap-2 rounded-md px-2 py-2.5 text-[12.5px] text-muted-foreground hover:bg-muted hover:text-foreground lg:py-1.5"
		>
			Remove from dashboard
		</button>
	</Popover.Content>
</Popover.Root>
