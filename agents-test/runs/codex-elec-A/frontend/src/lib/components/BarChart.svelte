<script lang="ts">
	export let points: { label: string; value: number }[] = [];
	export let height = 220;

	$: maxValue = Math.max(...points.map((point) => point.value), 1);
</script>

{#if points.length === 0}
	<div class="empty">No chart data available yet.</div>
{:else}
	<div class="chart" style={`height: ${height}px`}>
		{#each points as point}
			<div class="column">
				<div class="bar-wrap">
					<div
						class="bar"
						title={`${point.label}: ${point.value.toFixed(2)} kWh`}
						style={`height: ${(point.value / maxValue) * 100}%`}
					></div>
				</div>
				<div class="label">{point.label}</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	.chart {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(30px, 1fr));
		gap: 10px;
		align-items: end;
	}

	.column {
		display: grid;
		gap: 8px;
		justify-items: center;
	}

	.bar-wrap {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: end;
	}

	.bar {
		width: 100%;
		border-radius: 14px 14px 8px 8px;
		background: linear-gradient(180deg, #58bea8 0%, var(--teal) 60%, #15594f 100%);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24);
		min-height: 6px;
	}

	.label {
		font-size: 0.76rem;
		color: var(--muted);
	}
</style>
