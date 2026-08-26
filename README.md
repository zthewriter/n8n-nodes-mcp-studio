# n8n-nodes-mcp-studio

An n8n community node for [MCP Studio by Appa](https://appatools.com/mcp-studio). Point it at documentation sites, GitHub repositories, or any website and it returns a live [Model Context Protocol](https://modelcontextprotocol.io) endpoint that AI clients such as Cursor, Claude Desktop, and Windsurf can query. No code, no server to run.

This node manages the servers. It is complementary to n8n's built-in MCP Client tool: use this node to build and maintain the MCP endpoint, then point the MCP Client at the URL it returns.

[Installation](#installation) · [Account setup](#account-setup) · [Operations](#operations) · [Fast start](#fast-start) · [Local development](#local-development) · [Compatibility](#compatibility)

## Installation

In n8n, go to **Settings → Community nodes → Install** and enter:

```
n8n-nodes-mcp-studio
```

For self-hosted n8n you can also install it manually:

```bash
cd ~/.n8n
npm install n8n-nodes-mcp-studio
```

Restart n8n afterwards.

## Account setup

An MCP Studio account is required before the node can do anything.

1. Create a free account at [appatools.com/mcp-studio](https://appatools.com/mcp-studio?utm_source=n8n&utm_medium=integration).
2. Go to **Account → API Keys** and create a key. Choose **n8n** as the "Used from" value so your usage is attributed correctly.
3. Copy the key immediately. It starts with `msk_live_` and is shown exactly once.
4. In n8n, create a new **MCP Studio API** credential and paste the key. Leave **Base URL** at its default unless you are testing against a local instance.
5. Click **Test**. A successful test returns your current plan and usage.

The free tier includes 3 servers, 2 sources per server, and 50 MCP requests per month. New accounts also get a 30-day trial with every analytics tier and 5 sources on the first server. The node reports the account's limits through **Account → Get Usage**, so a workflow can branch before it hits a cap rather than failing on one.

## Operations

### Server

| Operation | What it does |
|---|---|
| **Create** | Creates a server from one or more sources, queues indexing, and returns the MCP endpoint URL plus a ready-to-paste client config snippet |
| **Get** | Returns a server with per-source indexing progress, the endpoint URL, and the config snippet |
| **Get Many** | Lists every server on the account |
| **Refresh** | Queues a re-index so the server picks up changed source content, either for the whole server or one source |
| **Delete** | Soft-deletes a server, leaving it restorable for 7 days |

### Source

| Operation | What it does |
|---|---|
| **Add** | Adds a source to an existing server and queues it for indexing |
| **Remove** | Removes a source and its indexed content, by source ID or URL |

### Account

| Operation | What it does |
|---|---|
| **Get Usage** | Returns plan, request usage, server and source limits |
| **Get Entitlements** | Returns trial state, analytics tier, and per-server source limits |

## Fast start

`workflows/mcp-studio-fast-start.json` is an importable workflow that walks the whole path: check the plan, branch if the account is already at its server limit, create a server, wait for indexing, then read back the endpoint and progress.

Import it through **Workflows → Import from File**, then open each MCP Studio node and select your credential. The exported `id` values are placeholders, so n8n will ask you to pick a credential the first time you run it.

## Indexing is asynchronous

**Create** and **Refresh** return as soon as the work is queued, not when it finishes. Indexing runs on a durable worker so it survives long crawls, and a large documentation site can take several minutes.

To wait for a server in a workflow, poll **Server → Get** and check each source's `crawlStatus`. When every source reads `complete`, the endpoint is fully populated. The `indexing` object on each source reports `pagesIndexed`, `chunksIndexed`, and `embeddingCoveragePct` while it runs.

The endpoint is queryable before indexing completes; it simply has less content to search.

## Private GitHub repositories

A private repository needs a linked GitHub account, which is a browser-based OAuth step. Link it once in the MCP Studio dashboard under the source you are adding. Adding a private repository through the API without that link returns a `422` with `auth_required`, because there is no token to read it with.

## Compatibility

Tested against n8n 1.x with Node.js 20 and later. The node uses n8n's declarative routing, so it has no runtime dependencies of its own.

## Local development

```bash
git clone https://github.com/zthewriter/n8n-nodes-mcp-studio.git
cd n8n-nodes-mcp-studio
npm install
npm run build
npm run lint
```

`.npmrc` sets `ignore-scripts=true`. `n8n-workflow` pulls in a native module through its expression runtime, and this package only needs its type definitions at build time — n8n supplies the runtime itself.

To try the node in a local n8n:

```bash
npm link
mkdir -p ~/.n8n/nodes && cd ~/.n8n/nodes
npm link n8n-nodes-mcp-studio
npx n8n start
```

See [`docs/local-testing.md`](docs/local-testing.md) for the full end-to-end test, including how to point the credential at a local MCP Studio instance.

## Resources

- [MCP Studio](https://appatools.com/mcp-studio)
- [MCP Studio documentation](https://docs.appatools.com/mcp-studio)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Model Context Protocol](https://modelcontextprotocol.io)

## License

[MIT](LICENSE.md)
