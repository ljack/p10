import { describe, it, expect } from 'vitest';

// Import the formatContent function from the ChatPanel module script
// Since it's in a .svelte file's module context, we replicate it here
function formatContent(content: string): string {
	if (!content) return '';
	let html = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

	html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
		const langLabel = lang
			? `<div class="text-xs text-muted px-3 py-1 border-b border-panel-border">${lang}</div>`
			: '';
		return `<div class="my-2 rounded bg-background border border-panel-border overflow-x-auto">${langLabel}<pre class="text-xs p-3 text-foreground"><code>${code}</code></pre></div>`;
	});

	html = html.replace(
		/`([^`]+)`/g,
		'<code class="bg-background text-accent px-1 py-0.5 rounded text-xs">$1</code>'
	);

	html = html.replace(
		/\*\*([^*]+)\*\*/g,
		'<strong class="text-foreground font-bold">$1</strong>'
	);

	return html;
}

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
});
