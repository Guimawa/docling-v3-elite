import { betterAuth } from "better-auth";
import { stripe } from "@better-auth/stripe";
import { Pool } from "pg";
import Stripe from "stripe";

let authInstance: any = null;
let poolInstance: any = null;

export const getAuth = (env: any) => {
  if (authInstance) return authInstance;

  poolInstance = poolInstance || new Pool({
    connectionString: env.DATABASE_URL,
  });

  const stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16" as any,
  });

  authInstance = betterAuth({
    database: {
      db: poolInstance,
      type: "postgres"
    },
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
      apple: {
        clientId: env.APPLE_CLIENT_ID,
        clientSecret: env.APPLE_CLIENT_SECRET,
      }
    },
    plugins: [
      stripe({
        stripeClient,
        stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
        createCustomerOnSignUp: true,
        subscriptionConfigs: [
          {
            plan: "pro",
            priceId: env.STRIPE_PRO_PRICE_ID,
          }
        ]
      })
    ],
    user: {
      additionalFields: {
        specialization: {
          type: "string",
          required: false,
          defaultValue: "Autre"
        }
      }
    }
  });

  return authInstance;
};
