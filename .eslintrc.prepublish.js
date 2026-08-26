module.exports = {
	extends: './.eslintrc.js',

	overrides: [
		{
			files: ['package.json'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			rules: {
				'n8n-nodes-base/community-package-json-name-still-default': 'error',
			},
		},
		{
			files: ['./credentials/**/*.ts'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			rules: {
				'n8n-nodes-base/cred-class-field-documentation-url-missing': 'error',
				// The casing rule expects an n8n-internal docs slug. A community package
				// points at its own documentation site, where the path is kebab-case.
				'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
			},
		},
		{
			files: ['./nodes/**/*.ts'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			rules: {
				'n8n-nodes-base/node-param-description-missing-final-period': 'error',
				'n8n-nodes-base/node-param-description-weak': 'error',
			},
		},
	],
};
