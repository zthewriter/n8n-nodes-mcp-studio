import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

/**
 * Kept in step with the version in package.json. Sent on every request so MCP
 * Studio can attribute activation and conversion to a specific node release,
 * which is what makes a regression in one version visible.
 */
const NODE_VERSION = '0.2.2';

const SOURCE_TYPE_OPTIONS = [
	{ name: 'Auto-Detect', value: '' },
	{ name: 'API Reference', value: 'api' },
	{ name: 'Documentation Site', value: 'docs' },
	{ name: 'GitHub Repository', value: 'github' },
	{ name: 'MCP Server', value: 'mcp' },
	{ name: 'PDF Document', value: 'pdf' },
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

/**
 * Fills the server dropdowns from the account the credential belongs to, so a
 * workflow is built by picking a server rather than by pasting a slug copied
 * from the dashboard.
 *
 * It also makes a scoped API key legible: /api/mcp/list returns only the servers
 * that key may act on, so the list a user sees here is exactly what the
 * credential can reach. A key limited to one server offers one server, instead
 * of offering everything and failing at run time.
 */
async function loadServerOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials('mcpStudioApi');
	const baseUrl = ((credentials.baseUrl as string) || 'https://appatools.com/mcp-studio').replace(
		/\/+$/,
		'',
	);

	const servers = (await this.helpers.httpRequestWithAuthentication.call(this, 'mcpStudioApi', {
		method: 'GET',
		url: `${baseUrl}/api/mcp/list`,
		headers: {
			'X-MCP-Studio-Partner': 'n8n',
			'X-MCP-Studio-Partner-Version': NODE_VERSION,
		},
		json: true,
	})) as Array<{ id?: string; name?: string; slug?: string; status?: string }>;

	if (!Array.isArray(servers)) return [];

	return servers
		// A deleted server still answers for its restore window, but offering one
		// in a picker invites a workflow built against something on its way out.
		.filter((server) => server.status !== 'deleted' && server.slug)
		.map((server) => ({
			// The slug, not the id: it is immutable, it is what the MCP endpoint URL
			// and every docs example use, and it keeps an exported workflow readable.
			// The API accepts either.
			value: server.slug as string,
			name: server.name || (server.slug as string),
			description: server.slug as string,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export class McpStudio implements INodeType {
	methods = {
		loadOptions: {
			getServers: loadServerOptions,
		},
	};

	description: INodeTypeDescription = {
		displayName: 'AI Context by MCP Studio',
		// Never change: this is the type identifier stored in saved workflows.
		name: 'mcpStudio',
		icon: { light: 'file:appaTools.svg', dark: 'file:appaTools.dark.svg' },
		group: ['transform'],
		version: 1,
		// Lets an AI Agent call this node as a tool, so an agent can add a source
		// or read metrics mid-run rather than only on a fixed trigger path.
		usableAsTool: true,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Give AI agents persistent context from your docs, code, PDFs, and internal tools through a live MCP server',
		defaults: {
			name: 'AI Context',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
					{ name: 'Analytics', value: 'analytics' },
					{ name: 'Server', value: 'server' },
					{ name: 'Source', value: 'source' },
					{ name: 'Tool', value: 'tool' },
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
				placeholder: 'Engineering Context',
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
					'What the agent should read before it acts: documentation, a GitHub repository, a PDF, a published spec or runbook, another MCP server, or any website. The free tier allows 2 sources per server, or 5 on your first server during the trial.',
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
				description:
					'Tools the MCP server exposes to AI clients. Choose between 3 and 10. Use the Tool resource to change them later without recreating the server.',
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
				displayName: 'Server Name or ID',
				name: 'serverId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getServers' },
				default: '',
				required: true,
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
				displayName: 'Server Name or ID',
				name: 'serverId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getServers' },
				default: '',
				required: true,
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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

			// ─── Tool ──────────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['tool'] } },
				options: [
					{
						name: 'Add',
						value: 'add',
						action: 'Add tools to a server',
						description: 'Enable more tools on an existing server. Tools already enabled are left alone.',
						routing: {
							request: {
								method: 'PATCH',
								url: '=/api/mcp/{{$parameter["serverId"]}}/tools',
								body: {
									add: '={{$parameter["toolNames"]}}',
								},
							},
						},
					},
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many tools',
						description: 'Return the tools a server exposes today, plus the full catalog it can choose from',
						routing: {
							request: {
								method: 'GET',
								url: '=/api/mcp/{{$parameter["serverId"]}}/tools',
							},
						},
					},
					{
						name: 'Remove',
						value: 'remove',
						action: 'Remove tools from a server',
						description: 'Disable tools on an existing server. At least 3 have to remain.',
						routing: {
							request: {
								method: 'PATCH',
								url: '=/api/mcp/{{$parameter["serverId"]}}/tools',
								body: {
									remove: '={{$parameter["toolNames"]}}',
								},
							},
						},
					},
					{
						name: 'Replace',
						value: 'replace',
						action: 'Replace the tools on a server',
						description: 'Set the exact tool list, whatever was enabled before',
						routing: {
							request: {
								method: 'PATCH',
								url: '=/api/mcp/{{$parameter["serverId"]}}/tools',
								body: {
									tools: '={{$parameter["toolNames"]}}',
								},
							},
						},
					},
				],
				default: 'getAll',
			},
			{
				displayName: 'Tools',
				name: 'toolNames',
				type: 'multiOptions',
				options: TOOL_OPTIONS,
				default: [],
				required: true,
				description:
					'Tools to apply. Changes reach connected agents on their next request, with no re-index and no new endpoint URL.',
				displayOptions: { show: { resource: ['tool'], operation: ['add', 'remove', 'replace'] } },
			},

			// ─── Analytics ─────────────────────────────────────────
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['analytics'] } },
				options: [
					{
						name: 'Get',
						value: 'get',
						action: 'Get MCP server metrics',
						description:
							'Return request volume, success rate, latency, and the tool, source, and client breakdowns for one server',
						routing: {
							request: {
								method: 'GET',
								url: '=/api/analytics/{{$parameter["serverId"]}}/summary',
							},
						},
					},
				],
				default: 'get',
			},

			// Shared by the two read-and-change resources, which both address a
			// server the same way.
			{
				displayName: 'Server Name or ID',
				name: 'serverId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getServers' },
				default: '',
				required: true,
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: { show: { resource: ['analytics', 'tool'] } },
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
