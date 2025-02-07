
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
    wallet_id: string,
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
    cb_charge_id: string,
}