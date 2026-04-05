/**
 * Markdown-ish content formatter for chat messages.
 * Converts a subset of markdown to HTML for terminal-aesthetic display.
 */

export function formatContent(content: string): string {
	if (!content) return '';
	let html = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

	// Code blocks ```lang\ncode\n```
	html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
		const langLabel = lang
			? `<div class="text-xs text-muted px-3 py-1 border-b border-panel-border">${lang}</div>`
			: '';
		return `<div class="my-2 rounded bg-background border border-panel-border overflow-x-auto">${langLabel}<pre class="text-xs p-3 text-foreground"><code>${code}</code></pre></div>`;
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
		/^(#{1,3})\s+(.+)$/gm,
		(_match, hashes, text) => {
			const level = hashes.length;
			const size = level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm';
			return `<div class="${size} font-bold text-foreground mt-2 mb-1">${text}</div>`;
		}
	);

	// Bullet lists - item or • item
	html = html.replace(
		/^[\-\•]\s+(.+)$/gm,
		'<div class="pl-3">• $1</div>'
	);

	// Numbered lists 1. item
	html = html.replace(
		/^(\d+)\.\s+(.+)$/gm,
		'<div class="pl-3">$1. $2</div>'
	);

	return html;
}
