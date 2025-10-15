export const erc20Abi = [
  { "type":"function", "name":"balanceOf", "stateMutability":"view", "inputs":[{"name":"account","type":"address"}], "outputs":[{"name":"","type":"uint256"}] },
  { "type":"function", "name":"transfer", "stateMutability":"nonpayable", "inputs":[{"name":"to","type":"address"},{"name":"amount","type":"uint256"}], "outputs":[{"name":"","type":"bool"}] }
] as const;

// CallBreaker deposit function
export const callBreakerAbi = [
  {
    "type": "function",
    "name": "deposit",
    "stateMutability": "payable",
    "inputs": [],
    "outputs": []
  },
  {
    "type": "function", 
    "name": "senderBalances",
    "stateMutability": "view",
    "inputs": [{"name": "sender", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}]
  }
] as const;

// Minimal ISmartExecute ABI for pushUserObjective
export const ismartExecuteAbi = [
  {
    "type":"function",
    "name":"pushUserObjective",
    "stateMutability":"payable",
    "inputs":[
      {
        "name":"_userObjective",
        "type":"tuple",
        "components":[
          {"name":"appId","type":"bytes"},
          {"name":"nonce","type":"uint256"},
          {"name":"tip","type":"uint256"},
          {"name":"chainId","type":"uint256"},
          {"name":"maxFeePerGas","type":"uint256"},
          {"name":"maxPriorityFeePerGas","type":"uint256"},
          {"name":"sender","type":"address"},
          {"name":"callObjects","type":"tuple[]","components":[
            {"name":"salt","type":"uint256"},
            {"name":"amount","type":"uint256"},
            {"name":"gas","type":"uint256"},
            {"name":"addr","type":"address"},
            {"name":"callvalue","type":"bytes"},
            {"name":"returnvalue","type":"bytes"},
            {"name":"skippable","type":"bool"},
            {"name":"verifiable","type":"bool"},
            {"name":"exposeReturn","type":"bool"}
          ]}
        ]
      },
      { "name":"_additionalData", "type":"tuple[]", "components":[
        {"name":"key","type":"bytes32"},
        {"name":"value","type":"bytes"}
      ]}
    ],
    "outputs":[{"name":"requestId","type":"bytes32"}]
  }
] as const;
