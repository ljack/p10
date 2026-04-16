<script lang="ts">
  import { onMount } from 'svelte';

  import EmptyState from '$lib/components/EmptyState.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import Panel from '$lib/components/Panel.svelte';
  import { api } from '$lib/api';
  import type { Pet, PetPayload, Species } from '$lib/types';
  import { speciesOptions, titleCase } from '$lib/utils';

  type PetForm = {
    name: string;
    species: Species;
    breed: string;
    age_years: number;
    owner_name: string;
    owner_phone: string;
    notes: string;
  };

  function emptyForm(): PetForm {
    return {
      name: '',
      species: 'dog',
      breed: '',
      age_years: 1,
      owner_name: '',
      owner_phone: '',
      notes: ''
    };
  }

  let pets: Pet[] = [];
  let search = '';
  let form = emptyForm();
  let editingId: number | null = null;
  let loading = true;
  let saving = false;
  let errorMessage = '';
  let successMessage = '';

  async function loadPets(): Promise<void> {
    loading = true;
    errorMessage = '';

    try {
      pets = await api.listPets(search.trim() || undefined);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unable to load pets.';
    } finally {
      loading = false;
    }
  }

  function resetForm(): void {
    form = emptyForm();
    editingId = null;
  }

  function selectPet(pet: Pet): void {
    editingId = pet.id;
    form = {
      name: pet.name,
      species: pet.species,
      breed: pet.breed ?? '',
      age_years: pet.age_years,
      owner_name: pet.owner_name,
      owner_phone: pet.owner_phone,
      notes: pet.notes ?? ''
    };
  }

  function buildPayload(): PetPayload {
    return {
      name: form.name.trim(),
      species: form.species,
      breed: form.breed.trim() || null,
      age_years: Number(form.age_years),
      owner_name: form.owner_name.trim(),
      owner_phone: form.owner_phone.trim(),
      notes: form.notes.trim() || null
    };
  }

  async function savePet(): Promise<void> {
    saving = true;
    errorMessage = '';
    successMessage = '';

    try {
      const payload = buildPayload();
      if (editingId) {
        await api.updatePet(editingId, payload);
        successMessage = 'Pet record updated.';
      } else {
        await api.createPet(payload);
        successMessage = 'Pet added to the clinic roster.';
      }

      resetForm();
      await loadPets();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unable to save this pet.';
    } finally {
      saving = false;
    }
  }

  async function removePet(pet: Pet): Promise<void> {
    if (!window.confirm(`Delete ${pet.name}'s record? This cannot be undone.`)) {
      return;
    }

    errorMessage = '';
    successMessage = '';

    try {
      await api.deletePet(pet.id);
      if (editingId === pet.id) {
        resetForm();
      }
      successMessage = 'Pet record removed.';
      await loadPets();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unable to delete this pet.';
    }
  }

  onMount(() => {
    void loadPets();
  });
</script>

<div class="page">
  <PageHeader
    eyebrow="Patients"
    title="Pets"
    description="Search by owner name, keep records tidy, and update the details the front desk needs before each visit."
  />

  {#if errorMessage}
    <div class="banner error">{errorMessage}</div>
  {/if}

  {#if successMessage}
    <div class="banner success">{successMessage}</div>
  {/if}

  <div class="split">
    <Panel title="Patient list" subtitle={`${pets.length} pet records ready to use`}>
      <form class="search-row" on:submit|preventDefault={loadPets}>
        <label>
          Owner search
          <input bind:value={search} placeholder="Search by owner name" />
        </label>
        <button type="submit" class="secondary">Search</button>
      </form>

      {#if loading}
        <p class="muted">Loading pet records...</p>
      {:else if pets.length === 0}
        <EmptyState
          title="No pet records yet"
          message="Add your first patient profile to start booking care."
        />
      {:else}
        <div class="pet-list">
          {#each pets as pet}
            <article class="pet-card">
              <div class="pet-card__header">
                <div>
                  <h3>{pet.name}</h3>
                  <p>{titleCase(pet.species)}{pet.breed ? ` · ${pet.breed}` : ''}</p>
                </div>
                <span>{pet.age_years} yrs</span>
              </div>

              <div class="pet-card__meta">
                <p>{pet.owner_name}</p>
                <p>{pet.owner_phone}</p>
              </div>

              {#if pet.notes}
                <p class="pet-card__notes">{pet.notes}</p>
              {/if}

              <div class="pet-card__actions">
                <button type="button" class="secondary" on:click={() => selectPet(pet)}>Edit</button>
                <button type="button" class="ghost" on:click={() => removePet(pet)}>Delete</button>
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </Panel>

    <Panel
      title={editingId ? 'Edit pet record' : 'Add a new pet'}
      subtitle="Keep patient and owner details ready for quick check-in."
    >
      <form class="stack" on:submit|preventDefault={savePet}>
        <div class="grid-two">
          <label>
            Pet name
            <input bind:value={form.name} required />
          </label>
          <label>
            Species
            <select bind:value={form.species}>
              {#each speciesOptions as species}
                <option value={species}>{titleCase(species)}</option>
              {/each}
            </select>
          </label>
        </div>

        <div class="grid-two">
          <label>
            Breed
            <input bind:value={form.breed} placeholder="Optional" />
          </label>
          <label>
            Age in years
            <input bind:value={form.age_years} type="number" min="0.1" max="100" step="0.1" />
          </label>
        </div>

        <div class="grid-two">
          <label>
            Owner name
            <input bind:value={form.owner_name} required />
          </label>
          <label>
            Owner phone
            <input bind:value={form.owner_phone} required />
          </label>
        </div>

        <label>
          Notes
          <textarea bind:value={form.notes} placeholder="Medical flags, handling notes, or reminders" />
        </label>

        <div class="actions">
          <button type="submit" disabled={saving}>{editingId ? 'Save changes' : 'Create pet'}</button>
          <button type="button" class="secondary" on:click={resetForm}>Reset</button>
        </div>
      </form>
    </Panel>
  </div>
</div>

<style>
  .split {
    display: grid;
    grid-template-columns: 1.2fr 0.9fr;
    gap: 1rem;
  }

  .search-row,
  .pet-list,
  .pet-card,
  .pet-card__meta {
    display: grid;
    gap: 1rem;
  }

  .search-row {
    grid-template-columns: 1fr auto;
    align-items: end;
    margin-bottom: 1rem;
  }

  .pet-card {
    padding: 1rem;
    border-radius: 1.2rem;
    background: rgba(255, 255, 255, 0.72);
  }

  .pet-card__header,
  .pet-card__actions {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .pet-card h3,
  .pet-card p {
    margin: 0;
  }

  .pet-card__header p,
  .pet-card__notes,
  .pet-card__meta {
    color: var(--muted);
    line-height: 1.5;
  }

  .pet-card__actions {
    align-items: center;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .muted {
    margin: 0;
    color: var(--muted);
  }

  @media (max-width: 960px) {
    .split,
    .search-row {
      grid-template-columns: 1fr;
    }
  }
</style>
