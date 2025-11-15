#!/bin/bash
# Helper script to deploy to local Anvil node

set -e

# Load and export environment variables
if [ -f .env.local ]; then
    set -a  # Automatically export all variables
    source .env.local
    set +a  # Turn off automatic export
else
    echo "Error: .env.local file not found!"
    echo "Please create .env.local with the required environment variables."
    exit 1
fi

# Verify required variables are set
if [ -z "$ROYALTY_REGISTRY" ] || [ -z "$RPC_URL" ] || [ -z "$PRIVATE_KEY" ]; then
    echo "Error: Required environment variables not set!"
    echo "Please check your .env.local file."
    exit 1
fi

# Check if Anvil is running
if ! curl -s http://127.0.0.1:8545 > /dev/null 2>&1; then
    echo "Error: Anvil is not running on http://127.0.0.1:8545"
    echo "Please start Anvil in another terminal: anvil"
    exit 1
fi

# Extract deployer address from private key
DEPLOYER_ADDRESS=$(cast wallet address $PRIVATE_KEY 2>/dev/null || echo "")
if [ -z "$DEPLOYER_ADDRESS" ]; then
    echo "Warning: Could not extract address from private key. Proceeding without --sender flag."
    SENDER_FLAG=""
else
    SENDER_FLAG="--sender $DEPLOYER_ADDRESS"
    echo "Deployer address: $DEPLOYER_ADDRESS"
fi

# Run the deployment script
echo "Deploying to local Anvil node..."
forge script script/DeployAll.s.sol:DeployAll \
  --rpc-url $RPC_URL \
  --skip test \
  --broadcast \
  $SENDER_FLAG \
  -vvvv

