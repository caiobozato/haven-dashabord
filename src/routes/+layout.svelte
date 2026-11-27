<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';
	import { Toaster } from '#lib/components/ui/sonner/index.js';
	import { live } from '#lib/live.svelte.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	onMount(() => {
		live.start();

		// A tiny service worker is what makes the manifest installable on
		// Android. It never caches application data, so SSE stays live.
		if ('serviceWorker' in navigator && import.meta.env.PROD) {
			void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
		}

		return () => live.stop();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
	<link rel="manifest" href="/manifest.json" />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<meta name="apple-mobile-web-app-title" content="Haven" />
</svelte:head>

{@render children()}

<Toaster position="bottom-right" />
