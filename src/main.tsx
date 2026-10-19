import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const AdminApp = import.meta.env.DEV
  ? lazy(() => import("./admin/AdminApp"))
  : null;

const isAdminRoute =
  window.location.pathname === "/admin" ||
  window.location.pathname.startsWith("/admin/");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isAdminRoute && AdminApp ? (
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen bg-gray-50 text-xs text-gray-500 font-sans">
            Loading Admin Panel...
          </div>
        }
      >
        <AdminApp />
      </Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
