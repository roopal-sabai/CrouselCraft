import { useState } from "react";
import { useLoaderData, useSubmit, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { Check, Zap, Crown, Star, Sparkles, HelpCircle, ArrowLeft } from "lucide-react";

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

  return { currentPlan: shop.subscriptionPlan || "free" };
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const plan = formData.get("plan");

  if (["free", "pro", "premium"].includes(plan)) {
    await prisma.shop.update({
      where: { shop: session.shop },
      data: { subscriptionPlan: plan },
    });
  }

  return { success: true, plan };
};

export default function Pricing() {
  const { currentPlan } = useLoaderData();
  const submit = useSubmit();
  const navigate = useNavigate();
  const [billingInterval, setBillingInterval] = useState("monthly");

  const handleSubscribe = (planId) => {
    const formData = new FormData();
    formData.append("plan", planId);
    submit(formData, { method: "POST" });
  };

  const plans = [
    {
      id: "free",
      name: "Free Plan",
      price: "$0",
      description: "Perfect for getting started.",
      icon: Star,
      features: [
        "1 Basic Layout (Classic Snap)",
        "Standard Editor (Static visual view)",
        "Showcase images, titles & details",
        "❌ No layout swapping after creation",
        "❌ No clickable storefront redirects",
      ],
      color: "text-gray-400",
      bg: "bg-gray-800/80 border-gray-700/50",
      border: "border-gray-800/80",
      btnClass: "bg-white/10 text-white hover:bg-white/15 border border-white/10",
    },
    {
      id: "pro",
      name: "Pro Plan",
      price: billingInterval === "annual" ? "$39" : "$49",
      period: billingInterval === "annual" ? "/mo, billed annually" : "/month",
      description: "For growing e-commerce stores.",
      icon: Zap,
      features: [
        "3 Premium Layouts (Classic, Floating, Coverflow)",
        "Instant Layout Swapping in editor",
        "Custom slide redirects (outbound links)",
        "Autoplay speed & gap control configs",
        "Enhanced visual controls (borders & shadows)",
      ],
      color: "text-violet-400",
      bg: "bg-violet-950/40 border-violet-900/30",
      border: "border-violet-500/20",
      popular: true,
      btnClass: "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-900/40",
    },
    {
      id: "premium",
      name: "Elite Plan",
      price: billingInterval === "annual" ? "$79" : "$99",
      period: billingInterval === "annual" ? "/mo, billed annually" : "/month",
      description: "For high-volume, luxury brands.",
      icon: Crown,
      features: [
        "All 6 Premium Layouts unlocked",
        "Unlimited Layout Swapping anytime",
        "Clickable Storefront CTAs & redirects",
        "Advanced swipe, drag & spring gestures",
        "Google Fonts preset integration",
        "Ambient glowing background visual FX",
      ],
      color: "text-rose-400",
      bg: "bg-rose-950/40 border-rose-900/30",
      border: "border-rose-500/20",
      btnClass: "bg-gradient-to-r from-rose-600 to-pink-600 text-white hover:from-rose-500 hover:to-pink-500 shadow-md shadow-rose-900/40",
    }
  ];

  return (
    <div className="min-h-screen bg-[#070913] text-gray-150 font-['Outfit',_sans-serif] py-16 px-6 lg:px-8 relative overflow-hidden">
      {/* Background Mesh Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[55%] aspect-square rounded-full bg-violet-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[45%] aspect-square rounded-full bg-rose-600/10 blur-[130px] pointer-events-none" />
      
      {/* Thin grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Navigation back header */}
        <div className="mb-10">
          <button 
            onClick={() => navigate('/app')} 
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors bg-white/5 px-4 py-2.5 rounded-xl border border-white/10 shadow-lg backdrop-blur-md"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>

        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-flex items-center gap-1.5 bg-violet-500/10 text-violet-300 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-5 border border-violet-500/20">
            <Sparkles className="w-3.5 h-3.5" /> Subscriptions & Billing
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight font-['Plus_Jakarta_Sans',_sans-serif] bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-gray-500">
            Plans for every stage of your business
          </h1>
          <p className="mt-4 text-gray-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            Choose a plan that fits your storefront size. Upgrade anytime to unlock interactive layouts and slide redirections.
          </p>
          <div className="mt-4 text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-4 py-2 rounded-full inline-block">
            Local Testing Mode: Plans unlock instantly
          </div>
        </div>

        {/* Billing Interval Toggle */}
        <div className="flex justify-center items-center gap-4 mb-20">
          <span className={`text-sm font-bold transition-colors ${billingInterval === "monthly" ? "text-white" : "text-gray-500"}`}>
            Monthly Billing
          </span>
          <button
            onClick={() => setBillingInterval(billingInterval === "monthly" ? "annual" : "monthly")}
            className="w-14 h-7 rounded-full bg-white/10 border border-white/10 p-0.5 transition-all duration-200 relative focus:outline-none flex items-center"
          >
            <div className={`w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${billingInterval === "annual" ? "translate-x-7" : "translate-x-0"}`} />
          </button>
          <span className={`text-sm font-bold transition-colors flex items-center gap-2 ${billingInterval === "annual" ? "text-white" : "text-gray-500"}`}>
            Annual Billing
            <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Save 20%
            </span>
          </span>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const Icon = plan.icon;
            
            return (
              <div 
                key={plan.id}
                className={`relative bg-[#0d111f]/80 backdrop-blur-xl rounded-3xl shadow-2xl flex flex-col border transition-all duration-300 hover:-translate-y-2 group ${
                  isCurrent 
                    ? 'border-white ring-1 ring-white/30 shadow-white/5' 
                    : 'border-white/[0.06] hover:border-white/[0.12] hover:shadow-violet-950/20'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 inset-x-0 transform -translate-y-1/2 flex justify-center">
                    <span className="bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-600 text-white text-[10px] font-extrabold uppercase tracking-widest py-1 px-4 rounded-full shadow-lg">
                      Recommended Plan
                    </span>
                  </div>
                )}
                
                <div className="p-8 border-b border-white/[0.04] flex-1 flex flex-col justify-between">
                  <div>
                    <div className={`w-12 h-12 rounded-2xl ${plan.bg} flex items-center justify-center mb-6 border ${plan.border}`}>
                      <Icon className={`w-6 h-6 ${plan.color}`} />
                    </div>
                    <h3 className="text-2xl font-black text-white font-['Plus_Jakarta_Sans',_sans-serif]">{plan.name}</h3>
                    <p className="text-gray-400 text-sm mt-2 h-10 leading-relaxed">{plan.description}</p>
                    
                    <div className="mt-6 flex items-baseline text-5xl font-black text-white tracking-tight">
                      {plan.price}
                      {plan.period && (
                        <span className="ml-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          {plan.period}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isCurrent}
                    className={`mt-8 w-full py-4 px-6 rounded-2xl font-bold text-center transition-all ${
                      isCurrent 
                        ? 'bg-white/5 text-gray-400 cursor-not-allowed border border-white/5'
                        : plan.btnClass
                    }`}
                  >
                    {isCurrent ? 'Current Active Tier' : `Upgrade to ${plan.name}`}
                  </button>
                </div>
                
                <div className="p-8 bg-[#0a0d17]/40 rounded-b-3xl flex-1 border-t border-white/[0.02]">
                  <h4 className="text-xs font-extrabold text-white/40 uppercase tracking-widest mb-4">Included Features</h4>
                  <ul className="space-y-4">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <div className="flex-shrink-0 mt-0.5">
                          {feature.startsWith("❌") ? (
                            <span className="text-xs"></span>
                          ) : (
                            <Check className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                        <p className={`ml-2.5 text-sm text-gray-300 ${feature.startsWith("❌") ? "text-gray-500 italic line-through" : ""}`}>
                          {feature.replace("❌", "").trim()}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Support Callout */}
        <div className="mt-24 text-center bg-white/[0.02] border border-white/[0.06] p-8 rounded-3xl max-w-xl mx-auto shadow-xl backdrop-blur-md">
          <HelpCircle className="w-6 h-6 text-violet-400 mx-auto mb-3" />
          <h4 className="font-extrabold text-white text-base font-['Plus_Jakarta_Sans',_sans-serif]">Have questions about billing?</h4>
          <p className="text-gray-400 text-sm mt-1 leading-relaxed">Our support team is online 24/7 to resolve checkout, installation, or design concerns.</p>
        </div>
      </div>
    </div>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
