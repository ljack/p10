<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Device, DeviceType } from '$lib/types';
	import { DEVICE_TYPES, humanizeDeviceType } from '$lib/utils';
	import Modal from './Modal.svelte';

	export let open = false;
	export let device: Device | null = null;
	export let saving = false;

	const dispatch = createEventDispatcher<{
		close: void;
		save: {
			name: string;
			type: DeviceType;
			wattage: number;
			location: string;
		};
	}>();

	let form = {
		name: '',
		type: 'appliance' as DeviceType,
		wattage: 500,
		location: ''
	};
	let seedKey = '';

	$: {
		const nextKey = open ? `${device?.id ?? 'new'}` : 'closed';
		if (nextKey !== seedKey) {
			seedKey = nextKey;
			form = {
				name: device?.name ?? '',
				type: device?.type ?? 'appliance',
				wattage: device?.wattage ?? 500,
				location: device?.location ?? ''
			};
		}
	}

	function submit() {
		dispatch('save', {
			name: form.name.trim(),
			type: form.type,
			wattage: Number(form.wattage),
			location: form.location.trim()
		});
	}
</script>

<Modal open={open} title={device ? 'Edit device' : 'Add device'} on:close={() => dispatch('close')}>
	<form class="stack" on:submit|preventDefault={submit}>
		<div class="grid-2">
			<div class="field">
				<label for="name">Device name</label>
				<input id="name" class="input" bind:value={form.name} placeholder="Living room AC" required />
			</div>
			<div class="field">
				<label for="type">Type</label>
				<select id="type" class="select" bind:value={form.type}>
					{#each DEVICE_TYPES as type}
						<option value={type}>{humanizeDeviceType(type)}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="grid-2">
			<div class="field">
				<label for="wattage">Wattage</label>
				<input id="wattage" class="input" bind:value={form.wattage} type="number" min="1" required />
			</div>
			<div class="field">
				<label for="location">Location</label>
				<input id="location" class="input" bind:value={form.location} placeholder="Kitchen" required />
			</div>
		</div>

		<div class="actions">
			<button class="button" type="submit" disabled={saving}>
				{saving ? 'Saving...' : device ? 'Save changes' : 'Create device'}
			</button>
			<button class="button-ghost" type="button" on:click={() => dispatch('close')} disabled={saving}>
				Cancel
			</button>
		</div>
	</form>
</Modal>
