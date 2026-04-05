import { describe, it, expect } from 'vitest';

// Test the parseToolBlocks and stripToolBlocks from toolExecutor
// We re-implement here since the module imports Svelte stores

function parseToolBlocks(text: string) {
	const toolRegex =
		/<tool:(\w+)((?:\s+\w+="[^"]*")*)(?:\s*\/>|>([\s\S]*?)<\/tool:\1>)/g;
	const results: Array<{ name: string; attrs: Record<string, string>; body: string }> = [];
	let match;
	while ((match = toolRegex.exec(text)) !== null) {
		const attrs: Record<string, string> = {};
		const attrRegex = /(\w+)="([^"]*)"/g;
		let attrMatch;
		while ((attrMatch = attrRegex.exec(match[2])) !== null) {
			attrs[attrMatch[1]] = attrMatch[2];
		}
		results.push({ name: match[1], attrs, body: match[3] || '' });
	}
	return results;
}

describe('parseToolBlocks', () => {
	it('parses write_spec tool', () => {
		const text = '<tool:write_spec filename="IDEA.md">\n# My Idea\nBuild something cool\n</tool:write_spec>';
		const tools = parseToolBlocks(text);
		expect(tools).toHaveLength(1);
		expect(tools[0].name).toBe('write_spec');
		expect(tools[0].attrs.filename).toBe('IDEA.md');
		expect(tools[0].body).toContain('My Idea');
	});

	it('parses mixed tool types', () => {
		const text = `
<tool:write_file path="server/index.js">
const express = require('express');
</tool:write_file>

<tool:run_command command="npm install" />

<tool:read_file path="package.json" />
`;
		const tools = parseToolBlocks(text);
		expect(tools).toHaveLength(3);
		expect(tools[0].name).toBe('write_file');
		expect(tools[0].attrs.path).toBe('server/index.js');
		expect(tools[1].name).toBe('run_command');
		expect(tools[1].attrs.command).toBe('npm install');
		expect(tools[2].name).toBe('read_file');
	});
});

describe('_routes injection', () => {
	it('detects when _routes is missing from server code', () => {
		const serverCode = `
import express from 'express';
const app = express();
app.get('/api/todos', (req, res) => res.json([]));
app.listen(3001);
`;
		expect(serverCode.includes('_routes')).toBe(false);
	});

	it('detects when _routes is present', () => {
		const serverCode = `
app.get('/api/_routes', (req, res) => { res.json([]); });
app.listen(3001);
`;
		expect(serverCode.includes('_routes')).toBe(true);
	});

	it('strips agent-written _routes', () => {
		const code = `
app.get('/api/todos', handler);
app.get('/api/_routes', (req, res) => { res.json({ routes: ['GET /api/todos'] }); });
app.listen(3001);
`;
		const stripped = code.replace(/app\.get\(['"]\/?(api\/)?_routes['"][\s\S]*?\);\n/g, '');
		expect(stripped.includes('_routes')).toBe(false);
		expect(stripped.includes('todos')).toBe(true);
	});
});
