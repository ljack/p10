<script lang="ts">
	import { colors } from '$lib/tokens/colors';
	import { spacing } from '$lib/tokens/spacing';
	
	interface ButtonProps {
		variant?: 'primary' | 'secondary' | 'danger';
		type?: 'button' | 'submit';
		onclick?: () => void;
		disabled?: boolean;
		children?: any;
	}
	
	let {
		variant = 'primary',
		type = 'button',
		onclick,
		disabled = false,
		children
	}: ButtonProps = $props();
	
	const variantColors = {
		primary: colors.primary,
		secondary: colors.secondary,
		danger: colors.danger
	};
</script>

<button
	{type}
	on:click={onclick}
	{disabled}
	style="
		background-color: {variantColors[variant]};
		color: white;
		padding: {spacing.sm} {spacing.md};
		border: none;
		border-radius: 0.375rem;
		cursor: {disabled ? 'not-allowed' : 'pointer'};
		opacity: {disabled ? 0.5 : 1};
		font-weight: 500;
	"
	aria-label="Button"
>
	{@render children?.()}
</button>
