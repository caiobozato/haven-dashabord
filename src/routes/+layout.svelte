<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';
	import Sidebar from '#lib/components/layout/Sidebar.svelte';
	import { Toaster } from '#lib/components/ui/sonner/index.js';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import { live } from '#lib/live.svelte.js';
	import { ui } from '#lib/ui.svelte.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	onMount(() => {
		live.start();
		return () => live.stop();
	});
</script>

<svelte:head>
	<title>Haven · Home OS</title>
	<meta name="theme-color" content="#FAFAFA" />
	<link rel="icon" href={favicon} />
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

<Toaster position="bottom-right" />
