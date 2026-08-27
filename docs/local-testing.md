# Local testing guide

End-to-end verification of the node before submitting it to n8n. Roughly 20 minutes.

The order matters: each stage depends on the one before it, and stopping at the first failure tells you which layer is broken.

## Prerequisites

- An MCP Studio account
- Either the production MCP Studio at `https://appatools.com/mcp-studio`, or a local instance
- Node.js 24 or later to *run* n8n. Current n8n requires it, and it fails to start on Node 20 with a version error rather than anything descriptive:

  ```bash
  nvm install 24 && nvm use 24 && node -v
  ```

  The node package itself builds on Node 20 and later. It is n8n that needs 24. Do the linking in step 2 under the same Node version you start n8n with, because `npm link` targets a version-specific global prefix and a link made under one version is invisible to the other.

## 1. Build the node

```bash
cd ~/n8n-nodes-mcp-studio
npm install
npm run build
npm run lint
npx eslint -c .eslintrc.prepublish.js nodes credentials package.json
```

All four must succeed. The last command is the stricter ruleset n8n applies at publish time, and it is the one that catches the description-wording rules their reviewers check.

Confirm `dist/` contains the compiled node, the credential, the icon, and the codex:

```bash
find dist -type f
```

Two files there are copied by gulp rather than emitted by tsc, and both fail
silently if the copy step breaks. `appaTools.png` missing leaves the node
loadable but drawn as a blank square. `McpStudio.node.json` missing leaves it
working but with no documentation links in the node details panel.

## 2. Link the node into a local n8n

```bash
nvm use 24

cd ~/n8n-nodes-mcp-studio
npm link

mkdir -p ~/.n8n/nodes
cd ~/.n8n/nodes
npm link n8n-nodes-mcp-studio

npx n8n start
```

Open http://localhost:5678. Add a node and search for "AI Context" or "MCP". It appears as **AI Context by MCP Studio** with the Appa Tools axolotl as its icon. If it does not appear, the link did not take — check that `~/.n8n/nodes/node_modules/n8n-nodes-mcp-studio` exists and points at your build, and that you linked under the same Node version you started n8n with.

After any code change, run `npm run build` and restart n8n. The editor caches node descriptions, so a hard refresh of the browser helps too.

## 3. Create an API key

In MCP Studio, go to **Account → API Keys**, set the label to `n8n local test`, set **Used from** to **n8n**, and create it. Copy the key immediately — it is displayed once.

## 4. Verify the credential

In n8n, create an **AI Context by MCP Studio API** credential:

- **API Key**: the `msk_live_…` value you just copied
- **Base URL**: `https://appatools.com/mcp-studio`

Click **Test**. Expect a green result.

If it fails, the useful distinction is which failure you get. A `401` means the key is wrong, revoked, or truncated on paste. Anything else, including a hang, usually means the Base URL is wrong — a common mistake is dropping the `/mcp-studio` path.

### Pointing at a local MCP Studio instance

```bash
cd ~/mcp-builder-studio
npm run dev
```

Then set **Base URL** to `http://localhost:3000/mcp-studio`. Everything else is identical. Note that a local instance runs its own in-process indexing worker, so indexing behaves the same as production but on your machine's bandwidth.

## 5. Walk the happy path

Import `workflows/mcp-studio-fast-start.json` through **Workflows → Import from File** and select your credential on each MCP Studio node. Then run it.

Check each stage:

1. **Check plan and limits** returns your plan, `mcpCallsUsed`, `mcpCallsLimit`, `serversUsed`, and `serversLimit`.
2. **Room for another server?** takes the true branch. If it takes the false branch you are already at your server limit — delete one in the dashboard and re-run.
3. **Create MCP server** returns `serverId`, `slug`, `url`, `sseUrl`, and `configSnippet`.
4. **Get endpoint and progress** returns the same server with a `sources` array whose entries carry `crawlStatus` and an `indexing` object.

If `crawlStatus` is still `crawling`, that is correct rather than broken. Indexing is asynchronous, and the 45-second wait in the template is deliberately short. Re-run just that node until every source reads `complete`.

## 6. Confirm the endpoint actually answers

This is the step that proves the whole chain, because it exercises the server the node built rather than the node itself. Take the `url` from step 5:

```bash
curl -s -X POST 'https://appatools.com/mcp-studio/api/mcp/YOUR-SLUG' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | python3 -m json.tool
```

Expect the three tools you selected. Then call one:

```bash
curl -s -X POST 'https://appatools.com/mcp-studio/api/mcp/YOUR-SLUG' \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call",
       "params":{"name":"search_docs","arguments":{"query":"getting started"}}}' \
  | python3 -m json.tool
```

A `result.content` array with text from your source means the node created a working MCP server. That is the activation milestone the GTM plan defines: account created, plugin connected, server created, first successful MCP call observed.

## 7. Exercise the remaining operations

| Operation | Setup | Expected |
|---|---|---|
| Server → Get Many | none | Array including the server you created |
| Source → Add | server slug plus a new URL | The new `Source` row, `crawlStatus: "pending"` |
| Server → Refresh | server slug | `started: true` with a `queued` count |
| Server → Refresh | slug plus a source ID | Only that source re-queued |
| Source → Remove | slug plus source ID | `{ ok: true, removed: 1 }` |
| Tool → Get Many | server slug | The 3 tools you created it with, the 10-entry `available` catalogue, and `minTools`/`maxTools` |
| Tool → Add | slug plus one unused tool | `added` names it, `tools` now has 4 |
| Tool → Add | the same tool again | `added` is empty and nothing changes |
| Tool → Remove | slug plus that tool | `removed` names it, back to 3 |
| Tool → Replace | slug plus 4 tools | `tools` is exactly those 4 |
| Analytics → Get | server slug | `totalCalls`, `successRate`, `toolUsage`, `clientUsage`, `callsOverTime`, `tier: "free"` |
| Account → Get Entitlements | none | Trial state and analytics tier |
| Server → Delete | server slug | `ok: true` with `purgeAt` 7 days out |

Run **Analytics → Get** after step 6, not before: a server nobody has queried
reports zeros, which proves the wiring but tells you nothing. Once your `curl`
calls have landed, `clientUsage` should show `cURL` and `toolUsage` should show
the tool you called.

After a **Tool → Add**, re-run the `tools/list` call from step 6 against the
endpoint. The new tool appears without a re-index and without the URL changing,
which is the point of the operation.

## 8. Check the error paths

These matter more than the happy path for review, because they are what a user actually hits.

| Trigger | Expected |
|---|---|
| Revoke the key in MCP Studio, re-run any node | `401 Authentication required` |
| Create with 2 tools selected | `400 Select between 3 and 10 tools` |
| Tool → Remove enough tools to leave 2 | `400 An MCP server needs at least 3 tools`, and the selection is unchanged |
| Tool → Get Many for another account's server | `404 Server not found`, never a tool list |
| Create with more sources than your tier allows | `402 source_limit` with the limit in the message |
| Get with a slug that does not exist | `404 Server not found` |
| Add a source that already exists on the server | `409 Source already exists` |
| Add a private GitHub repo with no linked account | `422 auth_required` |

Turn on **Settings → Always Output Data** on a node to inspect the error body rather than only the status.

## 9. Confirm attribution landed

Every request carries `X-MCP-Studio-Partner: n8n` and the node version. In MCP Studio, a server created through this node stores `partnerName` and `partnerVersion`, and PostHog receives `partner_name` on `mcp_server_created`.

Verify with a direct database read against the instance you tested:

```sql
SELECT name, slug, "partnerName", "partnerVersion", "partnerMetadata"
FROM "McpServer"
WHERE "partnerName" = 'n8n'
ORDER BY "createdAt" DESC
LIMIT 5;
```

A row with `partnerName = 'n8n'` means plugin-led attribution works. Without it the integration would still function, but none of the GTM reporting in the plugin-led growth plan would have data.

## 10. Verify the published package shape

```bash
npm pack --dry-run
```

Expect `dist/` (compiled node, credential, declarations, source maps, the icon,
and the codex JSON), `workflows/mcp-studio-fast-start.json`, `index.js`,
`package.json`, `README.md`, and `LICENSE.md`. It must not contain source `.ts`
files or `node_modules`.

The example workflow has to be in there. The README tells the reader to import
it, and someone who installed from npm has no repository to find it in.

## Submitting to n8n

Once every stage above passes:

1. Update `NODE_VERSION` in `nodes/McpStudio/McpStudio.node.ts` to match the
   version you are about to release. It is read separately from `package.json`,
   so a mismatch surfaces as misattributed analytics rather than a build error.
2. Add an `NPM_TOKEN` repository secret with publish rights, or configure npm
   Trusted Publishing for the repository.
3. Tag the release. Publishing runs in CI, not locally:

   ```bash
   npm version patch
   git push --follow-tags
   ```

   `.github/workflows/publish.yml` builds, runs the strict lint, refuses to
   continue if the tag and `package.json` disagree, then runs
   `npm publish --provenance`.
4. Confirm the npm page shows the package with the `n8n-community-node-package`
   keyword and a provenance attestation. The keyword is what makes it
   installable from the community nodes panel; the attestation is what makes it
   eligible for verification.
5. Submit for verification at [creators.n8n.io/nodes](https://creators.n8n.io/nodes).

Publishing from a laptop will not do. Since 1 May 2026 n8n only verifies nodes
published by a CI workflow carrying an npm provenance statement, because the
attestation depends on a short-lived OIDC token that only CI can obtain.

n8n's [verification guidelines](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines/)
are worth a final read. Requirements this package already satisfies: a
declarative node, no runtime dependencies, a credential with a working test, a
square icon, MIT license, one service per package, and a README documenting
every operation.

The icon is a PNG rather than an SVG. n8n's own documentation is explicit that
SVG is recommended and PNG is accepted, and n8n's built-in nodes ship dozens of
PNG icons, so this is not a verification blocker. The legacy lint rule that
errored on any non-SVG icon is disabled in `.eslintrc.js` with that reasoning
recorded; n8n has since removed the same check from its current plugin.
