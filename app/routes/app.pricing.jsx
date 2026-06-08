import { useLoaderData, useSubmit, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { Check, Zap, Crown, Star } from "lucide-react";

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
        "1 Basic Carousel Design",
        "Horizontal Sliding",
        "Basic Autoplay",
        "Standard Editor",
      ],
      color: "text-gray-600",
      bg: "bg-gray-100",
      border: "border-gray-200",
      btnClass: "bg-gray-900 text-white hover:bg-black",
    },
    {
      id: "pro",
      name: "Pro Plan",
      price: "$49",
      period: "/month",
      description: "For growing e-commerce stores.",
      icon: Zap,
      features: [
        "Everything in Free, plus:",
        "Floating Cards Carousel",
        "Coverflow 3D Carousel",
        "Advanced Animations",
        "Enhanced Customization",
      ],
      color: "text-violet-600",
      bg: "bg-violet-50",
      border: "border-violet-200",
      popular: true,
      btnClass: "bg-violet-600 text-white hover:bg-violet-700 shadow-md hover:shadow-lg",
    },
    {
      id: "premium",
      name: "Elite Plan",
      price: "$99",
      period: "/month",
      description: "For high-volume, luxury brands.",
      icon: Crown,
      features: [
        "Everything in Pro, plus:",
        "Stacked Story Carousel",
        "Infinite Marquee Carousel",
        "Premium 3D Showcase",
        "Advanced Typography & Shadows",
      ],
      color: "text-rose-600",
      bg: "bg-rose-50",
      border: "border-rose-200",
      btnClass: "bg-rose-600 text-white hover:bg-rose-700 shadow-md hover:shadow-lg",
    }
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-base font-semibold text-blue-600 tracking-wide uppercase">Pricing</h2>
          <p className="mt-2 text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight">
            Plans for every stage of your business
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
            Choose a plan that fits your needs. Upgrade anytime to unlock premium designs and advanced customization.
            <br/><span className="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full mt-4 inline-block">Local Testing Mode: Subscriptions unlock instantly</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const Icon = plan.icon;
            
            return (
              <div 
                key={plan.id}
                className={`relative bg-white rounded-3xl shadow-xl flex flex-col border-2 ${isCurrent ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2' : plan.border} transition-transform hover:-translate-y-1`}
              >
                {plan.popular && (
                  <div className="absolute top-0 inset-x-0 transform -translate-y-1/2 flex justify-center">
                    <span className="bg-violet-600 text-white text-xs font-bold uppercase tracking-widest py-1 px-4 rounded-full shadow-md">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="p-8 border-b border-gray-100 flex-1">
                  <div className={`w-12 h-12 rounded-xl ${plan.bg} flex items-center justify-center mb-6`}>
                    <Icon className={`w-6 h-6 ${plan.color}`} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-gray-500 mt-2 h-10">{plan.description}</p>
                  
                  <div className="mt-6 flex items-baseline text-5xl font-extrabold text-gray-900">
                    {plan.price}
                    {plan.period && <span className="ml-1 text-xl font-medium text-gray-500">{plan.period}</span>}
                  </div>
                  
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isCurrent}
                    className={`mt-8 w-full py-4 px-6 rounded-xl font-bold text-center transition-all ${
                      isCurrent 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : plan.btnClass
                    }`}
                  >
                    {isCurrent ? 'Current Plan' : `Upgrade to ${plan.name}`}
                  </button>
                </div>
                
                <div className="p-8 bg-gray-50 rounded-b-3xl flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">What's included</h4>
                  <ul className="space-y-4">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <div className="flex-shrink-0">
                          <Check className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="ml-3 text-base text-gray-700">{feature}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="text-center mt-12">
          <button onClick={() => navigate('/app')} className="text-gray-500 hover:text-gray-900 font-medium transition-colors">
            &larr; Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
