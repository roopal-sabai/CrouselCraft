import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  try {
    const { shop, payload, topic } = await authenticate.webhook(request);
    
    console.log(`[Webhook Success] Topic: ${topic} | Shop: ${shop}`);
    console.log(`[Webhook Payload] ${JSON.stringify(payload)}`);
    
    // Shopify compliance webhooks require responding with a 200 OK status
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[Webhook Verification Failure] Invalid signature or payload:", error);
    
    // Explicitly return 401 Unauthorized as required by Shopify's automated reviews
    return new Response("Unauthorized", { status: 401 });
  }
};
