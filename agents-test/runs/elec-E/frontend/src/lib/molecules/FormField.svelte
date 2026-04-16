<script lang="ts">
	import Input from '$lib/atoms/Input.svelte';
	import { spacing } from '$lib/tokens/spacing';
	import { colors } from '$lib/tokens/colors';
	
	interface FormFieldProps {
		label: string;
		type?: string;
		value?: string | number;
		placeholder?: string;
		required?: boolean;
		id: string;
	}
	
	let {
		label,
		type = 'text',
		value = $bindable(''),
		placeholder = '',
		required = false,
		id
	}: FormFieldProps = $props();
</script>

<div style="margin-bottom: {spacing.md};">
	<label for={id} style="display: block; margin-bottom: {spacing.xs}; color: {colors.text}; font-weight: 500;">
		{label}
		{#if required}<span style="color: {colors.danger};">*</span>{/if}
	</label>
	<Input {type} bind:value {placeholder} {required} {id} />
</div>
