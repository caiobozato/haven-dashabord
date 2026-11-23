<script lang="ts">
	import {
		Cloud,
		CloudFog,
		CloudLightning,
		CloudMoon,
		CloudRain,
		CloudRainWind,
		CloudSnow,
		CloudSun,
		Moon,
		Sun,
		Wind
	} from '@lucide/svelte';

	let {
		condition,
		size = 18,
		class: className = '',
		strokeWidth = 1.6
	}: { condition: string; size?: number; class?: string; strokeWidth?: number } = $props();

	const map = {
		sunny: Sun,
		'clear-night': Moon,
		partlycloudy: CloudSun,
		cloudy: Cloud,
		fog: CloudFog,
		hail: CloudSnow,
		lightning: CloudLightning,
		'lightning-rainy': CloudLightning,
		pouring: CloudRainWind,
		rainy: CloudRain,
		snowy: CloudSnow,
		'snowy-rainy': CloudSnow,
		windy: Wind,
		'windy-variant': Wind,
		exceptional: CloudLightning
	} as const;

	let Icon = $derived(map[condition as keyof typeof map] ?? Cloud);
</script>

<Icon {size} {strokeWidth} class={className} />
