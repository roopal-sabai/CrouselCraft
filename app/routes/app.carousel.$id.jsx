import { useState, useEffect } from "react";
import { useLoaderData, useNavigate, useSubmit, useActionData, useNavigation } from "react-router";
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
  ChevronLeft,
  Plus,
  Trash2,
  Image as ImageIcon,
  Monitor,
  Tablet,
  Smartphone,
  Lock,
} from "lucide-react";

// ─── Loader ──────────────────────────────────
export const loader = async ({ request, params }) => {
  const { session } = await authenticate.admin(request);
  const shop = await prisma.shop.findUnique({ where: { shop: session.shop } });
  const carousel = await prisma.carousel.findUnique({
    where: { id: params.id },
    include: { slides: { orderBy: { order: "asc" } } },
  });
  if (!carousel) throw new Response("Not Found", { status: 404 });
  return { carousel, plan: shop?.subscriptionPlan || "free", shopDomain: session.shop };
};

// ─── Action ──────────────────────────────────
export const action = async ({ request, params }) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  console.log("[Editor Action Debug]", { intent, params });

  if (intent === "updateSettings") {
    await prisma.carousel.update({
      where: { id: params.id },
      data: {
        name: formData.get("name"),
        design: parseInt(formData.get("design") || "1", 10),
        appearance: formData.get("appearance"),
        layout: formData.get("layout"),
        navigation: formData.get("navigation"),
        isActive: formData.get("isActive") === "true",
      },
    });
  } else if (intent === "createSlide") {
    const count = await prisma.slide.count({ where: { carouselId: params.id } });
    await prisma.slide.create({
      data: {
        carouselId: params.id,
        order: count,
        title: "New Slide",
        description: "Describe your product here.",
        buttonText: "Shop Now",
        linkUrl: "/collections/all",
        imageUrl: "https://images.unsplash.com/photo-1618220179428-22790b46a0eb?w=800&q=80",
      },
    });
    await prisma.carousel.update({
      where: { id: params.id },
      data: { updatedAt: new Date() },
    });
  } else if (intent === "updateSlide") {
    await prisma.slide.update({
      where: { id: formData.get("slideId") },
      data: {
        title: formData.get("title"),
        description: formData.get("description"),
        buttonText: formData.get("buttonText"),
        linkUrl: formData.get("linkUrl"),
        imageUrl: formData.get("imageUrl"),
      },
    });
    await prisma.carousel.update({
      where: { id: params.id },
      data: { updatedAt: new Date() },
    });
  } else if (intent === "deleteSlide") {
    await prisma.slide.deleteMany({ where: { id: formData.get("slideId") } });
    await prisma.carousel.update({
      where: { id: params.id },
      data: { updatedAt: new Date() },
    });
  }

  return { success: true };
};

// ─── Template definitions ────────────────────
const TEMPLATES = [
  {
    id: 1,
    name: "Classic Slider",
    tier: "free",
    tagline: "Clean & minimal",
    accent: "#6B7280",
    bg: "#F9FAFB",
    preview: "▬▬▬",
  },
  {
    id: 2,
    name: "Floating Cards",
    tier: "pro",
    tagline: "Hover & lift",
    accent: "#7C3AED",
    bg: "#F5F3FF",
    preview: "↑ ↑ ↑",
  },
  {
    id: 3,
    name: "Coverflow 3D",
    tier: "pro",
    tagline: "Cinematic depth",
    accent: "#1D4ED8",
    bg: "#EFF6FF",
    preview: "◁ ◈ ▷",
  },
  {
    id: 4,
    name: "Stacked Story",
    tier: "elite",
    tagline: "Drag to reveal",
    accent: "#059669",
    bg: "#ECFDF5",
    preview: "▣ ▣ ▣",
  },
  {
    id: 5,
    name: "Infinite Marquee",
    tier: "elite",
    tagline: "Non-stop scroll",
    accent: "#B45309",
    bg: "#FFFBEB",
    preview: "→→→→→",
  },
  {
    id: 6,
    name: "3D Showcase",
    tier: "elite",
    tagline: "Luxury hero",
    accent: "#BE185D",
    bg: "#FDF2F8",
    preview: "✦ tilt",
  },
];

const TIER_BADGE = {
  free: { label: "Free", className: "bg-gray-100 text-gray-600" },
  pro: { label: "Pro · $49", className: "bg-violet-100 text-violet-700" },
  elite: { label: "Elite · $99", className: "bg-rose-100 text-rose-700" },
};

// Defaults per design so switching never crashes
const DESIGN_DEFAULTS = {
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
};

// ─── Toggle Switch ───────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${checked ? "bg-gray-900" : "bg-gray-200"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  );
}

// ─── Slider control ──────────────────────────
function SliderControl({ label, value, min, max, step = 1, unit = "", onChange }) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-gray-900"
      />
    </div>
  );
}

// ─── Segmented control ───────────────────────
function Segmented({ options, value, onChange }) {
  return (
    <div className="flex border border-gray-200 rounded-xl overflow-hidden">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 text-xs font-semibold py-2 transition-colors ${value === opt.value ? "bg-gray-900 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Design-specific sidebar panels ─────────
function SettingsPanel({ design, appearance, setAppearance, layout, setLayout, navigation, setNavigation }) {
  const Section = ({ title }) => (
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 mt-5 first:mt-0">{title}</p>
  );

  const ToggleRow = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-700">{label}</span>
      <Toggle checked={!!checked} onChange={onChange} />
    </div>
  );

  // ── Shared: border radius + bg color ──
  const SharedAppearance = () => (
    <>
      <Section title="Appearance" />
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-700">Background color</span>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-2 py-1.5 rounded-lg">
          <input
            type="color"
            value={appearance.backgroundColor || "#ffffff"}
            onChange={(e) => setAppearance({ ...appearance, backgroundColor: e.target.value })}
            className="w-6 h-6 rounded cursor-pointer border-0 p-0"
          />
          <span className="text-xs text-gray-500 uppercase w-16">{appearance.backgroundColor || "#ffffff"}</span>
        </div>
      </div>
      <SliderControl
        label="Border radius"
        value={appearance.borderRadius ?? 12}
        min={0} max={48} step={4} unit="px"
        onChange={(v) => setAppearance({ ...appearance, borderRadius: v })}
      />
    </>
  );

  if (design === 1) {
    return (
      <div className="space-y-4">
        <SharedAppearance />
        <Section title="Layout" />
        <SliderControl label="Visible cards" value={layout.visibleCards ?? 3} min={1} max={5} onChange={(v) => setLayout({ ...layout, visibleCards: v })} />
        <SliderControl label="Card gap" value={layout.gap ?? 24} min={0} max={64} step={4} unit="px" onChange={(v) => setLayout({ ...layout, gap: v })} />
        <Section title="Navigation" />
        <ToggleRow label="Arrow buttons" checked={navigation.arrows} onChange={(v) => setNavigation({ ...navigation, arrows: v })} />
        <ToggleRow label="Dot indicators" checked={navigation.dots} onChange={(v) => setNavigation({ ...navigation, dots: v })} />
        <ToggleRow label="Infinite loop" checked={navigation.infinite} onChange={(v) => setNavigation({ ...navigation, infinite: v })} />
        <ToggleRow label="Autoplay" checked={navigation.autoplay} onChange={(v) => setNavigation({ ...navigation, autoplay: v })} />
        {navigation.autoplay && (
          <SliderControl label="Autoplay speed" value={navigation.speed ?? 3000} min={1000} max={8000} step={500} unit="ms" onChange={(v) => setNavigation({ ...navigation, speed: v })} />
        )}
      </div>
    );
  }

  if (design === 2) {
    return (
      <div className="space-y-4">
        <SharedAppearance />
        <Section title="Layout" />
        <SliderControl label="Visible cards" value={layout.visibleCards ?? 3} min={1} max={5} onChange={(v) => setLayout({ ...layout, visibleCards: v })} />
        <SliderControl label="Card gap" value={layout.gap ?? 28} min={0} max={64} step={4} unit="px" onChange={(v) => setLayout({ ...layout, gap: v })} />
        <Section title="Hover effect" />
        <SliderControl label="Float lift amount" value={Math.abs(layout.yOffset ?? 14)} min={4} max={32} unit="px" onChange={(v) => setLayout({ ...layout, yOffset: -v })} />
        <SliderControl label="Stagger delay" value={layout.staggerDelay ?? 0.08} min={0} max={0.3} step={0.01} unit="s" onChange={(v) => setLayout({ ...layout, staggerDelay: v })} />
        <Section title="Autoplay" />
        <ToggleRow label="Autoplay" checked={navigation.autoplay} onChange={(v) => setNavigation({ ...navigation, autoplay: v })} />
        {navigation.autoplay && (
          <SliderControl label="Speed" value={navigation.speed ?? 3000} min={1000} max={8000} step={500} unit="ms" onChange={(v) => setNavigation({ ...navigation, speed: v })} />
        )}
      </div>
    );
  }

  if (design === 3) {
    return (
      <div className="space-y-4">
        <SharedAppearance />
        <Section title="3D depth" />
        <SliderControl label="Rotation angle" value={layout.rotationAngle ?? 42} min={0} max={60} unit="°" onChange={(v) => setLayout({ ...layout, rotationAngle: v })} />
        <SliderControl label="Active card scale" value={layout.centerScale ?? 1.12} min={1.0} max={1.3} step={0.01} onChange={(v) => setLayout({ ...layout, centerScale: v })} />
        <SliderControl label="Depth spacing" value={layout.depthSpacing ?? 200} min={100} max={320} step={10} unit="px" onChange={(v) => setLayout({ ...layout, depthSpacing: v })} />
        <SliderControl label="Card width" value={layout.cardWidth ?? 300} min={220} max={420} step={10} unit="px" onChange={(v) => setLayout({ ...layout, cardWidth: v })} />
        <Section title="Visual FX" />
        <ToggleRow label="Mirror reflection" checked={layout.showReflection ?? true} onChange={(v) => setLayout({ ...layout, showReflection: v })} />
        <Section title="Navigation" />
        <ToggleRow label="Arrow buttons" checked={navigation.arrows} onChange={(v) => setNavigation({ ...navigation, arrows: v })} />
        <ToggleRow label="Dot indicators" checked={navigation.dots} onChange={(v) => setNavigation({ ...navigation, dots: v })} />
      </div>
    );
  }

  if (design === 4) {
    return (
      <div className="space-y-4">
        <SharedAppearance />
        <Section title="Stack layout" />
        <SliderControl label="Stack spread" value={layout.stackSpread ?? 22} min={8} max={60} unit="px" onChange={(v) => setLayout({ ...layout, stackSpread: v })} />
        <SliderControl label="Scale step per layer" value={layout.scaleStep ?? 0.06} min={0.01} max={0.12} step={0.01} onChange={(v) => setLayout({ ...layout, scaleStep: v })} />
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Stack direction</p>
          <Segmented
            options={[{ label: "Stack below", value: "bottom" }, { label: "Stack above", value: "top" }]}
            value={layout.stackDirection ?? "bottom"}
            onChange={(v) => setLayout({ ...layout, stackDirection: v })}
          />
        </div>
        <Section title="Interaction" />
        <ToggleRow label="Drag / swipe to cycle" checked={navigation.enableDrag ?? true} onChange={(v) => setNavigation({ ...navigation, enableDrag: v })} />
      </div>
    );
  }

  if (design === 5) {
    return (
      <div className="space-y-4">
        <SharedAppearance />
        <Section title="Card sizing" />
        <SliderControl label="Card width" value={layout.cardWidth ?? 300} min={200} max={440} step={10} unit="px" onChange={(v) => setLayout({ ...layout, cardWidth: v })} />
        <SliderControl label="Gap between cards" value={layout.gap ?? 20} min={4} max={48} step={4} unit="px" onChange={(v) => setLayout({ ...layout, gap: v })} />
        <Section title="Scroll behaviour" />
        <SliderControl label="Scroll duration" value={navigation.marqueeSpeed ?? 28} min={8} max={60} unit="s" onChange={(v) => setNavigation({ ...navigation, marqueeSpeed: v })} />
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Scroll direction</p>
          <Segmented
            options={[{ label: "← Left", value: "left" }, { label: "Right →", value: "right" }]}
            value={navigation.marqueeDirection ?? "left"}
            onChange={(v) => setNavigation({ ...navigation, marqueeDirection: v })}
          />
        </div>
        <ToggleRow label="Pause on hover" checked={navigation.pauseOnHover ?? true} onChange={(v) => setNavigation({ ...navigation, pauseOnHover: v })} />
      </div>
    );
  }

  if (design === 6) {
    return (
      <div className="space-y-4">
        <SharedAppearance />
        <Section title="Layout" />
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Content side</p>
          <Segmented
            options={[{ label: "Text left", value: "left" }, { label: "Text right", value: "right" }]}
            value={layout.layoutSide ?? "left"}
            onChange={(v) => setLayout({ ...layout, layoutSide: v })}
          />
        </div>
        <ToggleRow label="Ambient glow background" checked={layout.showGradientBg ?? true} onChange={(v) => setLayout({ ...layout, showGradientBg: v })} />
        <Section title="3D tilt" />
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Tilt strength</p>
          <Segmented
            options={[
              { label: "None", value: 0 },
              { label: "Subtle", value: 6 },
              { label: "Medium", value: 12 },
              { label: "Intense", value: 20 },
            ]}
            value={layout.tiltStrength ?? 12}
            onChange={(v) => setLayout({ ...layout, tiltStrength: v })}
          />
        </div>
        <Section title="CTA button" />
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Button style</p>
          <Segmented
            options={[{ label: "Solid", value: "solid" }, { label: "Outline", value: "outline" }, { label: "Glass", value: "glass" }]}
            value={navigation.buttonStyle ?? "solid"}
            onChange={(v) => setNavigation({ ...navigation, buttonStyle: v })}
          />
        </div>
      </div>
    );
  }

  return null;
}

// ─── Main Editor ─────────────────────────────
export default function CarouselEditor() {
  const { carousel, plan, shopDomain } = useLoaderData();
  const submit = useSubmit();
  const navigate = useNavigate();
  const actionData = useActionData();
  const nav = useNavigation();
  const actionPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";

  const [activeTab, setActiveTab] = useState("settings");
  const [previewMode, setPreviewMode] = useState("desktop");
  const [name, setName] = useState(carousel.name);
  const [design, setDesign] = useState(carousel.design || 1);
  const [editingSlideId, setEditingSlideId] = useState(null);
  const [isActive, setIsActive] = useState(carousel.isActive);

  const isSaving = nav.state === "submitting" && nav.formData?.get("intent") === "updateSettings";

  useEffect(() => {
    if (actionData?.success) {
      window.shopify?.toast.show("Carousel saved successfully");
    }
  }, [actionData]);

  const defaults = DESIGN_DEFAULTS[design] || DESIGN_DEFAULTS[1];

  const [appearance, setAppearance] = useState(
    () => ({ ...defaults.appearance, ...(JSON.parse(carousel.appearance || "{}")) })
  );
  const [layout, setLayout] = useState(
    () => ({ ...defaults.layout, ...(JSON.parse(carousel.layout || "{}")) })
  );
  const [navigation, setNavigation] = useState(
    () => ({ ...defaults.navigation, ...(JSON.parse(carousel.navigation || "{}")) })
  );

  const isLocked = (tier) => {
    if (plan === "elite" || plan === "premium") return false;
    if (plan === "pro" && (tier === "pro" || tier === "free")) return false;
    return tier !== "free";
  };

  const handleDesignChange = (newDesign) => {
    const tmpl = TEMPLATES.find((t) => t.id === newDesign);
    if (isLocked(tmpl.tier)) return;
    const d = DESIGN_DEFAULTS[newDesign];
    setDesign(newDesign);
    setAppearance(d.appearance);
    setLayout(d.layout);
    setNavigation(d.navigation);
  };

  const handleSave = () => {
    const fd = new FormData();
    fd.append("intent", "updateSettings");
    fd.append("name", name);
    fd.append("design", design.toString());
    fd.append("appearance", JSON.stringify(appearance));
    fd.append("layout", JSON.stringify(layout));
    fd.append("navigation", JSON.stringify(navigation));
    fd.append("isActive", isActive ? "true" : "false");
    submit(fd, { method: "post", action: actionPath });
  };

  const renderPreview = () => {
    const props = { slides: carousel.slides, appearance, layout, navigation, shopDomain };
    switch (design) {
      case 1: return <ClassicSlider {...props} />;
      case 2: return <FloatingCards {...props} />;
      case 3: return <CoverflowSlider {...props} />;
      case 4: return <StackedStory {...props} />;
      case 5: return <InfiniteMarquee {...props} />;
      case 6: return <Showcase3D {...props} />;
      default: return <ClassicSlider {...props} />;
    }
  };

  const previewMaxWidth = previewMode === "desktop" ? "1200px" : previewMode === "tablet" ? "768px" : "390px";

  return (
    <div className="flex h-screen bg-[#F4F4F5] font-sans overflow-hidden">

      {/* ── Sidebar ── */}
      <div className={`w-full md:w-[380px] bg-white border-r border-gray-200 flex flex-col h-full z-10 flex-shrink-0 ${activeTab === "preview" ? "hidden md:flex" : "flex"}`}>

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <button onClick={() => navigate("/app")} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="font-bold text-gray-900 bg-transparent border-none focus:ring-0 flex-1 min-w-0 text-sm"
          />
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black transition-colors font-semibold text-sm flex-shrink-0 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>



        {/* Main tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50">
          {[
            { id: "settings", label: "Settings" },
            { id: "slides", label: `Slides (${carousel.slides.length})` },
            { id: "preview", label: "Preview", className: "md:hidden" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${tab.className || ""} flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === tab.id
                  ? "border-b-2 border-gray-900 text-gray-900 bg-white"
                  : "text-gray-400 hover:text-gray-700"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === "settings" ? (
            <div className="p-5 space-y-6 pb-16">

              {/* Publication Status */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Status</p>
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="flex flex-col gap-0.5 text-left">
                    <span className="text-xs font-bold text-gray-800">
                      {isActive ? "Published" : "Draft Mode"}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {isActive
                        ? "Visible on storefront via widget block."
                        : "Hidden from storefront auto-discovery."}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isActive ? "bg-emerald-500" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        isActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>



              {/* Template picker: visual cards */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Choose template</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {TEMPLATES.map((tmpl) => {
                    const locked = isLocked(tmpl.tier);
                    const active = design === tmpl.id;
                    const badge = TIER_BADGE[tmpl.tier];
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleDesignChange(tmpl.id)}
                        disabled={locked}
                        className={`relative text-left rounded-xl border-2 transition-all overflow-hidden ${active
                            ? "border-gray-900 shadow-md"
                            : locked
                              ? "border-gray-100 opacity-50 cursor-not-allowed"
                              : "border-gray-100 hover:border-gray-300 hover:shadow-sm"
                          }`}
                      >
                        {/* Color swatch header */}
                        <div
                          className="h-12 flex items-center justify-center relative overflow-hidden"
                          style={{ background: tmpl.bg }}
                        >
                          {tmpl.id === 1 && (
                            <div className="flex gap-1 justify-center w-full px-2">
                              <div className="w-8 h-6 rounded bg-white border border-gray-200 shadow-sm" />
                              <div className="w-8 h-6 rounded bg-white border border-gray-200 shadow-sm" />
                              <div className="w-8 h-6 rounded bg-white border border-gray-200 shadow-sm" />
                            </div>
                          )}
                          {tmpl.id === 2 && (
                            <div className="flex gap-1 justify-center items-end w-full px-2 h-full pb-1.5">
                              <div className="w-7 h-5 rounded bg-white border border-gray-200 shadow-sm" style={{ borderColor: active ? tmpl.accent : '#e5e7eb' }} />
                              <div className="w-7 h-5 rounded bg-white border border-gray-200 shadow-sm -translate-y-1.5" style={{ borderColor: tmpl.accent }} />
                              <div className="w-7 h-5 rounded bg-white border border-gray-200 shadow-sm -translate-y-0.5" style={{ borderColor: active ? tmpl.accent : '#e5e7eb' }} />
                            </div>
                          )}
                          {tmpl.id === 3 && (
                            <div className="flex gap-0.5 justify-center items-center w-full px-2 h-full relative" style={{ perspective: "100px" }}>
                              <div className="w-7 h-5 rounded bg-white/40 border border-gray-300 shadow-sm" style={{ transform: "rotateY(30deg) scale(0.85)" }} />
                              <div className="w-8 h-6 rounded bg-white border shadow-md z-10" style={{ borderColor: tmpl.accent }} />
                              <div className="w-7 h-5 rounded bg-white/40 border border-gray-300 shadow-sm" style={{ transform: "rotateY(-30deg) scale(0.85)" }} />
                            </div>
                          )}
                          {tmpl.id === 4 && (
                            <div className="relative w-full h-full flex justify-center items-center">
                              <div className="absolute w-9 h-6 rounded bg-white/30 border border-gray-200 shadow-sm" style={{ transform: "translateY(4px) scale(0.88)" }} />
                              <div className="absolute w-9 h-6 rounded bg-white/60 border border-gray-200 shadow-sm" style={{ transform: "translateY(2px) scale(0.94)" }} />
                              <div className="absolute w-9 h-6 rounded bg-white border shadow-md" style={{ borderColor: tmpl.accent }} />
                            </div>
                          )}
                          {tmpl.id === 5 && (
                            <div className="flex gap-1.5 items-center w-[130%] opacity-90">
                              <div className="w-7 h-5 rounded bg-white border border-gray-200 flex-shrink-0 shadow-sm" />
                              <div className="w-7 h-5 rounded bg-white border border-gray-200 flex-shrink-0 shadow-sm" style={{ borderColor: tmpl.accent }} />
                              <div className="w-7 h-5 rounded bg-white border border-gray-200 flex-shrink-0 shadow-sm" />
                              <div className="w-7 h-5 rounded bg-white border border-gray-200 flex-shrink-0 shadow-sm" />
                            </div>
                          )}
                          {tmpl.id === 6 && (
                            <div className="flex justify-between items-center w-full px-2 h-full py-1">
                              <div className="w-[30%] h-4 rounded bg-white/30 border border-dashed border-gray-300" />
                              <div className="w-[60%] h-6 rounded bg-white border shadow-md transform rotate-2" style={{ borderColor: tmpl.accent }} />
                            </div>
                          )}
                        </div>
                        <div className="px-2.5 pt-2 pb-2.5 bg-white">
                          <p className="text-xs font-bold text-gray-900 leading-tight">{tmpl.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{tmpl.tagline}</p>
                          <span className={`inline-block mt-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                        {locked && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                            <Lock className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        {active && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-gray-900 flex items-center justify-center">
                            <span className="text-white text-[8px]">✓</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Design-specific controls */}
              <SettingsPanel
                design={design}
                appearance={appearance}
                setAppearance={setAppearance}
                layout={layout}
                setLayout={setLayout}
                navigation={navigation}
                setNavigation={setNavigation}
              />
            </div>
          ) : (
            <div className="p-4 space-y-3 pb-16">
              {carousel.slides.map((slide) => (
                <div
                  key={slide.id}
                  className={`bg-white border rounded-xl overflow-hidden transition-all ${editingSlideId === slide.id ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200"
                    }`}
                >
                  {editingSlideId === slide.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.target);
                        fd.append("intent", "updateSlide");
                        fd.append("slideId", slide.id);
                        submit(fd, { method: "post", action: actionPath });
                        setEditingSlideId(null);
                      }}
                      className="p-4 space-y-3 bg-gray-50"
                    >
                      {[
                        { name: "imageUrl", label: "Image URL", defaultValue: slide.imageUrl, placeholder: "https://..." },
                        { name: "title", label: "Title", defaultValue: slide.title },
                        { name: "buttonText", label: "Button text", defaultValue: slide.buttonText },
                        { name: "linkUrl", label: "Redirect URL", defaultValue: slide.linkUrl, placeholder: "/collections/all" },
                      ].map((field) => (
                        <div key={field.name}>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">{field.label}</label>
                          <input
                            type="text"
                            name={field.name}
                            defaultValue={field.defaultValue}
                            placeholder={field.placeholder}
                            className="w-full text-sm p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Description</label>
                        <textarea
                          name="description"
                          defaultValue={slide.description}
                          rows={2}
                          className="w-full text-sm p-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white resize-none"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button type="submit" className="flex-1 bg-gray-900 text-white py-2 rounded-lg text-sm font-semibold hover:bg-black transition-colors">
                          Save slide
                        </button>
                        <button type="button" onClick={() => setEditingSlideId(null)} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div
                      className="flex items-center p-3 gap-3 cursor-pointer hover:bg-gray-50 transition-colors group"
                      onClick={() => setEditingSlideId(slide.id)}
                    >
                      <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-100">
                        {slide.imageUrl ? (
                          <img src={slide.imageUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{slide.title || "Untitled"}</p>
                        <p className="text-gray-400 text-xs truncate">{slide.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this slide?")) {
                            const fd = new FormData();
                            fd.append("intent", "deleteSlide");
                            fd.append("slideId", slide.id);
                            submit(fd, { method: "post", action: actionPath });
                          }
                        }}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={() => { const fd = new FormData(); fd.append("intent", "createSlide"); submit(fd, { method: "post", action: actionPath }); }}
                className="w-full py-4 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-semibold text-sm hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add slide
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Live Preview ── */}
      <div className={`flex-1 flex flex-col overflow-hidden ${activeTab === "preview" ? "flex" : "hidden md:flex"}`}>

        {/* Preview toolbar */}
        <div className="flex items-center justify-center py-3 border-b border-gray-200 bg-white gap-1">
          {[
            { id: "desktop", icon: Monitor, label: "Desktop" },
            { id: "tablet", icon: Tablet, label: "Tablet" },
            { id: "mobile", icon: Smartphone, label: "Mobile" },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setPreviewMode(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${previewMode === id ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"
                }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div
          className="flex-1 overflow-auto p-6 flex justify-center items-start"
          style={{ backgroundColor: "#E5E7EB" }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl overflow-hidden flex-shrink-0 transition-all duration-300 w-full"
            style={{
              maxWidth: previewMaxWidth,
              minHeight: "100%",
              backgroundColor: appearance.backgroundColor || "#ffffff",
            }}
          >
            {/* Fake store header */}
            <div className="border-b border-gray-100 px-8 py-4 flex items-center gap-4">
              <div className="font-bold text-gray-900 text-sm">My Store</div>
              <div className="flex-1" />
              {["Home", "Shop", "About"].map((l) => (
                <button
                  key={l}
                  onClick={() => window.shopify?.toast.show(`Navigated to ${l} page (simulation)`)}
                  className="text-xs text-gray-400 hover:text-gray-900 bg-transparent border-0 cursor-pointer p-0"
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Carousel preview area */}
            <div className="px-8 py-10" style={{ fontFamily: appearance.fontFamily }}>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Featured Collection</h2>
                <p className="text-gray-500">Discover our hand-picked selection.</p>
              </div>
              <div
                style={{
                  background: design === 3 ? "#0f0f1a" : "transparent",
                  borderRadius: 16,
                  padding: design === 3 ? "8px" : 0,
                }}
              >
                {renderPreview()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}