# n8n-nodes-mcp-studio

**AI Context by MCP Studio** — an n8n community node that gives AI agents persistent context. Point it at your documentation, code repositories, PDFs, written specs, runbooks, or another MCP server, and it returns a live [Model Context Protocol](https://modelcontextprotocol.io) endpoint that agents consult before they act. No code, no vector database, no server to run.

[What this is](#what-this-is) · [What you can connect](#what-you-can-connect) · [What this looks like in n8n](#what-this-looks-like-in-n8n) · [Who it's for](#who-its-for) · [Installation](#installation) · [Account setup](#account-setup) · [Your first workflow](#your-first-workflow) · [Operations](#operations) · [What to expect](#what-to-expect) · [Limits and cost](#limits-and-cost) · [Troubleshooting](#troubleshooting) · [Local development](#local-development)

## What this is

An AI agent is only as good as what it knows at the moment it runs. Left alone, it answers from whatever it absorbed at training time plus whatever happens to be in the prompt. That is why the same agent can be confidently wrong about your own API, your own conventions, and your own processes — and wrong differently each time you ask.

Persistent context is the fix. Rather than pasting facts into prompts and hoping they stay current, you publish your sources once and the agent consults them on every run. That is what the Model Context Protocol standardises: an endpoint an agent queries for grounding before it does anything.

The hard part is the endpoint. Building one means crawling your content, chunking it so headings and code blocks survive intact, generating embeddings, storing the vectors, writing a retrieval layer that ranks well enough to be trusted, wrapping the result in the MCP protocol, and hosting it. That is weeks of engineering. It also does not end at launch: content changes, so something has to re-crawl it, re-embed what moved, skip what did not, and recover from runs that fail halfway — for as long as the server exists.

MCP Studio does the building and the maintaining, with no code. You give it URLs and get a hosted MCP endpoint in under a minute, queryable straight away while indexing fills in behind it. After that, sources re-index daily on their own, unchanged content is detected and skipped, and a run that fails leaves the previous index fully searchable.

This node moves those decisions into n8n. A workflow can create a server, add and remove sources, change which tools it exposes, force a re-index the moment content ships, read back the endpoint URL, and pull the server's own usage metrics — so context gets provisioned and maintained on a trigger instead of in a browser tab.

## What you can connect

A source is anything you want an agent to read before it answers. Documentation is the obvious one; it is not the most valuable one.

| Source | Why teams connect it |
|---|---|
| **Code repositories** | The agent writes code that matches your actual conventions, your real helper functions, and your existing patterns, instead of inventing plausible ones. Public repos work immediately; private repos need a GitHub account linked once in the dashboard |
| **Written specs and runbooks** | A page describing how something should be done becomes an instruction the agent follows every time, not a prompt someone has to remember to paste |
| **PDFs** | Contracts, policies, compliance documents, vendor manuals, exported reports — content that usually lives outside anything searchable. Page hints in search results point back to where an answer came from |
| **Documentation sites** | Product docs, internal wikis, help centres. Your agents and your customers' AI tools answer accurately about your product |
| **API references** | The agent gets your parameters and response shapes right rather than approximating them |
| **Another MCP server** | Federate an existing MCP endpoint in as a source, so several context sources sit behind one URL and one set of credentials |
| **Any website** | Changelogs, status pages, partner documentation, public research — anything on the open web |

They mix freely. One server can hold a docs site, two repositories, and a PDF, and answer across all of them in a single query.

## What this looks like in n8n

n8n is where this matters most, because an agent inside a workflow acts on what it retrieves. Grounding it changes what it does, not just what it says.

**Agents that follow your conventions.** Write down how you want work done — how workflows should be structured, which internal tools to call, what to never do — and connect that as a source alongside the repositories that demonstrate it. Every AI Agent node pointed at the endpoint now works from your rules instead of generic best practice.

**Internal knowledge your automations can act on.** Connect the runbooks, policies, and PDFs your team actually works from, then let a workflow answer questions, triage tickets, or draft replies against them. No copy-paste into prompts, and no separate vector database to operate.

**A docs MCP for your product.** Publish an endpoint alongside your documentation so your users' AI tools answer accurately about your product, and refresh it from CI the moment you ship.

**Context per client or per project.** Agencies and consultants provision one server per engagement as a repeatable workflow step, rather than a manual setup each time.

**Observability you can route on.** Read a server's metrics inside a workflow and act: post the weekly numbers to Slack, email a client their usage, or alert when the success rate drops or a source stops being cited.

### How it relates to n8n's MCP Client

They sit on opposite ends of the same pipe, and you will often use both:

| | This node | n8n's MCP Client tool |
|---|---|---|
| Purpose | **Builds and maintains** the MCP server | **Consumes** an MCP server |
| Typical use | Create the context server, refresh it when content changes | Let an AI Agent query that context |
| Runs | On a schedule, webhook, or manual trigger | Inside an agent's reasoning loop |

A common pairing: this node creates the server and returns its URL, and an MCP Client tool attached to an AI Agent node queries it.

## Who it's for

- **Anyone running AI agents in n8n.** You want the agent grounded in your repositories, specs, and processes rather than in what the model remembers.
- **Engineering teams.** Give coding agents your conventions and your codebase as context, so generated code fits the project.
- **Operations, support, and internal-tools teams.** Point assistants at help centres, runbooks, and PDFs without owning a vector database.
- **Developer-experience and docs teams.** Ship an MCP endpoint alongside your documentation and re-index it from CI.
- **Automation builders and consultants.** Provision context servers per client or per project as a repeatable step.

You do not need to know anything about embeddings, vector search, or the MCP specification. You do need an MCP Studio account.

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

Restart n8n afterwards. The node appears as **AI Context by MCP Studio**.

> Community nodes are available on self-hosted n8n and, for verified nodes, on n8n Cloud.

## Account setup

An MCP Studio account is required before the node can do anything. This is by design: the servers it creates are hosted, billed, and scoped to your account.

1. Create a free account at [appatools.com/mcp-studio](https://appatools.com/mcp-studio?utm_source=n8n&utm_medium=integration).
2. Go to **Account → API Keys** and create a key. Set **Used from** to **n8n**.
3. Copy the key immediately. It starts with `msk_live_` and is shown exactly once — MCP Studio stores only a hash of it, so a lost key can be replaced but never recovered.
4. In n8n, create an **AI Context by MCP Studio API** credential and paste the key. Leave **Base URL** at its default unless you are testing against a local instance.
5. Click **Test**. Success returns your current plan and usage.

A key acts on your account with your plan's limits. Treat it like a password, and revoke it from the same screen if it leaks.

## Your first workflow

The fastest path is the included template. Import `workflows/mcp-studio-fast-start.json` through **Workflows → Import from File**, select your credential on each node, and run it.

It does the whole loop end to end: reads your plan, branches if you are already at your server limit, creates a server from a source URL, waits, then reads back the live endpoint and indexing progress.

Building it yourself is four steps:

1. **Account → Get Usage** — confirm there is room for another server.
2. **Server → Create** — give it a name, one or more sources, and 3 to 10 tools. Returns `serverId`, `slug`, `url`, `sseUrl`, and `configSnippet`.
3. **Wait**, then **Server → Get** — poll until every source reports `crawlStatus: "complete"`.
4. Use the `url` — paste `configSnippet` into Cursor or Claude Desktop, or point an n8n MCP Client tool at `url` so an AI Agent can query it.

From there, the shape worth building is event-driven rather than scheduled. MCP Studio already re-indexes stale sources once a day on its own, so a nightly Schedule Trigger into **Refresh** mostly duplicates that. The gain is reacting to the event itself: a **Webhook** on your docs deploy, or a GitHub release trigger, into **Server → Refresh** — so context is current minutes after a change instead of by the next morning.

## Operations

### Server

| Operation | What it does |
|---|---|
| **Create** | Creates a server from one or more sources, queues indexing, and returns the MCP endpoint URL plus a ready-to-paste client config snippet |
| **Get** | Returns a server with per-source indexing progress, the endpoint URL, and the config snippet |
| **Get Many** | Lists every server on the account |
| **Refresh** | Queues a re-index so the server picks up changed content, either for the whole server or one source |
| **Delete** | Soft-deletes a server, leaving it restorable for 7 days |

### Source

| Operation | What it does |
|---|---|
| **Add** | Adds a source to an existing server and queues it for indexing |
| **Remove** | Removes a source and its indexed content, by source ID or URL |

### Tool

Tools are what an agent can actually do against your context. You pick them when you create a server, and you can change them afterwards without recreating anything.

| Operation | What it does |
|---|---|
| **Get Many** | Returns the tools a server exposes today, plus the full catalogue it can choose from |
| **Add** | Enables more tools. Tools already enabled are left alone, so the operation is safe to re-run |
| **Remove** | Disables tools. At least 3 have to remain |
| **Replace** | Sets the exact tool list, whatever was enabled before |

A change reaches connected agents on their next request. There is no re-index, and the endpoint URL does not change.

The ten available tools:

`search_docs`, `query_source`, `get_code_examples`, `summarize_content`, `find_api_reference`, `get_changelog`, `search_issues`, `get_quickstart`, `extract_schema`, `ask_question`

`search_docs`, `get_code_examples`, and `ask_question` are a sensible default for most content. See the [tools reference](https://docs.appatools.com/mcp-studio/reference/tools) for what each one does.

### Analytics

| Operation | What it does |
|---|---|
| **Get** | Returns one server's request metrics, so a workflow can report on them or alert on them |

This reads the metrics included on every plan, and it returns the same fields at every plan level:

| Field | What it tells you |
|---|---|
| `totalCalls`, `failedCalls`, `successRate` | Whether agents are getting answers |
| `avgDurationMs` | How fast they get them |
| `activeSources`, `citedSources` | How many of your sources are actually being quoted. A source that is never cited is either badly targeted or badly written |
| `toolUsage` | Which tools agents reach for, and how often each succeeds |
| `sourceUsage` | Which sources answer the most questions |
| `clientUsage` | Which clients are connecting — Cursor, Claude Desktop, an n8n agent, and so on |
| `callsOverTime` | Daily volume and errors for the last 30 days |

Per-request detail — the exact passage returned for a given question, content gaps, source grades, and forecasts — is part of MCP Studio's paid analytics and is read on the dashboard, not through this node.

### Account

| Operation | What it does |
|---|---|
| **Get Usage** | Returns plan, request usage, server and source limits |
| **Get Entitlements** | Returns trial state, analytics tier, and per-server source limits |

## What to expect

**Indexing is asynchronous.** Create and Refresh return as soon as the work is queued, not when it finishes. Expect roughly one to six minutes for a few sources, and longer for a large documentation site or a broad code repository. Indexing runs on a durable worker, so it survives long crawls and continues after your workflow — or n8n itself — has moved on.

**Sources refresh themselves daily.** Stale sources are re-queued automatically each day, and unchanged content is detected and skipped. Use **Refresh** when you need context current sooner than that, not to recreate the daily cadence.

**The endpoint works before indexing finishes.** It simply has less content to search, and gets better as pages land. Poll **Server → Get** and watch each source's `crawlStatus`, which moves `pending` → `crawling` → `complete`, or `error` if the crawl failed. The `indexing` object alongside it reports `pagesIndexed`, `chunksIndexed`, and `embeddingCoveragePct` as work lands.

**Slugs are stable, and are what you reference.** Create returns a slug like `engineering-context-a1b2`. Every later operation accepts either the ID or the slug.

**Tool changes are immediate; content changes are not.** Adding a tool takes effect on the next agent request. Adding a source takes as long as indexing it takes.

**Deleting is reversible for a week.** Delete is a soft delete with a 7-day restore window, after which the data is permanently removed.

**Usage counts MCP requests, not node executions.** Running this node does not consume request quota. Quota is consumed when an agent actually queries the finished server.

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
| `400 An MCP server needs at least 3 tools` | A **Tool → Remove** would drop the server below the minimum |
| `400 Unknown tool name` | A tool name is not in the catalogue. The response lists the valid names |
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

### Releasing

Releases publish from GitHub Actions, not from a laptop. n8n has required an npm
provenance attestation for verified community nodes since 1 May 2026, and that
attestation can only be minted by a CI job holding a short-lived OIDC token.

```bash
npm version patch
git push --follow-tags
```

The tag triggers `.github/workflows/publish.yml`, which builds, lints against the
publish ruleset, checks the tag matches `package.json`, and runs
`npm publish --provenance`. It needs an `NPM_TOKEN` repository secret with publish
rights, or npm Trusted Publishing configured for this repository.

## Resources

- [MCP Studio](https://appatools.com/mcp-studio)
- [MCP Studio documentation](https://docs.appatools.com/mcp-studio)
- [Using MCP Studio with n8n](https://docs.appatools.com/mcp-studio/integrations/n8n)
- [n8n community nodes](https://docs.n8n.io/integrations/#community-nodes)
- [Model Context Protocol](https://modelcontextprotocol.io)

## License

[MIT](LICENSE.md)
