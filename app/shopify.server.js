import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
  BillingInterval,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

export const PLAN_PRO_MONTHLY = "Pro Plan - Monthly";
export const PLAN_PRO_ANNUAL = "Pro Plan - Annual";
export const PLAN_ELITE_MONTHLY = "Elite Plan - Monthly";
export const PLAN_ELITE_ANNUAL = "Elite Plan - Annual";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""),
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    expiringOfflineAccessTokens: true,
  },
  billing: {
    [PLAN_PRO_MONTHLY]: {
      lineItems: [
        {
          amount: 49.0,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
      ],
    },
    [PLAN_PRO_ANNUAL]: {
      lineItems: [
        {
          amount: 468.0,
          currencyCode: "USD",
          interval: BillingInterval.Annual,
        },
      ],
    },
    [PLAN_ELITE_MONTHLY]: {
      lineItems: [
        {
          amount: 99.0,
          currencyCode: "USD",
          interval: BillingInterval.Every30Days,
        },
      ],
    },
    [PLAN_ELITE_ANNUAL]: {
      lineItems: [
        {
          amount: 948.0,
          currencyCode: "USD",
          interval: BillingInterval.Annual,
        },
      ],
    },
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
