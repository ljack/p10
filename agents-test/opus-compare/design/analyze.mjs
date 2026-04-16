#!/usr/bin/env node
/**
 * Objective design signals — deterministic, no LLM.
 * Usage:
 *   node analyze.mjs <build-name> <ui-url> <api-url> <build-dir>
 * Emits <build-dir>/design-objective.json and a screenshot.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../tests/node_modules/playwright-core/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const [,, buildName, uiUrl, apiUrl, buildDir] = process.argv;
if (!buildName || !uiUrl || !apiUrl || !buildDir) {
	console.error('usage: analyze.mjs <build-name> <ui-url> <api-url> <build-dir>');
	process.exit(1);
}
fs.mkdirSync(buildDir, { recursive: true });

const axeSource = fs.readFileSync(
	path.join(__dirname, '..', 'tests', 'node_modules', 'axe-core', 'axe.min.js'),
	'utf8',
);

function uniqueCount(values) {
	return new Set(values).size;
}

function gatherCssMetrics(css) {
	const rules = css.split('}').filter(Boolean);
	const colors = [];
	const fontSizes = [];
	const spacings = [];
	const zIndexes = [];
	const importants = (css.match(/!important/g) || []).length;

	for (const rule of rules) {
		for (const m of rule.matchAll(/#[0-9a-fA-F]{3,8}\b|rgb[a]?\([^)]+\)|hsl[a]?\([^)]+\)/g)) {
			colors.push(m[0].toLowerCase());
		}
		for (const m of rule.matchAll(/font-size\s*:\s*([^;]+);?/g)) fontSizes.push(m[1].trim());
		for (const m of rule.matchAll(/(margin|padding|gap)(-[a-z]+)?\s*:\s*([^;]+);?/g)) {
			for (const val of m[3].trim().split(/\s+/)) spacings.push(val);
		}
		for (const m of rule.matchAll(/z-index\s*:\s*(-?\d+)/g)) zIndexes.push(m[1]);
	}

	return {
		uniqueColors: uniqueCount(colors),
		colorSample: [...new Set(colors)].slice(0, 10),
		uniqueFontSizes: uniqueCount(fontSizes),
		fontSizeSample: [...new Set(fontSizes)].slice(0, 10),
		uniqueSpacings: uniqueCount(spacings),
		uniqueZIndexes: uniqueCount(zIndexes),
		importantCount: importants,
		rulesCount: rules.length,
		sizeBytes: css.length,
	};
}

function gatherHtmlMetrics(html) {
	const count = (re) => (html.match(re) || []).length;
	return {
		sizeBytes: html.length,
		headings: {
			h1: count(/<h1\b/gi),
			h2: count(/<h2\b/gi),
			h3: count(/<h3\b/gi),
		},
		landmarks: {
			main: count(/<main\b|role="main"/gi),
			header: count(/<header\b|role="banner"/gi),
			nav: count(/<nav\b|role="navigation"/gi),
			footer: count(/<footer\b|role="contentinfo"/gi),
		},
		inputsWithLabels: count(/aria-label=|<label\b/gi),
		buttons: count(/<button\b/gi),
		images: count(/<img\b/gi),
		imagesWithAlt: count(/<img\b[^>]*\balt=/gi),
		htmlLang: /<html[^>]+\blang=/i.test(html),
	};
}

async function main() {
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

	// Prime localStorage for both possible keys
	await page.addInitScript((url) => {
		try {
			localStorage.setItem('apiBase', url);
			localStorage.setItem('todo-ui:apiBase', url);
		} catch {}
	}, apiUrl);

	await page.goto(uiUrl, { waitUntil: 'networkidle' });

	// Screenshots — empty state
	await page.screenshot({ path: path.join(buildDir, 'screenshot-empty.png'), fullPage: true });

	// Seed one todo via API, reload, capture populated state
	await fetch(`${apiUrl}/todos`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ title: 'Sample todo for screenshot' }),
	}).catch(() => {});
	await page.reload({ waitUntil: 'networkidle' });
	await page.screenshot({ path: path.join(buildDir, 'screenshot-populated.png'), fullPage: true });

	// Axe run
	await page.addScriptTag({ content: axeSource });
	const axe = await page.evaluate(async () => {
		// eslint-disable-next-line no-undef
		return await axe.run(document, { resultTypes: ['violations', 'incomplete'] });
	});

	// Pull final HTML + linked CSS + linked JS
	const html = await page.content();
	const cssUrl = new URL('/styles.css', uiUrl).toString();
	const jsUrl = new URL('/app.js', uiUrl).toString();
	const cssText = await (await fetch(cssUrl)).text().catch(() => '');
	const jsText = await (await fetch(jsUrl)).text().catch(() => '');

	await browser.close();

	const cssMetrics = gatherCssMetrics(cssText);
	const htmlMetrics = gatherHtmlMetrics(html);

	const out = {
		build: buildName,
		uiUrl,
		apiUrl,
		timestamp: new Date().toISOString(),
		pageWeightBytes: {
			html: htmlMetrics.sizeBytes,
			css: cssMetrics.sizeBytes,
			js: jsText.length,
			total: htmlMetrics.sizeBytes + cssMetrics.sizeBytes + jsText.length,
		},
		html: htmlMetrics,
		css: cssMetrics,
		axe: {
			violations: axe.violations.length,
			bySeverity: axe.violations.reduce((acc, v) => {
				acc[v.impact || 'unknown'] = (acc[v.impact || 'unknown'] || 0) + 1;
				return acc;
			}, {}),
			topViolations: axe.violations.slice(0, 10).map((v) => ({
				id: v.id,
				impact: v.impact,
				help: v.help,
				helpUrl: v.helpUrl,
				nodes: v.nodes.map((n) => ({
					target: n.target,
					html: n.html,
					failureSummary: n.failureSummary,
				})),
			})),
			incomplete: axe.incomplete.length,
		},
	};

	fs.writeFileSync(path.join(buildDir, 'design-objective.json'), JSON.stringify(out, null, 2));
	console.log(`[${buildName}] axe violations=${out.axe.violations} page=${out.pageWeightBytes.total}B colors=${cssMetrics.uniqueColors} fontSizes=${cssMetrics.uniqueFontSizes}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
