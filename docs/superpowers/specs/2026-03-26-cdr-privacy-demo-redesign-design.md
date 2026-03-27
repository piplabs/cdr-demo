# CDR: Privacy Infra for AI — Demo Redesign Spec

## 1. Overview

### Problem

The current CDR demo is a feature catalogue for protocol engineers. It surfaces vault UUIDs, DKG parameters, and threshold encryption terminology on every page. A privacy-interested developer or general user cannot understand the value proposition without already knowing what CDR is.

### Goal

Redesign the demo into 5 self-contained mini-products that each solve a concrete privacy problem. Hide blockchain mechanics behind product-grade UX. Provide layered technical documentation in-app so developers can understand the full CDR architecture after experiencing the product.

### Audience

- Web2/web3 developers evaluating CDR for integration
- Privacy-interested users exploring the product independently
- Self-serve: users arrive from a launch page and explore on their own timeline

### Success Criteria

- A non-technical user can complete the Secret Share demo in under 60 seconds
- A developer can understand the full CDR architecture for any demo by reading the in-app "How it works" panel
- No CDR/vault/DKG/threshold jargon appears on any demo surface — only in developer panels
- All 5 demos feel like standalone products, not protocol wrappers

---

## 2. Brand & Visual System

### Name

**CDR: Privacy Infra for AI**

### Visual Direction: Deep Space

- **Backgrounds:** Near-black (#000 → #0a0a1a) with subtle indigo grid lines (rgba(99,102,241,0.04), 40px spacing)
- **Glows:** Radial gradients of demo accent colors at low opacity (0.10–0.15), positioned behind hero content
- **Cards:** Glassmorphism — rgba(255,255,255,0.03) fill, 1px rgba(255,255,255,0.08) border, border-radius 12px
- **Typography:** System font stack (Inter/SF Pro), tight letter-spacing on headings (-0.5px to -1px), generous line-height on body (1.6)
- **Buttons (primary):** Accent color at 15% opacity fill + 30% opacity border, white text. No rounded-full pills — use border-radius 8px.
- **Buttons (secondary):** 1px rgba(255,255,255,0.15) border, no fill
- **Icons:** Native emoji rendered inline without background containers. No colored squares behind emojis.
- **Whitespace:** Generous — content breathes. Max-width 2xl (672px) for form pages, max-width 5xl (1024px) for browse/list pages.

### Demo Accent Colors

| Demo | Primary | Usage |
|------|---------|-------|
| Secret Share | Indigo #818cf8 | Progress bars, active tabs, CTA buttons |
| Marketplace | Emerald #34d399 | Price tags, purchase confirmations, success states |
| Agent Exchange | Amber #f59e0b | Agent avatars, activity feed highlights, scenario cards |
| Confidential AI | Cyan #06b6d4 | Model cards, query status, attestation badges |
| Bounty Board | Rose #f43f5e | Bounty amounts, evaluation status, reward confirmations |

### Global States

- **Error:** Red border (red-500/20), red background (red-500/5), red text (red-400)
- **Success:** Green border (green-500/20), green background (green-500/5), green text (green-300)
- **Warning/wallet not connected:** Yellow border (yellow-500/20), yellow background (yellow-500/5), yellow text (yellow-400)
- **Loading/WASM:** White/10 border, white/5 background, white/50 text

---

## 3. Navigation

### Structure

```
CDR  |  Secret Share  |  Marketplace  |  Agent Exchange  |  Confidential AI  |  Bounty Board  |  Dev Tools ▾  |  [wallet]
```

### Behavior

- **CDR** links to home page (`/`)
- **5 demo links** are top-level, always visible
- **Dev Tools** is a dropdown containing:
  - Vault Inspector (`/vault`)
  - Licenses (`/licenses`)
  - Faucet (`/faucet`)
- **Wallet** shows balance + truncated address when connected, "Connect" button when not
- Active page is highlighted with bg-white/10
- Nav is sticky, border-b border-white/10, bg-black/40 backdrop-blur

### Removed from Top-Level

- "Encrypt" and "Decrypt" merge into "Secret Share"
- "Vault," "Licenses," "Faucet" move to Dev Tools dropdown
- "DePIN" renamed to "Bounty Board"
- "Inference" renamed to "Confidential AI"

---

## 4. Home Page (`/`)

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  CDR — PRIVACY INFRA FOR AI           (small, tracking) │
│                                                         │
│  Your data.                                             │
│  Your rules.                                            │
│  No single point of trust.              (gradient text) │
│                                                         │
│  Threshold encryption powered by a decentralized        │
│  key network. No server ever sees your data.            │
│                                                         │
│  [Try Secret Share →]        [Read the Docs]            │
└─────────────────────────────────────────────────────────┘

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 🔒       │ │ 🏪       │ │ 🤖       │ │ 🧠       │ │ 🎯       │
│ Secret   │ │ Data     │ │ Agent    │ │ Confid-  │ │ Bounty   │
│ Share    │ │ Market   │ │ Exchange │ │ ential   │ │ Board    │
│          │ │          │ │          │ │ AI       │ │          │
│ one-line │ │ one-line │ │ one-line │ │ one-line │ │ one-line │
│ desc     │ │ desc     │ │ desc     │ │ desc     │ │ desc     │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### Content

- **Tagline:** "Your data. Your rules. No single point of trust." — last line in gradient (indigo → purple)
- **Subtitle:** "Threshold encryption powered by a decentralized key network. No server ever sees your data."
- **Primary CTA:** "Try Secret Share →" — indigo accent button
- **Secondary CTA:** "Read the Docs" — border-only button

### Demo Cards

| Card | Emoji | Title | Description |
|------|-------|-------|-------------|
| 1 | 🔒 | Secret Share | Share secrets with zero-trust links |
| 2 | 🏪 | Data Market | Buy and sell encrypted data, no middleman |
| 3 | 🤖 | Agent Exchange | AI agents trade data autonomously |
| 4 | 🧠 | Confidential AI | Run models on your private data |
| 5 | 🎯 | Bounty Board | Post data bounties with trustless evaluation |

Cards use the glassmorphism style. Emoji rendered inline, no background. Each card links to its demo page. Hover: border transitions to white/20, bg to white/[0.04].

---

## 5. Secret Share (`/secret`)

### Purpose

The simplest demo. Encrypt a secret, get a shareable link, recipient reveals it. Demonstrates core CDR value in 30 seconds.

### Route Structure

- `/secret` — main page (defaults to Create tab)
- `/secret/[id]` — auto-switches to Reveal tab with vault ID pre-loaded

### UI: Two Tabs — Create / Reveal

**Create Tab (idle state):**

```
┌─────────────────────────────────────────┐
│ 🔒 Secret Share                         │
│ Share a secret with anyone. No server   │
│ ever sees the plaintext.                │
│                                         │
│ ┌─────────┬─────────┐                   │
│ │ Create  │ Reveal  │  (tab toggle)     │
│ └─────────┴─────────┘                   │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ YOUR SECRET                         │ │
│ │ ┌─────────────────────────────────┐ │ │
│ │ │ Type your secret message...     │ │ │
│ │ └─────────────────────────────────┘ │ │
│ │                                     │ │
│ │ [Create Secret Link]                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ▶ How it works (for developers)         │
└─────────────────────────────────────────┘
```

**Create Tab (processing state):**

Single progress bar with status text: "Encrypting your secret..." → "Storing on-chain..." → "Done!"

No multi-step StepIndicator. One smooth bar.

**Create Tab (done state):**

```
┌─────────────────────────────────────────┐
│ YOUR SECRET LINK                        │
│ ┌─────────────────────────────────────┐ │
│ │ https://cdr.demo/secret/a7f3...     │ │
│ │                            [Copy]   │ │
│ └─────────────────────────────────────┘ │
│ Send this link to your recipient.       │
│ Only they can reveal the secret.        │
│                                         │
│ [Create Another]                        │
└─────────────────────────────────────────┘
```

**Reveal Tab (idle state):**

Input field for secret link or ID. "Reveal" button. When accessed via `/secret/[id]`, the ID is pre-populated and the user just clicks "Reveal."

**Reveal Tab (processing state):**

Single progress bar: "Requesting decryption..." → "Collecting validator responses (2/4)..." → "Decrypting..." → "Done!"

The validator progress is shown as inline text within the progress bar label, not as a separate step indicator.

**Reveal Tab (done state):**

```
┌─────────────────────────────────────────┐
│ REVEALED SECRET                         │
│ ┌─────────────────────────────────────┐ │
│ │ The actual secret message appears   │ │
│ │ here in monospace green text        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Reveal Another]                        │
└─────────────────────────────────────────┘
```

### Contract Interaction

- **Create:** Calls CDR.allocate() (writeCondition = sender, readCondition = sender — CDR skips the check when the sender matches, making it effectively open-read for anyone calling CDR.read() directly) → CDR.write() with TDH2-encrypted data. The vault UUID is encoded into the shareable URL but never shown to the user as "UUID."
- **Reveal:** Calls CDR.read() with ephemeral key → collects partials → ECIES-decrypt → TDH2-combine → display plaintext.
- No new contracts needed. Uses CDR directly.

### Internal State Mapping

| User sees | Internal |
|-----------|----------|
| "Secret link" | URL containing vault UUID |
| "Encrypting your secret..." | allocate() + encryptDataKey() + write() |
| "Collecting validator responses (2/4)..." | Polling EncryptedPartialDecryptionSubmitted events |
| "Decrypting..." | eciesDecrypt() + tdh2Combine() |

---

## 6. Data Marketplace (`/marketplace`)

### Purpose

Buy and sell encrypted data with on-chain payment. Feels like a real marketplace, not a protocol demo.

### UI: Three Tabs — Browse / Sell / My Purchases

**Browse Tab:**

```
┌──────────────────────────────────────────────────────────┐
│ 🏪 Data Marketplace                                      │
│ Buy and sell encrypted data. No middleman, no platform   │
│ cuts. Payments enforced on-chain.                        │
│                                                          │
│ ┌──────────┬──────────┬──────────────┐                   │
│ │ Browse   │ Sell     │ My Purchases │                   │
│ └──────────┴──────────┴──────────────┘                   │
│                                                          │
│ 12 listings available            [Refresh]               │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Q1 2025 DeFi Analytics Dataset                       │ │
│ │ Comprehensive DeFi protocol metrics across 15        │ │
│ │ chains including TVL, volume, and yield data...      │ │
│ │                                                      │ │
│ │ [Analytics]  ·  3 sales  ·  0x1a2b...3c4d            │ │
│ │                                                      │ │
│ │                                   0.05 IP  [Buy →]   │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Premium NFT Trading Signals (March 2025)             │ │
│ │ ...                                                  │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ▶ How it works (for developers)                          │
└──────────────────────────────────────────────────────────┘
```

**Sell Tab:**

Form fields:
- **Title** (text input, required) — "What are you selling?"
- **Description** (textarea, required) — "Describe your data"
- **Category** (select dropdown, optional) — Analytics, Research, Media, Code, Other
- **Price** (number input, required) — in IP tokens
- **Data** (textarea, required) — "Paste the data you want to sell"
- **[List for Sale]** button

Processing: Single progress bar — "Creating your listing..." → "Encrypting data..." → "Publishing..." → "Done!"

Done state: "Your listing is live!" with listing title and link.

**My Purchases Tab:**

List of purchased items showing title, purchase date (block-derived), and a "Download" button that re-decrypts the data.

### Metadata Storage

The DataMarketplace contract's `ipfsHash` field (string) is repurposed to store a JSON-encoded metadata string:

```json
{"title":"Q1 DeFi Analytics","description":"Comprehensive...","category":"Analytics"}
```

This avoids new contract deployment. The field is set via the existing `upload()` call. The frontend JSON-encodes on write, JSON-decodes on read.

### Contract Changes

No Solidity changes. The existing DataMarketplace contract and MarketplaceWriteCondition work as-is. Only the frontend changes.

### Internal State Mapping

| User sees | Internal |
|-----------|----------|
| "List for Sale" | marketplace.setup(accessFee) → CDR.write() → marketplace.upload(metadata) |
| "Buy →" | marketplace.purchase(listingId, pubKey) → collectPartials → decrypt |
| Listing title/description | Parsed from marketplace.getListing().ipfsHash JSON |
| Price | marketplace.getListing().accessFee |
| "Download" | Re-trigger CDR read flow if data not cached |

---

## 7. Agent Exchange (`/agents`)

### Purpose

Demonstrate AI agents autonomously trading encrypted data using CDR. The most novel demo — shows CDR's value in the agentic AI world.

### UI: Scenario Picker + Live Activity Feed

**Idle State:**

```
┌──────────────────────────────────────────────────────────┐
│ 🤖 Agent Data Exchange                                   │
│ Watch AI agents buy and sell private data autonomously.   │
│ Real transactions. No human in the loop.                 │
│                                                          │
│ Choose a scenario to watch:                              │
│                                                          │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ │
│ │ 📊              │ │ 👤              │ │ 🗂️              │ │
│ │ Market          │ │ User           │ │ Training       │ │
│ │ Intelligence    │ │ Preferences    │ │ Data           │ │
│ │                 │ │                │ │                │ │
│ │ Agent A has     │ │ Agent A has    │ │ Agent A has    │ │
│ │ price/trend     │ │ user behavior  │ │ labeled data-  │ │
│ │ data. Agent B   │ │ profiles.      │ │ sets. Agent B  │ │
│ │ pays for it.    │ │ Agent B (rec   │ │ buys them for  │ │
│ │                 │ │ engine) buys.  │ │ fine-tuning.   │ │
│ │ [Start →]       │ │ [Start →]      │ │ [Start →]      │ │
│ └────────────────┘ └────────────────┘ └────────────────┘ │
│                                                          │
│ ▶ How it works (for developers)                          │
└──────────────────────────────────────────────────────────┘
```

**Running State:**

```
┌──────────────────────────────────────────────────────────┐
│ MARKET INTELLIGENCE EXCHANGE                              │
│                                                          │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Agent A (Seller)          Agent B (Buyer)          │   │
│ │ 📊 DataHarvester          🔍 AlphaSeeker            │   │
│ │ 0x1a2b...                 0x3c4d...                │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ ACTIVITY FEED                                            │
│ ┌────────────────────────────────────────────────────┐   │
│ │ ✓ Agent A listed "Q1 Market Trends" for 0.05 IP    │   │
│ │   12:04:32                                         │   │
│ │                                                    │   │
│ │ ✓ Agent B discovered listing                       │   │
│ │   12:04:35                                         │   │
│ │                                                    │   │
│ │ ● Agent B submitting payment...                    │   │
│ │   12:04:38                                         │   │
│ │                                                    │   │
│ │ ○ Validators releasing decryption shares           │   │
│ │   (pending)                                        │   │
│ │                                                    │   │
│ │ ○ Agent B receives and processes data              │   │
│ │   (pending)                                        │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ [← Back to Scenarios]                                    │
└──────────────────────────────────────────────────────────┘
```

### Scenario Definitions

**Market Intelligence:**
- Agent A (DataHarvester): Lists price/trend analysis dataset
- Agent B (AlphaSeeker): Discovers, purchases, decrypts
- Data payload: JSON with mock market metrics

**User Preferences:**
- Agent A (ProfileAggregator): Lists user behavior profiles
- Agent B (RecEngine): Discovers, purchases, decrypts
- Data payload: JSON with mock user preference vectors

**Training Data:**
- Agent A (DataLabeler): Lists labeled training dataset
- Agent B (ModelTrainer): Discovers, purchases, decrypts
- Data payload: JSON with mock labeled examples

### Backend: `/api/agents/run`

**Request:**
```json
{
  "scenario": "market-intelligence" | "user-preferences" | "training-data"
}
```

**Behavior:**
1. Uses pre-funded wallet A (private key from `AGENT_A_PRIVATE_KEY` env var)
2. Uses pre-funded wallet B (private key from `AGENT_B_PRIVATE_KEY` env var)
3. Executes the full marketplace flow: setup → encrypt → write → upload → purchase → collect partials → decrypt
4. Streams progress events via Server-Sent Events (SSE)

**SSE Event Stream:**
```
data: {"step": "list", "agent": "A", "message": "Agent A listed \"Q1 Market Trends\" for 0.05 IP", "txHash": "0x...", "status": "done"}
data: {"step": "discover", "agent": "B", "message": "Agent B discovered listing", "status": "done"}
data: {"step": "purchase", "agent": "B", "message": "Agent B submitting payment...", "status": "processing"}
data: {"step": "purchase", "agent": "B", "message": "Agent B purchased access", "txHash": "0x...", "status": "done"}
data: {"step": "decrypt", "agent": "B", "message": "Validators releasing decryption shares (2/4)", "status": "processing"}
data: {"step": "decrypt", "agent": "B", "message": "Agent B received and processed data", "status": "done"}
data: {"step": "complete", "message": "Exchange complete", "data": "{...decrypted payload preview...}", "status": "done"}
```

**Frontend** consumes the SSE stream and appends each event to the activity feed with timestamps and status icons (✓ done, ● processing, ○ pending).

### Environment Variables

```
AGENT_A_PRIVATE_KEY=0x...   # Pre-funded seller wallet
AGENT_B_PRIVATE_KEY=0x...   # Pre-funded buyer wallet
```

These wallets must be funded via faucet before the demo is usable. Fund them during initial deployment by calling the existing faucet API route or sending IP directly from the deployer wallet. Each agent scenario costs ~0.1 IP (allocate + write + read fees), so fund each wallet with at least 10 IP for sustained demo usage.

### Internal State Mapping

| User sees | Internal |
|-----------|----------|
| "Agent A listed data" | marketplace.setup() + CDR.allocate() + CDR.write() + marketplace.upload() |
| "Agent B submitting payment" | marketplace.purchase() which calls CDR.read() |
| "Validators releasing decryption shares (2/4)" | Polling EncryptedPartialDecryptionSubmitted events |
| "Agent B received data" | eciesDecrypt + tdh2Combine |

---

## 8. Confidential AI (`/ai`)

### Purpose

Run AI inference on private data. The model never sees your input, you never see the model. Only the result is revealed.

### UI: Two Tabs — Browse Models / My Queries

**Browse Models Tab:**

```
┌──────────────────────────────────────────────────────────┐
│ 🧠 Confidential AI                                       │
│ Run AI models on your private data. Your input stays     │
│ encrypted. The model stays encrypted. Only the result    │
│ is revealed — verified by a trusted execution            │
│ environment.                                             │
│                                                          │
│ ┌───────────────┬────────────┐                           │
│ │ Browse Models │ My Queries │                           │
│ └───────────────┴────────────┘                           │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 📝 Sentiment Analyzer                                │ │
│ │ Analyzes the emotional tone of your text and returns │ │
│ │ a sentiment score with confidence rating.            │ │
│ │                                                      │ │
│ │ 142 queries  ·  0.01 IP per query                    │ │
│ │                                                      │ │
│ │ ┌──────────────────────────────────────────────────┐ │ │
│ │ │ Type your prompt (encrypted before sending)...   │ │ │
│ │ └──────────────────────────────────────────────────┘ │ │
│ │                                                      │ │
│ │ [Run Privately — 0.01 IP]                            │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 📊 Text Summarizer                                   │ │
│ │ Condenses long text into key points.                 │ │
│ │ ...                                                  │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ▶ How it works (for developers)                          │
└──────────────────────────────────────────────────────────┘
```

**Query Processing:**

Single progress bar: "Encrypting your input..." → "Submitting to model..." → "TEE processing..." → "Result ready!"

**Query Result (inline):**

```
┌──────────────────────────────────────────────────────┐
│ RESULT                          Verified by TEE ✓    │
│ ┌──────────────────────────────────────────────────┐ │
│ │ {                                                │ │
│ │   "sentiment": "positive",                       │ │
│ │   "confidence": 0.92,                            │ │
│ │   "keywords": ["love", "excellent", "recommend"] │ │
│ │ }                                                │ │
│ └──────────────────────────────────────────────────┘ │
│                                                      │
│ Attestation: 0xa7f3...8b2c                           │
│                                                      │
│ [Run Another Query]                                  │
└──────────────────────────────────────────────────────┘
```

**My Queries Tab:**

List of past queries showing model name, status badge (Pending/Processing/Completed), and result preview.

### Pre-Registered Models

Three models are pre-registered on the contract by the deployer:

| Model | Emoji | Fee | Behavior |
|-------|-------|-----|----------|
| Sentiment Analyzer | 📝 | 0.01 IP | Counts positive/negative words, returns sentiment + confidence + keywords |
| Text Summarizer | 📊 | 0.02 IP | Returns word count, sentence count, and first/last sentence as "summary" |
| Entity Extractor | 🔍 | 0.01 IP | Regex-extracts emails, URLs, numbers, capitalized words from input |

### Backend: `/api/ai/process`

**Request:**
```json
{
  "queryId": 123,
  "modelId": 0,
  "input": "I love this product, it's excellent and I'd recommend it to everyone"
}
```

**Behavior:**
1. Receives the query ID and plaintext input directly from the frontend (the frontend sends the plaintext alongside the on-chain submission — in production, a real TEE would decrypt the CDR vault instead)
2. Applies the model's heuristic function to the input
3. Waits 3-5 seconds to simulate processing time
4. Writes the result to a new CDR vault (using deployer key from `DEPLOYER_PRIVATE_KEY` env var)
5. Updates the on-chain query record with result vault UUID and mock attestation
6. Returns the result directly to the frontend (the frontend displays it inline without needing to decrypt the result vault — in production, the user would decrypt the result vault via CDR.read())

**Response:**
```json
{
  "result": {"sentiment": "positive", "confidence": 0.92, "keywords": ["love", "excellent", "recommend"]},
  "attestation": "0xa7f3...8b2c",
  "resultVaultUuid": 47
}
```

The attestation is a keccak256 hash of the result JSON — not a real TEE attestation, but structurally similar. The "How it works" panel explains this distinction.

### Heuristic Functions

**Sentiment Analyzer:**
```
positive_words = ["good", "great", "love", "excellent", "amazing", "best", "happy", "recommend", ...]
negative_words = ["bad", "terrible", "hate", "worst", "awful", "poor", "disappointing", ...]
score = (positive_count - negative_count) / total_words
sentiment = score > 0.05 ? "positive" : score < -0.05 ? "negative" : "neutral"
confidence = min(abs(score) * 10, 0.99)
keywords = matched positive or negative words
```

**Text Summarizer:**
```
sentences = split by ". " or ".\n"
words = split by whitespace
return {
  word_count, sentence_count,
  summary: first sentence + " ... " + last sentence (if > 2 sentences)
  reading_time: ceil(word_count / 200) + " min"
}
```

**Entity Extractor:**
```
emails = regex match email patterns
urls = regex match http/https patterns
numbers = regex match numeric patterns
names = words starting with capital letter (naive NER)
return { emails, urls, numbers, names }
```

### Internal State Mapping

| User sees | Internal |
|-----------|----------|
| "Run Privately" | CDR.allocate() + encrypt input + CDR.write() + contract.submitQuery() |
| "TEE processing..." | Backend /api/ai/process running heuristic |
| "Result" | Backend wrote result to CDR vault, frontend displays inline |
| "Verified by TEE ✓" | Mock attestation hash displayed |

---

## 9. Bounty Board (`/bounties`)

### Purpose

Post data bounties with encrypted evaluation criteria. Contributors submit data. A simulated TEE evaluates quality and releases payment.

### UI: Three Tabs — Open Bounties / Post Bounty / My Submissions

**Open Bounties Tab:**

```
┌──────────────────────────────────────────────────────────┐
│ 🎯 Bounty Board                                          │
│ Post data bounties. Contributors submit data. Quality    │
│ is evaluated confidentially — no one can cheat.          │
│                                                          │
│ ┌──────────────┬──────────────┬────────────────┐         │
│ │ Open Bounties│ Post Bounty  │ My Submissions │         │
│ └──────────────┴──────────────┴────────────────┘         │
│                                                          │
│ 5 open bounties                          [Refresh]       │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Street-Level Air Quality Readings                    │ │
│ │ Looking for PM2.5 and ozone measurements from       │ │
│ │ personal sensors in urban areas. Must include GPS    │ │
│ │ coordinates and timestamps.                          │ │
│ │                                                      │ │
│ │ 3 submissions  ·  2 accepted  ·  0x1a2b...          │ │
│ │                                                      │ │
│ │                        0.5 IP bounty  [Submit Data]  │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ▶ How it works (for developers)                          │
└──────────────────────────────────────────────────────────┘
```

**Post Bounty Tab:**

Form fields:
- **Title** (text input, required) — "What data do you need?"
- **Public Description** (textarea, required) — visible to all contributors
- **Evaluation Criteria** (textarea, required) — "How should submissions be judged? (encrypted — contributors cannot see this)"
- **Bounty Amount** (number input, required) — in IP tokens
- **[Post Bounty]** button

Processing: Single progress bar — "Creating bounty..." → "Encrypting evaluation criteria..." → "Publishing..." → "Done!"

**Submit Data Flow (inline on bounty card):**

Contributor clicks "Submit Data" → inline textarea appears → enters data → clicks "Submit" → progress bar → done.

**TEE Evaluation Flow:**

After a provider submits data, the frontend detects the new response and calls the evaluation endpoint:

1. Frontend detects the new on-chain response via polling
2. Frontend calls `/api/bounties/evaluate` with the response ID
3. Frontend shows "Evaluating..." with a spinning indicator while the backend processes (~10-15 second delay)
4. Backend always accepts, generates mock attestation (keccak256 of responseId + timestamp), and calls the contract to mark the response as accepted
5. Frontend polls for the updated on-chain status and shows "Accepted ✓" with attestation hash

### Metadata Storage

Same pattern as marketplace — the DePIN contract's string fields are repurposed to store JSON metadata:

**Request metadata** (stored in evalIpfsHash):
```json
{"title": "Street-Level Air Quality", "description": "Looking for PM2.5..."}
```

**Response metadata** (stored in dataIpfsHash):
```json
{"title": "NYC Air Quality March 2025"}
```

### Backend: `/api/bounties/evaluate`

**Request:**
```json
{
  "responseId": 5
}
```

**Behavior:**
1. Waits 10-15 seconds to simulate TEE processing
2. Generates mock attestation: keccak256 hash of responseId + timestamp
3. Calls contract to mark response as accepted with attestation bytes
4. Uses deployer key from `DEPLOYER_PRIVATE_KEY` env var

**Response:**
```json
{
  "accepted": true,
  "attestation": "0xb8c4...9d1e"
}
```

### Internal State Mapping

| User sees | Internal |
|-----------|----------|
| "Post Bounty" | depinBackend.createRequest(teeImageHash) + CDR.allocate() + encrypt criteria + CDR.write() + setEvalIpfsHash(metadata) |
| "Submit Data" | depinBackend.respondToRequest() + CDR.allocate() + encrypt data + CDR.write() + setDataIpfsHash(metadata) |
| "Evaluating..." | Backend /api/bounties/evaluate processing |
| "Accepted ✓" | Backend called contract to mark accepted with attestation |
| Bounty title/description | Parsed from getRequest().evalIpfsHash JSON |

---

## 10. "How It Works" Developer Panels

### Structure

Every demo page has a collapsible panel at the bottom. Three layers, each collapsible:

```
▶ How it works (for developers)
  ▶ Layer 1: Conceptual Overview
  ▶ Layer 2: On-Chain Architecture
  ▶ Layer 3: Integration Code
```

### Layer 1: Conceptual Overview

4-5 bullet points in plain English explaining what CDR does for this demo. Example for Secret Share:

> - Your secret is encrypted using threshold cryptography — it's split so that no single party can read it
> - The encrypted data is stored on-chain in a CDR vault
> - When the recipient opens the link, each validator in the network provides a partial decryption
> - The recipient's browser combines the partials to recover the original secret
> - No server, no database, no single point of trust ever has access to the plaintext

### Layer 2: On-Chain Architecture

Visual flow diagram (built with divs/CSS, not images) showing the data path. Names the contracts, events, and condition patterns.

Example for Marketplace:

```
Seller                          CDR Contract                    Buyer
  │                                  │                             │
  ├─ marketplace.setup(fee) ────────►│ CDR.allocate()               │
  │                                  │ (readCondition = marketplace)│
  ├─ CDR.write(encrypted) ─────────►│                               │
  ├─ marketplace.upload(meta) ──────►│                               │
  │                                  │                             │
  │                                  │◄── marketplace.purchase() ──┤
  │                                  │    → CDR.read()              │
  │  accessFee ◄─────────────────────│                             │
  │                                  │──► EncryptedPartial events ─►│
  │                                  │                             ├─ decrypt
```

Also explains key CDR behaviors:
- The condition bypass pattern (msg.sender == conditionAddr skips check)
- Event-driven partial collection
- TDH2 threshold scheme

### Layer 3: Integration Code

TypeScript code snippets showing how a developer would replicate this demo's functionality:

```typescript
// 1. Allocate a vault
const { uuid } = await writeClient.uploader.allocate({
  updatable: false,
  writeConditionAddr: myAddress,
  readConditionAddr: myAddress,
  writeConditionData: "0x",
  readConditionData: "0x",
});

// 2. Encrypt and write data
const globalPubKey = await client.observer.getGlobalPubKey();
const ciphertext = await writeClient.uploader.encryptDataKey({
  dataKey: new TextEncoder().encode(secret),
  globalPubKey,
  label: uuidToLabel(uuid),
});
await writeClient.uploader.write({ uuid, encryptedData: toHex(ciphertext.raw) });

// 3. Read and decrypt
const { txHash } = await writeClient.consumer.read({
  uuid, requesterPubKey: toHex(pubKey),
});
// ... collect partials, ECIES-decrypt, TDH2-combine
```

Links to full source code and external docs.

---

## 11. Progress Indicators

### New Pattern: Single Progress Bar

Replace the multi-step StepIndicator with a simpler single progress bar for all user-facing flows:

```
┌──────────────────────────────────────────┐
│ ████████████░░░░░░░░░░░░░░  Encrypting   │
│                              your data...│
└──────────────────────────────────────────┘
```

- Bar fills smoothly from 0% to 100%
- Status text updates at each internal step
- Bar color uses the demo's accent color
- On error: bar turns red, error message appears below
- On success: bar fills to 100% in green, result appears below

The internal steps (allocate, fetch DKG key, encrypt, write) still happen sequentially — the bar just maps them to percentage ranges:

| Internal step | Bar range | Status text |
|---------------|-----------|-------------|
| allocate | 0–25% | "Creating secure vault..." |
| fetchDKG | 25–40% | "Connecting to key network..." |
| encrypt | 40–65% | "Encrypting your data..." |
| write | 65–90% | "Storing on-chain..." |
| done | 100% | "Done!" |

For decryption flows with partial collection, the "Collecting validator responses" step shows the count inline: "Collecting validator responses (2/4)..."

### Developer Panel Still Uses StepIndicator

The existing StepIndicator component is preserved for the "How it works" Layer 2 diagrams where showing individual steps is valuable for developer understanding.

---

## 12. Dev Tools Pages

### Vault Inspector (`/vault`)

Minimal changes from current implementation. Remains a developer-facing tool.

### Licenses (`/licenses`)

Minimal changes from current implementation. Remains a developer-facing tool.

### Faucet (`/faucet`)

Minimal changes from current implementation. Add note: "Fund your wallet to try the demos."

### Dropdown Component

New `DevToolsDropdown` component in nav:

```tsx
<div className="relative">
  <button>Dev Tools ▾</button>
  <div className="absolute right-0 mt-1 w-48 rounded-lg border border-white/10 bg-black/90 backdrop-blur">
    <Link href="/vault">Vault Inspector</Link>
    <Link href="/licenses">Licenses</Link>
    <Link href="/faucet">Faucet</Link>
  </div>
</div>
```

---

## 13. New Files

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Rewritten home page with hero + demo cards |
| `src/app/secret/page.tsx` | Secret Share (Create/Reveal tabs) |
| `src/app/secret/[id]/page.tsx` | Secret Share reveal route (redirects to /secret with pre-filled ID) |
| `src/app/marketplace/page.tsx` | Rewritten marketplace with title/description/category |
| `src/app/agents/page.tsx` | Agent Exchange with scenario picker + SSE activity feed |
| `src/app/ai/page.tsx` | Confidential AI with model browse + inline results |
| `src/app/bounties/page.tsx` | Bounty Board with bounty cards + submission flow |
| `src/app/api/agents/run/route.ts` | SSE endpoint for agent demo orchestration |
| `src/app/api/ai/process/route.ts` | Mock inference endpoint |
| `src/app/api/bounties/evaluate/route.ts` | Mock TEE evaluation endpoint |
| `src/components/nav.tsx` | Updated nav with Dev Tools dropdown |
| `src/components/progress-bar.tsx` | New single-bar progress component |
| `src/components/how-it-works.tsx` | Collapsible 3-layer developer panel |
| `src/components/dev-tools-dropdown.tsx` | Nav dropdown for dev tools |

### Removed/Replaced Files

| File | Action |
|------|--------|
| `src/app/encrypt/page.tsx` | Remove — merged into Secret Share |
| `src/app/decrypt/page.tsx` | Remove — merged into Secret Share |
| `src/app/depin/page.tsx` | Remove — replaced by Bounty Board |
| `src/app/inference/page.tsx` | Remove — replaced by Confidential AI |

### Preserved Files (no changes)

| File | Reason |
|------|--------|
| `src/app/vault/page.tsx` | Moved to Dev Tools dropdown, no UI changes |
| `src/app/licenses/page.tsx` | Moved to Dev Tools dropdown, no UI changes |
| `src/app/faucet/page.tsx` | Moved to Dev Tools dropdown, minor copy change |
| All files in `contracts/src/` | No contract changes needed |
| All files in `cdr-sdk/` | Git submodule, never modified |

---

## 14. Environment Variables

### New

```
AGENT_A_PRIVATE_KEY=0x...         # Pre-funded seller agent wallet
AGENT_B_PRIVATE_KEY=0x...         # Pre-funded buyer agent wallet
DEPLOYER_PRIVATE_KEY=0x...        # Deployer key for mock inference results and TEE attestations
```

### Existing (unchanged)

```
NEXT_PUBLIC_RPC_URL=http://52.243.51.231:8545
NEXT_PUBLIC_CHAIN_ID=90931
NEXT_PUBLIC_PRIVY_APP_ID=cmn3a9mtn005j0cl85vthjpfz
NEXT_PUBLIC_CDR_VAULT_NFT=0x...
NEXT_PUBLIC_DATA_MARKETPLACE=0x...
NEXT_PUBLIC_DEPIN_BACKEND=0x...
NEXT_PUBLIC_CONFIDENTIAL_INFERENCE=0x...
CDR_FAUCET_PRIVATE_KEY=0x
```
