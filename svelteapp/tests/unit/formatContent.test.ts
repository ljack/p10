import { describe, it, expect } from 'vitest';
import { formatContent } from '../../src/lib/agent/formatContent';

describe('formatContent', () => {
	it('returns empty string for empty input', () => {
		expect(formatContent('')).toBe('');
	});

	it('escapes HTML entities', () => {
		expect(formatContent('<script>')).toContain('&lt;script&gt;');
	});

	it('renders inline code', () => {
		const result = formatContent('use `npm install`');
		expect(result).toContain('<code');
		expect(result).toContain('npm install');
	});

	it('renders bold text', () => {
		const result = formatContent('this is **bold**');
		expect(result).toContain('<strong');
		expect(result).toContain('bold');
	});

	it('renders code blocks with language', () => {
		const result = formatContent('```javascript\nconst x = 1;\n```');
		expect(result).toContain('<pre');
		expect(result).toContain('const x = 1;');
		expect(result).toContain('javascript');
	});

	it('renders code blocks without language', () => {
		const result = formatContent('```\nhello\n```');
		expect(result).toContain('<pre');
		expect(result).toContain('hello');
	});

	it('handles mixed formatting', () => {
		const result = formatContent('**bold** and `code` together');
		expect(result).toContain('<strong');
		expect(result).toContain('<code');
	});

	it('renders italic text', () => {
		const result = formatContent('this is *italic*');
		expect(result).toContain('<em');
		expect(result).toContain('italic');
	});

	it('renders headers', () => {
		const result = formatContent('## My Header');
		expect(result).toContain('My Header');
		expect(result).toContain('font-bold');
	});

	it('renders bullet lists', () => {
		const result = formatContent('- Item one\n- Item two');
		expect(result).toContain('• Item one');
		expect(result).toContain('• Item two');
	});

	it('renders numbered lists', () => {
		const result = formatContent('1. First\n2. Second');
		expect(result).toContain('1. First');
		expect(result).toContain('2. Second');
	});
});
