import prisma from "../db.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const name = url.searchParams.get("name");

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Expose-Headers": "X-Shop-Plan",
    "Content-Type": "application/json",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  };

  if (!shop) {
    return new Response(JSON.stringify({ error: "Missing shop parameter" }), {
      status: 400,
      headers,
    });
  }

  try {
    const shopRecord = await prisma.shop.findUnique({
      where: { shop: shop }
    });
    const plan = shopRecord?.subscriptionPlan || "free";
    headers["X-Shop-Plan"] = plan;

    let carousels = [];

    // Find the specific carousel by name if provided
    if (name && name.trim()) {
      carousels = await prisma.carousel.findMany({
        where: {
          shopId: shop,
          name: name.trim(),
          isActive: true,
        },
        include: {
          slides: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
      });
    }

    // Format output
    const data = carousels.map((c) => ({
      id: c.id,
      name: c.name,
      design: c.design,
      appearance: JSON.parse(c.appearance || "{}"),
      layout: JSON.parse(c.layout || "{}"),
      navigation: JSON.parse(c.navigation || "{}"),
      slides: c.slides.map((s) => ({
        id: s.id,
        order: s.order,
        imageUrl: s.imageUrl,
        videoUrl: s.videoUrl,
        title: s.title,
        description: s.description,
        buttonText: s.buttonText,
        linkUrl: s.linkUrl,
      })),
    }));

    return new Response(JSON.stringify(data), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("API Error fetching carousels list:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers,
    });
  }
};

// Handle CORS Preflight requests
export const action = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
