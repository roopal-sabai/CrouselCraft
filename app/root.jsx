import { useEffect } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import tailwindStyles from "./tailwind.css?url";

export const links = () => [
  { rel: "stylesheet", href: tailwindStyles },
];

export default function App() {
  useEffect(() => {
    const handleRejection = (event) => {
      // Catch fetch/network load promise rejections
      if (
        event.reason && 
        (event.reason.message?.includes("Failed to fetch") || 
         event.reason.message?.includes("Load failed") ||
         event.reason.name === "TypeError")
      ) {
        console.warn("Caught unhandled fetch failure. Attempting auto-reload...");
        window.location.reload();
      }
    };

    const handleError = (event) => {
      // Catch script/chunk load runtime errors
      if (
        event.message?.includes("Failed to fetch") || 
        event.message?.includes("dynamically imported module") ||
        event.message?.includes("error loading script")
      ) {
        console.warn("Caught dynamic chunk/script load failure. Attempting auto-reload...");
        window.location.reload();
      }
    };

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError, true);

    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError, true);
    };
  }, []);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <link 
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
