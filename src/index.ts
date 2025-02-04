import 'dotenv/config'
import { HumanMessage } from "@langchain/core/messages";
import { Hono } from 'hono'
import { z } from 'zod'
import { cors } from 'hono/cors'
import { HonoSchema, agentMiddleware, postgresMiddleware } from './middleware'
import { serve } from '@hono/node-server'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

const app = new Hono<HonoSchema>()
app.use('*', cors())
app.use('*', postgresMiddleware)

app.post('/wallets', async (c) => {
  const sql = c.var.sql
  const privateKey = generatePrivateKey()
  const address = privateKeyToAccount(privateKey).address

  const wallet = {
    address,
    private_key: privateKey,
  }

  await sql`INSERT INTO wallets ${sql(wallet)}`

  return c.json({ address })
})

app.use('/wallets/:wallet/*', agentMiddleware)

app.post('/wallets/:wallet/messages', async (c) => {
  const address = c.req.param('wallet')
  const agent = c.get('agent')
  const body = await c.req.json()

  const { data, error } = z.object({
    message: z.string(),
    // signature: z.string(),
  })
    .safeParse(body)

  if (!data) {
    return c.json({ error: error.format() }, 400)
  }

  const { message } = data

  const stream = await agent.stream({ messages: [new HumanMessage(message)] }, { configurable: { thread_id: address } });
  let answer = ""
  for await (const chunk of stream) {
    if ("agent" in chunk) {
      answer += chunk.agent.messages[0].content
    } else if ("tools" in chunk) {
      answer += chunk.tools.messages[0].content
    }
    console.log("-------------------");
  }

  return c.json({ answer })
})

export default app
// serve(app)