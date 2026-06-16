import { useState, useEffect } from "react";
import { useLoaderData, useNavigate, useSubmit, redirect, useNavigation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
  ClassicSlider,
  FloatingCards,
  CoverflowSlider,
  StackedStory,
  InfiniteMarquee,
  Showcase3D,
} from "../components/Carousels";
import {
  Plus,
  Trash2,
  Copy,
  Edit,
  Lock,
  Sparkles,
  ChevronRight,
  Star,
  Zap,
  Crown,
  Check,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  Eye,
  Settings2,
} from "lucide-react";

// ─────────────────────────────────────────────
// DATA SETS FOR THE LIVE PREVIEWS
// ─────────────────────────────────────────────
const DATASET_FURNITURE = [
  { id: "f1", title: "Minimalist Lounge", description: "Nordic ash frame with wool upholstery.", buttonText: "View $249", imageUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&q=80" },
  { id: "f2", title: "Oak Desk Organizer", description: "Handcrafted valet tray for workspace essentials.", buttonText: "View $79", imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600&q=80" },
  { id: "f3", title: "Pebble Table Lamp", description: "Soft diffused illumination with dimming dial.", buttonText: "View $129", imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&q=80" },
];

const DATASET_FASHION = [
  { id: "fa1", title: "Silk Midi Dress", description: "Lustrous mulberry silk, designed to flow.", buttonText: "Explore", imageUrl: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=80" },
  { id: "fa2", title: "Cozy Knit Sweater", description: "Merino wool and baby alpaca blend.", buttonText: "Explore", imageUrl: "https://images.unsplash.com/photo-1574169208507-84376144848b?w=600&q=80" },
  { id: "fa3", title: "Trench Coat", description: "Double breasted water-resistant cotton canvas.", buttonText: "Explore", imageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80" },
];

const DATASET_SNEAKERS = [
  { id: "sn1", title: "Air Retro OG", description: "Full-grain leather with red highlights.", buttonText: "Shop Drop", imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80" },
  { id: "sn2", title: "Volt Runner Pro", description: "Carbon plate with responsive cushioning.", buttonText: "Shop Drop", imageUrl: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&q=80" },
  { id: "sn3", title: "Court Classic Low", description: "Minimalist cupsole lifestyle sneakers.", buttonText: "Shop Drop", imageUrl: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80" },
];

const DATASET_GADGETS = [
  { id: "g1", title: "ANC Headphones", description: "Hybrid noise cancellation & hi-fi acoustics.", buttonText: "Buy Now", imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80" },
  { id: "g2", title: "Titanium Smartwatch", description: "OLED display with premium health sensors.", buttonText: "Buy Now", imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80" },
  { id: "g3", title: "Hi-Fi Soundbar", description: "Dolby Atmos enabled home theater audio.", buttonText: "Buy Now", imageUrl: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&q=80" },
];

const DATASET_LOGOS = [
  { id: "l1", title: "Eco Threads", description: "Sustainable organic cotton fabrics.", buttonText: "Shop Eco", imageUrl: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=600&q=80" },
  { id: "l2", title: "Rawhide Co", description: "Naturally tanned full-grain leather.", buttonText: "Shop Leather", imageUrl: "https://images.unsplash.com/photo-1547949003-9792a18a2601?w=600&q=80" },
  { id: "l3", title: "Flaxen Linen", description: "Lightweight bed sheets and linen wear.", buttonText: "Shop Linen", imageUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&q=80" },
];

const DATASET_LUXURY = [
  { id: "lu1", title: "Carrara Table", description: "Italian marble top with black steel base.", buttonText: "View Model", imageUrl: "https://images.unsplash.com/photo-1577140917170-285929fb55b7?w=600&q=80" },
  { id: "lu2", title: "Velvet Lounge", description: "Mid-century emerald green accent chair.", buttonText: "View Model", imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80" },
  { id: "lu3", title: "Gilded Pendant", description: "Geometric brass fixture for dining areas.", buttonText: "View Model", imageUrl: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=600&q=80" },
];

// ─── Actions & Loaders ───────────────────────
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

  const carousels = await prisma.carousel.findMany({
    where: { shopId: shopDomain },
    orderBy: { createdAt: "desc" },
    include: {
      slides: {
        orderBy: { order: "asc" },
      },
      _count: {
        select: { slides: true },
      },
    },
  });

  const formattedCarousels = carousels.map((c) => {
    let parsedAppearance = {};
    let parsedLayout = {};
    let parsedNavigation = {};
    try {
      parsedAppearance = typeof c.appearance === "string" ? JSON.parse(c.appearance) : c.appearance || {};
    } catch (e) {}
    try {
      parsedLayout = typeof c.layout === "string" ? JSON.parse(c.layout) : c.layout || {};
    } catch (e) {}
    try {
      parsedNavigation = typeof c.navigation === "string" ? JSON.parse(c.navigation) : c.navigation || {};
    } catch (e) {}

    return {
      ...c,
      appearance: parsedAppearance,
      layout: parsedLayout,
      navigation: parsedNavigation,
      formattedUpdatedAt: new Date(c.updatedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    };
  });

  return { carousels: formattedCarousels, shop };
};

export const action = async ({ request }) => {
  const { session, redirect: shopifyRedirect } = await authenticate.admin(request);
  const shopDomain = session.shop;
  const formData = await request.formData();
  const intent = formData.get("intent");

  console.log("[Dashboard Action Debug]", { intent, shopDomain });

  if (intent === "create") {
    const design = parseInt(formData.get("design") || "1", 10);
    const name = formData.get("name") || "New Carousel";

    // Setup appearance settings defaults
    const defaults = {
      1: {
        layout: { visibleCards: 3, gap: 24 },
        navigation: { arrows: true, dots: true, autoplay: false, speed: 3000, infinite: true },
        appearance: { backgroundColor: "#ffffff", borderRadius: 12, fontFamily: "Inter", shadow: "md" },
      },
      2: {
        layout: { visibleCards: 3, gap: 28, yOffset: -14, staggerDelay: 0.08 },
        navigation: { autoplay: false, speed: 3000 },
        appearance: { backgroundColor: "#ffffff", borderRadius: 20, fontFamily: "Inter" },
      },
      3: {
        layout: { rotationAngle: 42, centerScale: 1.12, depthSpacing: 200, showReflection: true, cardWidth: 300 },
        navigation: { arrows: true, dots: true },
        appearance: { backgroundColor: "#0f0f1a", borderRadius: 16, fontFamily: "Inter" },
      },
      4: {
        layout: { stackSpread: 22, scaleStep: 0.06, stackDirection: "bottom" },
        navigation: { enableDrag: true },
        appearance: { backgroundColor: "#ffffff", borderRadius: 24, fontFamily: "Inter" },
      },
      5: {
        layout: { cardWidth: 300, gap: 20 },
        navigation: { marqueeDirection: "left", marqueeSpeed: 28, pauseOnHover: true },
        appearance: { backgroundColor: "#ffffff", borderRadius: 16, fontFamily: "Inter" },
      },
      6: {
        layout: { layoutSide: "left", tiltStrength: 12, showGradientBg: true },
        navigation: { buttonStyle: "solid" },
        appearance: { backgroundColor: "#ffffff", borderRadius: 24, fontFamily: "Inter" },
      },
    }[design] || { layout: {}, navigation: {}, appearance: {} };

    const newCarousel = await prisma.carousel.create({
      data: {
        shopId: shopDomain,
        name: name,
        design: design,
        appearance: JSON.stringify(defaults.appearance),
        layout: JSON.stringify(defaults.layout),
        navigation: JSON.stringify(defaults.navigation),
        isActive: true,
      },
    });

    // Generate specific starter slides based on template dataset
    const starters = {
      1: DATASET_FURNITURE,
      2: DATASET_FASHION,
      3: DATASET_SNEAKERS,
      4: DATASET_GADGETS,
      5: DATASET_LOGOS,
      6: DATASET_LUXURY,
    }[design] || DATASET_FURNITURE;

    await prisma.slide.createMany({
      data: starters.map((slide, index) => ({
        carouselId: newCarousel.id,
        order: index,
        title: slide.title,
        description: slide.description,
        buttonText: slide.buttonText,
        linkUrl: "/collections/all",
        imageUrl: slide.imageUrl,
      })),
    });

    return shopifyRedirect(`/app/carousel/${newCarousel.id}`);
  }

  if (intent === "duplicate") {
    const sourceId = formData.get("carouselId");
    const source = await prisma.carousel.findUnique({
      where: { id: sourceId },
      include: { slides: true },
    });

    if (source) {
      const duplicate = await prisma.carousel.create({
        data: {
          shopId: shopDomain,
          name: `${source.name} (Copy)`,
          design: source.design,
          appearance: source.appearance,
          layout: source.layout,
          navigation: source.navigation,
          isActive: true,
        },
      });

      await prisma.slide.createMany({
        data: source.slides.map((s) => ({
          carouselId: duplicate.id,
          order: s.order,
          title: s.title,
          description: s.description,
          buttonText: s.buttonText,
          linkUrl: s.linkUrl,
          imageUrl: s.imageUrl,
        })),
      });
    }
  }

  if (intent === "delete") {
    const carouselId = formData.get("carouselId");
    await prisma.carousel.deleteMany({
      where: { id: carouselId },
    });
  }

  if (intent === "toggleActive") {
    const carouselId = formData.get("carouselId");
    const source = await prisma.carousel.findUnique({
      where: { id: carouselId },
    });
    if (source) {
      await prisma.carousel.update({
        where: { id: carouselId },
        data: { isActive: !source.isActive },
      });
    }
  }

  if (intent === "subscribe") {
    let plan = formData.get("plan");
    if (plan === "elite") plan = "premium";
    await prisma.shop.update({
      where: { shop: session.shop },
      data: { subscriptionPlan: plan },
    });
  }

  return { success: true };
};

// ─── FAQ Collapse Hook ───────────────────────
function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.04] py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left py-2 focus:outline-none"
      >
        <span className="font-semibold text-white text-lg font-['Plus_Jakarta_Sans',_sans-serif]">{question}</span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <div className={`mt-2 text-gray-400 leading-relaxed transition-all overflow-hidden ${isOpen ? "max-h-40" : "max-h-0"}`}>
        {answer}
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────
export default function Index() {
  const { carousels, shop } = useLoaderData();
  const navigate = useNavigate();
  const submit = useSubmit();
  const navigation = useNavigation();
  const actionPath = typeof window !== "undefined"
    ? (() => {
        const url = new URL(window.location.href);
        url.searchParams.set("index", "");
        return url.pathname + url.search;
      })()
    : "";

  const [previewingTemplate, setPreviewingTemplate] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const plan = shop?.subscriptionPlan || "free";

  const isLocked = (tier) => {
    if (plan === "elite" || plan === "premium") return false;
    if (plan === "pro" && (tier === "pro" || tier === "free")) return false;
    return tier !== "free";
  };

  const handleUseTemplate = (tmplId, name) => {
    const tmpl = templates.find((t) => t.id === tmplId);
    if (isLocked(tmpl.tier)) {
      navigate("/app/pricing");
      return;
    }
    const fd = new FormData();
    fd.append("intent", "create");
    fd.append("design", tmplId.toString());
    fd.append("name", name);
    submit(fd, { method: "post", action: actionPath });
  };

  const handleAction = (intent, id) => {
    const fd = new FormData();
    fd.append("intent", intent);
    fd.append("carouselId", id);
    submit(fd, { method: "post", action: actionPath });
  };

  const templates = [
    {
      id: 1,
      name: "Classic Slider",
      tier: "free",
      tagline: "Clean & minimal Snap Slider",
      features: ["Basic snap alignment", "Fully responsive resizing", "Core navigation loops"],
      previewData: DATASET_FURNITURE,
      component: ClassicSlider,
    },
    {
      id: 2,
      name: "Floating Cards",
      tier: "pro",
      tagline: "Gravity-defying Stagger entrance",
      features: ["Staggered card entrances", "Hover floating effect", "Auto-play controls"],
      previewData: DATASET_FASHION,
      component: FloatingCards,
    },
    {
      id: 3,
      name: "Coverflow 3D",
      tier: "pro",
      tagline: "Apple style Cinema view",
      features: ["3D Card depth tilt", "Active card focus-scaling", "Soft reflection overlay"],
      previewData: DATASET_SNEAKERS,
      component: CoverflowSlider,
    },
    {
      id: 4,
      name: "Stacked Story",
      tier: "elite",
      tagline: "Mobile native swipe-deck",
      features: ["Card stacking offset layers", "Interactive swipe / drag", "Micro-spring physics"],
      previewData: DATASET_GADGETS,
      component: StackedStory,
    },
    {
      id: 5,
      name: "Infinite Marquee",
      tier: "elite",
      tagline: "Continuous auto-scroll marquee",
      features: ["Non-stop continuous ticker", "Adaptive velocity speed", "Pause on hover toggle"],
      previewData: DATASET_LOGOS,
      component: InfiniteMarquee,
    },
    {
      id: 6,
      name: "3D Showcase",
      tier: "elite",
      tagline: "High-end product hero tilt",
      features: ["3D Parallax tilt support", "Text split-screen detail", "Glowing ambient backlights"],
      previewData: DATASET_LUXURY,
      component: Showcase3D,
    },
  ];

  const planBadges = {
    free: { label: "Free", className: "bg-white/5 text-gray-300 border border-white/10" },
    pro: { label: "Pro", className: "bg-violet-500/10 text-violet-300 border border-violet-500/20" },
    elite: { label: "Elite", className: "bg-rose-500/10 text-rose-300 border border-rose-500/20" },
  };

  return (
    <div className="min-h-screen bg-[#070913] text-gray-150 font-['Outfit',_sans-serif] selection:bg-white selection:text-gray-900 pb-24 overflow-x-hidden relative">
      {/* Background Mesh Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] aspect-square rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[35%] aspect-square rounded-full bg-rose-600/10 blur-[130px] pointer-events-none" />
      
      {/* Thin grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* ── Glass Header ── */}
      <header className="sticky top-0 bg-[#070913]/70 backdrop-blur-md border-b border-white/[0.06] z-50 px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
            <span className="font-extrabold text-xl tracking-tight text-white font-['Plus_Jakarta_Sans',_sans-serif]">CarouselCraft</span>
            <span className={`px-2.5 py-0.5 text-[10px] uppercase font-bold tracking-widest rounded-full ${
              plan === "elite" || plan === "premium" ? "bg-rose-600 text-white" : plan === "pro" ? "bg-violet-600 text-white" : "bg-white/10 text-gray-300"
            }`}>
              {plan === "premium" ? "Elite" : plan} Plan
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#templates" className="text-sm font-semibold text-gray-400 hover:text-white transition-colors">Templates</a>
            <button
              onClick={() => navigate("/app/pricing")}
              className="text-sm font-semibold text-gray-400 hover:text-white transition-colors"
            >
              Subscription Plans
            </button>
            <button
              onClick={() => handleUseTemplate(1, "Classic Slider Carousel")}
              className="bg-white text-gray-900 hover:bg-gray-150 text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Create Carousel
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative pt-16 pb-20 px-8 overflow-hidden">
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto mb-6 font-['Plus_Jakarta_Sans',_sans-serif] bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
            Capture Attention. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-rose-400">
              Convert Storefront Visitors.
            </span>
          </h1>
          <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            Stop losing sales to standard, static sliders. CarouselCraft gives you 6 ultra-premium layouts built with Framer Motion to elevate your brand catalog.
          </p>
          <div className="flex justify-center items-center gap-4 mb-16">
            <button
              onClick={() => handleUseTemplate(1, "Classic Slider Carousel")}
              className="bg-white text-gray-900 font-extrabold px-8 py-4 rounded-2xl shadow-xl shadow-white/5 hover:scale-103 active:scale-97 transition-all text-base flex items-center gap-2"
            >
              Start Building Free <ArrowRight className="w-4 h-4 text-violet-600" />
            </button>
            <a
              href="#templates"
              className="bg-white/5 hover:bg-white/10 text-white font-semibold px-8 py-4 rounded-2xl border border-white/10 shadow-sm transition-all text-base"
            >
              Explore Templates
            </a>
          </div>
        </div>

        {/* Continuous Animated Hero Demo Slider */}
        <div className="w-full overflow-hidden py-4 border-y border-white/[0.04] bg-white/[0.01]">
          <InfiniteMarquee
            slides={[
              { id: "h1", title: "Sculptural Lounge Chair", description: "Design focus", buttonText: "View Drop", imageUrl: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&q=80" },
              { id: "h2", title: "Premium Chronograph", description: "OLED display", buttonText: "View Drop", imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80" },
              { id: "h3", title: "Hi-Fi Studio Overear", description: "ANC hardware", buttonText: "View Drop", imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80" },
              { id: "h4", title: "Retro Suede Leather Lows", description: "Urban culture", buttonText: "View Drop", imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80" },
              { id: "h5", title: "Merino Wool Knitwear", description: "Autumn catalog", buttonText: "View Drop", imageUrl: "https://images.unsplash.com/photo-1574169208507-84376144848b?w=600&q=80" },
            ]}
            appearance={{ borderRadius: 16 }}
            layout={{ cardWidth: 280, gap: 24 }}
            navigation={{ marqueeDirection: "left", marqueeSpeed: 24, pauseOnHover: true }}
          />
        </div>
      </section>

      {/* ── Dashboard: My Carousels ── */}
      <section className="px-8 max-w-6xl mx-auto py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white font-['Plus_Jakarta_Sans',_sans-serif]">Your Created Carousels</h2>
            <p className="text-gray-400 text-sm mt-1">Manage, duplicate and install carousels to your storefront pages.</p>
          </div>
          {carousels.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveFilter(activeFilter === "published" ? "all" : "published")}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                  activeFilter === "published"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-lg shadow-emerald-500/10 scale-105"
                    : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                {carousels.filter(c => c.isActive).length} Published
              </button>
              <button
                onClick={() => setActiveFilter(activeFilter === "drafts" ? "all" : "drafts")}
                className={`text-xs font-bold px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                  activeFilter === "drafts"
                    ? "bg-white/10 text-white border-white/30 shadow-lg scale-105"
                    : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                {carousels.filter(c => !c.isActive).length} Drafts
              </button>
            </div>
          )}
        </div>

        {(() => {
          const filtered = carousels.filter((c) => {
            if (activeFilter === "published") return c.isActive;
            if (activeFilter === "drafts") return !c.isActive;
            return true;
          });

          if (carousels.length === 0) {
            return (
              <div className="bg-[#0d111f]/60 border border-white/[0.06] rounded-3xl p-16 text-center shadow-xl backdrop-blur-md">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                  <Settings2 className="w-6 h-6 text-gray-400" />
                </div>
                <p className="font-semibold text-white text-lg">No carousels designed yet</p>
                <p className="text-gray-400 text-sm max-w-sm mx-auto mt-2 leading-relaxed">
                  Select one of the premium templates below to spin up a pre-configured slider instantly.
                </p>
              </div>
            );
          }

          if (filtered.length === 0) {
            return (
              <div className="bg-[#0d111f]/60 border border-white/[0.06] rounded-3xl p-16 text-center shadow-xl backdrop-blur-md">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                  <Settings2 className="w-6 h-6 text-gray-400" />
                </div>
                <p className="font-semibold text-white text-lg">
                  {activeFilter === "published" ? "No published carousels" : "No draft carousels"}
                </p>
                <p className="text-gray-400 text-sm max-w-sm mx-auto mt-2 leading-relaxed">
                  {activeFilter === "published"
                    ? "Go to the editor to publish your carousel configurations to your storefront."
                    : "All created carousels are currently published."}
                </p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((item) => {
                const tmpl = templates.find((t) => t.id === item.design) || templates[0];
              return (
                <div
                  key={item.id}
                  className="bg-[#0d111f]/80 border border-white/[0.06] rounded-2xl p-5 shadow-2xl hover:border-white/[0.12] transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-bold text-gray-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                        {tmpl.name}
                      </span>
                      <div
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                          item.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-white/5 text-gray-400 border-white/10"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? "bg-emerald-400" : "bg-gray-500"}`}></span>
                        {item.isActive ? "Published" : "Draft"}
                      </div>
                    </div>

                    {/* Miniature Visual Preview */}
                    <div
                      className="h-28 rounded-xl flex items-center justify-center relative overflow-hidden mb-4 border border-white/[0.04] select-none pointer-events-none"
                      style={{
                        background: item.design === 3 ? "#0f0f1a" : "radial-gradient(circle at center, #111528 0%, #080a13 100%)",
                      }}
                    >
                      <div className="w-full scale-[0.55] transform origin-center">
                        {(() => {
                          const PreviewComp = tmpl.component;
                          const displaySlides = item.slides && item.slides.length > 0 ? item.slides : tmpl.previewData;
                          return (
                            <PreviewComp
                              slides={displaySlides}
                              appearance={item.appearance || { borderRadius: 8, backgroundColor: item.design === 3 ? "#0f0f1a" : "#0f1324" }}
                              layout={item.design === 3 ? { rotationAngle: 25, centerScale: 1.1, depthSpacing: 80, showReflection: false, cardWidth: 120 } : { visibleCards: 2, gap: 12, cardWidth: 140 }}
                              navigation={{ arrows: false, dots: false }}
                            />
                          );
                        })()}
                      </div>
                    </div>

                    <h3 className="font-bold text-white text-base truncate group-hover:text-violet-400 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {item._count.slides} Slides · Modified {item.formattedUpdatedAt}
                    </p>
                  </div>

                  <div className="flex gap-2 mt-6 pt-4 border-t border-white/[0.04]">
                    <button
                      onClick={() => navigate(`/app/carousel/${item.id}`)}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleAction("delete", item.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
      </section>

      {/* ── Templates Showcase ── */}
      <section id="templates" className="px-8 max-w-6xl mx-auto py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-black text-white tracking-tight font-['Plus_Jakarta_Sans',_sans-serif]">Template Marketplace</h2>
          <p className="text-gray-400 mt-2">
            Fully functional interactive components running live. Choose one to launch a pre-populated design template.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {templates.map((tmpl) => {
            const locked = isLocked(tmpl.tier);
            const badge = planBadges[tmpl.tier];
            return (
              <div
                key={tmpl.id}
                className={`bg-[#0d111f]/80 border rounded-3xl overflow-hidden shadow-2xl hover:border-white/[0.12] transition-all duration-300 flex flex-col justify-between relative ${
                  locked ? 'border-white/[0.04]' : 'border-white/[0.06]'
                }`}
              >
                {/* Visual Preview Container */}
                <div
                  className="p-6 h-[320px] flex items-center justify-center relative overflow-hidden flex-shrink-0"
                  style={{
                    background: tmpl.id === 3 ? "#0f0f1a" : "radial-gradient(circle at center, #111528 0%, #080a13 100%)",
                  }}
                >
                  {/* Real Live Running Mini Preview */}
                  <div className="w-full scale-[0.80] transform origin-center pointer-events-auto">
                    {(() => {
                      const PreviewComp = tmpl.component;
                      return (
                        <PreviewComp
                          slides={tmpl.previewData}
                          appearance={{ borderRadius: 12, backgroundColor: tmpl.id === 3 ? "#0f0f1a" : "#0d111f" }}
                          layout={tmpl.id === 3 ? { rotationAngle: 35, centerScale: 1.1, depthSpacing: 120, showReflection: false, cardWidth: 160 } : { visibleCards: 2, gap: 16, cardWidth: 180 }}
                          navigation={tmpl.id === 5 ? { marqueeDirection: "left", marqueeSpeed: 14, pauseOnHover: true } : { arrows: true, dots: false }}
                        />
                      );
                    })()}
                  </div>

                  {locked && (
                    <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] flex flex-col items-center justify-center z-20">
                      <div className="bg-[#0d111f] border border-white/[0.08] p-4 rounded-2xl shadow-2xl flex flex-col items-center">
                        <Lock className="w-6 h-6 text-amber-400 mb-2" />
                        <span className="text-xs font-bold text-gray-200 uppercase tracking-wide">
                          Unlock with {tmpl.tier === "pro" ? "Pro Plan" : "Elite Plan"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-6 border-t border-white/[0.04] flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-extrabold text-white text-xl font-['Plus_Jakarta_Sans',_sans-serif]">{tmpl.name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">{tmpl.tagline}</p>
                    <ul className="space-y-2 mb-6">
                      {tmpl.features.map((f, i) => (
                        <li key={i} className="flex items-center text-xs text-gray-300 gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-3 mt-auto">
                    <button
                      onClick={() => setPreviewingTemplate(tmpl)}
                      className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" /> Live Preview
                    </button>
                    <button
                      onClick={() => {
                        if (locked) {
                          navigate("/app/pricing");
                        } else {
                          handleUseTemplate(tmpl.id, `${tmpl.name} Carousel`);
                        }
                      }}
                      className={`flex-1 text-sm font-bold py-3 rounded-xl transition-all ${
                        locked
                          ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 shadow-lg shadow-amber-900/10"
                          : "bg-white text-gray-900 hover:bg-gray-150"
                      }`}
                    >
                      {locked ? "Upgrade to Unlock" : "Use Template"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Why CarouselCraft ── */}
      <section className="bg-[#0a0d17]/40 border-y border-white/[0.04] py-16 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-black text-white tracking-tight font-['Plus_Jakarta_Sans',_sans-serif]">Why Merchants Choose CarouselCraft</h2>
            <p className="text-gray-400 mt-2">Built to solve standard e-commerce conversions constraints natively.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { title: "Boost Product Discovery", desc: "Showcase up to 15 products in a single immersive interactive section." },
              { title: "Mobile-First Ergonomics", desc: "Swipe, drag, and tap touch mechanics fully optimized for iOS & Android." },
              { title: "Fast-Loading Performance", desc: "Lightweight Framer Motion animations keep storefront LCP scores green." },
            ].map((item, idx) => (
              <div key={idx} className="p-6 rounded-2xl hover:bg-white/[0.02] border border-transparent hover:border-white/[0.04] transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 font-bold text-white">
                  {idx + 1}
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Comparison ── */}
      <section className="px-8 max-w-6xl mx-auto py-16">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-black text-white tracking-tight font-['Plus_Jakarta_Sans',_sans-serif]">Feature Comparison</h2>
          <p className="text-gray-400 mt-2">Compare feature tiers and choose the perfect scaling stage.</p>
        </div>
        <div className="bg-[#0d111f]/80 border border-white/[0.06] rounded-3xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/[0.04]">
                <th className="p-5 font-bold text-sm text-gray-400">Features</th>
                <th className="p-5 font-bold text-sm text-gray-300 text-center">Free</th>
                <th className="p-5 font-bold text-sm text-violet-400 text-center">Pro</th>
                <th className="p-5 font-bold text-sm text-rose-400 text-center">Elite</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Templates Available", free: "Classic Only", pro: "Classic, Floating, Coverflow", elite: "All 6 Templates" },
                { name: "Auto-play & Autoplay speed controls", free: "❌", pro: "✓", elite: "✓" },
                { name: "Responsive breakpoint switches", free: "❌", pro: "✓", elite: "✓" },
                { name: "Swipe / Drag Gestures", free: "❌", pro: "❌", elite: "✓" },
                { name: "3D Transformation Engines", free: "❌", pro: "✓ (Coverflow)", elite: "✓ (Showcase & Coverflow)" },
                { name: "Clickable storefront slides", free: "❌", pro: "❌", elite: "✓" },
                { name: "Future template drops", free: "❌", pro: "❌", elite: "✓" },
              ].map((row, idx) => (
                <tr key={idx} className="border-b border-white/[0.04] hover:bg-white/[0.01] transition-colors">
                  <td className="p-5 font-semibold text-gray-300 text-sm">{row.name}</td>
                  <td className="p-5 text-gray-400 text-sm text-center">{row.free}</td>
                  <td className="p-5 text-violet-300 font-semibold text-sm text-center">{row.pro}</td>
                  <td className="p-5 text-rose-300 font-bold text-sm text-center">{row.elite}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Pricing CTA Banner ── */}
      <section className="px-8 max-w-6xl mx-auto py-16">
        <div className="bg-gradient-to-r from-violet-600 via-indigo-700 to-purple-800 rounded-3xl p-10 md:p-14 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border border-white/[0.08]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-xl text-center md:text-left">
            <span className="inline-flex items-center gap-1 bg-white/15 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-white/10">
              <Sparkles className="w-3.5 h-3.5" /> Unlock Premium Layouts
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight font-['Plus_Jakarta_Sans',_sans-serif]">Ready to Elevate Your Storefront?</h2>
            <p className="mt-4 text-white/80 leading-relaxed text-sm md:text-base">
              Upgrade your subscription to unlock gravity-defying staggers, 3D Coverflow viewports, and automated scrolling marquee loops. Subscriptions activate instantly.
            </p>
          </div>
          <div className="relative z-10 flex-shrink-0">
            <button
              onClick={() => navigate("/app/pricing")}
              className="bg-white hover:bg-gray-100 text-gray-900 font-bold px-8 py-4 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 text-base flex items-center gap-2"
            >
              View Subscription Plans <ArrowRight className="w-4 h-4 text-violet-600" />
            </button>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section className="px-8 max-w-4xl mx-auto py-16 border-t border-white/[0.04]">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-white tracking-tight font-['Plus_Jakarta_Sans',_sans-serif]">Frequently Asked Questions</h2>
          <p className="text-gray-400 mt-2">Common answers regarding setup, configurations and designs.</p>
        </div>
        <div className="bg-[#0d111f]/80 border border-white/[0.06] rounded-3xl p-8 shadow-2xl">
          <FAQItem
            question="How do simulated subscriptions work?"
            answer="Since we are testing locally without live sandbox credentials, clicking upgrade immediately writes the updated plan tier into our SQLite store model. This allows instant gating verification."
          />
          <FAQItem
            question="Can I configure slides to link to specific products?"
            answer="Yes! Slides support titles, descriptions, custom buttons, and redirect URLs so you can point users to collections, landing drops, or checkout flows."
          />
          <FAQItem
            question="Are all templates fully mobile responsive?"
            answer="Absolutely. Each design scales down fluidly. The Stacked Story and Coverflow cards adapt stacking cards and dimensions dynamically for smaller viewports."
          />
          <FAQItem
            question="Can I customize fonts and border radius?"
            answer="Yes. The advanced customization panel in the editor lets you configure background stages, font families (with Google Fonts presets), border curves, and layout spacing parameters."
          />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.04] mt-12 py-8 text-center text-gray-500 text-xs">
        <p>© 2026 CarouselCraft. Design premium storefront carousels. All rights reserved.</p>
      </footer>

      {/* ── Premium Live Preview Drawer/Modal ── */}
      {previewingTemplate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#0d111f] rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200 border border-white/[0.08]">
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-white/[0.04] flex items-center justify-between relative z-20 bg-[#0d111f]">
              <div>
                <h3 className="font-extrabold text-white text-xl flex items-center gap-2 font-['Plus_Jakarta_Sans',_sans-serif]">
                  {previewingTemplate.name}
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${planBadges[previewingTemplate.tier].className}`}>
                    {planBadges[previewingTemplate.tier].label}
                  </span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{previewingTemplate.tagline}</p>
              </div>
              <button
                onClick={() => setPreviewingTemplate(null)}
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors relative z-30"
              >
                ✕
              </button>
            </div>

            {/* Modal Stage */}
            <div
              className="p-8 h-[440px] flex items-center justify-center overflow-hidden relative z-10"
              style={{
                background: previewingTemplate.id === 3 ? "#0f0f1a" : "radial-gradient(circle at center, #111528 0%, #080a13 100%)",
              }}
            >
              <div className="w-full scale-[0.72] md:scale-[0.80] transform origin-center">
                {(() => {
                  const PreviewComp = previewingTemplate.component;
                  return (
                    <PreviewComp
                      slides={previewingTemplate.previewData}
                      appearance={{ borderRadius: 16, backgroundColor: previewingTemplate.id === 3 ? "#0f0f1a" : "#0d111f" }}
                      layout={previewingTemplate.id === 3 ? { rotationAngle: 42, centerScale: 1.15, depthSpacing: 180, showReflection: true, cardWidth: 260 } : { visibleCards: 2, gap: 24, cardWidth: 280 }}
                      navigation={{ arrows: true, dots: true, marqueeSpeed: 20, marqueeDirection: "left", pauseOnHover: true }}
                    />
                  );
                })()}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-8 py-5 border-t border-white/[0.04] bg-[#0a0d17]/40 flex items-center justify-between relative z-20">
              <div className="text-xs text-gray-400 max-w-md">
                Requires a <strong>{planBadges[previewingTemplate.tier].label}</strong> subscription to customize and publish to live Shopify themes.
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setPreviewingTemplate(null)}
                  className="bg-white/5 border border-white/10 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  Close Preview
                </button>
                <button
                  onClick={() => {
                    const id = previewingTemplate.id;
                    setPreviewingTemplate(null);
                    if (isLocked(previewingTemplate.tier)) {
                      navigate("/app/pricing");
                    } else {
                      handleUseTemplate(id, `${previewingTemplate.name} Carousel`);
                    }
                  }}
                  className={`text-sm font-bold px-6 py-2.5 rounded-xl transition-all ${
                    isLocked(previewingTemplate.tier)
                      ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 shadow-lg shadow-amber-900/10"
                      : "bg-white text-gray-900 hover:bg-gray-150"
                  }`}
                >
                  {isLocked(previewingTemplate.tier) ? "Upgrade to Unlock" : "Use Template"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
