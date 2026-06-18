import { useEffect } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError, isRouteErrorResponse } from "react-router";
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

export function ErrorBoundary() {
  const error = useRouteError();
  let errorMessage = "An unexpected error occurred.";
  let errorStack = "";

  if (isRouteErrorResponse(error)) {
    errorMessage = `${error.status} ${error.statusText}`;
    errorStack = typeof error.data === "string" ? error.data : JSON.stringify(error.data);
  } else if (error instanceof Error) {
    errorMessage = error.message;
    errorStack = error.stack || "";
  }

  return (
    <html lang="en">
      <head>
        <title>App Error</title>
        <Meta />
        <Links />
      </head>
      <body className="bg-gray-50 p-8 font-sans">
        <div className="max-w-xl mx-auto bg-white border border-red-200 rounded-2xl p-6 shadow-md mt-12">
          <div className="text-red-500 text-3xl mb-4 font-bold">⚠️ Rendering Error</div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">{errorMessage}</h1>
          {errorStack && (
            <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-60 text-gray-600 font-mono mt-4">
              {errorStack}
            </pre>
          )}
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Reload Page
          </button>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
