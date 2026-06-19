import { redirect } from "react-router";
import { Form, useNavigation, useNavigate, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { LayoutTemplate, Layers, MousePointerClick, ChevronLeft, ArrowRight, Sparkles, Box, Crown, Lock } from "lucide-react";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  let shop = await prisma.shop.findUnique({
    where: { shop: shopDomain },
  });

  if (!shop) {
    shop = await prisma.shop.create({
      data: { shop: shopDomain },
    });
  }

  return { plan: shop.subscriptionPlan || "free" };
};

export const action = async ({ request }) => {
  const { session, redirect: shopifyRedirect } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const formData = await request.formData();
  const design = parseInt(formData.get("design") || "1", 10);
  const name = formData.get("name") || "New Carousel";
  const intent = formData.get("intent");

  if (intent === "upgrade") {
    return shopifyRedirect("/app/pricing");
  }

  // Ensure shop exists
  let shop = await prisma.shop.findUnique({
    where: { shop: shopDomain },
  });

  if (!shop) {
    shop = await prisma.shop.create({
      data: { shop: shopDomain },
    });
  }

  // Verify plan allows this design
  const plan = shop.subscriptionPlan || "free";
  if (design > 1 && plan === "free") return shopifyRedirect("/app/pricing");
  if (design > 3 && plan === "pro") return shopifyRedirect("/app/pricing");

  const newCarousel = await prisma.carousel.create({
    data: {
      shopId: shopDomain,
      name: name,
      design: design,
      isActive: true,
      appearance: JSON.stringify({
        backgroundColor: "#ffffff",
        textColor: "#000000",
      }),
      layout: JSON.stringify({
        visibleCards: 3,
        cardShape: "rounded",
      }),
      navigation: JSON.stringify({
        arrows: true,
        dots: true,
        autoplay: false,
      }),
    },
  });

  return shopifyRedirect(`/app/carousel/${newCarousel.id}`);
};

const templates = [
  {
    id: 1,
    name: "Classic Slider",
    tier: "free",
    description: "A sleek, smooth horizontal slider with snap points.",
    icon: LayoutTemplate,
    color: "text-gray-600",
    bg: "bg-gray-100",
    hoverBorder: "hover:border-gray-500 hover:ring-gray-500",
  },
  {
    id: 2,
    name: "Floating Cards",
    tier: "pro",
    description: "Cards float gently as you scroll, creating a premium feel.",
    icon: Layers,
    color: "text-blue-500",
    bg: "bg-blue-50",
    hoverBorder: "hover:border-blue-500 hover:ring-blue-500",
  },
  {
    id: 3,
    name: "Coverflow 3D",
    tier: "pro",
    description: "3D depth effect with the center slide scaling up prominently.",
    icon: MousePointerClick,
    color: "text-indigo-500",
    bg: "bg-indigo-50",
    hoverBorder: "hover:border-indigo-500 hover:ring-indigo-500",
  },
  {
    id: 4,
    name: "Stacked Story",
    tier: "premium",
    description: "Instagram-style stacked cards with swipe gestures.",
    icon: Box,
    color: "text-purple-500",
    bg: "bg-purple-50",
    hoverBorder: "hover:border-purple-500 hover:ring-purple-500",
  },
  {
    id: 5,
    name: "Infinite Marquee",
    tier: "premium",
    description: "Auto-scrolling continuous ticker, perfect for logos.",
    icon: Sparkles,
    color: "text-pink-500",
    bg: "bg-pink-50",
    hoverBorder: "hover:border-pink-500 hover:ring-pink-500",
  },
  {
    id: 6,
    name: "Premium 3D Showcase",
    tier: "premium",
    description: "Awwwards-style perspective effects and dynamic scaling.",
    icon: Crown,
    color: "text-amber-500",
    bg: "bg-amber-50",
    hoverBorder: "hover:border-amber-500 hover:ring-amber-500",
  }
];

export default function NewCarousel() {
  const { plan } = useLoaderData();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const isLocked = (tier) => {
    if (plan === "premium") return false;
    if (plan === "pro" && tier === "pro") return false;
    if (tier === "free") return false;
    return true;
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans pb-12">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Create New Carousel</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">Current Plan:</span>
            <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wider rounded-md ${
              plan === 'premium' ? 'bg-purple-100 text-purple-700' :
              plan === 'pro' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {plan}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 md:p-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Select a Template</h2>
            <p className="text-gray-500 mt-2 text-lg max-w-2xl mx-auto">
              Choose a starting design. You can preview all templates before unlocking them.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => {
              const Icon = template.icon;
              const locked = isLocked(template.tier);
              
              return (
                <Form method="post" key={template.id} className="flex h-full">
                  <input type="hidden" name="design" value={template.id} />
                  <input type="hidden" name="name" value={`${template.name} Carousel`} />
                  <input type="hidden" name="intent" value={locked ? "upgrade" : "create"} />
                  
                  <button 
                    type="submit"
                    disabled={isSubmitting && !locked}
                    className={`w-full flex flex-col text-left bg-white rounded-3xl p-6 shadow-sm border-2 border-transparent ring-1 ring-gray-100 transition-all duration-300 ${!locked ? template.hoverBorder : 'hover:border-amber-400'} group relative overflow-hidden h-full`}
                  >
                    {locked && (
                      <div className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full z-10 group-hover:bg-amber-100 transition-colors">
                        <Lock className="w-4 h-4 text-gray-400 group-hover:text-amber-600" />
                      </div>
                    )}
                    
                    <div className="flex-1 flex flex-col h-full">
                      <div className={`w-14 h-14 rounded-2xl ${template.bg} flex items-center justify-center mb-4 flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`w-7 h-7 ${template.color}`} />
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{template.name}</h3>
                        {template.tier !== 'free' && (
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm ${template.tier === 'premium' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                            {template.tier}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-1">{template.description}</p>
                      
                      <div className="flex items-center text-sm font-semibold mt-auto pt-4 border-t border-gray-50">
                        {locked ? (
                          <span className="text-amber-600 flex items-center gap-1 group-hover:underline">
                            Upgrade to Unlock <ArrowRight className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="text-gray-900 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Create from template <ArrowRight className="w-4 h-4 text-gray-400" />
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </Form>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
