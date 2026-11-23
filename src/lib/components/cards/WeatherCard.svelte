<script lang="ts">
	import { onMount } from 'svelte';
	import { Droplets, MapPin, Sunset, Wind } from '@lucide/svelte';
	import type { HaForecastEntry } from '#lib/ha/types.js';
	import { forecastDays, forecastHours, sunsetLabel, type WeatherView } from '#lib/ha/derive.js';
	import { config } from '#lib/config.js';
	import WeatherIcon from '#lib/components/WeatherIcon.svelte';
	import CardMenu from '#lib/components/layout/CardMenu.svelte';
	import DragHandle from '#lib/components/layout/DragHandle.svelte';

	let {
		weather,
		sunNextSetting,
		span,
		sizeOptions,
		onSpanChange,
		onRemove,
		onReorderStart
	}: {
		weather: WeatherView;
		sunNextSetting?: string;
		span: number;
		sizeOptions: number[];
		onSpanChange: (span: number) => void;
		onRemove: () => void;
		onReorderStart: (event: PointerEvent) => void;
	} = $props();

	let daily = $state<HaForecastEntry[]>([]);
	let hourly = $state<HaForecastEntry[]>([]);

	onMount(() => {
		let cancelled = false;
		fetch(`/api/forecast?entity=${encodeURIComponent(weather.entityId)}`)
			.then((response) => response.json())
			.then((data: { daily?: HaForecastEntry[]; hourly?: HaForecastEntry[] }) => {
				if (cancelled) return;
				daily = data.daily ?? [];
				hourly = data.hourly ?? [];
			})
			.catch(() => undefined);
		return () => {
			cancelled = true;
		};
	});

	let hours = $derived(forecastHours(hourly, config.timeZone, 4));
	let days = $derived(forecastDays(daily, config.timeZone, 3));

	let temperature = $derived(
		weather.temperature === undefined ? '—' : Math.round(weather.temperature).toString()
	);

	let stats = $derived([
		{
			label: 'Humidity',
			value: weather.humidity === undefined ? '—' : `${Math.round(weather.humidity)}%`,
			icon: Droplets
		},
		{
			label: 'Wind',
			value:
				weather.windSpeed === undefined ? '—' : `${Math.round(weather.windSpeed)} ${weather.windUnit}`,
			icon: Wind
		},
		{
			label: 'Sunset',
			value: sunsetLabel(sunNextSetting, config.timeZone),
			icon: Sunset
		}
	]);
</script>

<section class="flex h-full w-full flex-col overflow-hidden rounded-[10px] border border-border bg-card">
	<!-- Location -->
	<div class="flex items-center justify-between gap-2 px-4 pt-3.5">
		<div class="flex min-w-0 items-center gap-2.5">
			<DragHandle name="Weather" onDragPointerDown={onReorderStart} />
			<div class="flex min-w-0 items-center gap-1.5">
				<MapPin size={13} class="shrink-0 text-muted-foreground" />
				<span class="truncate text-[12.5px] font-medium text-foreground">{config.location}</span>
			</div>
		</div>
		<CardMenu
			name="Weather"
			{span}
			options={sizeOptions}
			onSelect={onSpanChange}
			{onRemove}
			class="-mr-1"
		/>
	</div>

	<!-- Current conditions -->
	<div class="flex items-center justify-between gap-3 px-4 pb-4 pt-3.5">
		<div class="flex items-start">
			<span class="text-[60px] font-medium leading-none tracking-[-3px] tabular text-foreground">
				{temperature}
			</span>
			<span class="pt-2.5 pl-0.5 text-[18px] font-medium text-foreground">{weather.unit}</span>
		</div>

		<div class="flex flex-col items-end gap-1">
			<WeatherIcon condition={weather.condition} size={28} class="text-foreground" />
			<span class="text-[12.5px] font-medium text-foreground">{weather.conditionLabel}</span>
			<span class="text-[11px] text-muted-foreground">
				{#if weather.dewPoint !== undefined}
					Dew point {Math.round(weather.dewPoint)}°
				{:else if weather.pressure !== undefined}
					{Math.round(weather.pressure)} {weather.pressureUnit}
				{:else}
					{weather.entityId.split('.').pop()}
				{/if}
			</span>
		</div>
	</div>

	<!-- Hourly strip -->
	{#if hours.length}
		<div class="flex items-stretch gap-2 px-4 pb-4">
			{#each hours as hour (hour.label)}
				<div
					class="flex flex-1 flex-col items-center gap-2 rounded-[8px] px-0 py-2.5 {hour.label ===
					'Now'
						? 'bg-muted'
						: ''}"
				>
					<span
						class="text-[11px] {hour.label === 'Now'
							? 'font-semibold text-foreground'
							: 'text-muted-foreground'}">{hour.label}</span
					>
					<WeatherIcon condition={hour.condition} size={18} class="text-foreground" />
					<span class="text-[12.5px] font-medium tabular text-foreground">
						{hour.temperature === undefined ? '—' : `${Math.round(hour.temperature)}°`}
					</span>
				</div>
			{/each}
		</div>
	{/if}

	<div class="h-px w-full bg-border"></div>

	<!-- Stats -->
	<div class="flex items-start justify-between gap-2 px-4 py-3.5">
		{#each stats as stat (stat.label)}
			<div class="flex flex-1 flex-col gap-[3px]">
				<div class="flex items-center gap-1">
					<stat.icon size={12} class="text-muted-foreground" />
					<span class="text-[11px] text-muted-foreground">{stat.label}</span>
				</div>
				<span class="text-[13px] font-semibold tabular text-foreground">{stat.value}</span>
			</div>
		{/each}
	</div>

	<div class="h-px w-full bg-border"></div>

	<!-- Daily forecast -->
	<div class="flex flex-1 flex-col justify-center gap-3.5 px-4 py-3.5">
		<span class="text-[11px] font-medium text-muted-foreground">Next 3 days</span>
		{#each days as day (day.label)}
			<div class="flex items-center gap-2">
				<div class="flex w-[88px] items-center gap-[7px]">
					<span class="text-[12px] font-medium text-foreground">{day.label}</span>
					<WeatherIcon condition={day.condition} size={14} class="text-muted-foreground" />
				</div>
				<div class="flex-1"></div>
				<div class="flex items-center gap-2">
					<span class="text-[12px] font-medium tabular text-foreground">
						{day.high === undefined ? '—' : `${Math.round(day.high)}°`}
					</span>
					<span class="text-[12px] tabular text-muted-foreground">
						{day.low === undefined ? '—' : `${Math.round(day.low)}°`}
					</span>
				</div>
			</div>
		{/each}
	</div>
</section>
