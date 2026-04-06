/**
 * Human-readable slug generator for mesh daemon IDs.
 * Produces memorable names like "swift-fox", "calm-owl", "bold-lynx".
 */

const ADJECTIVES = [
	'swift', 'calm', 'bold', 'keen', 'warm', 'cool', 'wild', 'wise',
	'fair', 'dark', 'pure', 'raw', 'dry', 'wet', 'odd', 'shy',
	'fast', 'slow', 'loud', 'soft', 'deep', 'flat', 'tall', 'thin',
	'rich', 'pale', 'dim', 'red', 'blue', 'gold', 'gray', 'jade',
	'neon', 'cozy', 'hazy', 'icy', 'lazy', 'zany', 'epic', 'tiny',
	'vast', 'mild', 'rare', 'tidy', 'wavy', 'fizzy', 'lucky', 'dusty',
];

const NOUNS = [
	'fox', 'owl', 'lynx', 'wolf', 'bear', 'hawk', 'crow', 'dove',
	'deer', 'hare', 'frog', 'moth', 'wasp', 'crab', 'seal', 'wren',
	'pike', 'mule', 'newt', 'swan', 'ibis', 'lark', 'puma', 'yak',
	'orca', 'tuna', 'bass', 'boar', 'goat', 'lamb', 'mink', 'vole',
	'kite', 'finch', 'crane', 'raven', 'otter', 'stoat', 'gecko', 'coral',
	'ember', 'spark', 'flint', 'storm', 'frost', 'blaze', 'comet', 'atlas',
];

export function generateSlug(): string {
	const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
	const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
	return `${adj}-${noun}`;
}
