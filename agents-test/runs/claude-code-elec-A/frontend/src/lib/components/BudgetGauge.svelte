<script lang="ts">
  let { used_percent = 0, threshold_percent = 80 }: {
    used_percent: number;
    threshold_percent?: number;
  } = $props();

  let clamped = $derived(Math.min(Math.max(used_percent, 0), 100));

  let color = $derived(
    clamped > 80 ? 'var(--danger)' :
    clamped > 60 ? 'var(--warning)' :
    'var(--success)'
  );

  // Semi-circular gauge: arc from -180deg to 0deg
  // SVG arc calculation
  const cx = 100;
  const cy = 100;
  const r = 80;
  const startAngle = Math.PI; // 180 degrees (left)

  let endAngle = $derived(Math.PI - (clamped / 100) * Math.PI);

  let arcX = $derived(cx + r * Math.cos(endAngle));
  let arcY = $derived(cy - r * Math.sin(endAngle));

  let largeArc = $derived(clamped > 50 ? 1 : 0);

  let arcPath = $derived(
    clamped === 0
      ? ''
      : `M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${arcX.toFixed(2)} ${arcY.toFixed(2)}`
  );

  // Threshold marker position
  let thresholdAngle = $derived(Math.PI - ((threshold_percent ?? 80) / 100) * Math.PI);
  let thresholdX1 = $derived(cx + (r - 10) * Math.cos(thresholdAngle));
  let thresholdY1 = $derived(cy - (r - 10) * Math.sin(thresholdAngle));
  let thresholdX2 = $derived(cx + (r + 10) * Math.cos(thresholdAngle));
  let thresholdY2 = $derived(cy - (r + 10) * Math.sin(thresholdAngle));
</script>

<div class="gauge-container">
  <svg viewBox="0 0 200 120" class="gauge-svg">
    <!-- Background arc -->
    <path
      d="M {cx - r} {cy} A {r} {r} 0 0 1 {cx + r} {cy}"
      fill="none"
      stroke="var(--border)"
      stroke-width="12"
      stroke-linecap="round"
    />

    <!-- Value arc -->
    {#if clamped > 0}
      <path
        d={arcPath}
        fill="none"
        stroke={color}
        stroke-width="12"
        stroke-linecap="round"
      />
    {/if}

    <!-- Threshold marker -->
    <line
      x1={thresholdX1}
      y1={thresholdY1}
      x2={thresholdX2}
      y2={thresholdY2}
      stroke="var(--text-muted)"
      stroke-width="2"
      stroke-dasharray="3,2"
    />

    <!-- Percentage text -->
    <text
      x={cx}
      y={cy - 15}
      text-anchor="middle"
      fill={color}
      font-size="28"
      font-weight="700"
    >
      {clamped.toFixed(0)}%
    </text>
    <text
      x={cx}
      y={cy + 5}
      text-anchor="middle"
      fill="var(--text-muted)"
      font-size="10"
    >
      used
    </text>
  </svg>
</div>

<style>
  .gauge-container {
    display: flex;
    justify-content: center;
  }
  .gauge-svg {
    width: 100%;
    max-width: 240px;
    height: auto;
  }
</style>
