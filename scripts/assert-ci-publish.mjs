#!/usr/bin/env node
/**
 * Refuses any publish that is not running in GitHub Actions.
 *
 * n8n has required an npm provenance attestation for verified community nodes
 * since 1 May 2026, and the attestation is signed against a short-lived OIDC
 * token that only CI can obtain. A publish from a laptop therefore succeeds and
 * looks entirely normal on npm — the failure surfaces days later as a rejection
 * from n8n's review queue, and npm will not let the version be republished, so
 * the only remedy is burning a version number.
 *
 * That is exactly how 0.3.0 shipped: it went out from a laptop thirteen seconds
 * before the tag reached CI, and the workflow that would have minted the
 * attestation died on "cannot publish over the previously published versions".
 *
 * Documenting "release from CI" was not enough, so this makes the wrong path
 * fail instead.
 */

// A dry run cannot reach the registry, so it has nothing to prove.
if (process.env.npm_config_dry_run === 'true') {
	process.exit(0);
}

if (process.env.GITHUB_ACTIONS === 'true') {
	process.exit(0);
}

console.error(
	[
		'',
		'Refusing to publish outside GitHub Actions.',
		'',
		'Verified n8n community nodes must carry an npm provenance attestation,',
		'and only a CI job can mint one. Publishing from here would produce a',
		'release that n8n rejects and that npm will not let you replace.',
		'',
		'Bump the version in a pull request, merge it, then release with:',
		'',
		'  npm run release',
		'',
		'which tags the merged commit and pushes the tag that triggers',
		'.github/workflows/publish.yml.',
		'',
	].join('\n'),
);

process.exit(1);
