<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let open = false;
	export let title = '';

	const dispatch = createEventDispatcher<{ close: void }>();

	function close() {
		dispatch('close');
	}

	function handleKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') {
			close();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
	<div class="overlay" on:click={close} role="presentation">
		<div class="dialog" on:click|stopPropagation role="dialog" aria-modal="true" aria-label={title}>
			<div class="dialog-head">
				<h3>{title}</h3>
				<button class="button-ghost" type="button" on:click={close}>Close</button>
			</div>
			<div class="dialog-body">
				<slot />
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(18, 23, 24, 0.44);
		backdrop-filter: blur(10px);
		display: grid;
		place-items: center;
		padding: 20px;
		z-index: 30;
	}

	.dialog {
		width: min(620px, 100%);
		border-radius: 28px;
		background: linear-gradient(180deg, rgba(255, 252, 245, 0.98), rgba(248, 241, 228, 0.95));
		box-shadow: 0 24px 80px rgba(0, 0, 0, 0.18);
		border: 1px solid rgba(255, 255, 255, 0.58);
	}

	.dialog-head {
		padding: 18px 20px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		border-bottom: 1px solid rgba(29, 43, 43, 0.08);
	}

	h3 {
		margin: 0;
	}

	.dialog-body {
		padding: 20px;
	}
</style>
