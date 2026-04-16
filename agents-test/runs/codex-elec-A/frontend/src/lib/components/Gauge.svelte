<script lang="ts">
	export let label: string;
	export let value = 0;
	export let max = 100;
	export let threshold = 80;
	export let footer = '';

	$: safeMax = Math.max(max, 1);
	$: percent = Math.min((value / safeMax) * 100, 100);
	$: thresholdPercent = Math.min((threshold / safeMax) * 100, 100);
	$: warning = percent >= thresholdPercent;
</script>

<section class="gauge">
	<div class="header">
		<div>
			<h3>{label}</h3>
			<p>{value.toFixed(1)} / {max.toFixed(1)} kWh</p>
		</div>
		<div class:warning class="percent">{percent.toFixed(1)}%</div>
	</div>

	<div class="track">
		<div class="fill" class:warning style={`width: ${percent}%`}></div>
		<div class="marker" style={`left: ${thresholdPercent}%`}></div>
	</div>

	{#if footer}
		<p class="footer">{footer}</p>
	{/if}
</section>

<style>
	.gauge {
		display: grid;
		gap: 12px;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 16px;
	}

	h3,
	p {
		margin: 0;
	}

	.header p,
	.footer {
		color: var(--muted);
	}

	.percent {
		font-size: 1.4rem;
		font-weight: 800;
		color: var(--teal);
	}

	.percent.warning {
		color: var(--coral);
	}

	.track {
		position: relative;
		height: 16px;
		border-radius: 999px;
		background: rgba(29, 43, 43, 0.08);
		overflow: hidden;
	}

	.fill {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, var(--teal), #4cb8a1);
	}

	.fill.warning {
		background: linear-gradient(90deg, var(--gold-deep), var(--coral));
	}

	.marker {
		position: absolute;
		inset: 0 auto 0 0;
		width: 2px;
		background: rgba(29, 43, 43, 0.5);
		transform: translateX(-1px);
	}
</style>
