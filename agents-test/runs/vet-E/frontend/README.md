# Vet Appointment Frontend

## Architecture

This frontend is built with **Svelte 5** and **SvelteKit**, following best practices for modern web applications.

### Planned Structure (AGENTS.md Compliance)

```
frontend/src/
├── lib/
│   ├── atoms/           # Atomic Design - smallest components
│   │   ├── Button.svelte
│   │   ├── Input.svelte
│   │   └── Label.svelte
│   │
│   ├── molecules/       # Combinations of atoms
│   │   ├── FormField.svelte
│   │   ├── SearchBar.svelte
│   │   └── StatusBadge.svelte
│   │
│   ├── organisms/       # Complex components
│   │   ├── PetForm.svelte
│   │   ├── AppointmentCard.svelte
│   │   └── Calendar.svelte
│   │
│   ├── templates/       # Page layouts
│   │   ├── MainLayout.svelte
│   │   └── DashboardLayout.svelte
│   │
│   ├── machines/        # XState finite state machines
│   │   ├── appointmentMachine.ts
│   │   └── petFormMachine.ts
│   │
│   ├── services/        # API clients
│   │   ├── api.ts
│   │   ├── pets.ts
│   │   ├── treatments.ts
│   │   └── appointments.ts
│   │
│   ├── stores/          # Svelte stores
│   │   └── auth.ts
│   │
│   ├── i18n/            # Internationalization
│   │   ├── en.json
│   │   └── translations.ts
│   │
│   └── tokens/          # Design tokens
│       ├── colors.ts
│       ├── spacing.ts
│       └── typography.ts
│
├── routes/              # SvelteKit pages
│   ├── +layout.svelte
│   ├── +page.svelte     # Dashboard
│   ├── pets/
│   │   ├── +page.svelte
│   │   └── [id]/+page.svelte
│   ├── treatments/
│   │   └── +page.svelte
│   └── appointments/
│       ├── +page.svelte
│       └── book/+page.svelte
│
└── app.html             # HTML template
```

## Setup

```bash
npm install
npm run dev
```

Application runs on http://localhost:5173

## Features (Planned)

### Pages
1. **Dashboard** (`/`) - Today's appointments, quick stats
2. **Pets** (`/pets`) - List, search, add/edit pet
3. **Treatments** (`/treatments`) - List, manage treatments
4. **Appointments** (`/appointments`) - Calendar/list view with filters
5. **Book Appointment** (`/appointments/book`) - Multi-step booking flow

### State Management
- **XState** for complex flows (appointment booking, form wizards)
- **Svelte Stores** for global state (user, selected items)
- **Page-level state** for simple components

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Focus management
- ARIA labels

### Design System
- Design tokens for colors, spacing, typography
- Consistent component library
- Responsive design (mobile-first)
- Dark mode support (optional)

## API Integration

All API calls go through service layer:

```typescript
// lib/services/pets.ts
export async function getPets(ownerName?: string) {
  const params = ownerName ? `?owner_name=${ownerName}` : '';
  const response = await fetch(`/api/v1/pets${params}`);
  return response.json();
}
```

Proxy configuration in `vite.config.js` routes `/api/*` to backend (port 8000).

## AGENTS.md Requirements vs Implementation

### ✅ Planned (Not Yet Implemented)
- Atomic Design pattern
- XState for state machines
- Storybook stories
- WCAG 2.1 AA compliance
- i18n ready
- Design tokens

### Current Status
This is a **structural foundation** with:
- SvelteKit configuration
- Vite build setup
- API proxy configuration
- TypeScript support
- Basic project structure

### To Implement for Full Compliance

1. **Component Library** (~20 hours)
   - Atoms: Button, Input, Label, Icon, etc.
   - Molecules: FormField, SearchBar, Card, etc.
   - Organisms: PetForm, AppointmentCalendar, etc.
   - Templates: Layouts with slots

2. **State Machines** (~10 hours)
   - Appointment booking flow
   - Form wizard flows
   - Data fetching states

3. **Pages** (~15 hours)
   - Dashboard with stats
   - Pet management (CRUD)
   - Treatment management
   - Appointment booking (multi-step)
   - Calendar view

4. **Storybook** (~8 hours)
   - Setup Storybook
   - Stories for all components
   - Documentation
   - Accessibility tests

5. **Accessibility** (~12 hours)
   - WCAG 2.1 AA audit
   - Keyboard navigation
   - Screen reader testing
   - ARIA implementation
   - Focus management

6. **i18n** (~5 hours)
   - Translation setup
   - Language switcher
   - RTL support prep

7. **Design System** (~10 hours)
   - Design tokens
   - Theme provider
   - CSS architecture
   - Documentation

**Total**: ~80 hours for full frontend implementation

## Development Guide

### Adding a New Page

```bash
# Create route directory
mkdir src/routes/my-page

# Create page component
cat > src/routes/my-page/+page.svelte << 'EOF'
<script lang="ts">
  // Page logic
</script>

<h1>My Page</h1>
EOF
```

### Creating a Component (Atomic Design)

```svelte
<!-- lib/atoms/Button.svelte -->
<script lang="ts">
  export let variant: 'primary' | 'secondary' = 'primary';
  export let disabled = false;
</script>

<button
  class="btn btn-{variant}"
  {disabled}
  on:click
>
  <slot />
</button>

<style>
  /* Using design tokens */
  .btn {
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--font-size-base);
    border-radius: var(--radius-md);
  }

  .btn-primary {
    background: var(--color-primary);
    color: var(--color-on-primary);
  }
</style>
```

### Using XState

```typescript
// lib/machines/bookingMachine.ts
import { createMachine } from 'xstate';

export const bookingMachine = createMachine({
  id: 'booking',
  initial: 'selectPet',
  states: {
    selectPet: {
      on: { SELECT: 'selectTreatment' }
    },
    selectTreatment: {
      on: {
        SELECT: 'selectSlot',
        BACK: 'selectPet'
      }
    },
    selectSlot: {
      on: {
        SELECT: 'confirm',
        BACK: 'selectTreatment'
      }
    },
    confirm: {
      on: {
        SUBMIT: 'submitting',
        BACK: 'selectSlot'
      }
    },
    submitting: {
      on: {
        SUCCESS: 'success',
        ERROR: 'error'
      }
    },
    success: { type: 'final' },
    error: {
      on: { RETRY: 'selectSlot' }
    }
  }
});
```

## Tech Stack

- **Svelte 5** - Reactivity with runes
- **SvelteKit** - Full-stack framework
- **TypeScript** - Type safety
- **XState** - State machines
- **Vite** - Build tool and dev server

## Build & Deploy

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Testing (To Be Implemented)

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Accessibility tests
npm run test:a11y
```

## License

MIT
