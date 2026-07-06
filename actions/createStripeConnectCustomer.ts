"use server"


import { api } from "@/convex/_generated/api";
import { stripe } from "@/lib/stripe";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser"

if(!process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error("NEXT_PUBLIC_CONEX_URL is not set")

}

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export async function createStripeConnectCustomer() {
    const { userId } = await auth()

    if(!userId) {
        throw new Error("Not authenticated")
    }

    // Check if user already has a connect acc
    const existingStripeConnectId = await convex.query(
        api.users.getUsersStripeConnectId,
        {
            userId
        }
    );
    if(existingStripeConnectId){
        return {account: existingStripeConnectId};   
     }

    //  Create new connect account
    const account = await stripe.accounts.create({
        type: "express",
        capabilities: {
            card_payments: {requested : true},
            transfers: {requested: true},
        }
    });

    // Update user with sripe connct id
    await convex.mutation(api.users.upadteOrCreateUserStripeConnectId, {
        userId,
        stripeConnectId: account.id,
    });
    return {account: account.id}
} 
