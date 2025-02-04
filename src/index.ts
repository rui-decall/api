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
import { RetellRequest } from './types/RetellRequest'



const app = new Hono<HonoSchema>()
app.use('*', cors())
app.use('*', postgresMiddleware)

app.post('/phones/:phone/wallets', async (c) => {
  
  const phone = c.req.param('phone')

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
  console.log('hi')
  const sql = c.var.sql

  const wallets = await sql<{
    address: string
    phone: string
  }[]>`SELECT address, phone FROM wallets WHERE phone = ${phone}`
  if (wallets.length === 0) {
    return c.json({ error: 'Wallet not found' }, 404)
  }

  const wallet = wallets[0]

  return c.json({ wallet })
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

app.post('/get_user_info', async (c) => {
  const body = await c.req.json()
  const request = new RetellRequest(body)
  return c.json({
    user_name: 'Yao'
  })
})


app.post('/get_available_slots', async (c) => {
  const body = await c.req.json()

  try {
    const request = new RetellRequest(body)
    
    console.log('Call ID:', request.callId)
    console.log('Query:', request.query)
    console.log('Dynamic Variables:', request.dynamicVariables)
    console.log('Call Type:', request.callType)
    console.log('Name:', request.name)

    // return a dummy response, natural language response
    return c.json({
      response: `Available slots are 10am and 11am`,
    })
  } catch (error) {
    return c.json({ 
      error: 'Invalid request format', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 400)
  }
})

// app.post('/create_appointment', async (c) => {
//   const body = await c.req.json()
//   const request = new RetellRequest(body)

//   // the query is in natural language
//   // example: User would like to book an appointment with Dr. John Doe on 2025-02-03 at 10am.
//   // extraction will need to occurs somewhere here.


//   // dummy response
//   return c.json({
//     response: {
//       appointment_id: '1234567890',
//       appointment_remarks: 'successfully created appointment',
//     },
//   })
// })

// app.post('/edit_appointment', async (c) => {
//   const body = await c.req.json()
//   const request = new RetellRequest(body)

//   // the query is in natural language
//   // example: User would like to edit the appointment with Dr. John Doe on 2025-02-03 at 10am to 2025-02-04 at 11am.
//   // extraction will need to occur somewhere here.

//   // dummy response
//   return c.json({
//     response: {
//       appointment_id: '1234567890',
//       appointment_remarks: 'successfully edited appointment',
//     },
//   })
// })

app.post('/get_user_appointment', async (c) => {
  const body = await c.req.json()
  try {
    const request = new RetellRequest(body)
    
    console.log('Call ID:', request.callId) // Always available
    console.log('Query:', request.query ?? 'No query provided')
    console.log('Args:', request.args ?? {})
    
    // return dummy response
    return c.json({
      response: {
        appointment_id: '1234567890',
        appointment_date: '2025-02-03',
        appointment_time: '10:00 AM',
        appointment_remarks: 'Appointment confirmed',
      },
    })
  } catch (error) {
    return c.json({ 
      error: 'Invalid request format', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 400)
  }
})

app.post('/submit_transaction', async (c) => {
  const body = await c.req.json()
  try {
    const request = new RetellRequest(body)
    const transactionDetails = request.getTransactionDetails()
    
    console.log('Call ID:', request.callId)
    console.log('Transaction Details:', transactionDetails)
    
    if (!transactionDetails) {
      return c.json({ 
        error: 'No transaction details provided',
      }, 400)
    }
    
    // Return response including the transaction details
    return c.json({
      response: {
        transaction_id: '9876543210',
        transaction_remarks: 'Transaction successful',
        query_processed: transactionDetails.query,
        execution_message: transactionDetails.executionMessage
      },
    })
  } catch (error) {
    return c.json({ 
      error: 'Invalid request format', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 400)
  }
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