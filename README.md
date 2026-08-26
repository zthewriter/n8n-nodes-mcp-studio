# n8n-nodes-mcp-studio

An n8n community node for [MCP Studio by Appa](https://appatools.com/mcp-studio). It turns documentation sites, GitHub repositories, and websites into a live [Model Context Protocol](https://modelcontextprotocol.io) endpoint that AI clients and agents can query — created and kept up to date from an n8n workflow, with no code and no server to run.

[What this is](#what-this-is) · [Who it's for](#who-its-for) · [When to use it](#when-to-use-it) · [Installation](#installation) · [Account setup](#account-setup) · [Your first workflow](#your-first-workflow) · [Operations](#operations) · [What to expect](#what-to-expect) · [Limits and cost](#limits-and-cost) · [Troubleshooting](#troubleshooting) · [Local development](#local-development)

## What this is

An AI agent is only as good as the context it can reach. Giving one access to your documentation normally means building a retrieval pipeline: crawl the pages, chunk them, embed them, store the vectors, write a search layer, then wrap the whole thing in an MCP server and host it. That is days of work and a service to operate.

MCP Studio does that part. You give it URLs; it crawls, chunks, embeds, and indexes them, then exposes a hosted MCP endpoint with search tools over the result.

This node puts that lifecycle in n8n. A workflow can create a server, add and remove sources, trigger a re-index when content changes, and read back the endpoint URL — so the retrieval layer behind your agents becomes something you automate instead of something you maintain by hand.

### How it relates to n8n's MCP Client

They sit on opposite ends of the same pipe, and you will often use both:

| | This node | n8n's MCP Client tool |
|---|---|---|
| Purpose | **Builds and maintains** the MCP server | **Consumes** an MCP server |
| Typical use | Create a server from your docs, refresh it when they change | Let an AI Agent call the tools on that server |
| Runs | On a schedule, webhook, or manual trigger | Inside an agent's reasoning loop |

A common pairing: this node creates the server and returns its URL, and an MCP Client tool attached to an AI Agent node queries it.

## Who it's for

- **Teams running AI agents on internal or product documentation.** You want an agent grounded in your real docs rather than in whatever the model remembers.
- **Developer-experience and docs teams.** Ship an MCP endpoint alongside your documentation so users' AI tools answer accurately about your product, and re-index it from CI when you ship.
- **Automation builders and consultants.** Provision a documentation-backed MCP server per client or per project as a repeatable workflow step instead of a manual setup.
- **Support and internal-tools teams.** Point an assistant at your help center and runbooks without owning a vector database.

You do not need to know anything about embeddings, vector search, or the MCP specification to use it. You do need an MCP Studio account.

## When to use it

Good fits:

- Provisioning the same kind of server repeatedly, for many projects, customers, or repositories
- Reacting to an event so the index is fresh within minutes: a docs site deploys, a release ships, a repo gets a new tag
- Composing server management with the rest of a pipeline — notify Slack when indexing completes, open a ticket when a source errors, record the endpoint in a database
- Gating on plan limits inside a workflow rather than discovering them through a failed run

Reach for something else when:

- **You just want to query an existing MCP server.** Use n8n's MCP Client tool. This node does not call MCP tools; it manages the servers that expose them.
- **You need one server, once, and will never change it.** The [MCP Studio wizard](https://appatools.com/mcp-studio/studio) is faster for a single manual setup.
- **Your content is not reachable by URL.** Sources are crawled over HTTP. Files on your laptop or content behind a login the crawler cannot pass are out of scope, with private GitHub repositories the one supported exception.

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

> Community nodes are available on self-hosted n8n and, for verified nodes, on n8n Cloud.

## Account setup

An MCP Studio account is required before the node can do anything. This is by design: the servers it creates are hosted, billed, and scoped to your account.

1. Create a free account at [appatools.com/mcp-studio](https://appatools.com/mcp-studio?utm_source=n8n&utm_medium=integration).
2. Go to **Account → API Keys** and create a key. Set **Used from** to **n8n**.
3. Copy the key immediately. It starts with `msk_live_` and is shown exactly once — MCP Studio stores only a hash of it, so a lost key can be replaced but never recovered.
4. In n8n, create an **MCP Studio API** credential and paste the key. Leave **Base URL** at its default unless you are testing against a local instance.
5. Click **Test**. Success returns your current plan and usage.

A key acts on your account with your plan's limits. Treat it like a password, and revoke it from the same screen if it leaks.

## Your first workflow

The fastest path is the included template. Import `workflows/mcp-studio-fast-start.json` through **Workflows → Import from File**, select your credential on each MCP Studio node, and run it.

It does the whole loop end to end: reads your plan, branches if you are already at your server limit, creates a server from a documentation URL, waits, then reads back the live endpoint and indexing progress.

Building it yourself is four steps:

1. **Account → Get Usage** — confirm there is room for another server.
2. **Server → Create** — give it a name, one or more source URLs, and 3 to 10 tools. Returns `serverId`, `slug`, `url`, `sseUrl`, and `configSnippet`.
3. **Wait**, then **Server → Get** — poll until every source reports `crawlStatus: "complete"`.
4. Use the `url` — paste `configSnippet` into Cursor or Claude Desktop, or point an n8n MCP Client tool at `url`.

From there, the shape worth building is event-driven rather than scheduled. MCP Studio already re-indexes stale sources once a day on its own, so a nightly Schedule Trigger into **Refresh** mostly duplicates that. The gain is reacting to the event itself: a **Webhook** on your docs deploy, or a GitHub release trigger, into **Server → Refresh** — so the index is current minutes after a change instead of by the next morning.

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

### Tools you can enable on a server

Choose between 3 and 10. These are the tools the finished MCP server exposes to AI clients:

`search_docs`, `query_source`, `get_code_examples`, `summarize_content`, `find_api_reference`, `get_changelog`, `search_issues`, `get_quickstart`, `extract_schema`, `ask_question`

`search_docs`, `get_code_examples`, and `ask_question` are a sensible default for most documentation. See the [tools reference](https://docs.appatools.com/mcp-studio/reference/tools) for what each one does.

## What to expect

**Indexing is asynchronous.** Create and Refresh return as soon as the work is queued, not when it finishes. Expect roughly one to six minutes for a few sources, and longer for a large documentation site or a broad code repository. Indexing runs on a durable worker, so it survives long crawls and continues after your workflow — or n8n itself — has moved on.

**Sources refresh themselves daily.** Stale sources are re-queued automatically each day, and unchanged content is detected and skipped. Use **Refresh** when you need the index current sooner than that, not to recreate the daily cadence.

**The endpoint works before indexing finishes.** It simply has less content to search, and gets better as pages land. Poll **Server → Get** and watch each source's `crawlStatus`, which moves `pending` → `crawling` → `complete`, or `error` if the crawl failed. The `indexing` object alongside it reports `pagesIndexed`, `chunksIndexed`, and `embeddingCoveragePct` as work lands.

**Slugs are stable, and are what you reference.** Create returns a slug like `product-docs-a1b2`. Every later operation accepts either the ID or the slug.

**Deleting is reversible for a week.** Delete is a soft delete with a 7-day restore window, after which the data is permanently removed.

**Usage counts MCP requests, not node executions.** Running this node does not consume request quota. Quota is consumed when an AI client actually queries the finished server.

## Limits and cost

The free tier includes 3 servers, 2 sources per server, and 50 MCP requests per month, and it stays free at that volume. New accounts also get a 30-day trial with every analytics tier and 5 sources on the first server.

Paid plans add MCP request volume, extra sources, and analytics. Current pricing is on the [pricing page](https://appatools.com/mcp-studio/pricing).

Rather than letting a workflow discover a limit by failing, read it: **Account → Get Usage** returns `serversUsed`, `serversLimit`, `mcpCallsUsed`, `mcpCallsLimit`, and `sourcesLimitPerServer`, so an IF node can branch, alert, or queue for later. The fast-start template shows this pattern.

It also returns `upgradeUrl`, and every limit response carries the same field, so a workflow that detects a cap can put a real link in the Slack message or email it sends instead of telling someone to go and find Billing. Source limits additionally return a `purchaseUrl` that goes straight to checkout.

## Troubleshooting

| What you see | What it means |
|---|---|
| `401 Authentication required` | The key is wrong, truncated on paste, or revoked. Create a new one under **Account → API Keys** |
| Credential test hangs or fails oddly | Base URL is wrong. It must include the `/mcp-studio` path |
| `400 Select between 3 and 10 tools` | Tool count is outside the allowed range |
| `402 source_limit` | More sources than your tier allows. The message states the limit |
| `403 enterprise_limit` | Server count cap reached. Delete one or upgrade |
| `404 Server not found` | Wrong ID or slug, or the server belongs to another account |
| `409 Source already exists` | That URL is already on the server |
| `422 auth_required` | A private GitHub repo with no linked GitHub account (see below) |
| `429 Too many requests` | Rate limited. Create is capped at 10 per hour |
| `crawlStatus` stuck on `crawling` | Normal for a large source. Keep polling and check that `indexing.pagesIndexed` is climbing |
| `crawlStatus: "error"` | The crawl failed for that source. `crawlError` on the same object says why |

Turn on **Settings → Always Output Data** on a node to inspect the full error body rather than only the status code.

### Private GitHub repositories

A private repository needs a linked GitHub account, and that link is a browser OAuth step that cannot happen over an API. Link it once in the MCP Studio dashboard, then add the source. Without the link you get a `422` with `auth_required`, because there is no token to read the repository with.

## Compatibility

Tested against n8n 1.x on Node.js 20 and later. The node uses n8n's declarative routing and has no runtime dependencies of its own.

## Privacy

Source content is fetched by MCP Studio and stored as text chunks and embeddings so it can be searched. Only public URLs and repositories you have explicitly linked are crawled. Deleting a source removes its indexed content. Requests from this node carry the node version and an `n8n` partner tag for support and attribution; no workflow data is sent beyond the parameters of the operation you run.

## Local development

```bash
git clone https://github.com/zthewriter/n8n-nodes-mcp-studio.git
cd n8n-nodes-mcp-studio
npm install
npm run build
npm run lint
```

`.npmrc` sets `ignore-scripts=true`. `n8n-workflow` pulls in a native module through its expression runtime, and this package needs only its type definitions at build time — n8n supplies the runtime itself.

To try the node in a local n8n:

```bash
npm link
mkdir -p ~/.n8n/nodes && cd ~/.n8n/nodes
npm link n8n-nodes-mcp-studio
npx n8n start
```

[`docs/local-testing.md`](docs/local-testing.md) is the full end-to-end verification, including pointing the credential at a local MCP Studio instance and confirming the finished endpoint answers a real MCP call.

## Resources

- [MCP Studio](https://appatools.com/mcp-studio)
- [MCP Studio documentation](https://docs.appatools.com/mcp-studio)
- [Using MCP Studio with n8n](https://docs.appatools.com/mcp-studio/integrations/n8n)
- [n8n community nodes](https://docs.n8n.io/integrations/#community-nodes)
- [Model Context Protocol](https://modelcontextprotocol.io)

## License

[MIT](LICENSE.md)
