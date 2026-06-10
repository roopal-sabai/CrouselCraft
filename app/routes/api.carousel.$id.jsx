import prisma from "../../db.server";

export const loader = async ({ params }) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  try {
    const carousel = await prisma.carousel.findUnique({
      where: { id: params.id },
      include: {
        slides: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!carousel) {
      return new Response(JSON.stringify({ error: "Carousel not found" }), {
        status: 404,
        headers,
      });
    }

    // Parse configurations so they are returned as direct JSON objects instead of strings
    const data = {
      id: carousel.id,
      name: carousel.name,
      design: carousel.design,
      appearance: JSON.parse(carousel.appearance || "{}"),
      layout: JSON.parse(carousel.layout || "{}"),
      navigation: JSON.parse(carousel.navigation || "{}"),
      slides: carousel.slides.map(s => ({
        id: s.id,
        order: s.order,
        imageUrl: s.imageUrl,
        videoUrl: s.videoUrl,
        title: s.title,
        description: s.description,
        buttonText: s.buttonText,
        linkUrl: s.linkUrl,
      })),
    };

    return new Response(JSON.stringify(data), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("API Error fetching carousel:", error);
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
