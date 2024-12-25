import { cssBundleHref } from "@remix-run/css-bundle";
import type { LinksFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from "@remix-run/react";
import { Toaster } from "sonner";
import "./tailwind.css";

// Configure future flags through remix.config.js instead of here
export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
];

export function ErrorBoundary() {
  const error = useRouteError();

  return (
    <html lang="en" className="h-full">
      <head>
        <title>Error - Interview Platform</title>
        <Meta />
        <Links />
      </head>
      <body className="h-full bg-slate-950 text-slate-200">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 p-8 rounded-lg shadow-lg text-center">
            <h1 className="text-2xl font-bold mb-4">
              {isRouteErrorResponse(error)
                ? `${error.status} - ${error.statusText}`
                : "Application Error"}
            </h1>
            <p className="text-slate-400 mb-8">
              {isRouteErrorResponse(error)
                ? error.data?.message || "An unexpected error occurred"
                : "Sorry, something went wrong. Please try again later."}
            </p>
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full">
        <Outlet />
        <Toaster 
          position="top-right" 
          richColors 
          closeButton
          theme="dark"
          expand
          visibleToasts={3}
        />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}