import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }) => {
  const { session, billing } = await authenticate.admin(request);
  const url = new URL(request.url);
  const plan = url.searchParams.get("plan");

  // Verify the active subscription on Shopify
  const billingCheck = await billing.check({
    plans: [
      "Pro Plan - Monthly",
      "Pro Plan - Annual",
      "Elite Plan - Monthly",
      "Elite Plan - Annual",
    ],
    isTest: true,
  });

  if (billingCheck.hasActivePayment) {
    // Update the database with the verified plan
    await prisma.shop.update({
      where: { shop: session.shop },
      data: { subscriptionPlan: plan },
    });
  }

  // Redirect the merchant back to the dashboard templates page
  return redirect("/app");
};
