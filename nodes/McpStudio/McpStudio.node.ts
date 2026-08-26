import type { INodeType, INodeTypeDescription } from 'n8n-workflow';

/**
 * Kept in step with the version in package.json. Sent on every request so MCP
 * Studio can attribute activation and conversion to a specific node release,
 * which is what makes a regression in one version visible.
 */
const NODE_VERSION = '0.1.0';

const SOURCE_TYPE_OPTIONS = [
	{ name: 'Auto-Detect', value: '' },
	{ name: 'API Reference', value: 'api' },
	{ name: 'Documentation Site', value: 'docs' },
	{ name: 'GitHub Repository', value: 'github' },
	{ name: 'MCP Server', value: 'mcp' },
	{ name: 'Website', value: 'website' },
];

const TOOL_OPTIONS = [
	{ name: 'Ask Question', value: 'ask_question', description: 'Answer a natural language question from the indexed sources' },
	{ name: 'Extract Schema', value: 'extract_schema', description: 'Return a type or schema definition' },
	{ name: 'Find API Reference', value: 'find_api_reference', description: 'Look up a specific API or method' },
	{ name: 'Get Changelog', value: 'get_changelog', description: 'Return release notes or version history' },
	{ name: 'Get Code Examples', value: 'get_code_examples', description: 'Return code snippets for a topic' },
	{ name: 'Get Quickstart', value: 'get_quickstart', description: 'Return getting-started instructions' },
	{ name: 'Query Source', value: 'query_source', description: 'Ask a question against one specific source URL' },
	{ name: 'Search Docs', value: 'search_docs', description: 'Full-text and semantic search across every source' },
	{ name: 'Search Issues', value: 'search_issues', description: 'Search issues and error reports' },
	{ name: 'Summarize Content', value: 'summarize_content', description: 'Summarize a source URL' },
];

export class McpStudio implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'MCP Studio',
		name: 'mcpStudio',
		icon: 'file:mcpStudio.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create and manage MCP Studio servers that turn documentation into a live MCP endpoint',
		defaults: {
			name: 'MCP Studio',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mcpStudioApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				'Content-Type': 'application/json',
				'X-MCP-Studio-Partner': 'n8n',
				'X-MCP-Studio-Partner-Version': NODE_VERSION,
			},
		},
		properties: [
			{
				displayName:
					'This node needs a free MCP Studio account. Create one at <a href="https://appatools.com/mcp-studio?utm_source=n8n&utm_medium=integration" target="_blank">appatools.com/mcp-studio</a>, then add an API key credential above.',
				name: 'setupNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Server', value: 'server' },
					{ name: 'Source', value: 'source' },
				],
				default: 'server',
			},

			// ─── Server ────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['server'] } },
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create an MCP server',
						description: 'Create a server, index its sources, and return the live MCP endpoint',
						routing: {
							request: {
								method: 'POST',
								url: '/api/mcp/create',
								body: {
									name: '={{$parameter["name"]}}',
									description: '={{$parameter["additionalFields"]["description"] || undefined}}',
									sources: '={{$parameter["sources"]["source"]}}',
									tools: '={{$parameter["tools"]}}',
								},
							},
						},
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete an MCP server',
						description: 'Soft-delete a server, keeping it restorable for 7 days',
						routing: {
							request: {
								method: 'DELETE',
								url: '=/api/mcp/{{$parameter["serverId"]}}',
							},
						},
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get an MCP server',
						description: 'Return a server with its indexing progress, endpoint URL, and client config snippet',
						routing: {
							request: {
								method: 'GET',
								url: '=/api/mcp/{{$parameter["serverId"]}}',
							},
						},
					},
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many MCP servers',
						description: 'List every server on the account',
						routing: {
							request: {
								method: 'GET',
								url: '/api/mcp/list',
							},
						},
					},
					{
						name: 'Refresh',
						value: 'refresh',
						action: 'Refresh an MCP server',
						description: 'Queue a re-index so the server picks up changed source content',
						routing: {
							request: {
								method: 'POST',
								url: '/api/mcp/crawl',
								body: {
									serverId: '={{$parameter["serverId"]}}',
									sourceId: '={{$parameter["refreshOptions"]["sourceId"] || undefined}}',
								},
							},
						},
					},
				],
				default: 'create',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'Product Docs',
				description: 'Name for the new MCP server. Also used to derive its public slug.',
				displayOptions: { show: { resource: ['server'], operation: ['create'] } },
			},
			{
				displayName: 'Sources',
				name: 'sources',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				placeholder: 'Add Source',
				description:
					'Documentation URLs, GitHub repositories, or websites to index. The free tier allows 2 sources per server, or 5 on your first server during the trial.',
				displayOptions: { show: { resource: ['server'], operation: ['create'] } },
				options: [
					{
						displayName: 'Source',
						name: 'source',
						values: [
							{
								displayName: 'URL',
								name: 'url',
								type: 'string',
								default: '',
								required: true,
								placeholder: 'https://docs.example.com',
								description: 'HTTP or HTTPS URL to crawl and index',
							},
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: SOURCE_TYPE_OPTIONS,
								default: '',
								description: 'Leave on auto-detect unless the URL is misclassified',
							},
							{
								displayName: 'Label',
								name: 'label',
								type: 'string',
								default: '',
								description: 'Human-readable name shown in the MCP Studio dashboard',
							},
						],
					},
				],
			},
			{
				displayName: 'Tools',
				name: 'tools',
				type: 'multiOptions',
				options: TOOL_OPTIONS,
				default: ['search_docs', 'get_code_examples', 'ask_question'],
				required: true,
				description: 'Tools the MCP server exposes to AI clients. Choose between 3 and 10.',
				displayOptions: { show: { resource: ['server'], operation: ['create'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['server'], operation: ['create'] } },
				options: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'Description shown in the dashboard and to connecting AI clients',
					},
				],
			},
			{
				displayName: 'Server ID or Slug',
				name: 'serverId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'product-docs-a1b2',
				description: 'The server ID or its slug. Both are returned by Create and Get Many.',
				displayOptions: {
					show: { resource: ['server'], operation: ['get', 'delete', 'refresh'] },
				},
			},
			{
				displayName: 'Refresh Options',
				name: 'refreshOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { resource: ['server'], operation: ['refresh'] } },
				options: [
					{
						displayName: 'Source ID',
						name: 'sourceId',
						type: 'string',
						default: '',
						description: 'Re-index only this source instead of every source on the server',
					},
				],
			},

			// ─── Source ────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['source'] } },
				options: [
					{
						name: 'Add',
						value: 'add',
						action: 'Add a source to a server',
						description: 'Add a source and queue it for indexing',
						routing: {
							request: {
								method: 'POST',
								url: '=/api/mcp/{{$parameter["serverId"]}}/sources',
								body: {
									url: '={{$parameter["url"]}}',
									type: '={{$parameter["sourceOptions"]["type"] || undefined}}',
									label: '={{$parameter["sourceOptions"]["label"] || undefined}}',
								},
							},
						},
					},
					{
						name: 'Remove',
						value: 'remove',
						action: 'Remove a source from a server',
						description: 'Remove a source and its indexed content',
						routing: {
							request: {
								method: 'DELETE',
								url: '=/api/mcp/{{$parameter["serverId"]}}/sources',
								body: {
									sourceId: '={{$parameter["sourceId"] || undefined}}',
									url: '={{$parameter["url"] || undefined}}',
								},
							},
						},
					},
				],
				default: 'add',
			},
			{
				displayName: 'Server ID or Slug',
				name: 'serverId',
				type: 'string',
				default: '',
				required: true,
				description: 'The server the source belongs to',
				displayOptions: { show: { resource: ['source'] } },
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'https://docs.example.com/guides',
				description: 'URL of the source to add',
				displayOptions: { show: { resource: ['source'], operation: ['add'] } },
			},
			{
				displayName: 'Source Options',
				name: 'sourceOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { resource: ['source'], operation: ['add'] } },
				options: [
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						options: SOURCE_TYPE_OPTIONS,
						default: '',
						description: 'Leave on auto-detect unless the URL is misclassified',
					},
					{
						displayName: 'Label',
						name: 'label',
						type: 'string',
						default: '',
						description: 'Human-readable name shown in the dashboard',
					},
				],
			},
			{
				displayName: 'Source ID',
				name: 'sourceId',
				type: 'string',
				default: '',
				description: 'ID of the source to remove. Supply this or a URL.',
				displayOptions: { show: { resource: ['source'], operation: ['remove'] } },
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				description: 'URL of the source to remove. Used when no source ID is given.',
				displayOptions: { show: { resource: ['source'], operation: ['remove'] } },
			},

			// ─── Account ───────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['account'] } },
				options: [
					{
						name: 'Get Usage',
						value: 'getUsage',
						action: 'Get account usage',
						description: 'Return plan, request usage, and limits so a workflow can branch before hitting a cap',
						routing: {
							request: {
								method: 'GET',
								url: '/api/billing/usage',
							},
						},
					},
					{
						name: 'Get Entitlements',
						value: 'getEntitlements',
						action: 'Get account entitlements',
						description: 'Return trial state, analytics tier, and source limits',
						routing: {
							request: {
								method: 'GET',
								url: '/api/account/entitlements',
							},
						},
					},
				],
				default: 'getUsage',
			},
		],
	};
}
