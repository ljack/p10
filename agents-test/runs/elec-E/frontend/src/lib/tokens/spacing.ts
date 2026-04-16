/**
 * Spacing design tokens
 */
export const spacing = {
	xs: '0.25rem',
	sm: '0.5rem',
	md: '1rem',
	lg: '1.5rem',
	xl: '2rem',
	xxl: '3rem'
} as const;

export type SpacingToken = keyof typeof spacing;
