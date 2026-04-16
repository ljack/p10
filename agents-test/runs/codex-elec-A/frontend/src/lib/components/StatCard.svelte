<script lang="ts">
	export let title: string;
	export let value: string;
	export let subtitle = '';
	export let accent: 'gold' | 'teal' | 'coral' = 'gold';
</script>

<article class="stat-card fade-in" data-accent={accent}>
	<div class="eyebrow">{title}</div>
	<div class="value">{value}</div>
	{#if subtitle}
		<p>{subtitle}</p>
	{/if}
</article>

<style>
	.stat-card {
		padding: 20px;
		border-radius: 22px;
		background: rgba(255, 250, 240, 0.94);
		border: 1px solid rgba(29, 43, 43, 0.08);
		position: relative;
		overflow: hidden;
	}

	.stat-card::before {
		content: '';
		position: absolute;
		inset: 0 auto auto 0;
		width: 100%;
		height: 4px;
		background: linear-gradient(90deg, var(--gold), transparent);
	}

	.stat-card[data-accent='teal']::before {
		background: linear-gradient(90deg, var(--teal), transparent);
	}

	.stat-card[data-accent='coral']::before {
		background: linear-gradient(90deg, var(--coral), transparent);
	}

	.eyebrow {
		font-size: 0.86rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--muted);
		margin-bottom: 12px;
	}

	.value {
		font-size: clamp(1.8rem, 2.8vw, 2.7rem);
		font-weight: 800;
	}

	p {
		margin: 10px 0 0;
		color: var(--muted);
	}
</style>
