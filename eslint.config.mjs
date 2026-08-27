/**
 * Mirrors the ESLint config that `@n8n/scan-community-package` runs, which is the
 * gate n8n applies to a submitted node.
 *
 * This file exists because the two diverging is how 0.2.1 shipped with six
 * scanner errors while `npm run lint` was green: our config only registered
 * `eslint-plugin-n8n-nodes-base`, so every `@n8n/eslint-plugin-community-nodes`
 * rule — missing credential icon, missing `usableAsTool`, connection-type string
 * literals — was invisible locally. The scanner only fetches published packages,
 * so a mistake was not discoverable until after a release.
 *
 * Keep this in step with `buildScanConfig` in that package when it changes. Do
 * not silence a rule here to make a build pass: the scanner does not read this
 * file, so anything switched off is a failure deferred to n8n's review queue
 * rather than one avoided.
 */

import { defineConfig } from 'eslint/config';
import { n8nCommunityNodesPlugin } from '@n8n/eslint-plugin-community-nodes';
import n8nNodesPlugin from 'eslint-plugin-n8n-nodes-base';
import * as tsParser from '@typescript-eslint/parser';

const parser = tsParser.default ?? tsParser;

export default defineConfig(
	{
		ignores: ['dist/**', 'node_modules/**', 'package-lock.json', '*.config.mjs', 'gulpfile.js'],
	},

	n8nCommunityNodesPlugin.configs.recommended,

	{
		rules: { 'no-console': 'error' },
	},

	{ plugins: { 'n8n-nodes-base': n8nNodesPlugin } },

	{
		files: ['package.json'],
		rules: { ...n8nNodesPlugin.configs.community.rules },
	},

	{
		files: ['**/credentials/**/*.ts'],
		rules: {
			...n8nNodesPlugin.configs.credentials.rules,
			// Not valid for community nodes.
			'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
			// The community-nodes credential-password-field rule is more accurate.
			'n8n-nodes-base/cred-class-field-type-options-password-missing': 'off',
		},
	},

	{
		files: ['**/nodes/**/*.ts'],
		rules: {
			...n8nNodesPlugin.configs.nodes.rules,
			// Inputs and outputs are the NodeConnectionTypes enum, not the string 'main'.
			'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
			'n8n-nodes-base/node-class-description-outputs-wrong': 'off',
			// A third-party API may genuinely have a maximum, so maxValue is valid.
			'n8n-nodes-base/node-param-type-options-max-value-present': 'off',
		},
	},

	// package.json is linted by rules that walk a TSESTree ObjectExpression, which
	// the TypeScript parser produces for a top-level JSON object literal.
	{
		files: ['**/*.json'],
		languageOptions: { parser },
	},

	{
		files: ['**/*.ts'],
		languageOptions: { parser },
	},
);
