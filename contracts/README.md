# CDR Demo Contracts

Solidity contracts backing the five demos in `cdr-demo`. All contracts target **Story Aeneid Testnet** (chain ID `1315`).

## Layout

```
src/
  CDRVaultNFT.sol                  # Vault NFT that allocates CDR vault UUIDs
  ConfidentialInference.sol        # Submit encrypted queries, receive TEE-attested results
  DataMarketplace.sol              # List / purchase encrypted datasets
  DepinBackend.sol                 # Post data bounties, accept TEE-evaluated submissions
  DeadManSwitchCondition.sol       # Auto-unlock vaults after inactivity
  WhitelistCondition.sol           # Gate vault reads by whitelist
  TimeBasedCondition.sol           # Gate vault reads by block time
  FixedFeeCondition.sol            # Gate vault reads by per-read fee
  MarketplaceWriteCondition.sol    # Marketplace-scoped write gate
  DepinWriteCondition.sol          # DePIN-scoped write gate
  InferenceWriteCondition.sol      # Inference-scoped write gate
  VaultWriteCondition.sol          # Generic vault write gate
  Constants.sol

script/
  DeployAll.s.sol                  # Deploys marketplace + DePIN + inference + conditions
  Deploy.s.sol                     # Standalone vault deployment
  DeployDeadManSwitch.s.sol        # Standalone DeadManSwitchCondition deployment
  RegisterModels.s.sol             # Registers the three demo AI models

test/
  DeadManSwitchCondition.t.sol
  WhitelistCondition.t.sol
```

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- A funded deployer wallet on Story Aeneid Testnet

## Build and test

```bash
forge build
forge test
```

## Deploy

From the repo root, the easiest path is the one-shot script which deploys everything and registers models:

```bash
PRIVATE_KEY=0x<your-deployer-private-key> ./scripts/deploy-demo.sh
```

Or run individual Foundry scripts from this directory — see the root [README](../README.md#deploying-the-demo-contracts) for the manual walkthrough.

## License

[MIT](../LICENSE)
