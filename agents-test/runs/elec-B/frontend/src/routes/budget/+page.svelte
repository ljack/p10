<script lang="ts">
    import { onMount } from 'svelte';
    import { api, type Budget, type BudgetStatus } from '$lib/api';

    let budgets: Budget[] = [];
    let currentBudgetStatus: BudgetStatus | null = null;
    let loading = true;
    let showModal = false;
    let editingBudget: Budget | null = null;
    let formData = {
        year_month: new Date().toISOString().slice(0, 7),
        budget_kwh: 500,
        price_per_kwh: 0.15,
        alert_threshold_percent: 80
    };

    const currentMonth = new Date().toISOString().slice(0, 7);

    onMount(loadData);

    async function loadData() {
        loading = true;
        try {
            budgets = await api.budget.list();
            try {
                currentBudgetStatus = await api.budget.status(currentMonth);
            } catch (e) {
                currentBudgetStatus = null;
            }
        } catch (error) {
            console.error('Failed to load budgets:', error);
        } finally {
            loading = false;
        }
    }

    function openModal(budget?: Budget) {
        if (budget) {
            editingBudget = budget;
            formData = {
                year_month: budget.year_month,
                budget_kwh: budget.budget_kwh,
                price_per_kwh: budget.price_per_kwh,
                alert_threshold_percent: budget.alert_threshold_percent
            };
        } else {
            editingBudget = null;
            formData = {
                year_month: new Date().toISOString().slice(0, 7),
                budget_kwh: 500,
                price_per_kwh: 0.15,
                alert_threshold_percent: 80
            };
        }
        showModal = true;
    }

    function closeModal() {
        showModal = false;
        editingBudget = null;
    }

    async function handleSubmit() {
        try {
            if (editingBudget) {
                await api.budget.update(editingBudget.year_month, {
                    budget_kwh: formData.budget_kwh,
                    price_per_kwh: formData.price_per_kwh,
                    alert_threshold_percent: formData.alert_threshold_percent
                });
            } else {
                await api.budget.create(formData);
            }
            closeModal();
            loadData();
        } catch (error) {
            console.error('Failed to save budget:', error);
            alert('Failed to save budget');
        }
    }

    let usedPercent = $derived(currentBudgetStatus ? currentBudgetStatus.used_percent : 0);
    let progressClass = $derived(usedPercent >= 90 ? 'danger' : usedPercent >= 80 ? 'warning' : '');
</script>

<div class="container">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <h1>Budget Management</h1>
        <button on:click={() => openModal()}>Set Budget</button>
    </div>

    {#if loading}
        <p>Loading...</p>
    {:else}
        {#if currentBudgetStatus}
            <div class="card">
                <h2>Current Month ({currentMonth})</h2>
                <div class="progress-bar">
                    <div class="progress-fill {progressClass}" style="width: {Math.min(usedPercent, 100)}%">
                        {usedPercent.toFixed(1)}%
                    </div>
                </div>
                <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-top: 1rem;">
                    <div>
                        <strong>Budget:</strong> {currentBudgetStatus.budget_kwh} kWh
                    </div>
                    <div>
                        <strong>Used:</strong> {currentBudgetStatus.used_kwh} kWh
                    </div>
                    <div>
                        <strong>Remaining:</strong> {currentBudgetStatus.remaining_kwh} kWh
                    </div>
                    <div>
                        <strong>Projected:</strong> {currentBudgetStatus.projected_end_of_month_kwh} kWh
                    </div>
                    <div>
                        <strong>Cost:</strong> €{currentBudgetStatus.estimated_cost}
                    </div>
                </div>
                {#if currentBudgetStatus.is_over_threshold}
                    <p style="color: #e74c3c; font-weight: bold; margin-top: 1rem">
                        ⚠️ Warning: You've exceeded the alert threshold!
                    </p>
                {/if}
            </div>
        {/if}

        <div class="card">
            <h2>All Budgets</h2>
            <table>
                <thead>
                    <tr>
                        <th>Month</th>
                        <th>Budget (kWh)</th>
                        <th>Price/kWh (€)</th>
                        <th>Alert Threshold</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each budgets as budget}
                        <tr>
                            <td>{budget.year_month}</td>
                            <td>{budget.budget_kwh}</td>
                            <td>€{budget.price_per_kwh}</td>
                            <td>{budget.alert_threshold_percent}%</td>
                            <td>
                                <button class="secondary" on:click={() => openModal(budget)}>Edit</button>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>

{#if showModal}
    <div class="modal" on:click={closeModal}>
        <div class="modal-content" on:click|stopPropagation>
            <h2>{editingBudget ? 'Edit Budget' : 'Set Budget'}</h2>
            <form on:submit|preventDefault={handleSubmit}>
                <label>
                    Month (YYYY-MM)
                    <input type="month" bind:value={formData.year_month} required disabled={editingBudget !== null} />
                </label>
                <label>
                    Budget (kWh)
                    <input type="number" step="0.1" bind:value={formData.budget_kwh} required min="0" />
                </label>
                <label>
                    Price per kWh (€)
                    <input type="number" step="0.01" bind:value={formData.price_per_kwh} required min="0" />
                </label>
                <label>
                    Alert Threshold (%)
                    <input type="number" bind:value={formData.alert_threshold_percent} required min="0" max="100" />
                </label>
                <div class="button-group">
                    <button type="submit">Save</button>
                    <button type="button" class="secondary" on:click={closeModal}>Cancel</button>
                </div>
            </form>
        </div>
    </div>
{/if}
