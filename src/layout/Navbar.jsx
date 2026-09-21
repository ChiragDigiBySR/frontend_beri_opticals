import { useState } from "react";
import { FaBars, FaBell, FaChevronDown, FaSignOutAlt } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { logout } from "../features/auth/authSlice";
import { clearEmployees } from "../features/employees/employeeSlice";
import { clearSettings } from "../features/settings/settingSlice";
import { PiBrainFill } from "react-icons/pi";
import { FaCog } from "react-icons/fa";

const PAGE_TITLES = {
  "/": "Dashboard",
  "/stores": "Stores",
  "/stores/create": "Create Store",
  "/customer/add": "Add New Customer",
  "/customers/list": "Customer List",
  "/expense/add": "Add Expense",
  "/expense/list": "Expenses List",
  "/new-jc": "New Job Card",
  "/inventory": "Inventory",
  "/report/main": "Main Report",
  "/report/daily": "Daily Report",
  "/vendor/add": "Add Vendor",
  "/vendors/list": "Vendor List",
  "/vendors/lensorders": "Lens Orders List",
  "/vendors/purchasereport": "Purchase Report",
  "/vendors/order": "Vendor Orders",
  "/jc/list": "Job Card List",
  "/prescription/add": "Add Prescription",
  "/prescription/list": "Prescription List",
  "/sales/add": "Add Sales",
  "/sales/list": "Sales List",
  "/addtask": "Add Task",
  "/task/list": "Task List",
  "/edit/jc": "Edit Job Card",
  "/add/repair": "Add Repair",
  "/repair/list": "Repair List",
  "/add/asset": "Add Asset",
  "/asset/list": "Asset List",
  "/digi/ai": "Digi AI",
  "/link/whatsapp": "Link Whatsapp",
  "/whats/new/media": "What's New",
  "/store/settings": "Store Settings",
  "/add/patient": "Add Patient",
  "/patient/list": "Patient List",
  "/opd/report": "OPD Report",
  "/opd/edit": "Edit OPD Report",
  "/opd/list": "OPD Report List",
  "/add/appointment": "Add Appointment",
  "/appointment/list": "Appointment List",
  "/403": "Not Allowed",
};

// function getBreadcrumbs(pathname) {
//   const parts = pathname.split("/").filter(Boolean);
//   if (parts.length === 0) return [{ label: "Dashboard", path: "/" }];
//   return [
//     { label: "Home", path: "/" },
//     ...parts.map((part, i) => ({
//       label: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, " "),
//       path: "/" + parts.slice(0, i + 1).join("/"),
//     })),
//   ];
// }


function getBreadcrumbs(pathname) {
  // Dynamic OPD edit route
  if (pathname.startsWith("/opd/edit/")) {
    return [
      { label: "Home", path: "/" },
      { label: "OPD Report", path: "/opd/list" },
      { label: "Edit OPD", path: pathname },
    ];
  }

  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) {
    return [{ label: "Dashboard", path: "/" }];
  }

  return [
    { label: "Home", path: "/" },
    ...parts.map((part, i) => ({
      label: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, " "),
      path: "/" + parts.slice(0, i + 1).join("/"),
    })),
  ];
}

export default function Navbar({ toggleSidebar }) {
  const { pathname } = useLocation();
  // const pageTitle = PAGE_TITLES[pathname] || "Admin Panel";
  const pageTitle = pathname.startsWith("/opd/edit/") ? "Edit OPD" : PAGE_TITLES[pathname] || "Admin Panel";
  const { user, store } = useSelector((state) => state.auth);
  const breadcrumbs = getBreadcrumbs(pathname);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "AU";

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Logout?",
      text: "Are you sure you want to logout?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, logout",
    });

    if (result.isConfirmed) {
      dispatch(logout());
      dispatch(clearEmployees());
      dispatch(clearSettings());
      navigate("/login", { replace: true });
      toast.success("Logged out successfully", { duration: 20 });
    }
  };

  return (
    <div className="sticky top-0 z-40 px-4 pt-3 pb-1 bg-[#fdf0e8]">
      <header className="h-14 bg-white rounded-2xl shadow-sm flex items-center justify-between px-4 gap-4 border border-orange-100">

        {/* LEFT: Title + Breadcrumb */}
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-gray-800 leading-tight truncate">{pageTitle}</h1>
          <nav className="hidden sm:flex items-center gap-1 mt-0.5">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.path} className="flex items-center gap-1">
                {i > 0 && <span className="text-orange-200 text-[10px]">/</span>}
                <span
                  className={`text-[11px] leading-none ${i === breadcrumbs.length - 1
                    ? "text-[#F26522] font-medium"
                    : "text-orange-300 hover:text-orange-500 cursor-pointer transition-colors"
                    }`}
                >
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>
        </div>

        {/* RIGHT: Notifications + User + Toggle */}
        <div className="flex items-center gap-1">

          {/* Page navigate to ai page */}
          {
            store !== undefined && store?.hasAI && <button
              onClick={() => navigate("/digi/ai")}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-blue-500 hover:text-blue-500 transition-all relative px-6 py-3 cursor-pointer"
            >
              <span className="relative flex justify-center items-center">
                <PiBrainFill className="text-md" /> <span>AI</span>
              </span>
            </button>
          }



          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setNotifOpen(!notifOpen); setDropdownOpen(false); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-orange-50 text-orange-300 hover:text-[#F26522] transition-all relative"
            >
              <FaBell className="text-sm" />
              {/* notification mark */}
              {/* <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#F26522] rounded-full ring-1 ring-white" /> */}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-10 w-72 bg-white rounded-2xl shadow-xl border border-orange-100 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-orange-50 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700">Notifications</span>
                  <span className="text-[10px] text-[#F26522] font-medium cursor-pointer hover:underline">
                    Mark all read
                  </span>
                </div>
                {[
                  // { title: "New job card created", time: "2m ago", unread: true },
                  // { title: "Inventory low on item #42", time: "1h ago", unread: true },
                  // { title: "Sales report ready", time: "3h ago", unread: false },
                ].map((n, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 px-4 py-3 hover:bg-orange-50/50 cursor-pointer transition-colors ${n.unread ? "bg-orange-50/70" : ""}`}
                  >
                    <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${n.unread ? "bg-[#F26522]" : "bg-gray-200"}`} />
                    <div>
                      <p className="text-xs text-gray-700 font-medium">{n.title}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
                <div className="px-4 py-2.5 border-t border-orange-50 text-center">
                  <span className="text-[11px] text-[#F26522] font-medium cursor-pointer hover:underline">View all</span>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <span className="w-px h-5 bg-orange-100 mx-1" />

          {/* User Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setDropdownOpen(!dropdownOpen); setNotifOpen(false); }}
              className="flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-xl hover:bg-orange-50 transition-all duration-200 group"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#F26522] to-[#c94e10] flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] font-bold text-white tracking-wide">{initials}</span>
              </div>
              <span className="hidden sm:block text-xs font-medium text-gray-600 group-hover:text-[#F26522] transition-colors max-w-[80px] truncate">
                {user?.name || "Admin"}
              </span>
              <FaChevronDown
                className={`text-[9px] text-orange-300 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-10 w-48 bg-white rounded-2xl shadow-xl border border-orange-100 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-orange-50">
                  <p className="text-xs font-semibold text-gray-800">{user?.name || "Admin User"}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">{user?.email || "admin@example.com"}</p>
                </div>

                {/* settings button */}
                {
                  user?.role === "ADMIN" && <div className="py-1">
                    <button
                      onClick={() => navigate("/store/settings")}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-gray-600 hover:bg-gray-700/40 hover:text-white transition-all rounded-md"
                    >
                      <FaCog className="text-sm" />
                      <span>Settings</span>
                    </button>
                  </div>
                }

                <div className="py-1">
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                    <FaSignOutAlt className="text-sm" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Toggle — hidden on mobile (sidebar handles its own toggle on mobile) */}
          <button
            onClick={toggleSidebar}
            className="md:flex w-8 h-8 items-center justify-center rounded-lg hover:bg-orange-50 text-orange-300 hover:text-[#F26522] transition-all duration-200 ml-1"
            aria-label="Toggle sidebar"
          >
            <FaBars className="text-base" />
          </button>

        </div>
      </header>

      {/* Click-away overlay for dropdowns */}
      {(dropdownOpen || notifOpen) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => { setDropdownOpen(false); setNotifOpen(false); }}
        />
      )}
    </div>
  );
}