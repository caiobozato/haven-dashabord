<script lang="ts">
	import { GripVertical } from '@lucide/svelte';

	let {
		name,
		onDragPointerDown
	}: {
		name: string;
		onDragPointerDown: (event: PointerEvent) => void;
	} = $props();
</script>

<button
	type="button"
	onpointerdown={onDragPointerDown}
	class="-ml-1 grid size-5 shrink-0 cursor-grab touch-none place-items-center rounded text-subtle-foreground opacity-45 transition-opacity hover:text-foreground hover:opacity-100 active:cursor-grabbing"
	aria-label={`Move ${name}`}
	title="Drag to move"
>
	<GripVertical size={14} strokeWidth={2} />
</button>
