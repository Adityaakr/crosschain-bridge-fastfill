export const USDC_ARB = process.env.USDC_ARB ?? "0xaf88d065e77c8cc2239327c5edb3a432268e5831"; // mainnet USDC on Arbitrum
export const CALLBREAKER_ARB = process.env.CALLBREAKER_ARB; // required
export const ARB_RPC_URL = process.env.ARB_RPC_URL;         // required
export const ARB_RELAYER_PK = process.env.ARB_RELAYER_PK;   // required

// App config
export const APP_ID = "app.cross.fastfill.v1";
export const MIN_RECEIVE_6DP = 9_800_000n; // 9.8 USDC
export const CHAIN_ID_ARB = 421614n; // Arbitrum Sepolia testnet

// gas caps (tune these)
export const MAX_FEE_PER_GAS = 20_000_000n;        // 0.02 gwei in wei? (example placeholder; set real caps!)
export const MAX_PRIORITY_FEE_PER_GAS = 200_000n;  // placeholder
