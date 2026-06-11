import prisma from "../db.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (!shop) {
    return new Response(JSON.stringify({ error: "Missing shop parameter" }), {
      status: 400,
      headers,
    });
  }

  try {
    const carousels = await prisma.carousel.findMany({
      where: {
        shopId: shop,
        isActive: true, // Only return published carousels
      },
      include: {
        slides: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

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
