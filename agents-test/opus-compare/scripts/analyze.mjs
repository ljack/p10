#!/usr/bin/env node
/**
 * Analyze a pi JSON stream + run artifacts.
 * Usage: node analyze.mjs <run-dir>
 * Emits <run-dir>/metrics.json and prints a one-line summary.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const runDir = process.argv[2];
if (!runDir) {
	console.error('usage: analyze.mjs <run-dir>');
	process.exit(1);
}

const streamPath = path.join(runDir, 'stream.jsonl');
const metaPath = path.join(runDir, 'run-meta.json');
const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {};

// Parse JSONL stream
const lines = fs.existsSync(streamPath)
	? fs.readFileSync(streamPath, 'utf8').split('\n').filter(Boolean)
	: [];

let turns = 0;
let toolCalls = 0;
const toolCounts = {};
let errorMessages = 0;
let finalUsage = null;
let messageEnds = 0;

// Track per-message incremental usage (sum message_end usages that aren't cumulative)
// pi actually emits cumulative-per-message usage inside message_update, and a
// final usage on message_end. The simplest & most accurate metric:
// sum the message_end usage across all assistant messages.
let sumInput = 0, sumOutput = 0, sumCacheRead = 0, sumCacheWrite = 0;
let sumCostInput = 0, sumCostOutput = 0, sumCostCacheRead = 0, sumCostCacheWrite = 0;

for (const line of lines) {
	let ev;
	try { ev = JSON.parse(line); } catch { continue; }
	if (ev.type === 'turn_start') turns++;
	if (ev.type === 'message_end' && ev.message?.role === 'assistant') {
		messageEnds++;
		const u = ev.message.usage;
		if (u) {
			sumInput += u.input || 0;
			sumOutput += u.output || 0;
			sumCacheRead += u.cacheRead || 0;
			sumCacheWrite += u.cacheWrite || 0;
			if (u.cost) {
				sumCostInput += u.cost.input || 0;
				sumCostOutput += u.cost.output || 0;
				sumCostCacheRead += u.cost.cacheRead || 0;
				sumCostCacheWrite += u.cost.cacheWrite || 0;
			}
			finalUsage = u;
		}
		if (ev.message.stopReason === 'error') errorMessages++;
	}
	// Count tool use blocks
	const content = ev.message?.content || ev.assistantMessageEvent?.partial?.content;
	if (Array.isArray(content)) {
		for (const c of content) {
			if (c.type === 'tool_use' && ev.type === 'message_end') {
				toolCalls++;
				toolCounts[c.name] = (toolCounts[c.name] || 0) + 1;
			}
		}
	}
}

// Inspect filesystem artifacts produced
function walk(dir, skip = /node_modules|\.git|session/) {
	const out = [];
	if (!fs.existsSync(dir)) return out;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (skip.test(entry.name)) continue;
		const p = path.join(dir, entry.name);
		if (entry.isDirectory()) out.push(...walk(p, skip));
		else out.push(p);
	}
	return out;
}
const files = walk(runDir)
	.filter((f) => !f.endsWith('stream.jsonl') && !f.endsWith('stderr.log') && !f.endsWith('run-meta.json') && !f.endsWith('metrics.json'));

let totalLoc = 0;
for (const f of files) {
	try {
		const text = fs.readFileSync(f, 'utf8');
		totalLoc += text.split('\n').length;
	} catch { /* binary */ }
}

// Attempt to run tests (optional)
let testResult = null;
const pkgPath = path.join(runDir, 'package.json');
if (fs.existsSync(pkgPath)) {
	try {
		execSync('npm install --silent --no-audit --no-fund', { cwd: runDir, stdio: 'pipe', timeout: 120_000 });
		const out = execSync('npm test --silent -- --ci 2>&1 || true', {
			cwd: runDir, encoding: 'utf8', timeout: 120_000,
		});
		fs.writeFileSync(path.join(runDir, 'test-output.log'), out);
		const tests = out.match(/Tests:\s+([^\n]+)/)?.[1] || 'unknown';
		const passed = /PASS\s+/.test(out) || /Tests:.*\d+ passed/.test(out);
		const failed = /FAIL\s+/.test(out) || /Tests:.*\d+ failed/.test(out);
		testResult = { summary: tests.trim(), passed, failed };
	} catch (err) {
		testResult = { error: String(err).slice(0, 300) };
	}
}

const metrics = {
	meta,
	turns,
	messageEnds,
	toolCalls,
	toolCounts,
	errorMessages,
	tokens: {
		input: sumInput,
		output: sumOutput,
		cacheRead: sumCacheRead,
		cacheWrite: sumCacheWrite,
		total: sumInput + sumOutput + sumCacheRead + sumCacheWrite,
	},
	cost: {
		input: sumCostInput,
		output: sumCostOutput,
		cacheRead: sumCostCacheRead,
		cacheWrite: sumCostCacheWrite,
		total: sumCostInput + sumCostOutput + sumCostCacheRead + sumCostCacheWrite,
	},
	files: files.map((f) => path.relative(runDir, f)),
	totalLoc,
	testResult,
};

fs.writeFileSync(path.join(runDir, 'metrics.json'), JSON.stringify(metrics, null, 2));

const oneLine = `[${path.basename(runDir)}] ${meta.durationSec ?? '?'}s · ${turns} turns · ${toolCalls} tools · ${(sumInput + sumOutput).toLocaleString()} io-tokens · $${metrics.cost.total.toFixed(4)} · ${metrics.files.length} files · ${totalLoc} LOC · tests: ${testResult?.summary || testResult?.error?.slice(0,40) || 'n/a'}`;
console.log(oneLine);
