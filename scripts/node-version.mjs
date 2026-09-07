#!/usr/bin/env node
/**
 * Keeps `NODE_VERSION` in the node source in step with package.json.
 *
 * The constant is sent as X-MCP-Studio-Partner-Version on every request, and it
 * is read separately from package.json, so a stale value never fails a build —
 * it quietly attributes a release's activations to the previous one.
 *
 * `--check` only reports, and runs in CI so the pull request that bumps the
 * version is where a mismatch surfaces rather than the release. Run as npm's
 * `version` lifecycle hook it rewrites and stages the file instead.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const NODE_FILE = 'nodes/McpStudio/McpStudio.node.ts';
const DECLARATION = /(const NODE_VERSION = ')([^']+)(';)/;

const expected = JSON.parse(readFileSync('package.json', 'utf8')).version;
const source = readFileSync(NODE_FILE, 'utf8');
const declaration = source.match(DECLARATION);

if (!declaration) {
	console.error(`No NODE_VERSION declaration found in ${NODE_FILE}.`);
	process.exit(1);
}

const current = declaration[2];

if (process.argv.includes('--check')) {
	if (current !== expected) {
		console.error(`NODE_VERSION is ${current} but package.json says ${expected}.`);
		process.exit(1);
	}
	console.log(`NODE_VERSION matches package.json (${expected}).`);
	process.exit(0);
}

if (current !== expected) {
	writeFileSync(NODE_FILE, source.replace(DECLARATION, `$1${expected}$3`));
	console.log(`NODE_VERSION ${current} -> ${expected}`);
}

// `npm version` commits whatever is staged when the hook returns, so an
// unstaged rewrite would be left behind as a dirty tree after the tag is cut.
if (process.env.npm_lifecycle_event === 'version') {
	execFileSync('git', ['add', NODE_FILE], { stdio: 'inherit' });
}
