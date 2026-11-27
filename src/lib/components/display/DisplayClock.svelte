<script lang="ts">
	import { House } from '@lucide/svelte';
	import WeatherIcon from '#lib/components/WeatherIcon.svelte';
	import { config } from '#lib/config.js';
	import type { WeatherView } from '#lib/ha/derive.js';

	let {
		now,
		weather,
		high,
		low
	}: {
		now: Date;
		weather: WeatherView | null;
		high: number | undefined;
		low: number | undefined;
	} = $props();

	const timeFormat = new Intl.DateTimeFormat('en-GB', {
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
		timeZone: config.timeZone
	});
	const secondFormat = new Intl.DateTimeFormat('en-GB', {
		second: '2-digit',
		timeZone: config.timeZone
	});
	const dateFormat = new Intl.DateTimeFormat('en-GB', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		timeZone: config.timeZone
	});

	let time = $derived(timeFormat.format(now));
	let seconds = $derived(secondFormat.format(now));
	let date = $derived(dateFormat.format(now));

	let temperature = $derived(
		weather?.temperature === undefined ? '—' : Math.round(weather.temperature).toString()
	);

	let meta = $derived(
		[
			weather?.humidity !== undefined ? `${Math.round(weather.humidity)}% humidity` : null,
			weather?.windSpeed !== undefined
				? `${Math.round(weather.windSpeed)} ${weather.windUnit}`
				: null
		]
			.filter(Boolean)
			.join(' · ')
	);
</script>

<div class="clock-panel">
	<header class="brand">
		<span class="mark"><House size={15} strokeWidth={2} /></span>
		<span class="home">{config.homeName}</span>
		<span class="location">{config.location}</span>
	</header>

	<div class="clock">
		<div class="time-row">
			<span class="time">{time}</span>
			<span class="seconds">{seconds}</span>
		</div>
		<p class="date">{date}</p>
	</div>

	<div class="weather">
		<div class="weather-icon">
			{#if weather}
				<WeatherIcon condition={weather.condition} size={34} strokeWidth={1.5} />
			{/if}
		</div>

		<div class="weather-copy">
			<div class="temp-row">
				<span class="temp">{temperature}</span>
				<span class="degree">{weather?.unit ?? '°C'}</span>
				<span class="condition">{weather?.conditionLabel ?? 'Weather unavailable'}</span>
			</div>
			<p class="meta">
				{#if meta}{meta}{:else}Waiting for Home Assistant{/if}
			</p>
			<p class="range">
				{#if high !== undefined}<span>H {Math.round(high)}°</span>{/if}
				{#if low !== undefined}<span>L {Math.round(low)}°</span>{/if}
			</p>
		</div>
	</div>
</div>

<style>
	.clock-panel {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		gap: 14px;
		min-width: 0;
		min-height: 0;
		height: 100%;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		color: #737373;
	}

	.mark {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		flex: 0 0 26px;
		border: 1px solid #262626;
		border-radius: 8px;
		background: #111;
		color: #d4d4d4;
	}

	.home {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.2px;
		color: #d4d4d4;
	}

	.location {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 10.5px;
		color: #5f5f5f;
	}

	.clock {
		min-width: 0;
	}

	.time-row {
		display: flex;
		align-items: baseline;
		gap: 8px;
		min-width: 0;
	}

	.time {
		font-size: clamp(64px, min(12.5vw, 23vh), 150px);
		font-weight: 300;
		line-height: 0.82;
		letter-spacing: -0.075em;
		font-variant-numeric: tabular-nums;
		color: #fafafa;
		white-space: nowrap;
	}

	.seconds {
		font-size: clamp(18px, 2.2vw, 26px);
		font-weight: 400;
		font-variant-numeric: tabular-nums;
		color: #525252;
	}

	.date {
		margin-top: 10px;
		font-size: clamp(13px, 1.5vw, 17px);
		font-weight: 450;
		letter-spacing: 0.1px;
		color: #8a8a8a;
	}

	.weather {
		display: flex;
		align-items: center;
		gap: 14px;
		min-width: 0;
		padding-top: 12px;
		border-top: 1px solid #1c1c1c;
	}

	.weather-icon {
		display: grid;
		place-items: center;
		width: 52px;
		height: 52px;
		flex: 0 0 52px;
		border-radius: 14px;
		background: #0e0e0e;
		color: #e5e5e5;
	}

	.weather-copy {
		min-width: 0;
	}

	.temp-row {
		display: flex;
		align-items: baseline;
		gap: 4px;
		min-width: 0;
	}

	.temp {
		font-size: clamp(34px, 4vw, 46px);
		font-weight: 400;
		line-height: 0.95;
		letter-spacing: -0.05em;
		font-variant-numeric: tabular-nums;
		color: #fafafa;
	}

	.degree {
		font-size: 15px;
		font-weight: 500;
		color: #a3a3a3;
	}

	.condition {
		margin-left: 6px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 13px;
		font-weight: 500;
		color: #d4d4d4;
	}

	.meta {
		margin-top: 3px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 10.5px;
		color: #5f5f5f;
	}

	.range {
		display: flex;
		gap: 10px;
		margin-top: 2px;
		font-size: 10.5px;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		color: #737373;
	}
</style>
