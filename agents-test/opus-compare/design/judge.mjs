#!/usr/bin/env node
/**
 * LLM design judge — neutral third-party model scores the build against rubric.md.
 *
 * Usage: node judge.mjs <build-name> <build-dir>
 * Input: <build-dir>/screenshot-empty.png, screenshot-populated.png, design-objective.json
 *        + the original source: index.html, styles.css, app.js from the run dir
 * Output: <build-dir>/design-rubric.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const [,, buildName, buildDir, sourceDir] = process.argv;
if (!buildName || !buildDir || !sourceDir) {
	console.error('usage: judge.mjs <build-name> <build-dir> <source-dir>');
	process.exit(1);
}

const rubric = fs.readFileSync(path.join(__dirname, 'rubric.md'), 'utf8');
const objective = fs.readFileSync(path.join(buildDir, 'design-objective.json'), 'utf8');
const html = fs.readFileSync(path.join(sourceDir, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(sourceDir, 'styles.css'), 'utf8');

const promptPath = path.join(buildDir, 'judge-prompt.md');
const outPath = path.join(buildDir, 'design-rubric.json');
const rawPath = path.join(buildDir, 'design-rubric.raw.txt');

const prompt = `You are a neutral UI/UX reviewer. Score this build against the rubric below.

Return ONLY a single JSON object matching the schema at the bottom of the rubric. No prose, no markdown fences, no comments. Every leaf \`score\` MUST be an integer 1..5.

# Build
- name: ${buildName}

# Rubric
${rubric}

# Evidence: objective metrics (deterministic)
\`\`\`json
${objective}
\`\`\`

# Evidence: index.html
\`\`\`html
${html}
\`\`\`

# Evidence: styles.css (first 8KB)
\`\`\`css
${css.slice(0, 8000)}
\`\`\`

Attached images: empty-state screenshot and populated-state screenshot.

Now produce the JSON object:`;

fs.writeFileSync(promptPath, prompt);

// Call gpt-5.4 via pi
// Use pi with a short system prompt enforcing JSON-only output, no tools needed
const sessionDir = path.join(buildDir, 'judge-session');
fs.mkdirSync(sessionDir, { recursive: true });

const emptyImg = path.join(buildDir, 'screenshot-empty.png');
const popImg = path.join(buildDir, 'screenshot-populated.png');

const systemPrompt = 'You are a strict JSON generator. Reply with ONE JSON object only. No prose, no markdown fences. The object must match the schema described in the user prompt exactly.';

console.log(`[${buildName}] calling judge model...`);
const start = Date.now();

try {
	const res = execSync(
		`pi -p --mode text --model openai/gpt-5.4 --no-context-files --no-extensions --no-skills --no-prompt-templates --no-tools --system-prompt ${JSON.stringify(systemPrompt)} --session-dir ${JSON.stringify(sessionDir)} @${JSON.stringify(emptyImg)} @${JSON.stringify(popImg)} @${JSON.stringify(promptPath)}`,
		{ encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: 180_000 },
	);
	fs.writeFileSync(rawPath, res);
	console.log(`[${buildName}] judge returned ${res.length} chars in ${((Date.now() - start) / 1000).toFixed(1)}s`);

	// Extract JSON object
	const m = res.match(/\{[\s\S]*\}/);
	if (!m) throw new Error('no JSON object found in judge output');
	const parsed = JSON.parse(m[0]);
	fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2));
	// Compute averages
	function sumLeaves(obj) {
		const scores = [];
		(function walk(o) {
			for (const [k, v] of Object.entries(o)) {
				if (v && typeof v === 'object' && typeof v.score === 'number') scores.push(v.score);
				else if (v && typeof v === 'object' && !Array.isArray(v)) walk(v);
			}
		})(obj);
		return { count: scores.length, avg: scores.reduce((a, b) => a + b, 0) / scores.length };
	}
	const nielsen = sumLeaves(parsed.scores?.nielsen || {});
	const gestalt = sumLeaves(parsed.scores?.gestalt || {});
	const overall = sumLeaves(parsed.scores || {});
	console.log(`[${buildName}] nielsen avg=${nielsen.avg.toFixed(2)} gestalt avg=${gestalt.avg.toFixed(2)} overall avg=${overall.avg.toFixed(2)} (n=${overall.count})`);
} catch (err) {
	console.error(`[${buildName}] judge failed:`, err.message.slice(0, 500));
	process.exit(1);
}
