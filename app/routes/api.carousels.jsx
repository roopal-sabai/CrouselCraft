import prisma from "../db.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const name = url.searchParams.get("name");

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Expose-Headers": "X-Shop-Plan",
    "Content-Type": "application/json",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers,
    });
  }

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

// Handle CORS Preflight and Slide Update POST requests
export const action = async ({ request }) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers,
    });
  }

  if (request.method === "POST") {
    try {
      const body = await request.json();
      const { shop, name, slides } = body;

      if (!shop || !name || !Array.isArray(slides)) {
        return new Response(JSON.stringify({ error: "Missing required parameters" }), {
          status: 400,
          headers,
        });
      }

      const carousel = await prisma.carousel.findFirst({
        where: {
          shopId: shop,
          name: name.trim(),
        },
      });

      if (!carousel) {
        return new Response(JSON.stringify({ error: "Carousel not found" }), {
          status: 404,
          headers,
        });
      }

      // Sync slides in transaction
      await prisma.$transaction([
        prisma.slide.deleteMany({
          where: { carouselId: carousel.id },
        }),
        ...slides.map((s, index) =>
          prisma.slide.create({
            data: {
              carouselId: carousel.id,
              order: index,
              title: s.title || "",
              description: s.description || "",
              buttonText: s.buttonText || "",
              linkUrl: s.linkUrl || "#",
              imageUrl: s.imageUrl || "",
            },
          })
        ),
        prisma.carousel.update({
          where: { id: carousel.id },
          data: { updatedAt: new Date() },
        }),
      ]);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers,
      });
    } catch (error) {
      console.error("API Error updating slides:", error);
      return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
        status: 500,
        headers,
      });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers,
  });
};
