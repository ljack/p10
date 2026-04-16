import type { AppointmentStatus, Species } from '$lib/types';

export const speciesOptions: Species[] = ['dog', 'cat', 'bird', 'rabbit', 'other'];
export const appointmentStatusOptions: AppointmentStatus[] = [
  'scheduled',
  'in-progress',
  'completed',
  'cancelled'
];

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric'
});

const fullDateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric'
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit'
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

function pad(value: number): string {
  return `${value}`.padStart(2, '0');
}

export function toDateInputValue(value: Date | string = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toDateTimeLocalValue(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${toDateInputValue(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function nextClinicDateValue(base: Date = new Date()): string {
  const candidate = new Date(base);
  while (candidate.getDay() === 0 || candidate.getDay() === 6) {
    candidate.setDate(candidate.getDate() + 1);
  }
  return toDateInputValue(candidate);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return fullDateFormatter.format(date);
}

export function formatShortDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return dateFormatter.format(date);
}

export function formatTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return timeFormatter.format(date);
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return dateTimeFormatter.format(date);
}

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function titleCase(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function dateRangeAround(day: string, span = 5): string[] {
  const anchor = new Date(`${day}T12:00:00`);
  const dates: string[] = [];

  for (let offset = -Math.floor(span / 2); offset <= Math.floor(span / 2); offset += 1) {
    const candidate = new Date(anchor);
    candidate.setDate(anchor.getDate() + offset);
    dates.push(toDateInputValue(candidate));
  }

  return dates;
}
