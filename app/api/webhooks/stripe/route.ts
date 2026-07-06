import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import Stripe from "stripe";
import { StripeCheckoutMetaData } from "@/actions/CreateStripeCheckoutSession";

export async function POST(req: Request) {
  console.log("Webhook received");

  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature") as string;

  console.log("Webhook signature:", signature ? "Present" : "Missing");

  let event: Stripe.Event;

  try {
    console.log("Attempting to construct webhook event");
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log("===============");
console.log("EVENT TYPE:", event.type);
console.log("EVENT ACCOUNT:", event.account);
console.log("EVENT ID:", event.id);
console.log("===============");
    console.log("Webhook event constructed successfully:", event.type);
  } catch (err) {
    console.error("Webhook construction failed:", err);
    return new Response(`Webhook Error: ${(err as Error).message}`, {
      status: 400,
    });
  }

  const convex = getConvexClient();
console.log("Is checkout session?",
  event.type === "checkout.session.completed");
  if (event.type === "checkout.session.completed") {
  console.log("Event account:", event.account);

    const session = event.data.object as Stripe.Checkout.Session;
      console.log("FULL SESSION");
  console.log(JSON.stringify(session, null, 2));

  console.log("SESSION METADATA");
  console.log(session.metadata);
      
    const metadata = session.metadata as StripeCheckoutMetaData;
    
    try {
      const result = await convex.mutation(api.events.purchaseTicket, {
        eventId: metadata.eventId,
        userId: metadata.userId,
        waitingListId: metadata.waitingListId,
        paymentInfo: {
          paymentIntentId: session.payment_intent as string,
          amount: session.amount_total ?? 0,
        },
      });
      console.log("Purchase ticket mutation completed:", result);
    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response("Error processing webhook", { status: 500 });
    }
  }

  return new Response(null, { status: 200 });
}