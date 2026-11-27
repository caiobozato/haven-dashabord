<script lang="ts">
	import { Lightbulb } from '@lucide/svelte';
	import type { LightView } from '#lib/ha/derive.js';

	let {
		light,
		busy = false,
		onToggle
	}: {
		light: LightView;
		busy?: boolean;
		onToggle: () => void;
	} = $props();
</script>

<button
	type="button"
	class="light-tile"
	class:on={light.isOn}
	class:busy
	aria-pressed={light.isOn}
	aria-label={`${light.isOn ? 'Turn off' : 'Turn on'} ${light.name}`}
	onclick={onToggle}
>
	<span class="bulb">
		<Lightbulb size={19} strokeWidth={light.isOn ? 2 : 1.6} />
	</span>
	<span class="copy">
		<span class="name">{light.name}</span>
		<span class="room">
			{light.room ?? 'Light'}{light.isOn && light.brightnessPct !== undefined
				? ` · ${light.brightnessPct}%`
				: ''}
		</span>
	</span>
	<span class="dot" aria-hidden="true"></span>
</button>

<style>
	.light-tile {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 56px;
		width: 100%;
		padding: 0 14px;
		border: 1px solid #202020;
		border-radius: 14px;
		background: #0d0d0d;
		color: #d4d4d4;
		text-align: left;
		touch-action: manipulation;
		transition:
			background-color 120ms ease,
			border-color 120ms ease,
			color 120ms ease;
	}

	.light-tile:active {
		background: #191919;
	}

	.light-tile.on {
		border-color: rgba(251, 191, 36, 0.45);
		background: rgba(251, 191, 36, 0.1);
		color: #fef3c7;
	}

	.light-tile:focus-visible {
		outline: 2px solid #7dd3fc;
		outline-offset: 2px;
	}

	.light-tile.busy {
		opacity: 0.55;
	}

	.bulb {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		flex: 0 0 32px;
		border-radius: 9px;
		background: #171717;
		color: #737373;
	}

	.on .bulb {
		background: rgba(251, 191, 36, 0.16);
		color: #fbbf24;
	}

	.copy {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		flex: 1;
	}

	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 14px;
		font-weight: 550;
		line-height: 1.15;
	}

	.room {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 11px;
		line-height: 1.15;
		color: #737373;
	}

	.on .room {
		color: #b0892a;
	}

	.dot {
		width: 7px;
		height: 7px;
		flex: 0 0 7px;
		border-radius: 999px;
		background: #262626;
	}

	.on .dot {
		background: #fbbf24;
		box-shadow: 0 0 10px rgba(251, 191, 36, 0.55);
	}
</style>
