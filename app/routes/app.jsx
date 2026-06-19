import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  // Sync the current SHOPIFY_APP_URL to Shop metafield so storefront Liquid can read it
  const appUrl = process.env.SHOPIFY_APP_URL || "";
  if (appUrl) {
    try {
      const shopQuery = await admin.graphql(
        `#graphql
        query {
          shop {
            id
          }
        }`
      );
      const shopData = await shopQuery.json();
      const shopId = shopData.data?.shop?.id;

      if (shopId) {
        const response = await admin.graphql(
          `#graphql
          mutation CreateMetafield($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields {
                id
                namespace
                key
                value
              }
              userErrors {
                field
                message
              }
            }
          }`,
          {
            variables: {
              metafields: [
                {
                  ownerId: shopId,
                  namespace: "carousel_craft",
                  key: "app_url",
                  value: appUrl,
                  type: "single_line_text_field"
                }
              ]
            }
          }
        );
        const resJson = await response.json();
        console.log("[CarouselCraft] Sync App URL Metafield Result:", JSON.stringify(resJson.data?.metafieldsSet));
      }
    } catch (e) {
      console.error("[CarouselCraft] Failed to sync App URL metafield:", e);
    }
  }

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/pricing">Subscription Plans</s-link>
      </s-app-nav>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  const error = useRouteError();
  try {
    return boundary.error(error);
  } catch (e) {
    return (
      <div style={{ padding: "2rem", fontFamily: "sans-serif", textAlign: "center" }}>
        <h1 style={{ color: "#d32f2f" }}>App Error</h1>
        <p>{error instanceof Error ? error.message : "An unexpected error occurred."}</p>
      </div>
    );
  }
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
