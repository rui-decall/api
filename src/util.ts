
import { Context } from "hono";
import { HonoSchema } from "./middleware";
import { http, parseEther } from "viem";
import { createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

export type ChargeMetadata = {
    booking_id: string,
    action: 'create' | 'cancel',
}

async function createCharge(
    c: Context<HonoSchema>,
    name: string,
    description: string,
    amount: string,
    metadata: ChargeMetadata
) {

    const response = await fetch("https://api.commerce.coinbase.com/charges", {
        method: "POST",
        headers: {
            "X-CC-Api-Key": c.env.CB_COMMERCE_API_KEY,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "name": name,
            "description": description,
            "pricing_type": "fixed_price",
            "local_price": {
                "amount": amount,
                "currency": "ETH"
            },
            "metadata": metadata
        })
    })
        .then(o => o.json<{
            data: {
                id: string
            }
        }>())

    return response.data.id
}

export async function payCharge(
    c: Context<HonoSchema>,
    payer_wallet_id: string,
    charge_id: string,
) {

    const { tx, error } = await fetch(`${c.env.CB_API_URL}/charges/${charge_id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
            wallet_id: payer_wallet_id,
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(res => res.json<{ tx: string, error?: string }>())

    if (error) {
        throw new Error(error)
    }
    if (!tx) {
        throw new Error('Failed to pay charge')
    }

    return tx
}


export async function createBooking(c: Context<HonoSchema>, _booking: Booking, payer: User) {

      console.log('Booking Data:', _booking)
      console.log('Payer Data:', payer)

      let booking = await c.var.supabase.from('bookings')
      .select()
      .eq('user_id', payer.id)
      .eq('booking_date', _booking.booking_date)
      .eq('from_time', _booking.from_time)
      .eq('to_time', _booking.to_time)
      .not('status', 'in', '(cancelled,pending_cancel,confirmed)')
      .throwOnError()
      .maybeSingle<Booking>()
      .then(res => res.data)

      if (!booking) {
        const { data } = await c.var.supabase
        .from('bookings')
        .insert(_booking)
        .select()
        .single<Booking>()
        .throwOnError()

        booking = data
    }
    
    
    console.log(89, booking)
    if (!booking.cb_charge_id) {
        console.log('create charge')
        const charge_id = await createCharge(
            c,
            'Payphone Checkout',
            `Booking ID: ${booking.id}`,
            booking.amount,
            {
                booking_id: booking.id!,
                action: 'create'
            }
        )
        booking.cb_charge_id = charge_id
        await c.var.supabase.from('bookings').update({ cb_charge_id: charge_id }).eq('id', booking.id!).throwOnError()
    }

    console.log('booking', booking)

    const tx = await payCharge(c, payer.wallet_id, booking.cb_charge_id)
    return {
        tx,
        charge_id: booking.cb_charge_id,
        booking_id: booking.id
    }

}

export async function cancelBooking(c: Context<HonoSchema>, booking_id: string) {
    const bookingWithSeller = await c.var.supabase.from('bookings')
        .select('amount, status, buyer:users(wallet_address), seller:sellers(wallet_address, private_key)')
        .eq('id', booking_id)
        .single()
        .throwOnError()
        .then(res => {
            return res.data as unknown as {
                status: string
                amount: string
                // cb_charge_id?: string
                buyer: {
                    wallet_address: string
                }
                seller: {
                    wallet_address: string
                    private_key: string
                }
            }
        })

    if (!bookingWithSeller) {
        throw new Error('Booking not found')
    }

    switch (bookingWithSeller.status) {
        case 'confirmed':
            // const charge_id = await createCharge(
            //     c,
            //     'Payphone Cancellation',
            //     `Booking ID: ${booking_id}`,
            //     bookingWithSeller.amount,
            //     {
            //         booking_id: booking_id,
            //         action: 'cancel'
            //     }
            // )
            // bookingWithSeller.cb_charge_id = charge_id
            
            // await c.var.supabase.from('bookings').update({ status: 'pending_cancel', cancelled_charge_id: charge_id })
            //     .eq('id', booking_id)
            //     .select()
            //     .single()
            //     .throwOnError()
            
            break
        case 'cancelled':
            throw new Error('Booking is already cancelled')
        case 'pending_cancel':
            throw new Error('Booking is already pending cancel')
        default:
            throw new Error('Booking is not confirmed')
    }


    // const tx = await payCharge(c, bookingWithSeller.seller.wallet_id, bookingWithSeller.cb_charge_id!)

    const client = createWalletClient({
        account: privateKeyToAccount(bookingWithSeller.seller.private_key as `0x${string}`),
        chain: base,
        transport: http(c.env.RPC_URL),
      })
      

      const tx = await client.sendTransaction({
        to: bookingWithSeller.buyer.wallet_address as `0x${string}`,
        value: parseEther(bookingWithSeller.amount.toString()),
      })

      console.log('Transaction:', tx)
      
      await c.var.supabase.from('bookings').update({ status: 'cancelled', cancelled_tx: tx })
      .eq('id', booking_id)
      .select()
      .single()
      .throwOnError()

    return {
        tx,
        // charge_id: bookingWithSeller.cb_charge_id,
    }
}

export type User = {
    id: string,
    phone_number: string,
    wallet_address: string,
    created_at: string,
    private_key: string,
    name: string,
    wallet_id: string,
}

export type Booking = {
    id?: string,
    user_id: string,
    booking_date: string,
    status: string,
    created_at?: string,
    from_time: string,
    to_time: string,
    seller_id: string,
    remark?: string,
    amount: string,
    cb_charge_id?: string,
}