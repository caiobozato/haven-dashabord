<script lang="ts">
	import { ExternalLink, Wind } from '@lucide/svelte';
	import { HA_PUBLIC_URL } from '$app/env/public';
	import * as Sheet from '#lib/components/ui/sheet/index.js';
	import type { ClimateView } from '#lib/ha/derive.js';
	import { fanLabel, titleCase } from '#lib/ha/derive.js';
	import { setFanMode, setPresetMode, setSwingMode } from '#lib/ha/actions.js';

	let {
		climate,
		model,
		open = $bindable(false)
	}: { climate: ClimateView; model: string; open?: boolean } = $props();

	const PRESET_LABELS: Record<string, string> = { eco: 'Eco', boost: 'Boost' };

	function chipClass(active: boolean) {
		return active
			? 'border-primary bg-primary text-primary-foreground'
			: 'border-border bg-white text-foreground hover:border-border-strong';
	}
</script>

<Sheet.Root bind:open>
	<Sheet.Content side="right" class="w-full gap-0 sm:max-w-[400px]">
		<Sheet.Header class="gap-3 border-b border-border px-5 py-5">
			<div class="flex items-center gap-3">
				<div>
					<Sheet.Title class="text-[16px] font-semibold tracking-[-0.3px]">
						{climate.name}
					</Sheet.Title>
					<Sheet.Description class="mt-1 text-[11.5px] text-muted-foreground">
						{model}
					</Sheet.Description>
				</div>
			</div>
		</Sheet.Header>

		<div class="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
			<!-- Live readings -->
			<div class="grid grid-cols-2 gap-3">
				<div class="rounded-lg border border-border p-3">
					<p class="text-[10.5px] font-medium text-muted-foreground">Room</p>
					<p class="mt-1 text-[20px] font-medium tracking-[-0.5px] tabular">
						{climate.currentTemp === undefined || climate.currentTemp === null ? '—' : `${climate.currentTemp.toFixed(1)}°`}
					</p>
				</div>
				<div class="rounded-lg border border-border p-3">
					<p class="text-[10.5px] font-medium text-muted-foreground">Target</p>
					<p class="mt-1 text-[20px] font-medium tracking-[-0.5px] tabular">
						{climate.targetTemp === undefined || climate.targetTemp === null ? '—' : `${Math.round(climate.targetTemp)}°`}
					</p>
				</div>
			</div>

			<!-- Presets -->
			{#if climate.presetModes.length}
				<div class="flex flex-col gap-2">
					<p class="text-[11px] font-medium tracking-[0.2px] text-muted-foreground">Preset</p>
					<div class="flex flex-wrap gap-2">
						{#each [{ id: 'none', label: 'None' }, ...climate.presetModes.map((preset) => ({ id: preset, label: PRESET_LABELS[preset] ?? titleCase(preset) }))] as preset (preset.id)}
							<button
								type="button"
								onclick={() => setPresetMode(climate.entityId, preset.id)}
								class="rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition-colors {chipClass(
									(climate.presetMode ?? 'none') === preset.id
								)}"
							>
								{preset.label}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Swing -->
			{#if climate.swingModes.length}
				<div class="flex flex-col gap-2">
					<p class="text-[11px] font-medium tracking-[0.2px] text-muted-foreground">Swing</p>
					<div class="flex flex-wrap gap-2">
						{#each climate.swingModes as swing (swing)}
							<button
								type="button"
								onclick={() => setSwingMode(climate.entityId, swing)}
								class="rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition-colors {chipClass(
									climate.swingMode === swing
								)}"
							>
								{titleCase(swing)}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Fan -->
			{#if climate.fanModes.length}
				<div class="flex flex-col gap-2">
					<div class="flex items-center gap-1.5">
						<Wind size={12} class="text-muted-foreground" />
						<p class="text-[11px] font-medium tracking-[0.2px] text-muted-foreground">Fan speed</p>
					</div>
					<div class="flex flex-wrap gap-2">
						{#each climate.fanModes as fan (fan)}
							<button
								type="button"
								onclick={() => setFanMode(climate.entityId, fan)}
								class="rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition-colors {chipClass(
									climate.fanMode === fan
								)}"
							>
								{fanLabel(fan)}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<a
				href={`${HA_PUBLIC_URL}/history?entity_id=${climate.entityId}`}
				target="_blank"
				rel="noreferrer"
				class="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-[12px] font-medium text-foreground transition-colors hover:border-border-strong"
			>
				<ExternalLink size={13} />
				Open history in Home Assistant
			</a>
		</div>
	</Sheet.Content>
</Sheet.Root>
