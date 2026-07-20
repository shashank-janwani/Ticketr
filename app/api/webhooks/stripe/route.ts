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
    console.log("Webhook event constructed successfully:", event.type);
  } catch (error) {
  console.error("🔥 Full webhook error:", error);

  if (error instanceof Error) {
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
  }

  return new Response(
    JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
    }),
    { status: 500 }
  );
}

  const convex = getConvexClient();

  if (event.type === "checkout.session.completed") {

    
      console.log("Processing checkout.session.completed");
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("Full session:", JSON.stringify(session, null, 2));
    const metadata = session.metadata as StripeCheckoutMetaData;
    

console.log("Full session:", JSON.stringify(session, null, 2));
console.log("Session metadata:", session.metadata);
    console.log("Convex client:", convex);

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
