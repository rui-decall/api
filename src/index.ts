// import 'dotenv/config'
import { HumanMessage } from "@langchain/core/messages";
import { Hono } from 'hono'
import { z } from 'zod'
import { cors } from 'hono/cors'
import { HonoSchema, postgresMiddleware } from './middleware'
import { serve } from '@hono/node-server'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { createWalletClient, http, parseEther } from "viem";
import { baseSepolia } from "viem/chains";
import { timeout } from 'hono/timeout'



const app = new Hono<HonoSchema>()
app.use('*', cors())
app.use('*', postgresMiddleware)

app.post('/phones/:phone/wallets', async (c) => {
  
  const phone = c.req.param('phone')
  const body = await c.req.json()

  if (!phone) {
    return c.json({ error: 'Phone is required' }, 400)
  }

  const sql = c.var.sql
  const privateKey = generatePrivateKey()
  const address = privateKeyToAccount(privateKey).address

  const wallet = {
    address,
    private_key: privateKey,
    phone,
  }

  await sql`INSERT INTO wallets ${sql(wallet)}`

  return c.json({ address })
})

app.get('/phones/:phone/wallets', async (c) => {
  const phone = c.req.param('phone')
  const sql = c.var.sql

  const wallets = await sql`SELECT * FROM wallets WHERE phone = ${phone}`

  return c.json({ wallets })
})

app.post('/transfers', timeout(30000), async (c) => {
  const body = await c.req.json()

  const { data, error } = z.object({
    from_address: z.string(),
    to_address: z.string(),
    amount: z.string(),
  })
    .safeParse(body)

  if (!data) {
    return c.json({ error: error.format() }, 400)
  }

  const { from_address, to_address, amount } = data
  const fromWallet = await c.var.sql<{
    address: string
    private_key: string
  }[]>`SELECT * FROM wallets WHERE address = ${from_address}`
    .then(res => res.length > 0 && res[0])

  if (!fromWallet) {
    return c.json({ error: 'From wallet not found' }, 400)
  }

  const account = privateKeyToAccount(fromWallet.private_key as `0x${string}`)
  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  })
  const tx = await client.sendTransaction({
    to: to_address as `0x${string}`,
    value: parseEther(amount),
  })

  return c.json({ tx })
})

// app.use('/wallets/:wallet/*', agentMiddleware)

// app.post('/wallets/:wallet/messages', async (c) => {
//   const address = c.req.param('wallet')
//   const agent = c.get('agent')
//   const body = await c.req.json()

//   const { data, error } = z.object({
//     message: z.string(),
//     // signature: z.string(),
//   })
//     .safeParse(body)

//   if (!data) {
//     return c.json({ error: error.format() }, 400)
//   }

//   const { message } = data

//   const stream = await agent.stream({ messages: [new HumanMessage(message)] }, { configurable: { thread_id: address } });
//   let answer = ""
//   for await (const chunk of stream) {
//     if ("agent" in chunk) {
//       answer += chunk.agent.messages[0].content
//     } else if ("tools" in chunk) {
//       answer += chunk.tools.messages[0].content
//     }
//     console.log("-------------------");
//   }

//   return c.json({ answer })
// })

export default app
// serve(app)