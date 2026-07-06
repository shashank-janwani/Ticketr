"use server"

import { stripe } from "@/lib/stripe";

export async function createstripeConnectLoginLink(stripeAccouctId: string){
    if(!stripeAccouctId){
        throw new Error("No stripe Id provided");

    }

    try {
        const loginLink = await stripe.accounts.createLoginLink(stripeAccouctId);
        return loginLink.url
    } catch (error) {
        console.error("Error creating stripe connect login link:", error);
        throw new Error("Failed to create Stripe Connect Login Link") ;
    }
} 