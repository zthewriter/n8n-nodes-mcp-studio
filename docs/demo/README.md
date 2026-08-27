# Verification video: setup and script

n8n's manual review asks for a single-take video, five minutes or less, no cuts,
covering: install from npm, insert the node, set up and test the credential,
demonstrate the common actions, and show the node used as a tool by an AI Agent.

The three workflows here cover that. Import them, set them up, rehearse once,
then record.

## The use case

A support team wants an agent in n8n that answers customer questions only from
their live product documentation and source code, rather than from whatever the
model happens to remember. The three workflows are the three things that team
actually does:

1. **Provision the context** — create the MCP server and its sources from a
   workflow, and choose which tools it exposes.
2. **Consume it, then observe it** — make the same MCP request an agent would,
   then read which sources got cited.
3. **Ground an agent in it** — an AI Agent that reads the context before it
   answers, with the node itself attached as a tool.

That order matters on camera: each workflow answers the question the previous one
raises, so there is a reason to keep watching.

## Before you record

### 1. Uninstall the linked build — this one is easy to get wrong

Local development uses `npm link`, which is **not** an npm install. Their step 1
asks to install from npm at the submitted version, and a reviewer can tell the
difference. If the linked copy is still present the install will also collide
with it.

```bash
# stop n8n first, then:
cd ~/.n8n/nodes
npm unlink n8n-nodes-mcp-studio 2>/dev/null
rm -rf node_modules/n8n-nodes-mcp-studio .package-lock.json

cd ~/n8n-nodes-mcp-studio
npm unlink -g n8n-nodes-mcp-studio 2>/dev/null
```

Restart n8n and confirm the node is **gone** from the node panel. Starting the
recording from a genuinely clean instance is what makes the install step
meaningful.

Installing an unverified package from the UI needs
`N8N_UNVERIFIED_PACKAGES_ENABLED=true`, which is the current default.

### 2. Point workflows 2 and 3 at a server that has finished indexing

Indexing is asynchronous and a real corpus takes longer than the whole video, so
nothing in the recording waits for it. Any server you already built in the MCP
Studio UI works here — the API cannot tell how a server was created, so
UI-created and node-created servers are interchangeable.

Put its slug into:

- workflow 2, the **Which server** node, `slug`
- workflow 3, both `REPLACE_WITH_YOUR_SERVER_SLUG` placeholders

Make a handful of MCP requests against it beforehand so the metrics in workflow 2
show real numbers rather than zeros. Rehearsing workflow 2 a few times is enough.

**Only three things need indexed content:** the JSON-RPC call and Analytics in
workflow 2, and the agent in workflow 3. Everything in workflow 1 — Create,
Source add, Tool add, Server get — returns immediately, because those are
metadata operations that only queue indexing rather than wait on it.

That is why workflow 1 keeps its Tool and Source steps on the server it just
created instead of borrowing your existing one. Running them against a live
server would gain nothing, and it risks two things on camera: the free tier's
2-source cap rejecting the add, and mutating a server you actually depend on.

Workflow 1 therefore ends on a server that is still indexing. Say so out loud
rather than working around it — asynchronous indexing is the honest shape of the
product, and a reviewer who sees it explained will not read it as a defect.

### 3. Watch the free-tier limits

The free tier allows 3 servers and 2 sources per server. Workflow 1 creates a new
server on **every** run, so two or three rehearsals will hit the cap and the
recording will fail on camera.

Delete the servers from each rehearsal before the real take, and go in with at
most one server already on the account.

### 4. Have an LLM credential ready

Workflow 3 needs a model credential (the Chat Model node defaults to OpenAI).
Set it up and send one message before recording, so the take is not the first
time it runs.

## Shot script (about 4:40)

**0:00 – 0:50 · Install from npm**

Settings → Community nodes → Install. Enter `n8n-nodes-mcp-studio`. Show the
version installed is **0.2.2**, the version under review. Worth saying aloud that
it was published from GitHub Actions with an npm provenance attestation.

**0:50 – 1:40 · Insert the node and test the credential**

New workflow → add node → search "AI Context" → **AI Context by MCP Studio**.
Note the node offers Server, Source, Tool, Analytics and Account.

Create a new credential. Paste an API key from MCP Studio (Account → API Keys,
with **Used from** set to n8n). Leave Base URL at `https://appatools.com/mcp-studio`.
Click **Test** and show it succeed — it calls the account usage endpoint, so it
proves the key without changing anything.

**1:40 – 3:00 · Workflow 1, provision the context**

Open `1 · Provision agent context` and execute. Walk the outputs left to right:

- **Check plan and headroom** — plan and limits, so a workflow can branch before
  it hits a cap.
- **Create context server** — the server, its slug and its MCP endpoint URL.
- **Add a code repository** — say the thing that widens the audience here: the
  context is not only documentation. A GitHub repository, a PDF, a spec or
  another MCP server all work.
- **List tools and catalog** — what it exposes now, and the ten it could.
- **Enable two more tools** — point out the `added` array, and that this reaches
  connected agents on their next request with no re-index and no new URL.
- **Get endpoint and progress** — the endpoint to point an agent at, and indexing
  still in progress. Say that plainly; it is the honest shape of the product.

Worth mentioning aloud that Source and Tool each have a matching remove, and that
Server has Get Many, Delete and Refresh. Demonstrating them costs time the video
does not have, but naming them shows the resource coverage is not one-directional.

**3:00 – 3:45 · Workflow 2, consume it and observe it**

Open `2 · Consume the context, then observe it` and execute.

- **Ask the MCP server** — the same JSON-RPC request Cursor or Claude Desktop
  would send. Show the answer and its citations. No API key here: the MCP
  endpoint is public, the key is only for managing the account.
- **Read the metrics** — the request you just made is already counted. Point at
  `sourceUsage` and `citedSources`: a source that never gets cited is either
  badly targeted or badly written, and that is the loop this closes.

**3:45 – 4:40 · Workflow 3, the agent tool (their step 5)**

Open `3 · Support agent grounded in your context` and open the chat.

Ask a product question first, so `product_context` fires and the answer is
grounded in the indexed docs.

Then ask: *"How is the context server performing, and are any sources not being
cited?"* The agent calls **context_metrics** — the AI Context node itself,
attached as an agent tool. Show the tool call in the log. That is the
`usableAsTool` requirement satisfied on camera.

## If you want a shorter take

Workflow 2 is the one to drop. Workflows 1 and 3 together already cover every
required step, and 3 demonstrates consumption through the MCP client anyway. Keep
2 if you have the time, because the metrics loop is the part reviewers are least
likely to have seen from another node.
