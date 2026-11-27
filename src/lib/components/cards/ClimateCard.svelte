<script lang="ts">
	import { Slider as SliderPrimitive } from 'bits-ui';
	import {
		Droplets,
		Fan,
		Minus,
		Plus,
		RefreshCw,
		Snowflake,
		Sun,
		Thermometer,
		Wind
	} from '@lucide/svelte';
	import { Switch } from '#lib/components/ui/switch/index.js';
	import CardMenu from '#lib/components/layout/CardMenu.svelte';
	import DragHandle from '#lib/components/layout/DragHandle.svelte';
	import { fanLabel, hvacModeLabel, titleCase, type ClimateView } from '#lib/ha/derive.js';
	import { setFanMode, setHvacMode, setTemperature, turnOff, turnOn } from '#lib/ha/actions.js';
	import { live } from '#lib/live.svelte.js';

	let {
		climate,
		model,
		span,
		sizeOptions,
		onSpanChange,
		onRemove,
		onDetail,
		onReorderStart
	}: {
		climate: ClimateView;
		model: string;
		span: number;
		sizeOptions: number[];
		onSpanChange: (span: number) => void;
		onRemove: () => void;
		onDetail: () => void;
		onReorderStart: (event: PointerEvent) => void;
	} = $props();

	const MODE_ICONS = {
		cool: Snowflake,
		heat: Sun,
		fan_only: Fan,
		dry: Droplets,
		auto: RefreshCw
	} as const;

	const CARD_MODES = ['cool', 'heat', 'fan_only', 'dry', 'auto'] as const;

	let modes = $derived(CARD_MODES.filter((mode) => climate.modes.includes(mode)));
	let busy = $derived(Boolean(live.busy[climate.entityId]));

	/* ---- optimistic target temperature ---- */
	let optimisticTemp = $state<number | null>(null);
	let clearTimer: ReturnType<typeof setTimeout> | undefined;

	// Home Assistant reports `temperature: null` while the Daikin integration
	// re-polls the unit, so the card must render "—" rather than a 0° setpoint.
	let target = $derived(optimisticTemp ?? climate.targetTemp ?? null);
	let canDecrease = $derived(target !== null && target > climate.minTemp);
	let canIncrease = $derived(target !== null && target < climate.maxTemp);

	async function step(delta: number) {
		if (!climate.isOn || target === null) return;
		const next = Math.min(climate.maxTemp, Math.max(climate.minTemp, target + delta * climate.step));
		if (next === target) return;

		optimisticTemp = next;
		clearTimeout(clearTimer);
		const ok = await setTemperature(climate.entityId, next);
		clearTimer = setTimeout(() => (optimisticTemp = null), ok ? 900 : 0);
	}

	/* ---- fan slider ---- */
	let optimisticFan = $state<number | null>(null);
	let fanIndex = $derived(
		optimisticFan ?? (climate.fanMode ? climate.fanModes.indexOf(climate.fanMode) : 0)
	);
	let fanMax = $derived(Math.max(0, climate.fanModes.length - 1));
	let fanCurrentLabel = $derived(
		climate.fanModes[fanIndex] ? fanLabel(climate.fanModes[fanIndex]) : '—'
	);

	async function commitFan(value: number) {
		const mode = climate.fanModes[value];
		if (!mode) return;
		optimisticFan = value;
		const ok = await setFanMode(climate.entityId, mode);
		setTimeout(() => (optimisticFan = null), ok ? 900 : 0);
	}

	async function togglePower(next: boolean) {
		if (next) await turnOn(climate.entityId);
		else await turnOff(climate.entityId);
	}

	async function switchMode(mode: string) {
		if (!climate.isOn) {
			// Selecting a mode on an off unit powers it on into that mode.
			await turnOn(climate.entityId);
		}
		await setHvacMode(climate.entityId, mode);
	}

	let statusTone = $derived(
		!climate.isOn
			? 'bg-subtle-foreground'
			: climate.mode === 'heat'
				? 'bg-warning'
				: climate.mode === 'fan_only'
					? 'bg-muted-foreground'
					: climate.mode === 'auto'
						? 'bg-success'
						: 'bg-cool'
	);

	/** Real state the mockup faked with a schedule footer. */
	let footerNote = $derived(
		[
			climate.presetMode && climate.presetMode !== 'none' ? titleCase(climate.presetMode) : null,
			climate.swingMode && climate.swingMode !== 'off'
				? `Swing ${titleCase(climate.swingMode)}`
				: null
		]
			.filter(Boolean)
			.join(' · ') || (climate.isOn ? 'No preset' : 'Not running')
	);
</script>

<section
	class="flex flex-col gap-3 rounded-[10px] border border-border bg-card p-4 transition-opacity {busy
		? 'opacity-80'
		: ''}"
>
	<!-- Unit header -->
	<div class="flex items-start justify-between gap-3">
		<div class="flex min-w-0 items-center gap-2.5">
			<DragHandle name={climate.name} onDragPointerDown={onReorderStart} />

			<span
				class="grid size-8 shrink-0 place-items-center rounded-[8px] {climate.isOn
					? 'bg-cool-soft text-cool'
					: 'bg-muted text-muted-foreground'}"
			>
				{#if climate.isOn}
					<Snowflake size={15} strokeWidth={1.75} />
				{:else}
					<Thermometer size={15} strokeWidth={1.75} />
				{/if}
			</span>

			<div class="flex min-w-0 flex-col leading-none">
				<button
					type="button"
					onclick={onDetail}
					class="truncate text-left text-[13.5px] font-semibold text-foreground hover:underline"
				>
					{climate.name}
				</button>
				<span class="mt-1 truncate text-[10.5px] text-muted-foreground">{model}</span>
			</div>
		</div>

		<div class="flex shrink-0 items-center gap-1.5">
			<CardMenu
				name={climate.name}
				{span}
				options={sizeOptions}
				onSelect={onSpanChange}
				{onRemove}
			/>
			<Switch
				checked={climate.isOn}
				onCheckedChange={togglePower}
				aria-label={`Toggle ${climate.name}`}
			/>
		</div>
	</div>

	<!-- Temperature -->
	<div class="flex items-center justify-between gap-3 py-0.5">
		<div class="flex items-start">
			<span
				class="text-[38px] font-medium leading-none tracking-[-1.6px] tabular {climate.isOn
					? 'text-foreground'
					: 'text-subtle-foreground'}"
			>
				{target === null ? '—' : Math.round(target)}
			</span>
			<span
				class="pl-0.5 pt-1.5 text-[14px] font-medium {climate.isOn
					? 'text-foreground'
					: 'text-subtle-foreground'}">{climate.unit}</span
			>
		</div>

		<div class="flex items-center gap-2">
			<div class="flex items-center gap-1.5">
				<span class="size-[5px] rounded-full {statusTone}"></span>
				<span
					class="text-[11px] font-medium {climate.isOn
						? 'text-foreground'
						: 'text-subtle-foreground'}">{climate.actionLabel}</span
				>
			</div>

			<div class="flex items-center gap-1.5">
				<button
					type="button"
					onclick={() => step(-1)}
					disabled={!climate.isOn || !canDecrease || target === null}
					class="grid size-11 place-items-center rounded-[7px] border border-border bg-white text-foreground transition-colors hover:bg-muted disabled:opacity-40 lg:size-[30px]"
					aria-label="Decrease temperature"
				>
					<Minus size={13} strokeWidth={2} />
				</button>
				<button
					type="button"
					onclick={() => step(1)}
					disabled={!climate.isOn || !canIncrease || target === null}
					class="grid size-11 place-items-center rounded-[7px] border border-border bg-white text-foreground transition-colors hover:bg-muted disabled:opacity-40 lg:size-[30px]"
					aria-label="Increase temperature"
				>
					<Plus size={13} strokeWidth={2} />
				</button>
			</div>
		</div>
	</div>

	<!-- Mode selector -->
	<div class="flex items-center gap-0.5 rounded-[8px] bg-muted p-[3px]">
		{#each modes as mode (mode)}
			{@const Icon = MODE_ICONS[mode]}
			<button
				type="button"
				onclick={() => switchMode(mode)}
				class="flex h-10 flex-1 items-center justify-center gap-1 rounded-[6px] text-[11px] transition-colors lg:h-7 {climate.isOn &&
				climate.mode === mode
					? 'border border-border bg-white font-semibold text-foreground shadow-[0_1px_1px_rgba(0,0,0,0.03)]'
					: 'font-[450] text-muted-foreground hover:text-foreground'}"
				aria-pressed={climate.mode === mode}
			>
				<Icon size={12} strokeWidth={1.75} />
				<span>{hvacModeLabel(mode)}</span>
			</button>
		{/each}
	</div>

	<!-- Fan speed -->
	<div class="flex items-center gap-3">
		<div class="flex shrink-0 items-center gap-1.5">
			<Wind size={12} class="text-muted-foreground" />
			<span class="text-[11px] text-muted-foreground">Fan</span>
		</div>

		<div class="flex-1 {climate.isOn ? '' : 'pointer-events-none opacity-45'}">
			{#if fanMax > 0}
				<SliderPrimitive.Root
					type="single"
					value={fanIndex}
					max={fanMax}
					step={1}
					disabled={!climate.isOn}
					onValueCommit={commitFan}
					aria-label="Fan speed"
					class="relative flex h-3 w-full touch-none items-center select-none"
				>
					{#snippet children({ thumbItems })}
						<span class="relative h-[3px] w-full grow overflow-hidden rounded-full bg-[#E5E5E5]">
							<SliderPrimitive.Range class="absolute h-full bg-primary" />
						</span>
						{#each thumbItems as thumb (thumb.index)}
							<SliderPrimitive.Thumb
								index={thumb.index}
								class="block size-3 shrink-0 rounded-full border-[1.5px] border-primary bg-white transition-shadow focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-hidden"
							/>
						{/each}
					{/snippet}
				</SliderPrimitive.Root>
			{:else}
				<div class="h-[3px] w-full rounded-full bg-[#E5E5E5]"></div>
			{/if}
		</div>

		<span
			class="w-[54px] shrink-0 text-right text-[11px] font-medium {climate.isOn
				? 'text-foreground'
				: 'text-subtle-foreground'}">{fanCurrentLabel}</span
		>
	</div>

	<!-- Footer: preset/swing state + live room temperature -->
	<div class="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2.5 text-[10.5px]">
		<span class="truncate text-muted-foreground">{footerNote}</span>
		<span class="shrink-0 tabular text-[11px] font-medium text-foreground">
			{#if climate.currentTemp !== undefined && climate.currentTemp !== null}
				Room {climate.currentTemp.toFixed(1)}°
			{:else}
				Room —
			{/if}
		</span>
	</div>
</section>
