import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  const { shop, payload, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  console.log(JSON.stringify(payload));

  // Shopify compliance: return a 200 OK response
  return new Response();
};
