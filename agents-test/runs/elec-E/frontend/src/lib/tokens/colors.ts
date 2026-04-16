/**
 * Color design tokens
 */
export const colors = {
	primary: '#3b82f6',
	primaryDark: '#2563eb',
	secondary: '#8b5cf6',
	success: '#10b981',
	warning: '#f59e0b',
	danger: '#ef4444',
	background: '#ffffff',
	surface: '#f9fafb',
	text: '#111827',
	textSecondary: '#6b7280',
	border: '#e5e7eb'
} as const;

export type ColorToken = keyof typeof colors;
