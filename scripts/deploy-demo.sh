#!/bin/bash
set -euo pipefail

# CDR Demo — Full Deployment Script
# Deploys all contracts, registers models, and funds agent wallets.
#
# Prerequisites:
#   - foundry (forge, cast) installed
#   - PRIVATE_KEY env var set to a funded deployer wallet
#
# Usage:
#   PRIVATE_KEY=0x... ./scripts/deploy-demo.sh

RPC_URL="${RPC_URL:-https://aeneid.storyrpc.io}"
CONTRACTS_DIR="$(cd "$(dirname "$0")/../contracts" && pwd)"

if [ -z "${PRIVATE_KEY:-}" ]; then
  echo "ERROR: Set PRIVATE_KEY env var to a funded deployer wallet"
  exit 1
fi

DEPLOYER_ADDR=$(cast wallet address "$PRIVATE_KEY")
echo "Deployer: $DEPLOYER_ADDR"
echo ""

# ============================================================
# Step 1: Deploy all contracts
# ============================================================
echo "=== Step 1: Deploying contracts ==="
cd "$CONTRACTS_DIR"

DEPLOY_OUTPUT=$(forge script script/DeployAll.s.sol \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --private-key "$PRIVATE_KEY" \
  --priority-gas-price 30gwei \
  --with-gas-price 31gwei
  2>&1)

echo "$DEPLOY_OUTPUT"

# Parse deployed addresses from forge output
MARKETPLACE_ADDR=$(echo "$DEPLOY_OUTPUT" | grep "DataMarketplace:" | awk '{print $NF}')
DEPIN_ADDR=$(echo "$DEPLOY_OUTPUT" | grep "DepinBackend:" | awk '{print $NF}')
INFERENCE_ADDR=$(echo "$DEPLOY_OUTPUT" | grep "ConfidentialInference:" | awk '{print $NF}')

echo ""
echo "DataMarketplace:        $MARKETPLACE_ADDR"
echo "DepinBackend:           $DEPIN_ADDR"
echo "ConfidentialInference:  $INFERENCE_ADDR"
echo ""

# ============================================================
# Step 2: Register AI models
# ============================================================
echo "=== Step 2: Registering AI models ==="

CONFIDENTIAL_INFERENCE="$INFERENCE_ADDR" forge script script/RegisterModels.s.sol \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --private-key "$PRIVATE_KEY" \
  --priority-gas-price 30gwei \
  --with-gas-price 31gwei
  2>&1

echo ""

# ============================================================
# Step 3: Generate and fund agent wallets
# ============================================================
echo "=== Step 3: Generating agent wallets ==="

AGENT_A_KEY=$(cast wallet new --json | jq -r '.[0].private_key')
AGENT_A_ADDR=$(cast wallet address "$AGENT_A_KEY")

AGENT_B_KEY=$(cast wallet new --json | jq -r '.[0].private_key')
AGENT_B_ADDR=$(cast wallet address "$AGENT_B_KEY")

echo "Agent A (Seller): $AGENT_A_ADDR"
echo "Agent B (Buyer):  $AGENT_B_ADDR"
echo ""

echo "Funding Agent A with 10 IP..."
cast send "$AGENT_A_ADDR" --value 10ether --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --priority-gas-price 30gwei --gas-price 31gwei > /dev/null
echo "Funding Agent B with 10 IP..."
cast send "$AGENT_B_ADDR" --value 10ether --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --priority-gas-price 30gwei --gas-price 31gwei > /dev/null
echo "Done."
echo ""

# ============================================================
# Step 4: Output .env.local values
# ============================================================
echo "============================================"
echo "  Add these to your .env.local file:"
echo "============================================"
echo ""
echo "NEXT_PUBLIC_DATA_MARKETPLACE=$MARKETPLACE_ADDR"
echo "NEXT_PUBLIC_DEPIN_BACKEND=$DEPIN_ADDR"
echo "NEXT_PUBLIC_CONFIDENTIAL_INFERENCE=$INFERENCE_ADDR"
echo "AGENT_A_PRIVATE_KEY=$AGENT_A_KEY"
echo "AGENT_B_PRIVATE_KEY=$AGENT_B_KEY"
echo "DEPLOYER_PRIVATE_KEY=$PRIVATE_KEY"
echo ""
echo "============================================"
echo "  Deployment complete! Run: pnpm dev"
echo "============================================"
