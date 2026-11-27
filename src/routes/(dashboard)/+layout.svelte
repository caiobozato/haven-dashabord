<script lang="ts">
	import { onMount } from 'svelte';
	import Sidebar from '#lib/components/layout/Sidebar.svelte';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import { ui } from '#lib/ui.svelte.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// The display route sets `.dark` on <html> for portalled UI. Clear it on
	// the way back so the dashboard keeps its light identity.
	onMount(() => document.documentElement.classList.remove('dark'));
</script>

<svelte:head>
	<title>Haven · Home OS</title>
	<meta name="theme-color" content="#FAFAFA" />
</svelte:head>

<div class="flex min-h-dvh bg-background text-foreground">
	<aside class="hidden w-[248px] shrink-0 lg:block">
		<div class="sticky top-0 h-dvh">
			<Sidebar />
		</div>
	</aside>

	<main class="min-w-0 flex-1">
		{@render children()}
	</main>
</div>

<Sheet.Root bind:open={ui.mobileNavOpen}>
	<Sheet.Content side="left" class="w-[248px] gap-0 p-0 sm:max-w-[248px]">
		<Sidebar onNavigate={() => (ui.mobileNavOpen = false)} />
	</Sheet.Content>
</Sheet.Root>
