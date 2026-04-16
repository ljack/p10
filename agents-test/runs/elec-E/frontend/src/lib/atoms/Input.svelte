<script lang="ts">
	import { colors } from '$lib/tokens/colors';
	import { spacing } from '$lib/tokens/spacing';
	
	interface InputProps {
		type?: string;
		value?: string | number;
		placeholder?: string;
		required?: boolean;
		oninput?: (e: Event) => void;
		id?: string;
	}
	
	let {
		type = 'text',
		value = $bindable(''),
		placeholder = '',
		required = false,
		oninput,
		id
	}: InputProps = $props();
</script>

<input
	{type}
	bind:value
	{placeholder}
	{required}
	on:input={oninput}
	{id}
	style="
		width: 100%;
		padding: {spacing.sm} {spacing.md};
		border: 1px solid {colors.border};
		border-radius: 0.375rem;
		font-size: 1rem;
		color: {colors.text};
	"
	aria-label={placeholder}
/>
