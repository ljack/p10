import type { DeviceType } from '$lib/types';

export const DEVICE_TYPES: DeviceType[] = [
	'lighting',
	'heating',
	'cooling',
	'appliance',
	'electronics',
	'other'
];

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function currentYearMonth(): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	return `${year}-${month}`;
}

export function toDatetimeLocalValue(input = new Date()): string {
	const date = new Date(input.getTime() - input.getTimezoneOffset() * 60_000);
	return date.toISOString().slice(0, 16);
}

export function formatKwh(value: number): string {
	return `${value.toFixed(2)} kWh`;
}

export function formatCurrency(value: number): string {
	return new Intl.NumberFormat('fi-FI', {
		style: 'currency',
		currency: 'EUR',
		maximumFractionDigits: 2
	}).format(value);
}

export function formatPercent(value: number): string {
	return `${value.toFixed(1)}%`;
}

export function formatDateTime(value: string): string {
	return new Intl.DateTimeFormat('fi-FI', {
		dateStyle: 'medium',
		timeStyle: 'short'
	}).format(new Date(value));
}

export function formatDate(value: string): string {
	return new Intl.DateTimeFormat('fi-FI', {
		dateStyle: 'medium'
	}).format(new Date(value));
}

export function formatTime(value: string): string {
	return value.slice(0, 5);
}

export function humanizeDeviceType(type: DeviceType): string {
	return type.charAt(0).toUpperCase() + type.slice(1);
}

export function monthLabel(yearMonth: string): string {
	const [year, month] = yearMonth.split('-').map(Number);
	return new Intl.DateTimeFormat('fi-FI', {
		month: 'long',
		year: 'numeric'
	}).format(new Date(year, month - 1, 1));
}

export function dayValueLabel(value: string): string {
	return new Intl.DateTimeFormat('fi-FI', {
		month: 'numeric',
		day: 'numeric'
	}).format(new Date(value));
}
