<script lang="ts">
  let { data = [], height = 200 }: {
    data: Array<{ label: string; value: number }>;
    height?: number;
  } = $props();

  let maxValue = $derived(Math.max(...data.map(d => d.value), 0.01));

  let hoveredIndex: number | null = $state(null);

  const padding = { top: 10, right: 10, bottom: 30, left: 10 };
  const chartWidth = 600;

  let barWidth = $derived(
    data.length > 0
      ? Math.max((chartWidth - padding.left - padding.right) / data.length - 4, 8)
      : 20
  );
</script>

{#if data.length === 0}
  <div class="empty-state">No consumption data for this period</div>
{:else}
  <div class="chart-wrapper">
    <svg
      viewBox="0 0 {chartWidth} {height}"
      preserveAspectRatio="xMidYMid meet"
      class="chart-svg"
    >
      {#each data as item, i}
        {@const barHeight = (item.value / maxValue) * (height - padding.top - padding.bottom)}
        {@const x = padding.left + i * ((chartWidth - padding.left - padding.right) / data.length) + 2}
        {@const y = height - padding.bottom - barHeight}

        <!-- Bar -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <g
          onmouseenter={() => hoveredIndex = i}
          onmouseleave={() => hoveredIndex = null}
        >
          <rect
            {x}
            {y}
            width={barWidth}
            height={Math.max(barHeight, 1)}
            rx="3"
            fill={hoveredIndex === i ? 'var(--accent-hover)' : 'var(--accent)'}
            opacity={hoveredIndex === i ? 1 : 0.85}
            style="transition: all 0.15s"
          />

          <!-- Label -->
          <text
            x={x + barWidth / 2}
            y={height - 8}
            text-anchor="middle"
            fill="var(--text-muted)"
            font-size="9"
          >
            {item.label}
          </text>

          <!-- Tooltip on hover -->
          {#if hoveredIndex === i}
            <rect
              x={x + barWidth / 2 - 28}
              y={y - 24}
              width="56"
              height="18"
              rx="4"
              fill="var(--bg-card)"
              stroke="var(--border)"
            />
            <text
              x={x + barWidth / 2}
              y={y - 11}
              text-anchor="middle"
              fill="var(--text)"
              font-size="10"
              font-weight="600"
            >
              {item.value.toFixed(2)}
            </text>
          {/if}
        </g>
      {/each}
    </svg>
  </div>
{/if}

<style>
  .chart-wrapper {
    width: 100%;
    overflow-x: auto;
  }
  .chart-svg {
    width: 100%;
    height: auto;
    min-height: 150px;
  }
</style>
