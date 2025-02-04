
import { Next } from "hono"

import { Context } from "hono"
import postgres from "postgres"

// export const sql = postgres(process.env.POSTGRES_URL!)

export function postgresMiddleware(c: Context, next: Next) {
  c.set('sql', postgres(c.env.POSTGRES_URL))
  return next()
}

// const modifier = `
//     You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit. You are 
//   empowered to interact onchain using your tools. If you ever need funds, you can request them from the 
//   faucet if you are on network ID 'base-sepolia'. If not, you can provide your wallet details and request 
//   funds from the user. Before executing your first action, get the wallet details to see what network 
//   you're on. If there is a 5XX (internal) HTTP error code, ask the user to try again later. If someone 
//   asks you to do something you can't do with your currently available tools, you must say so, and 
//   encourage them to implement it themselves using the CDP SDK + Agentkit, recommend they go to 
//   docs.cdp.coinbase.com for more information. Be concise and helpful with your responses. Refrain from 
//   restating your tools' descriptions unless it is explicitly requested.
// `;


// async function initialize(c: Context<HonoSchema>) {
//   const checkpointer = PostgresSaver.fromConnString(c.env.POSTGRES_URL);
//   // await checkpointer.setup();
//   const address = c.req.param('wallet')

//   // const sql = c.var.sql`SELECT * FROM wallets WHERE address = ${address}`
//   const wallet = await c.var.sql<Wallet[]>`SELECT * FROM wallets WHERE address = ${address!}`.then(res => res.length > 0 && res[0])
//   if (!wallet) {
//     throw new Error('Wallet not found')
//   }
//   // Initialize LLM
//   const llm = new ChatOpenAI({ model: "gpt-4o-mini", apiKey: c.env.OPENAI_API_KEY });
//   const account = privateKeyToAccount(wallet.private_key as `0x${string}`)
//   const client = createWalletClient({
//     account,
//     chain: baseSepolia,
//     transport: http(),
//   })
//   const walletProvider = new ViemWalletProvider(client as WalletClient);

//   // const walletProvider = await CdpWalletProvider.configureWithWallet(
//   //   {
//   //     apiKeyName: "organizations/361a3577-34b6-4dd0-aa3a-086eb351e564/apiKeys/fcaecd16-37bf-44de-ae5b-540ecf5fcad5",
//   //     apiKeyPrivateKey: "-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEINsuM0nKy4/XJcpW/vkOQHnMxELt1enlFOXkh9ojb3mGoAoGCCqGSM49\nAwEHoUQDQgAEFXTIUzYrqmk7U2CHYSz9jWJl8B5rn1IW4PN5wLKteAM9Xc048vyU\niLZJmlhJcLpgus4eneqrAv0EFwNrvis/ng==\n-----END EC PRIVATE KEY-----\n",
//   //     // networkId: "base-sepolia",
//   //   }
//   // );
//   try {
//     const agentkit = await AgentKit.from({
//       walletProvider,
//       actionProviders: [walletActionProvider(), cdpApiActionProvider({
//         apiKeyName: "organizations/361a3577-34b6-4dd0-aa3a-086eb351e564/apiKeys/fcaecd16-37bf-44de-ae5b-540ecf5fcad5",
//         apiKeyPrivateKey: "-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEINsuM0nKy4/XJcpW/vkOQHnMxELt1enlFOXkh9ojb3mGoAoGCCqGSM49\nAwEHoUQDQgAEFXTIUzYrqmk7U2CHYSz9jWJl8B5rn1IW4PN5wLKteAM9Xc048vyU\niLZJmlhJcLpgus4eneqrAv0EFwNrvis/ng==\n-----END EC PRIVATE KEY-----\n".replace(/\\n/g, "\n"),
//         //     // networkId: "base-sepolia",
//       })],
//     });

//     const tools = await getLangChainTools(agentkit);

//     // React Agent options
//     // const agentConfig = { configurable: { thread_id: "Twitter Agentkit Chatbot Example!" } };

//     // Create React Agent using the LLM and Twitter (X) tools
//     const agent = createReactAgent({
//       llm,
//       tools,
//       checkpointSaver: checkpointer,
//       messageModifier: modifier,
//     });

//     return { agent };
//   } catch (error) {
//     console.error(error)
//     throw error
//   }
// }

// export async function agentMiddleware(c: Context, next: Next) {
//   try {
//     console.log(c.req.param())
//     const { agent } = await initialize(c)
//     c.set('agent', agent)
//     return next()
//   } catch (error) {
//     console.log(error)
//     return c.json({ error: 'Failed to initialize agent' }, 500)
//   }
// }

// export async function jwtMiddleware(c: Context, next: Next) {


//     const jwtMiddleware = jwt({
//         secret: c.env.JWT_SECRET,
//         // cookie: 'access-token',
//     })
//     // return next()
//     return jwtMiddleware(c, next)
// }


export type HonoSchema = {
  Bindings: {
    POSTGRES_URL: string
    CDP_API_KEY_NAME: string
    CDP_API_KEY_PRIVATE_KEY: string
    OPENAI_API_KEY: string
    NETWORK_ID: string
    RPC_URL: string
    CONTRACT_ADDRESS: string
    // JWT_SECRET: string
    // INFERENCE_URL: string
    // UPSTASH_REDIS_REST_URL: string
    // UPSTASH_REDIS_REST_TOKEN: string
  }, Variables: {
    sql: postgres.Sql
    agent: any
  }
}