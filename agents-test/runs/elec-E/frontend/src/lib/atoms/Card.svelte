<script lang="ts">
	import { colors } from '$lib/tokens/colors';
	import { spacing } from '$lib/tokens/spacing';
	
	interface CardProps {
		children?: any;
	}
	
	let { children }: CardProps = $props();
</script>

<div
	style="
		background-color: {colors.background};
		border: 1px solid {colors.border};
		border-radius: 0.5rem;
		padding: {spacing.lg};
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
	"
	role="article"
>
	{@render children?.()}
</div>
