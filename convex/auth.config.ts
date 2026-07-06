import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain:"https://select-anemone-67.clerk.accounts.dev",
      applicationID: "convex",
    },
  ]
} satisfies AuthConfig;