// import { AgentKit, cdpApiActionProvider, CdpWalletProvider, twitterActionProvider, ViemWalletProvider, walletActionProvider } from "@coinbase/agentkit"
// import { privateKeyToAccount } from "viem/accounts";
// import { createWalletClient, http, WalletClient } from "viem";
// import { baseSepolia } from "viem/chains";
// // const llm = new ChatOpenAI({ model: "gpt-4o-mini", apiKey: process.env.OPENAI_API_KEY });
// const account = privateKeyToAccount(`0xdfdc5c46a3e64ae23198b8d0a448978659e31b67c735acae3ec6886fa4425805`)
// const client = createWalletClient({
//   account,
//   chain: baseSepolia,
//   transport: http(),
// })
// const walletProvider = new ViemWalletProvider(client as WalletClient);

// async function main() {
//     const agentkit = await AgentKit.from({
//         walletProvider,
//         actionProviders: [walletActionProvider(), cdpApiActionProvider({
//       apiKeyName: "organizations/361a3577-34b6-4dd0-aa3a-086eb351e564/apiKeys/fcaecd16-37bf-44de-ae5b-540ecf5fcad5",
//       apiKeyPrivateKey: "-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEINsuM0nKy4/XJcpW/vkOQHnMxELt1enlFOXkh9ojb3mGoAoGCCqGSM49\nAwEHoUQDQgAEFXTIUzYrqmk7U2CHYSz9jWJl8B5rn1IW4PN5wLKteAM9Xc048vyU\niLZJmlhJcLpgus4eneqrAv0EFwNrvis/ng==\n-----END EC PRIVATE KEY-----\n".replace(/\\n/g, "\n"),
//       //     // networkId: "base-sepolia",
//     })],
//   });
// }

// main()

import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { baseSepolia } from "viem/chains";
import { createBundlerClient } from "viem/account-abstraction";
import { toCoinbaseSmartAccount } from "viem/account-abstraction";
import { privateKeyToAccount } from "viem/accounts";
const contractAddress = "0xC00d77ad2fdD15854bDd7dfd08e680aAF771Fb94"
// import { account, client, RPC_URL } from "./config.js";
import abi from "./abi.json";
const RPC_URL = "https://api.developer.coinbase.com/rpc/v1/base-sepolia/Fk58oFWjRRHBBKU4SJHzbr8U4YMrgARY"

async function book(seller: string, amount: string, bookingId: string, privateKey: string) {
  // const client = createPublicClient({
  //   chain: baseSepolia,
  //   transport: http(RPC_URL),
  // });

  const owner = privateKeyToAccount(privateKey as `0x${string}`);

  const client = createWalletClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
    account: owner,
  });

  const account = await toCoinbaseSmartAccount({
    client,
    owners: [owner],
  });


  // const hash = await client.writeContract({
  //   abi: abi,
  //   address: contractAddress,
  //   functionName: "book",
  //   args: [seller, parseEther(amount), bookingId],
  //   value: parseEther(amount)

  // })
  // console.log(hash)

  // const estimate = await client.({
  //         abi: abi,
  //         address: contractAddress,
  //         functionName: "book",
  //         args: [seller, parseEther(amount), bookingId],
  //         value: parseEther(amount)

  // })

  // console.log(estimate)


  const bundlerClient = createBundlerClient({
    account,
    client,
    transport: http(RPC_URL),
    chain: baseSepolia,
  });

  const estimate = await bundlerClient.estimateUserOperationGas({
    account,
    calls: [
      {
        to: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
        value: 100000000000000n,
      }
    ],

  });

  console.log(estimate)

  // account.userOperation = {
  //   estimateGas: async (userOperation) => {
  //     console.log(88)
  //     const estimate = await bundlerClient.estimateUserOperationGas({
  //       account,
  //       calls: [
  //         {
  //           to: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  //           value: 100000000000000n,
  //         }
  //       ],

  //     });
  //     console.log(97)

  //     estimate.preVerificationGas = estimate.preVerificationGas * 2n;
  //     return estimate;
  //   },
  // };

  // console.log(parseEther(amount))


  // try {
  //   const userOpHash = await bundlerClient.sendUserOperation({
  //     account,
  //     calls: [
  //       {
  //         // abi: abi,
  //         // // to: contractAddress,
  //         // functionName: "book",
  //         // args: [seller, parseEther(amount), bookingId],
  //         // value: parseEther(amount),
        
  //         // abi: abi,
  //         // functionName: "mintTo",
  //         // to: "0x66519FCAee1Ed65bc9e0aCc25cCD900668D3eD49",
  //         // args: [account.address, 1],

  //         to:  "0x19950317f772DA1652B02fe4AA11f89824fa2dE7",
  //         value: 100n,
  //       }
  //     ],
  //     paymaster: true,
  //   });

  //   const receipt = await bundlerClient.waitForUserOperationReceipt({
  //     hash: userOpHash,
  //   });

  //   console.log("✅ Transaction successfully sponsored!");
  //   console.log(`⛽ View sponsored UserOperation on blockscout: https://base-sepolia.blockscout.com/op/${receipt.userOpHash}`);
  //   console.log(`🔍 View NFT mint on basescan: https://sepolia.basescan.org/address/${account.address}`);
  //   return
  // } catch (error) {
  //   console.log("Error sending transaction: ", error);
  //   return
  // }
}

async function main() {
  await book("0x19950317f772DA1652B02fe4AA11f89824fa2dE7", "0.0001", "booking_2", "0x76bc0c6d3e9440f2aec6fd9367ef6d272f3493d20f3a809f4d2a493a18fde55b")
}

main()