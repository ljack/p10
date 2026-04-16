/**
 * Markdown-ish content formatter for chat messages.
 * Converts a subset of markdown to HTML for terminal-aesthetic display.
 */

export function formatContent(content: string): string {
	if (!content) return '';
	let html = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

	// Collapse 3 or more consecutive newlines (even with spaces/CRs between) into exactly 2 newlines
	html = html.replace(/\n(?:\s*\n){2,}/g, '\n\n');

	// Code blocks ```lang\ncode\n```
	html = html.replace(/(?:\n*)```(\w*)\n([\s\S]*?)```(?:\n*)/g, (_match, lang, code) => {
		const langLabel = lang
			? `<div class="text-xs text-muted px-3 py-1 border-b border-panel-border">${lang}</div>`
			: '';
		return `<div class="my-3 rounded bg-background border border-panel-border overflow-x-auto">${langLabel}<pre class="text-xs p-3 text-foreground"><code>${code}</code></pre></div>`;
	});

	// Inline code `text`
	html = html.replace(
		/`([^`]+)`/g,
		'<code class="bg-background text-accent px-1 py-0.5 rounded text-xs">$1</code>'
	);

	// Bold **text**
	html = html.replace(
		/\*\*([^*]+)\*\*/g,
		'<strong class="text-foreground font-bold">$1</strong>'
	);

	// Italic *text* (but not inside bold)
	html = html.replace(
		/(?<!\*)\*([^*]+)\*(?!\*)/g,
		'<em class="text-foreground italic">$1</em>'
	);

	// Headers ## text (only at line start)
	html = html.replace(
		/(?:\n*)^(#{1,3})\s+([^\n]+)(?:\n*)/gm,
		(_match, hashes, text) => {
			const level = hashes.length;
			const size = level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm';
			return `<div class="${size} font-bold text-accent mt-3 mb-2">${text}</div>`;
		}
	);

	// Horizontal Rule ---
	html = html.replace(
		/(?:\n*)^---$(?:\n*)/gm,
		'<div class="border-t border-panel-border my-4"></div>'
	);

	// Bullet lists - item or • item
	html = html.replace(
		/^[\-\•]\s+([^\n]+)(?:\n)?/gm,
		'<div class="pl-3">• $1</div>'
	);

	// Numbered lists 1. item
	html = html.replace(
		/^(\d+)\.\s+([^\n]+)(?:\n)?/gm,
		'<div class="pl-3">$1. $2</div>'
	);

	// Absorb exactly one newline before/after block elements to prevent double-spacing in pre-wrap
	html = html.replace(/\n(<div)/g, '$1');
	html = html.replace(/(<\/div>)\n/g, '$1');

	return html;
}
