<script lang="ts">
	let display = $state('0');
	let firstOperand = $state<number | null>(null);
	let operator = $state<string | null>(null);
	let waitingForSecondOperand = $state(false);
	let loading = $state(false);
	let error = $state<string | null>(null);

	function inputDigit(digit: string) {
		error = null;
		if (waitingForSecondOperand) {
			display = digit;
			waitingForSecondOperand = false;
		} else {
			display = display === '0' ? digit : display + digit;
		}
	}

	function inputDecimal() {
		error = null;
		if (waitingForSecondOperand) {
			display = '0.';
			waitingForSecondOperand = false;
			return;
		}
		if (!display.includes('.')) {
			display = display + '.';
		}
	}

	function handleOperator(nextOperator: string) {
		error = null;
		const inputValue = parseFloat(display);

		if (operator && waitingForSecondOperand) {
			operator = nextOperator;
			return;
		}

		if (firstOperand === null) {
			firstOperand = inputValue;
		} else if (operator) {
			calculate();
			firstOperand = parseFloat(display);
		}

		waitingForSecondOperand = true;
		operator = nextOperator;
	}

	async function calculate() {
		if (operator === null || firstOperand === null) return;

		const secondOperand = parseFloat(display);
		loading = true;
		error = null;

		try {
			const res = await fetch('/api/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					a: firstOperand,
					b: secondOperand,
					operator: operator
				})
			});

			const data = await res.json();

			if (!res.ok) {
				error = data.error || 'Calculation failed';
				return;
			}

			display = String(data.result);
			firstOperand = data.result;
			operator = null;
			waitingForSecondOperand = true;
		} catch (err) {
			error = 'Network error';
		} finally {
			loading = false;
		}
	}

	function clear() {
		display = '0';
		firstOperand = null;
		operator = null;
		waitingForSecondOperand = false;
		error = null;
	}

	function clearEntry() {
		display = '0';
		error = null;
	}

	function toggleSign() {
		display = String(parseFloat(display) * -1);
	}
</script>

<div class="w-full max-w-xs mx-auto">
	<div class="bg-surface rounded-2xl shadow-xl overflow-hidden border border-border">
		<!-- Display -->
		<div class="bg-surface-alt p-4">
			<div class="text-right">
				{#if error}
					<div class="text-red-400 text-sm mb-1">{error}</div>
				{/if}
				<div class="text-xs text-muted h-4 mb-1">
					{#if firstOperand !== null && operator}
						{firstOperand} {operator}
					{/if}
				</div>
				<div class="text-4xl font-light text-foreground tabular-nums truncate" class:opacity-50={loading}>
					{display}
				</div>
			</div>
		</div>

		<!-- Button Grid -->
		<div class="grid grid-cols-4 gap-px bg-border p-px">
			<!-- Row 1: Clear buttons -->
			<button onclick={clear} class="calc-btn calc-btn-secondary col-span-2">AC</button>
			<button onclick={clearEntry} class="calc-btn calc-btn-secondary">CE</button>
			<button onclick={() => handleOperator('/')} class="calc-btn calc-btn-operator" class:active={operator === '/'}>/</button>

			<!-- Row 2: 7, 8, 9, × -->
			<button onclick={() => inputDigit('7')} class="calc-btn">7</button>
			<button onclick={() => inputDigit('8')} class="calc-btn">8</button>
			<button onclick={() => inputDigit('9')} class="calc-btn">9</button>
			<button onclick={() => handleOperator('*')} class="calc-btn calc-btn-operator" class:active={operator === '*'}>×</button>

			<!-- Row 3: 4, 5, 6, - -->
			<button onclick={() => inputDigit('4')} class="calc-btn">4</button>
			<button onclick={() => inputDigit('5')} class="calc-btn">5</button>
			<button onclick={() => inputDigit('6')} class="calc-btn">6</button>
			<button onclick={() => handleOperator('-')} class="calc-btn calc-btn-operator" class:active={operator === '-'}>−</button>

			<!-- Row 4: 1, 2, 3, + -->
			<button onclick={() => inputDigit('1')} class="calc-btn">1</button>
			<button onclick={() => inputDigit('2')} class="calc-btn">2</button>
			<button onclick={() => inputDigit('3')} class="calc-btn">3</button>
			<button onclick={() => handleOperator('+')} class="calc-btn calc-btn-operator" class:active={operator === '+'}>+</button>

			<!-- Row 5: ±, 0, ., = -->
			<button onclick={toggleSign} class="calc-btn">±</button>
			<button onclick={() => inputDigit('0')} class="calc-btn">0</button>
			<button onclick={inputDecimal} class="calc-btn">.</button>
			<button onclick={calculate} disabled={loading} class="calc-btn calc-btn-equals">=</button>
		</div>
	</div>
</div>

<style>
	.calc-btn {
		@apply py-4 text-xl font-medium bg-surface text-foreground 
		       hover:bg-surface-alt active:bg-border
		       transition-colors duration-100
		       disabled:opacity-50 disabled:cursor-not-allowed;
	}

	.calc-btn-secondary {
		@apply bg-surface-alt text-muted;
	}

	.calc-btn-operator {
		@apply bg-accent/20 text-accent hover:bg-accent/30;
	}

	.calc-btn-operator.active {
		@apply bg-accent text-white;
	}

	.calc-btn-equals {
		@apply bg-accent text-white hover:brightness-110;
	}
</style>
