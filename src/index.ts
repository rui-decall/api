// import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { HonoSchema, postgresMiddleware, supabaseMiddleware } from './middleware'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { base, baseSepolia } from "viem/chains";
import { RetellRequest } from './types/RetellRequest'
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js'

const owner_wallet = "0xCaFE1246df2B91336A87b655247Bd91086632518"
import { Booking, createAndPayCharge, User } from "./util";
import { createWalletClient, http, parseEther } from 'viem';


const app = new Hono<HonoSchema>()
app.use('*', cors())
app.use('*', postgresMiddleware)

app.post('/phones/:phone/wallets', async (c) => {

  const phone = c.req.param('phone')

  if (!phone) {
    return c.json({ error: 'Phone is required' }, 400)
  }

  const body = await c.req.json()
  const name = body.name

  const sql = c.var.sql
  const privateKey = generatePrivateKey()
  const address = privateKeyToAccount(privateKey).address

  const wallet = {
    wallet_address: address,
    private_key: privateKey,
    phone_number: phone,
    name,
  }

  await sql`INSERT INTO users ${sql(wallet)}`

  return c.json({ address })
})

app.get('/phones/:phone/wallets', async (c) => {
  const phone = c.req.param('phone')
  const sql = c.var.sql

  const wallets = await sql<{
    wallet_address: string
    phone_number: string
    name: string
  }[]>`SELECT wallet_address, phone_number, name FROM users WHERE phone_number = ${phone}`
  if (wallets.length === 0) {
    return c.json({ error: 'Wallet not found' }, 404)
  }

  const wallet = wallets[0]

  return c.json({ wallet })
})

async function executeTransfer(
  rpc_url: string,
  fromWallet: User,
  booking: Booking
) {

  const tx = await createAndPayCharge(
    booking.id,
    `Decall Checkout`,
    ``,
    booking.amount,
    rpc_url,
    base.id,
    fromWallet
  )

  return tx
}

// app.post('/transfers', timeout(30000), async (c) => {
//   const body = await c.req.json()

//   const { data, error } = z.object({
//     from_address: z.string(),
//     to_address: z.string(),
//     amount: z.string(),
//   })
//     .safeParse(body)

//   if (!data) {
//     return c.json({ error: error.format() }, 400)
//   }

//   const { from_address, to_address, amount } = data

//   try {
//     const tx = await executeTransfer(c.var.sql, from_address, to_address, amount)
//     return c.json({ tx })
//   } catch (error) {
//     return c.json({ 
//       error: error instanceof Error ? error.message : 'Unknown error' 
//     }, 400)
//   }
// })

interface UserInfo {
  name: string;
  wallet_address: string;
  phone_number: string;
}

app.post('/get_user_info', async (c) => {
  const body = await c.req.json()
  console.log('body', body)

  // example
  // {
  //   llm_id: 'llm_efa5cbff15063e84c19ab959455e',
  //   from_number: '+60129210283',
  //   to_number: '+14197806507'
  // }
  
  const sql = c.var.sql
  let number = body.from_number.replace('+', '')

  const user = await sql<UserInfo[]>`
    SELECT name, wallet_address, phone_number 
    FROM users 
    WHERE phone_number = ${number}`

  if (user.length === 0) {
    return c.json({ error: 'Wallet not found' }, 404)
  }

  console.log('user', user)

  return c.json({
    user_name: user[0].name,
    wallet_address: user[0].wallet_address,
    user_phone: user[0].phone_number
  })
})

// app.post('/bookings/:booking_id/payments', timeout(30000), async (c) => {
//   const bookingId = c.req.param('booking_id')
//   const body = await c.req.json()

//   const { data, error } = z.object({
//     payer: z.string(),
//     amount: z.string(),
//   })
//     .safeParse(body)

//   if (!data) {
//     return c.json({ error: error.format() }, 400)
//   }

//   const { payer, amount } = data
//   const payerWallet = await c.var.sql<{
//     address: string
//     private_key: string
//   }[]>`SELECT * FROM wallets WHERE address = ${payer}`
//     .then(res => res.length > 0 && res[0])

//   if (!payerWallet) {
//     return c.json({ error: 'From wallet not found' }, 400)
//   }

//   const booking = await c.var.sql<{
//     seller: string
//   }[]>`
//   SELECT *, sellers.wallet_address "seller" FROM bookings 
//   JOIN sellers ON bookings.seller_id = sellers.id
//   WHERE id = ${bookingId}`
//     .then(res => res.length > 0 && res[0])

//   if (!booking) {
//     return c.json({ error: 'Booking not found' }, 400)
//   }

//   const seller = booking.seller

//   const account = privateKeyToAccount(payerWallet.private_key as `0x${string}`)

//   const publicClient = createPublicClient({
//     chain: baseSepolia,
//     transport: http(c.env.RPC_URL),
//   })

//   const client = createWalletClient({
//     account,
//     chain: baseSepolia,
//     transport: http(c.env.RPC_URL),
//   })


//   const { request, result } = await publicClient.simulateContract({
//     abi: abi,
//     address: c.env.CONTRACT_ADDRESS as `0x${string}`,
//     functionName: "book",
//     args: [seller, parseEther(amount), bookingId],
//     value: parseEther(amount)
//   })

//   const hash = await client.writeContract(request)

//   return c.json({ tx: hash })
// })

// app.use('/wallets/:wallet/*', agentMiddleware)

app.post('/get_available_slots', async (c) => {
  const body = await c.req.json()
  const type = c.req.query('type')

  try {
    const request = new RetellRequest(body)

    console.log('Call ID:', request.callId)
    console.log('Query:', request.query)
    console.log('Dynamic Variables:', request.dynamicVariables)
    console.log('Call Type:', request.callType)
    console.log('Name:', request.name)

    let message = request.query;
    const threadId = request.callId;
    const userPhoneNumber = request.dynamicVariables?.user_phone;
    const bookingId = request.dynamicVariables?.reference_id;

    const supabase = createClient(c.env.SUPABASE_URL!, c.env.SUPABASE_ANON_KEY!)

    const { data: user, error: user_error } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', userPhoneNumber)
      .single()

    if (user_error) {
      return c.json({ error: user_error.message }, 400)
    }
    const userId = user.id;

    message += `\ncurrent_time: ${new Date().toISOString()}`
    message += `\nuser_id: ${userId}`
    message += `\nreference_variables: ${JSON.stringify(request.dynamicVariables)}`


    const resp = await fetch("https://run.nodegen.fun/execute/workflow/d14edf48-c813-4c77-a41f-14ffe6f6c5e5", {
      method: 'POST',
      body: JSON.stringify({
        input: {
          message,
          threadId,
          userId
        }
      })
    }).then(res => res.json())
    console.log('Response:', resp)


    // return a dummy response, natural language response
    return c.json({
      // response: `Available slots are 10am and 11am`,
      response: resp
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

    const phoneNumber = request.dynamicVariables?.user_phone;
    const supabase = createClient(c.env.SUPABASE_URL!, c.env.SUPABASE_ANON_KEY!)

    const { data: user, error: user_error } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single()

    if (user_error) {
      return c.json({ error: user_error.message }, 400)
    }

    const { data: bookings, error: booking_error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user.id)

    if (booking_error) {
      return c.json({ error: booking_error.message }, 400)
    }

    // return dummy response
    return c.json({
      // response: {
      //   appointment_id: '1234567890',
      //   appointment_date: '2025-02-03',
      //   appointment_time: '10:00 AM',
      //   appointment_remarks: 'Appointment confirmed',
      // },
      response: bookings
    })
  } catch (error) {
    return c.json({

      error: 'Invalid request format',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 400)
  }
})

const parseTransactionDetails = async (body: any) => {

  const response = await fetch('https://run.nodegen.fun/execute/workflow/ae9cd542-92d8-4c60-9c6d-7a7506eb61bd', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: {
        message: JSON.stringify({
          query: body.args.query,
          context: body.call.retell_llm_dynamic_variables
        }),
        threadId: 'thread_1',
        userId: 'user_1'
      }
    })
  })

  const data = await response.json() as any;
  return data.json_output;

}

app.post('/webhook/coinbase/commerce', async (c) => {
  const body = await c.req.json()

  console.log('metadata:', body.event.data.metadata)
  console.log('id:', body.id)
  console.log('type:', body.event.type)
  switch (body.event.type) {
    case 'charge.created':
      await c.var.sql`
      UPDATE bookings SET cb_commerce_logs = ${body.event} WHERE id = ${body.event.data.metadata.booking_id}
      `
      break;
    case "charge:pending":
      await c.var.sql`
      UPDATE bookings SET status = 'confirmed', cb_commerce_logs = ${body.event} WHERE id = ${body.event.data.metadata.booking_id}
      `
      break;
    case 'charge.confirmed':
      await c.var.sql`
      UPDATE bookings SET cb_commerce_logs = ${body.event} WHERE id = ${body.event.data.metadata.booking_id}
      `
      break;
    case 'charge.failed':
      await c.var.sql`
      UPDATE bookings SET cb_commerce_logs = ${body.event} WHERE id = ${body.event.data.metadata.booking_id}
      `
      break;
  }
  return c.json({ ok: true })
})

app.post('/submit_transaction', async (c) => {
  const body = await c.req.json()
  try {
    console.log('Body:', body)
    const transactionDetails = await parseTransactionDetails(body)
    console.log('Transaction Details:', transactionDetails)

    // Example of transaction details:
    // Transaction Details: {
    //   user_wallet: '0xcafe',
    //   user_phone: 12345678,
    //   date: '2023-10-27',
    //   time: '1000',
    //   action: 'create',
    //   reference_id: '',
    //   remark: 'Hair dye service with red color'
    // }

    // const transactionDetails = {
    //   "user_wallet": "0xcafe",
    //   "user_phone": 60123456789,
    //   "date": "2023-10-27",
    //   "time": "1000",
    //   "action": "create",
    //   "reference_id": "",
    //   "remark": "Hair dye service with red color"
    // }

    let tx_hash = ""
    let amount = "0.001" // an arbitrary amount
    const seller_id = "d5ec1a04-ac81-4417-bf6a-801dd6883028" // seller hardcoded id

    const supabase = createClient(c.env.SUPABASE_URL!, c.env.SUPABASE_ANON_KEY!)

    const { data: user, error: user_error } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', transactionDetails.user_phone)
      .single<User>()

    if (user_error) {
      return c.json({ error: user_error.message }, 400)
    }

    const bookingData = {
      user_id: user.id,
      from_time: `${transactionDetails.time.substring(0, 2)}:${transactionDetails.time.substring(2, 4)}:00`,
      to_time: `${Number(transactionDetails.time.substring(0, 2)) + 1}:${transactionDetails.time.substring(2, 4)}:00`,
      booking_date: transactionDetails.date,
      status: 'pending',
      remark: transactionDetails.remark,
      seller_id: seller_id,
      amount: amount
    }
    console.log('Booking Data:', bookingData)
    const { data: booking, error: booking_error } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single<Booking>()

    if (booking_error) {
      return c.json({ error: booking_error.message }, 400)
    }

    console.log('Bookings:', booking)



    // create / update / delete 

    if (transactionDetails.action === 'create' || true) {
      // send transaction to the owner wallet
      const tx = await executeTransfer(c.env.RPC_URL, user, booking)

      console.log('Transaction:', tx)
      tx_hash = tx
    }



    // Return response including the transaction details
    return c.json({
      response: {
        id: booking.id,
        tx_hash: tx_hash ? tx_hash : "",
        // query_processed: transactionDetails.query,
        // execution_message: transactionDetails.executionMessage
      },
    })
  } catch (error) {
    return c.json({
      error: 'Invalid request format',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 400)
  }
})

app.put('/bookings/:booking_id/cancel', supabaseMiddleware, async (c) => {
  const booking_id = c.req.param('booking_id')
  const booking = await c.var.supabase.from('bookings')
    .select('amount, status, buyer:users(wallet_address), seller:sellers(wallet_address, private_key)')
    .eq('id', booking_id)
    .maybeSingle()
    .then(res => {
      if (res.error) {
        console.log('error', res.error)
      }
      return res.data as unknown as {
        status: string
        amount: string
        buyer: {
          wallet_address: string
        }
        seller: {
          wallet_address: string
          private_key: string
        }
      }
    })

  if (!booking) {
    return c.json({ error: 'Booking not found' }, 404)
  }

  console.log('Booking:', booking)

  if (booking.status === 'cancelled') {
    return c.json({ error: 'Booking is already cancelled' }, 400)
  }

  if (booking.status !== 'confirmed') {
    return c.json({ error: 'Booking is not confirmed' }, 400)
  }


  const client = createWalletClient({
    account: privateKeyToAccount(booking.seller.private_key as `0x${string}`),
    chain: base,
    transport: http(c.env.RPC_URL),
  })

  const tx = await client.sendTransaction({
    to: booking.buyer.wallet_address as `0x${string}`,
    value: parseEther(booking.amount.toString()),
  })

  console.log('Transaction:', tx)


  const { data, error } = await c.var.supabase.from('bookings').update({ status: 'cancelled', cancelled_tx: tx })
    .eq('id', booking_id)
    .select()
    .single()
  return c.json({ booking: data, error: error })
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