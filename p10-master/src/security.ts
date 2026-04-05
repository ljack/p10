import type { SecurityCheck, RiskLevel } from './types.js';

/** Dangerous patterns that need human approval */
const CRITICAL_PATTERNS = [
	{ pattern: /rm\s+(-rf|-fr|--recursive)\s/i, reason: 'Recursive file deletion' },
	{ pattern: /sudo\s/i, reason: 'Superuser operation' },
	{ pattern: /chmod\s+777/i, reason: 'World-writable permissions' },
	{ pattern: />(\/etc|\/usr|\/sys|\/boot)\//i, reason: 'System file modification' },
	{ pattern: /npm\s+publish/i, reason: 'Package publishing' },
	{ pattern: /git\s+push\s+.*--force/i, reason: 'Force push to remote' },
	{ pattern: /git\s+reset\s+--hard/i, reason: 'Hard git reset' },
	{ pattern: /DROP\s+(TABLE|DATABASE)/i, reason: 'Database destruction' },
	{ pattern: /curl\s+.*\|\s*(bash|sh)/i, reason: 'Remote code execution' },
];

const HIGH_PATTERNS = [
	{ pattern: /rm\s+-/i, reason: 'File deletion with flags' },
	{ pattern: /git\s+push/i, reason: 'Push to remote' },
	{ pattern: /npm\s+install\s+-g/i, reason: 'Global package install' },
	{ pattern: /mkfs/i, reason: 'Filesystem format' },
];

const MEDIUM_PATTERNS = [
	{ pattern: /npm\s+install/i, reason: 'Package installation' },
	{ pattern: /git\s+commit/i, reason: 'Git commit' },
	{ pattern: /rm\s+/i, reason: 'File deletion' },
];

export function checkSecurity(operation: string, command?: string): SecurityCheck {
	const fullText = `${operation} ${command || ''}`;

	for (const { pattern, reason } of CRITICAL_PATTERNS) {
		if (pattern.test(fullText)) {
			return {
				operation,
				command,
				risk: 'critical',
				requiresApproval: true,
				reason: `🚨 CRITICAL: ${reason}`
			};
		}
	}

	for (const { pattern, reason } of HIGH_PATTERNS) {
		if (pattern.test(fullText)) {
			return {
				operation,
				command,
				risk: 'high',
				requiresApproval: true,
				reason: `⚠️ HIGH RISK: ${reason}`
			};
		}
	}

	for (const { pattern, reason } of MEDIUM_PATTERNS) {
		if (pattern.test(fullText)) {
			return {
				operation,
				command,
				risk: 'medium',
				requiresApproval: false,
				reason: `ℹ️ ${reason}`
			};
		}
	}

	return {
		operation,
		command,
		risk: 'low',
		requiresApproval: false,
		reason: 'Standard operation'
	};
}
