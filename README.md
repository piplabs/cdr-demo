# CDR: Privacy Infra for AI

Threshold-encrypted data vaults on Story L1. Share secrets, trade data, run confidential AI — no single point of trust.

> A reference frontend for the CDR SDK showing five end-to-end demos against Story Aeneid Testnet (chain ID **1315**).

## Demos

| Demo | Route | Description |
|------|-------|-------------|
| Secret Share | `/secret` | Share secrets via zero-trust links |
| Data Marketplace | `/marketplace` | Buy and sell encrypted data, no middleman |
| Agent Exchange | `/agents` | Watch AI agents trade data autonomously |
| Confidential AI | `/ai` | Run AI models on private data |
| Bounty Board | `/bounties` | Post data bounties with trustless evaluation |

## Prerequisites

- Node.js 18+
- pnpm
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (forge, cast) — only needed if you deploy contracts
- A wallet funded on Story Aeneid Testnet (chain ID `1315`, RPC `https://aeneid.storyrpc.io`)

## Quick start

```bash
git clone --recurse-submodules https://github.com/piplabs/cdr-demo.git
cd cdr-demo
pnpm install
cp .env.local.example .env.local
# Fill in .env.local (see "Environment" below)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The `Secret Share` demo works out-of-the-box against the pre-deployed `CDR_VAULT_NFT`. The other demos require deploying the demo contracts (see below).

## Environment

Minimum `.env.local` to boot the app:

```env
NEXT_PUBLIC_RPC_URL=https://aeneid.storyrpc.io
NEXT_PUBLIC_CHAIN_ID=1315
NEXT_PUBLIC_PRIVY_APP_ID=<your-privy-app-id>
PRIVY_APP_SECRET=<your-privy-app-secret>
NEXT_PUBLIC_CDR_VAULT_NFT=0xfcDB4564c18A9134002b9771816092C9693622e3

# Server-side CometBFT RPC for x/dkg queries — never shipped to the browser
COMETBFT_RPC_URL=http://<your-cometbft-node>:26657
```

See `.env.local.example` for the full list (demo contracts, agent wallets, Storacha, OpenAI).

### What each demo needs

| Demo | Required env |
|------|--------------|
| Secret Share | `NEXT_PUBLIC_CDR_VAULT_NFT`, `PRIVY_APP_SECRET` |
| Confidential AI (API-only) | `OPENAI_API_KEY`, `DEPLOYER_PRIVATE_KEY` |
| Data Marketplace | `NEXT_PUBLIC_DATA_MARKETPLACE`, `STORACHA_*` for uploads |
| Agent Exchange | `NEXT_PUBLIC_DATA_MARKETPLACE`, `AGENT_A_PRIVATE_KEY`, `AGENT_B_PRIVATE_KEY`, `OPENAI_API_KEY` |
| Bounty Board | `NEXT_PUBLIC_DEPIN_BACKEND`, `DEPLOYER_PRIVATE_KEY` |

## Deploying the demo contracts

The one-shot script deploys all demo contracts, registers three AI models, and generates + funds two agent wallets from your deployer key:

```bash
PRIVATE_KEY=0x<your-deployer-private-key> ./scripts/deploy-demo.sh
```

The script prints the env values to paste into `.env.local`.

<details>
<summary>Manual step-by-step deployment</summary>

If you'd rather deploy each contract individually, export your RPC + key:

```bash
export RPC_URL=https://aeneid.storyrpc.io
export PRIVATE_KEY=0x<your-deployer-private-key>
cd contracts
```

**Data Marketplace**

```bash
forge create src/MarketplaceWriteCondition.sol:MarketplaceWriteCondition \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY

forge create src/DataMarketplace.sol:DataMarketplace \
  --constructor-args $WRITE_CONDITION_ADDR \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY

cast send $WRITE_CONDITION_ADDR "initialize(address)" $MARKETPLACE_ADDR \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY
```

**Bounty Board (DePIN Backend)**

```bash
forge create src/DepinWriteCondition.sol:DepinWriteCondition \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY

forge create src/DepinBackend.sol:DepinBackend \
  --constructor-args $WRITE_CONDITION_ADDR \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY

cast send $WRITE_CONDITION_ADDR "initialize(address)" $DEPIN_ADDR \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY

cast send $DEPIN_ADDR "setTEEAuthorization(address,bool)" $DEPLOYER_ADDR true \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY
```

**Confidential Inference**

```bash
forge create src/InferenceWriteCondition.sol:InferenceWriteCondition \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY

forge create src/ConfidentialInference.sol:ConfidentialInference \
  --constructor-args $WRITE_CONDITION_ADDR \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY

cast send $WRITE_CONDITION_ADDR "initialize(address)" $INFERENCE_ADDR \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY

cast send $INFERENCE_ADDR "setTEEAuthorization(address,bool)" $DEPLOYER_ADDR true \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY
```

**Register AI models**

```bash
ALLOC_FEE=$(cast call $INFERENCE_ADDR "CDR_CONTRACT()" --rpc-url $RPC_URL \
  | xargs cast call --rpc-url $RPC_URL "allocateFee()(uint256)")

# Sentiment Analyzer (0.01 IP per query)
cast send $INFERENCE_ADDR "registerModel(uint256,bytes32)" \
  $(cast to-wei 0.01) 0x0000000000000000000000000000000000000000000000000000000000000001 \
  --value $ALLOC_FEE --rpc-url $RPC_URL --private-key $PRIVATE_KEY

# Text Summarizer (0.02 IP per query)
cast send $INFERENCE_ADDR "registerModel(uint256,bytes32)" \
  $(cast to-wei 0.02) 0x0000000000000000000000000000000000000000000000000000000000000002 \
  --value $ALLOC_FEE --rpc-url $RPC_URL --private-key $PRIVATE_KEY

# Entity Extractor (0.01 IP per query)
cast send $INFERENCE_ADDR "registerModel(uint256,bytes32)" \
  $(cast to-wei 0.01) 0x0000000000000000000000000000000000000000000000000000000000000003 \
  --value $ALLOC_FEE --rpc-url $RPC_URL --private-key $PRIVATE_KEY
```

**Fund agent wallets**

```bash
cast wallet new  # Agent A (seller) — save the key
cast wallet new  # Agent B (buyer) — save the key

cast send $AGENT_A_ADDR --value 10ether --rpc-url $RPC_URL --private-key $PRIVATE_KEY
cast send $AGENT_B_ADDR --value 10ether --rpc-url $RPC_URL --private-key $PRIVATE_KEY
```

</details>

## Tech stack

- **Frontend:** Next.js 14, React 18, Tailwind CSS
- **Wallet:** Privy (`@privy-io/react-auth`)
- **CDR SDK:** `@piplabs/cdr-sdk`, `@piplabs/cdr-crypto`, `@piplabs/cdr-contracts` (vendored submodule)
- **Smart contracts:** Solidity 0.8.26, Foundry
- **Chain:** Story Aeneid Testnet (chain ID `1315`)

## Project structure

```
src/
  app/
    page.tsx                       # Home — hero + demo cards
    secret/                        # Secret Share (Create/Reveal/Dead-man's-switch)
    marketplace/                   # Data Marketplace (Browse/Sell/Purchases)
    agents/                        # Agent Exchange (scenario picker + activity feed)
    ai/                            # Confidential AI (model browse + queries)
    bounties/                      # Bounty Board
    vault/, licenses/, faucet/     # Dev tools
    api/
      agents/run/                  # SSE endpoint for agent demo
      ai/process/                  # Mock AI inference
      bounties/evaluate/           # Mock TEE evaluation
      comet/[...segments]/         # Server-only CometBFT proxy (x/dkg queries)
      privy/resolve/               # Email → Privy wallet resolver
      rpc/                         # EVM RPC pass-through
      faucet/, storage/, vaults/   # Misc endpoints
  components/, hooks/, lib/, config/
contracts/
  src/                             # Solidity contracts
  script/                          # Foundry deploy scripts
scripts/
  deploy-demo.sh                   # One-command full deployment
```

## License

[MIT](./LICENSE)
