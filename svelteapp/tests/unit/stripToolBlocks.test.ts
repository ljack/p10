import { describe, it, expect } from 'vitest';

/** Same logic as ChatPanel streaming display */
function stripToolBlocks(text: string): string {
	return text
		// Strip complete tool blocks
		.replace(/<tool:\w+(?:\s+\w+="[^"]*")*(?:\s*\/>|>[\s\S]*?<\/tool:\w+>)/g, '')
		// Strip incomplete/partial tool blocks (still streaming)
		.replace(/<tool:\w+(?:\s+\w+="[^"]*")*>[\s\S]*$/g, '')
		// Strip partial opening tag
		.replace(/<tool:[^>]*$/g, '')
		.trim();
}

describe('stripToolBlocks', () => {
	it('strips complete write_file block', () => {
		const text = 'I will create the file.\n<tool:write_file path="src/App.jsx">\nconst App = () => {};\n</tool:write_file>\nDone!';
		expect(stripToolBlocks(text)).toBe('I will create the file.\n\nDone!');
	});

	it('strips self-closing tags', () => {
		const text = 'Let me read it.\n<tool:read_file path="src/App.jsx" />\nHere it is.';
		expect(stripToolBlocks(text)).toBe('Let me read it.\n\nHere it is.');
	});

	it('strips incomplete tool block mid-stream', () => {
		const text = 'Creating the file:\n<tool:write_file path="src/App.css">\n* { margin: 0; }\nbody { color: red; }';
		expect(stripToolBlocks(text)).toBe('Creating the file:');
	});

	it('strips partial opening tag mid-stream', () => {
		const text = 'Here we go\n<tool:write_fi';
		expect(stripToolBlocks(text)).toBe('Here we go');
	});

	it('strips partial tag with attributes', () => {
		const text = 'Creating\n<tool:write_file path="src/App.jsx"';
		expect(stripToolBlocks(text)).toBe('Creating');
	});

	it('preserves text without tool blocks', () => {
		const text = 'Just normal text with no tools.';
		expect(stripToolBlocks(text)).toBe('Just normal text with no tools.');
	});

	it('handles multiple complete blocks', () => {
		const text = 'A\n<tool:write_file path="a.js">code1</tool:write_file>\nB\n<tool:write_file path="b.js">code2</tool:write_file>\nC';
		expect(stripToolBlocks(text)).toBe('A\n\nB\n\nC');
	});

	it('handles complete blocks followed by incomplete', () => {
		const text = 'A\n<tool:write_file path="a.js">done</tool:write_file>\nB\n<tool:write_file path="b.js">still streaming...';
		expect(stripToolBlocks(text)).toBe('A\n\nB');
	});
});
