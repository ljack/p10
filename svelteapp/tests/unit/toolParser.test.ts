import { describe, it, expect } from 'vitest';

// Extract and test the tool block parsing logic independently
interface ToolCall {
	name: string;
	attrs: Record<string, string>;
	body: string;
}

function parseToolBlocks(text: string): ToolCall[] {
	const toolRegex = /<tool:(\w+)((?:\s+\w+="[^"]*")*)(?:\s*\/>|>([\s\S]*?)<\/tool:\1>)/g;
	const results: ToolCall[] = [];

	let match;
	while ((match = toolRegex.exec(text)) !== null) {
		const name = match[1];
		const attrsStr = match[2];
		const body = match[3] || '';

		const attrs: Record<string, string> = {};
		const attrRegex = /(\w+)="([^"]*)"/g;
		let attrMatch;
		while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
			attrs[attrMatch[1]] = attrMatch[2];
		}

		results.push({ name, attrs, body });
	}

	return results;
}

describe('toolParser', () => {
	it('parses write_file with body', () => {
		const text = `<tool:write_file path="src/App.jsx">
const App = () => <div>Hello</div>;
export default App;
</tool:write_file>`;

		const tools = parseToolBlocks(text);
		expect(tools).toHaveLength(1);
		expect(tools[0].name).toBe('write_file');
		expect(tools[0].attrs.path).toBe('src/App.jsx');
		expect(tools[0].body).toContain('const App');
	});

	it('parses self-closing tags', () => {
		const text = '<tool:read_file path="package.json" />';
		const tools = parseToolBlocks(text);
		expect(tools).toHaveLength(1);
		expect(tools[0].name).toBe('read_file');
		expect(tools[0].attrs.path).toBe('package.json');
		expect(tools[0].body).toBe('');
	});

	it('parses run_command', () => {
		const text = '<tool:run_command command="npm install axios" />';
		const tools = parseToolBlocks(text);
		expect(tools).toHaveLength(1);
		expect(tools[0].name).toBe('run_command');
		expect(tools[0].attrs.command).toBe('npm install axios');
	});

	it('parses multiple tool blocks', () => {
		const text = `
I'll create two files.

<tool:write_file path="src/App.jsx">
function App() { return <div>App</div>; }
</tool:write_file>

<tool:write_file path="src/App.css">
.app { color: red; }
</tool:write_file>
`;
		const tools = parseToolBlocks(text);
		expect(tools).toHaveLength(2);
		expect(tools[0].attrs.path).toBe('src/App.jsx');
		expect(tools[1].attrs.path).toBe('src/App.css');
	});

	it('returns empty array for text without tool blocks', () => {
		const text = 'Just some regular text with no tools.';
		expect(parseToolBlocks(text)).toHaveLength(0);
	});

	it('handles tool blocks mixed with regular text', () => {
		const text = `Let me read the file first.
<tool:read_file path="src/App.jsx" />
Now I'll modify it.`;
		const tools = parseToolBlocks(text);
		expect(tools).toHaveLength(1);
	});
});
