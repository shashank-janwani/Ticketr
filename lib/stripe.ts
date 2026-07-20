import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is missing in env file");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-06-24.dahlia",
});

console.log("Secret Key:", process.env.STRIPE_SECRET_KEY?.slice(0, 12));