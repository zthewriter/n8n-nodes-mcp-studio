import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class McpStudioApi implements ICredentialType {
	// Never change: this is the identifier stored in saved workflows.
	name = 'mcpStudioApi';

	// Matches the node name, with the 'API' suffix n8n's credential lint requires.
	displayName = 'AI Context by MCP Studio API';

	// Same mark as the node, so the credential is recognisable in the picker,
	// where n8n lists it away from the node that uses it.
	icon: Icon = { light: 'file:appaTools.svg', dark: 'file:appaTools.dark.svg' };

	documentationUrl = 'https://docs.appatools.com/mcp-studio/integrations/n8n';

	properties: INodeProperties[] = [
		{
			displayName:
				'An MCP Studio account is required before this node can do anything. Sign up free at <a href="https://appatools.com/mcp-studio?utm_source=n8n&utm_medium=integration" target="_blank">appatools.com/mcp-studio</a>, then create a key under Account &rarr; API Keys. The free tier includes 3 servers, 2 sources per server, and 50 MCP requests per month.',
			name: 'accountNotice',
			type: 'notice',
			default: '',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Key generated under Account &rarr; API Keys in MCP Studio. Begins with msk_live_ and is shown only once.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://appatools.com/mcp-studio',
			description:
				'Root URL of the MCP Studio instance. Change this only to test against a local instance, for example http://localhost:3000/mcp-studio.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	// Hits the cheapest authenticated endpoint there is, so "Test" tells the user
	// whether the key works without creating or changing anything on the account.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/billing/usage',
			method: 'GET',
		},
	};
}
