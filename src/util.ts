
import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import coinbaseAbi from "./abi/coinbase.json";

export type User = {
    id: string,
    phone_number: string,
    wallet_address: string,
    created_at: string,
    private_key: string,
    name: string,
}

export type Booking = {
    id: string,
    user_id: string,
    booking_date: string,
    status: string,
    created_at: string,
    from_time: string,
    to_time: string,
    seller_id: string,
    remark: string,
    amount: string,
}

export async function createAndPayCharge(
    booking_id: string,
    booking_name: string,
    booking_description: string,
    amount: string,
    rpc_url: string,
    chain_id: number,
    fromWallet: User
) {

    const publicClient = createPublicClient({
        chain: base,
        transport: http(rpc_url),
    })

    const balance = await publicClient.getBalance({
        address: fromWallet.wallet_address as `0x${string}`
    })

    console.log('balance', balance)

    if (balance < parseEther(amount.toString())) {
        throw new Error("Insufficient balance")
    }

    const response = await fetch("https://api.commerce.coinbase.com/charges", {
        method: "POST",
        headers: {
            "X-CC-Api-Key": "1befce4f-0aec-475a-ac07-c37e962e4d46",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "name": booking_name,
            "description": booking_description,
            "pricing_type": "fixed_price",
            "local_price": {
                "amount": amount.toString(),
                "currency": "ETH"
            },
            "metadata": {
                "booking_id": booking_id
            }
        })
    })
        .then(res => res.json())
    console.log("response", JSON.stringify(response, null, 2))

    const hydrate: any = await fetch(`https://api.commerce.coinbase.com/charges/${response.data.id}/hydrate`, {
        method: "PUT",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({
            "chain_id": chain_id,
            "sender": fromWallet.wallet_address
        })
    })
        .then((response) => response.json())

    console.log("hydrate", JSON.stringify(hydrate, null, 2))


    const call_data = hydrate.data.web3_data.transfer_intent.call_data


    const account = privateKeyToAccount(fromWallet.private_key as `0x${string}`)

    if (account.address !== hydrate.data.web3_data.transfer_intent.metadata.sender) {
        throw new Error("Account does not match sender")
    }

    const poolFeesTier = 500;
    const estimate = await publicClient.simulateContract({
        abi: coinbaseAbi,
        account,
        address: hydrate.data.web3_data.transfer_intent.metadata.contract_address as `0x${string}`,
        functionName: "swapAndTransferUniswapV3Native",
        args: [{
            recipientAmount: BigInt(call_data.recipient_amount),
            deadline: BigInt(
                Math.floor(new Date(call_data.deadline).getTime() / 1000),
            ),
            recipient: call_data.recipient,
            recipientCurrency: call_data.recipient_currency,
            refundDestination: call_data.refund_destination,
            feeAmount: BigInt(call_data.fee_amount),
            id: call_data.id,
            operator: call_data.operator,
            signature: call_data.signature,
            prefix: call_data.prefix,
        }, poolFeesTier],
        value: parseEther((hydrate.data.pricing.local.amount * 1.5).toString())
    })

    const walletClient = createWalletClient({
        chain: base,
        transport: http(rpc_url),
        account,
    })

    console.log('executing transaction')
    const hash = await walletClient.writeContract(estimate.request)

    console.log(hash)
    return hash

}