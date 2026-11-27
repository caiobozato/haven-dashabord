<script lang="ts">
	import { Minus, Plus, Power } from '@lucide/svelte';
	import type { ClimateView } from '#lib/ha/derive.js';
	import { setTemperature, turnOff, turnOn } from '#lib/ha/actions.js';
	import { live } from '#lib/live.svelte.js';

	let { climate, onDetail }: { climate: ClimateView; onDetail: () => void } = $props();

	let optimisticTemp = $state<number | null>(null);
	let clearTimer: ReturnType<typeof setTimeout> | undefined;

	let busy = $derived(Boolean(live.busy[climate.entityId]));
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

	async function togglePower() {
		if (climate.isOn) await turnOff(climate.entityId);
		else await turnOn(climate.entityId);
	}

	let roomTemp = $derived(
		climate.currentTemp === undefined || climate.currentTemp === null
			? null
			: `${climate.currentTemp.toFixed(1)}°`
	);
</script>

<section class="ac" class:off={!climate.isOn} class:busy>
	<div class="head">
		<button
			type="button"
			class="name-block"
			onclick={onDetail}
			aria-label={`Open ${climate.name} controls`}
		>
			<span class="name">{climate.name}</span>
			<span class="sub">
				{climate.isOn ? climate.modeLabel : 'Off'}{roomTemp ? ` · Room ${roomTemp}` : ''}
			</span>
		</button>

		<button
			type="button"
			class="icon-btn power"
			class:on={climate.isOn}
			aria-pressed={climate.isOn}
			aria-label={`Turn ${climate.isOn ? 'off' : 'on'} ${climate.name}`}
			onclick={togglePower}
		>
			<Power size={20} strokeWidth={2} />
		</button>
	</div>

	<div class="body">
		<button
			type="button"
			class="icon-btn"
			onclick={() => step(-1)}
			disabled={!climate.isOn || !canDecrease || target === null}
			aria-label={`Decrease ${climate.name} temperature`}
		>
			<Minus size={22} strokeWidth={2.25} />
		</button>

		<div class="readout">
			<span class="target">
				{target === null ? '—' : Math.round(target)}<span class="unit">{climate.unit}</span>
			</span>
			<span class="caption">{climate.actionLabel}</span>
		</div>

		<button
			type="button"
			class="icon-btn"
			onclick={() => step(1)}
			disabled={!climate.isOn || !canIncrease || target === null}
			aria-label={`Increase ${climate.name} temperature`}
		>
			<Plus size={22} strokeWidth={2.25} />
		</button>
	</div>
</section>

<style>
	.ac {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
		padding: 6px 8px 7px;
		border: 1px solid #1f1f1f;
		border-radius: 16px;
		background: #0c0c0c;
		transition:
			border-color 140ms ease,
			background-color 140ms ease,
			opacity 140ms ease;
	}

	.ac.busy {
		opacity: 0.65;
	}

	.head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 8px;
		min-width: 0;
	}

	.name-block {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 2px;
		align-self: stretch;
		min-width: 0;
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		text-align: left;
		touch-action: manipulation;
	}

	.name-block:focus-visible {
		outline: 2px solid #7dd3fc;
		outline-offset: 3px;
		border-radius: 6px;
	}

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 13.5px;
		font-weight: 600;
		line-height: 1.15;
		color: #f5f5f5;
	}

	.sub {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 11px;
		line-height: 1.15;
		color: #8a8a8a;
	}

	.icon-btn {
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		flex: 0 0 56px;
		border: 1px solid #262626;
		border-radius: 13px;
		background: #141414;
		color: #e5e5e5;
		touch-action: manipulation;
		transition:
			background-color 120ms ease,
			border-color 120ms ease,
			color 120ms ease;
	}

	.icon-btn:active:not(:disabled) {
		background: #222;
	}

	.icon-btn:focus-visible {
		outline: 2px solid #7dd3fc;
		outline-offset: 2px;
	}

	.icon-btn:disabled {
		opacity: 0.3;
	}

	.power {
		color: #8a8a8a;
	}

	.power.on {
		border-color: rgba(56, 189, 248, 0.45);
		background: rgba(56, 189, 248, 0.12);
		color: #7dd3fc;
	}

	.body {
		display: grid;
		grid-template-columns: 56px minmax(0, 1fr) 56px;
		align-items: center;
		gap: 8px;
	}

	.readout {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-width: 0;
		line-height: 1;
	}

	.target {
		font-size: 31px;
		font-weight: 450;
		letter-spacing: -1.2px;
		font-variant-numeric: tabular-nums;
		color: #fafafa;
		white-space: nowrap;
	}

	.unit {
		margin-left: 1px;
		font-size: 13px;
		font-weight: 500;
		letter-spacing: 0;
		color: #a3a3a3;
	}

	.caption {
		margin-top: 3px;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 9.5px;
		font-weight: 500;
		letter-spacing: 0.2px;
		text-transform: uppercase;
		color: #6b6b6b;
	}

	.off .target {
		color: #525252;
	}

	.off .unit,
	.off .caption {
		color: #404040;
	}

</style>
