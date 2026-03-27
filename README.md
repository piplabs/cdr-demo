# CDR: Privacy Infra for AI

Threshold-encrypted data vaults on Story L1. Share secrets, trade data, run confidential AI — no single point of trust.

## Demos

| Demo | Route | Description |
|------|-------|-------------|
| Secret Share | `/secret` | Share secrets via zero-trust links |
| Data Marketplace | `/marketplace` | Buy and sell encrypted data, no middleman |
| Agent Exchange | `/agents` | Watch AI agents trade data autonomously |
| Confidential AI | `/ai` | Run AI models on private data |
| Bounty Board | `/bounties` | Post data bounties with trustless evaluation |

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (forge, cast)
- A funded deployer wallet on CDR Devnet (chain ID 90931)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Deploy contracts and set up the demo

The deploy script handles everything: deploys all contracts, registers AI models, generates and funds agent wallets.

```bash
PRIVATE_KEY=0x<your-deployer-private-key> ./scripts/deploy-demo.sh
```

This outputs all the values you need for `.env.local`. Copy them.

### 3. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in the values from the deploy script output:

```env
# Chain config (defaults work for CDR Devnet)
NEXT_PUBLIC_RPC_URL=http://52.243.51.231:8545
NEXT_PUBLIC_CHAIN_ID=90931
NEXT_PUBLIC_PRIVY_APP_ID=cmn3a9mtn005j0cl85vthjpfz

# Existing contracts (already deployed)
NEXT_PUBLIC_CDR_VAULT_NFT=0x...

# Demo contracts (from deploy script output)
NEXT_PUBLIC_DATA_MARKETPLACE=0x...
NEXT_PUBLIC_DEPIN_BACKEND=0x...
NEXT_PUBLIC_CONFIDENTIAL_INFERENCE=0x...

# Faucet
CDR_FAUCET_PRIVATE_KEY=0x...

# Agent Exchange (from deploy script output)
AGENT_A_PRIVATE_KEY=0x...
AGENT_B_PRIVATE_KEY=0x...

# Deployer (for mock TEE and inference)
DEPLOYER_PRIVATE_KEY=0x...
```

### 4. Run the app

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Manual Deployment (step by step)

If you prefer to deploy contracts individually instead of using the deploy script:

### Deploy Data Marketplace

```bash
cd contracts

# 1. Deploy write condition
forge create src/MarketplaceWriteCondition.sol:MarketplaceWriteCondition \
  --rpc-url http://52.243.51.231:8545 --private-key $PRIVATE_KEY

# 2. Deploy marketplace (pass write condition address as constructor arg)
forge create src/DataMarketplace.sol:DataMarketplace \
  --constructor-args $WRITE_CONDITION_ADDR \
  --rpc-url http://52.243.51.231:8545 --private-key $PRIVATE_KEY

# 3. Initialize write condition with marketplace address
cast send $WRITE_CONDITION_ADDR "initialize(address)" $MARKETPLACE_ADDR \
  --rpc-url http://52.243.51.231:8545 --private-key $PRIVATE_KEY
```

### Deploy Bounty Board (DePIN Backend)

```bash
# 1. Deploy write condition
forge create src/DepinWriteCondition.sol:DepinWriteCondition \
  --rpc-url http://52.243.51.231:8545 --private-key $PRIVATE_KEY

# 2. Deploy DePIN backend
forge create src/DepinBackend.sol:DepinBackend \
  --constructor-args $WRITE_CONDITION_ADDR \
  --rpc-url http://52.243.51.231:8545 --private-key $PRIVATE_KEY

# 3. Initialize write condition
cast send $WRITE_CONDITION_ADDR "initialize(address)" $DEPIN_ADDR \
  --rpc-url http://52.243.51.231:8545 --private-key $PRIVATE_KEY

# 4. Authorize deployer as TEE (for mock evaluation)
cast send $DEPIN_ADDR "setTEEAuthorization(address,bool)" $DEPLOYER_ADDR true \
  --rpc-url http://52.243.51.231:8545 --private-key $PRIVATE_KEY
```

### Deploy Confidential Inference

```bash
# 1. Deploy write condition
forge create src/InferenceWriteCondition.sol:InferenceWriteCondition \
  --rpc-url http://52.243.51.231:8545 --private-key $PRIVATE_KEY

# 2. Deploy inference contract
forge create src/ConfidentialInference.sol:ConfidentialInference \
  --constructor-args $WRITE_CONDITION_ADDR \
  --rpc-url http://52.243.51.231:8545 --private-key $PRIVATE_KEY

# 3. Initialize write condition
cast send $WRITE_CONDITION_ADDR "initialize(address)" $INFERENCE_ADDR \
  --rpc-url http://52.243.51.231:8545 --private-key $PRIVATE_KEY

# 4. Authorize deployer as TEE
cast send $INFERENCE_ADDR "setTEEAuthorization(address,bool)" $DEPLOYER_ADDR true \
  --rpc-url http://52.243.51.231:8545 --private-key $PRIVATE_KEY
```

### Register AI Models

```bash
# Get allocate fee
ALLOC_FEE=$(cast call $INFERENCE_ADDR "CDR_CONTRACT()" --rpc-url http://52.243.51.231:8545 | xargs cast call --rpc-url http://52.243.51.231:8545 "allocateFee()(uint256)")

# Model 0: Sentiment Analyzer (0.01 IP per query)
cast send $INFERENCE_ADDR "registerModel(uint256,bytes32)" \
  $(cast to-wei 0.01) 0x0000000000000000000000000000000000000000000000000000000000000001 \
  --value $ALLOC_FEE --rpc-url http://52.243.51.231:8545 --private-key $PRIVATE_KEY

# Model 1: Text Summarizer (0.02 IP per query)
cast send $INFERENCE_ADDR "registerModel(uint256,bytes32)" \
  $(cast to-wei 0.02) 0x0000000000000000000000000000000000000000000000000000000000000002 \
  --value $ALLOC_FEE --rpc-url http://52.243.51.231:8545 --private-key $PRIVATE_KEY

# Model 2: Entity Extractor (0.01 IP per query)
cast send $INFERENCE_ADDR "registerModel(uint256,bytes32)" \
  $(cast to-wei 0.01) 0x0000000000000000000000000000000000000000000000000000000000000003 \
  --value $ALLOC_FEE --rpc-url http://52.243.51.231:8545 --private-key $PRIVATE_KEY
```

### Fund Agent Wallets

```bash
# Generate two wallets for Agent Exchange demo
cast wallet new  # Agent A (seller) — save the private key
cast wallet new  # Agent B (buyer) — save the private key

# Fund each with 10 IP
cast send $AGENT_A_ADDR --value 10ether \
  --rpc-url http://52.243.51.231:8545 --private-key $PRIVATE_KEY
cast send $AGENT_B_ADDR --value 10ether \
  --rpc-url http://52.243.51.231:8545 --private-key $PRIVATE_KEY
```

## Demo Features Without Contracts

Some demos work without deployed contracts:

| Demo | Without contract |
|------|-----------------|
| Secret Share | Fully functional (uses CDR directly) |
| Confidential AI | API-only mode (skips on-chain, calls mock backend) |
| Data Marketplace | Requires `DATA_MARKETPLACE` contract |
| Agent Exchange | Requires `DATA_MARKETPLACE` contract + funded agent wallets |
| Bounty Board | Requires `DEPIN_BACKEND` contract |

## Tech Stack

- **Frontend:** Next.js 14, React 18, Tailwind CSS
- **Wallet:** Privy (`@privy-io/react-auth`)
- **CDR SDK:** `@piplabs/cdr-sdk`, `@piplabs/cdr-crypto`, `@piplabs/cdr-contracts`
- **Smart Contracts:** Solidity 0.8.26, Foundry
- **Chain:** CDR Devnet (chain ID 90931)

## Project Structure

```
src/
  app/
    page.tsx              # Home — hero + demo cards
    secret/page.tsx       # Secret Share (Create/Reveal tabs)
    marketplace/page.tsx  # Data Marketplace (Browse/Sell/Purchases)
    agents/page.tsx       # Agent Exchange (scenario picker + activity feed)
    ai/page.tsx           # Confidential AI (model browse + queries)
    bounties/page.tsx     # Bounty Board (bounties + submissions)
    vault/page.tsx        # Dev Tools — Vault Inspector
    licenses/page.tsx     # Dev Tools — License Management
    faucet/page.tsx       # Dev Tools — Testnet Faucet
    api/
      agents/run/route.ts      # SSE endpoint for agent demo
      ai/process/route.ts      # Mock AI inference
      bounties/evaluate/route.ts  # Mock TEE evaluation
  components/
    nav.tsx               # Navigation with Dev Tools dropdown
    progress-bar.tsx      # Single progress bar component
    how-it-works.tsx      # Collapsible 3-layer developer panel
  lib/
    collect-partials.ts   # Shared partial collection utility
contracts/
  src/                    # Solidity contracts
  script/
    DeployAll.s.sol       # Deploy all demo contracts
    RegisterModels.s.sol  # Register AI models
scripts/
  deploy-demo.sh          # One-command full deployment
```
