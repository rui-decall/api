import { AgentKit, cdpApiActionProvider, CdpWalletProvider, twitterActionProvider, ViemWalletProvider, walletActionProvider } from "@coinbase/agentkit"
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http, WalletClient } from "viem";
import { baseSepolia } from "viem/chains";
// const llm = new ChatOpenAI({ model: "gpt-4o-mini", apiKey: process.env.OPENAI_API_KEY });
const account = privateKeyToAccount(`0xdfdc5c46a3e64ae23198b8d0a448978659e31b67c735acae3ec6886fa4425805`)
const client = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(),
})
const walletProvider = new ViemWalletProvider(client as WalletClient);

async function main() {
    const agentkit = await AgentKit.from({
        walletProvider,
        actionProviders: [walletActionProvider(), cdpApiActionProvider({
      apiKeyName: "organizations/361a3577-34b6-4dd0-aa3a-086eb351e564/apiKeys/fcaecd16-37bf-44de-ae5b-540ecf5fcad5",
      apiKeyPrivateKey: "-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEINsuM0nKy4/XJcpW/vkOQHnMxELt1enlFOXkh9ojb3mGoAoGCCqGSM49\nAwEHoUQDQgAEFXTIUzYrqmk7U2CHYSz9jWJl8B5rn1IW4PN5wLKteAM9Xc048vyU\niLZJmlhJcLpgus4eneqrAv0EFwNrvis/ng==\n-----END EC PRIVATE KEY-----\n".replace(/\\n/g, "\n"),
      //     // networkId: "base-sepolia",
    })],
  });
}

main()