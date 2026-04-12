import { createAuthClient } from "better-auth/react";
import { stripeClient } from "@better-auth/stripe/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "https://docling-api.guimawa.workers.dev",
  plugins: [
    stripeClient({
      subscription: {
        enabled: true
      }
    })
  ]
});
