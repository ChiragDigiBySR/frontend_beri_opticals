import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";

export default function AppLayout() {
  // Start open on desktop, closed on mobile/tablet
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const { user } = useSelector((state) => state.auth);
  const userRole = user?.role || "";

  // Keep behavior sane on resize (e.g. rotating a tablet, resizing browser)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-gray-100">
      {/* Mobile backdrop — only visible on small screens when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar – fixed, full height, scrolls its own nav internally */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        userRole={userRole}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Right Side (Navbar + Page Content) */}
      <div
        className={`flex flex-col flex-1 min-w-0 h-screen transition-all duration-300 ${
          sidebarOpen ? "lg:ml-64" : "lg:ml-0"
        }`}
      >
        {/* Navbar — fixed height, does not scroll */}
        <div className="shrink-0">
          <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        </div>

        {/* Page Content — the ONLY scrollable region */}
        <main className="flex-1 min-h-0 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}