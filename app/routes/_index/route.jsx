import { redirect, Form, useLoaderData } from "react-router";
import { login } from "../../shopify.server";
import { Sparkles, LayoutGrid, Zap, Code2, ArrowRight } from "lucide-react";
import styles from "./styles.module.css";

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const data = useLoaderData();
  const showForm = data?.showForm ?? false;

  return (
    <div className={styles.index}>
      {/* Background aesthetics */}
      <div className={styles.meshGlow1} />
      <div className={styles.meshGlow2} />
      <div className={styles.gridOverlay} />

      <div className={styles.content}>
        {/* Logo/Brand */}
        <div className={styles.brand}>
          <Sparkles className={`${styles.brandIcon} w-6 h-6`} />
          <span className={styles.brandName}>CarouselCraft</span>
        </div>

        {/* Hero Section */}
        <div className={styles.hero}>
          <h1 className={styles.heading}>
            Capture Attention. <br />
            <span className={styles.headingHighlight}>Convert Storefront Visitors.</span>
          </h1>
          <p className={styles.text}>
            Stop losing sales to standard, static sliders. CarouselCraft gives you 6 ultra-premium, interactive layout designs built with fluid physics to elevate your catalog.
          </p>
        </div>

        {/* Log In Form */}
        {showForm && (
          <div className={styles.loginBox}>
            <Form className={styles.form} method="post" action="/auth/login">
              <div className={styles.label}>
                <span className={styles.labelText}>Shop domain</span>
                <input 
                  className={styles.input} 
                  type="text" 
                  name="shop" 
                  placeholder="your-store.myshopify.com" 
                  required
                />
                <span className={styles.helperText}>e.g: my-shop-domain.myshopify.com</span>
              </div>
              <button className={styles.button} type="submit">
                Install & Log In <ArrowRight className="w-4 h-4" />
              </button>
            </Form>
          </div>
        )}

        {/* Features list */}
        <ul className={styles.featuresGrid}>
          <li className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>
              <LayoutGrid className="w-5 h-5" />
            </div>
            <h3 className={styles.featureTitle}>6 Premium Layouts</h3>
            <p className={styles.featureText}>
              Launch interactive sliders including Coverflow 3D, Stacked Deck, Infinite Marquee, and luxury 3D Hover showcases.
            </p>
          </li>
          <li className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>
              <Zap className="w-5 h-5" />
            </div>
            <h3 className={styles.featureTitle}>Fluid Motion Physics</h3>
            <p className={styles.featureText}>
              Powered by Framer Motion, offering smooth custom easing, gesture-based swipe controls, and interactive hover effects.
            </p>
          </li>
          <li className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>
              <Code2 className="w-5 h-5" />
            </div>
            <h3 className={styles.featureTitle}>No Coding Required</h3>
            <p className={styles.featureText}>
              Customize colors, card spacing, and autoplay options in real-time, then embed directly via standard App Blocks.
            </p>
          </li>
        </ul>
      </div>
    </div>
  );
}
