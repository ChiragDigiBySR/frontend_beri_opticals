import { useState, useMemo } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LayoutDashboard, Store, Plus, Briefcase, List, UserPlus, Users, Truck, FileText, ShoppingCart, Receipt, Package, BarChart3, LogOut, ChevronDown, Settings, HelpCircle, Megaphone, ClipboardList, MessageCircle, } from "lucide-react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { logout } from "../features/auth/authSlice";
import { clearEmployees } from "../features/employees/employeeSlice";
import { clearSettings } from "../features/settings/settingSlice";

export default function AppSidebar({ sidebarOpen, onClose, userRole = "ADMIN", }) {
  const [openGroups, setOpenGroups] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const user = useSelector((state) => state.auth.user);
  const allowedPages = user?.pages || [];

  const isSuperAdmin = userRole === "SUPER_ADMIN";

  const hasAccess = (page) => allowedPages.includes(page);



  const toggleGroup = (label) => {
    setOpenGroups((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

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

  /* ================= SUPER ADMIN ================= */
  const superAdminGroups = [
    {
      label: "Stores",
      icon: <Store className="h-4 w-4" />,
      items: [
        { to: "/stores", label: "Stores List", icon: <List className="h-4 w-4" /> },
        { to: "/stores/create", label: "Create Store", icon: <Plus className="h-4 w-4" /> },
      ],
    },
  ];

  /* ================= STORE GROUPS ================= */
  const storeGroups = useMemo(
    () =>
      [
        {
          label: "Job Cards",
          icon: <Briefcase className="h-4 w-4" />,
          items: [
            hasAccess("NEW JOB CARDS") && { to: "/new-jc", label: "New Job Card", icon: <Plus className="h-4 w-4" /> },
            hasAccess("JOB CARDS LIST") && { to: "/jc/list", label: "Job Card List", icon: <List className="h-4 w-4" /> },
          ].filter(Boolean),
        },
        {
          label: "Customers",
          icon: <Users className="h-4 w-4" />,
          items: [
            hasAccess("ADD CUSTOMERS") && { to: "/customer/add", label: "Add Customer", icon: <UserPlus className="h-4 w-4" /> },
            hasAccess("CUSTOMERS LIST") && { to: "/customers/list", label: "Customer List", icon: <List className="h-4 w-4" /> },
          ].filter(Boolean),
        },

        {
          label: "OPD",
          icon: <Users className="h-4 w-4" />,
          items: [
            hasAccess("ADD PATIENT") && { to: "/add/patient", label: "Add Patient", icon: <UserPlus className="h-4 w-4" /> },
            hasAccess("PATIENT LIST") && { to: "/patient/list", label: "Patient List", icon: <List className="h-4 w-4" /> },
            hasAccess("OPD REPORT") && { to: "/opd/report", label: "OPD Report", icon: <List className="h-4 w-4" /> },
            hasAccess("OPD LIST") && { to: "/opd/list", label: "OPD Report List", icon: <List className="h-4 w-4" /> },
            hasAccess("ADD APPOINTMENT") && { to: "/add/appointment", label: "Add Appointment", icon: <List className="h-4 w-4" /> },
            hasAccess("APPOINTMENT LIST") && { to: "/appointment/list", label: "Appointment List", icon: <List className="h-4 w-4" /> },
          ].filter(Boolean),
        },
        
        {
          label: "Vendors",
          icon: <Truck className="h-4 w-4" />,
          items: [
            hasAccess("ADD VENDORS") && { to: "/vendor/add", label: "Add Vendor", icon: <Plus className="h-4 w-4" /> },
            hasAccess("VENDORS LIST") && { to: "/vendors/list", label: "Vendor List", icon: <List className="h-4 w-4" /> },
            hasAccess("VENDOR ORDERS") && { to: "/vendors/order", label: "Vendor Orders", icon: <List className="h-4 w-4" /> },
            hasAccess("LENS ORDERS LIST") && { to: "/vendors/lensorders", label: "Lens Orders List", icon: <List className="h-4 w-4" /> },
            hasAccess("VENDOR PURCHASE REPORT") && { to: "/vendors/purchasereport", label: "Vendor Purchase Report", icon: <List className="h-4 w-4" /> },
          ].filter(Boolean),
        },
        {
          label: "Sales",
          icon: <ShoppingCart className="h-4 w-4" />,
          items: [
            hasAccess("ADD SALES") && { to: "/sales/add", label: "Add Sales", icon: <Plus className="h-4 w-4" /> },
            hasAccess("SALES LIST") && { to: "/sales/list", label: "Sales List", icon: <List className="h-4 w-4" /> },
          ].filter(Boolean),
        },
        {
          label: "Expenses",
          icon: <Receipt className="h-4 w-4" />,
          items: [
            hasAccess("ADD EXPENSES") && { to: "/expense/add", label: "Add Expense", icon: <Plus className="h-4 w-4" /> },
            hasAccess("EXPENSES LIST") && { to: "/expense/list", label: "Expenses List", icon: <List className="h-4 w-4" /> },
          ].filter(Boolean),
        },
        {
          label: "Prescription",
          icon: <FileText className="h-4 w-4" />,
          items: [
            hasAccess("ADD PRESCRIPTION") && { to: "/prescription/add", label: "Add Prescription", icon: <Plus className="h-4 w-4" /> },
            hasAccess("PRESCRIPTIONS LIST") && { to: "/prescription/list", label: "Prescription List", icon: <List className="h-4 w-4" /> },
          ].filter(Boolean),
        },
        {
          label: "Report",
          icon: <BarChart3 className="h-4 w-4" />,
          items: [
            hasAccess("MAIN REPORTS") && { to: "/report/main", label: "Main Report", icon: <BarChart3 className="h-4 w-4" /> },
            hasAccess("DAILY REPORTS") && { to: "/report/daily", label: "Daily Report", icon: <List className="h-4 w-4" /> },
          ].filter(Boolean),
        },
        {
          label: "Task",
          icon: <ClipboardList className="h-4 w-4" />,
          items: [
            hasAccess("ADD TASK") && { to: "/addtask", label: "Add Task", icon: <Plus className="h-4 w-4" /> },
            hasAccess("TASK LIST") && { to: "/task/list", label: "Task List", icon: <List className="h-4 w-4" /> },
          ].filter(Boolean),
        },
        {
          label: "Repair",
          icon: <ClipboardList className="h-4 w-4" />,
          items: [
            hasAccess("ADD REPAIR") && { to: "/add/repair", label: "Add Repair", icon: <Plus className="h-4 w-4" /> },
            hasAccess("REPAIR LIST") && { to: "/repair/list", label: "Repair List", icon: <List className="h-4 w-4" /> },
          ].filter(Boolean),
        },
        {
          label: "Assets",
          icon: <ClipboardList className="h-4 w-4" />,
          items: [
            hasAccess("ADD ASSETS") && { to: "/add/asset", label: "Add Asset", icon: <Plus className="h-4 w-4" /> },
            hasAccess("ASSETS LIST") && { to: "/asset/list", label: "Assets List", icon: <List className="h-4 w-4" /> },
          ].filter(Boolean),
        },

      ].filter((g) => g.items.length > 0),
    [allowedPages]
  );

  const bottomItems = [
    hasAccess("INVENTORY") && { to: "/inventory", label: "Inventory", icon: <Package className="h-4 w-4" /> },
    hasAccess("USERS") && { to: "/user", label: "Users", icon: <Users className="h-4 w-4" /> },
    // hasAccess("Link Whatsapp") && { to: "/link/whatsapp", label: "Link Whatsapp", icon: <MessageCircle className="h-4 w-4" /> },
    { to: "/link/whatsapp", label: "Link Whatsapp", icon: <MessageCircle className="h-4 w-4" /> },
    { to: "/whats/new/media", label: "What's New", icon: <Megaphone className="h-4 w-4" /> },
  ].filter(Boolean);

  const groups = isSuperAdmin ? superAdminGroups : storeGroups;

  /* ─── active link classes ─── */
  const activeCls = "bg-[hsl(var(--sidebar-active-bg))] text-[hsl(var(--sidebar-active-text))] shadow-sm";
  const inactiveCls = "text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))] hover:text-[hsl(var(--sidebar-active-text))]";

  return (
    <>
      <style>{`
        /* smooth custom scrollbar */
        .sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(242,101,34,0.25) transparent;
        }
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(242,101,34,0.3);
          border-radius: 99px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(242,101,34,0.55);
        }

        /* submenu slide-down */
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .submenu-enter { animation: slideDown 0.18s ease forwards; }

        /* active indicator pulse dot */
        @keyframes pulse-dot {
          0%, 100% { opacity: 1;   transform: scale(1);   }
          50%       { opacity: 0.5; transform: scale(1.4); }
        }
        .active-dot { animation: pulse-dot 2s ease-in-out infinite; }
      `}</style>

    <aside
  className={`
    fixed top-0 left-0 z-50 h-screen
    bg-sidebar border-r border-sidebar-border
    transition-all duration-300 ease-in-out
    flex flex-col
    ${sidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full"}
    overflow-hidden
  `}
>
        {/* ── Logo ─────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-center px-5 py-4 border-b border-sidebar-border bg-sidebar">
          <div className="flex items-center">
            <img
              src="https://digibysr.com/wp-content/uploads/2025/01/DigiOptics.png"
              alt="DigiOptics"
              className="h-7 object-contain"
            />
          </div>
        </div>


        {/* ── Scrollable nav ───────────────────────────────────── */}
        <nav className="flex-1 min-h-0 overflow-y-auto sidebar-scroll px-2.5 pb-3 space-y-0.5">

          {/* Dashboard */}
          {!isSuperAdmin && hasAccess("DASHBOARD") && (
            <NavLink
              to="/"
              end
              onClick={() => { if (window.innerWidth < 1024) onClose(); }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${isActive ? activeCls : inactiveCls}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`p-1 rounded-lg transition-all ${isActive ? "bg-white/20" : "bg-[hsl(var(--sidebar-hover))]"}`}>
                    <LayoutDashboard className="h-3.5 w-3.5" />
                  </span>
                  Dashboard
                </>
              )}
            </NavLink>
          )}

          {/* Groups */}
          {groups.map((group) => {
            const isActiveGroup = group.items.some(
              (item) => location.pathname.startsWith(item.to)
            );
            const isOpen = openGroups[group.label] ?? isActiveGroup;

            return (
              <div key={group.label}>
                {/* Group toggle button */}
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`
                    flex w-full items-center justify-between px-3 py-2 rounded-xl
                    text-sm font-semibold transition-all duration-150
                    ${isActiveGroup ? activeCls : `text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-hover))]`}
                  `}
                >
                  <span className="flex items-center gap-3">
                    <span className={`p-1 rounded-lg transition-all ${isActiveGroup ? "bg-white/20" : "bg-[hsl(var(--sidebar-hover))]"}`}>
                      {group.icon}
                    </span>
                    {group.label}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 opacity-60 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Group children */}
                {isOpen && (
                  <div className="submenu-enter ml-3 pl-3 mt-0.5 mb-1 border-l-2 border-orange-200/40 space-y-0.5">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end
                        onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
                          ${isActive ? activeCls : inactiveCls}`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span className={`transition-all ${isActive ? "text-[hsl(var(--sidebar-active-text))]" : "opacity-50"}`}>
                              {item.icon}
                            </span>
                            {item.label}
                            {isActive && (
                              <span className="ml-auto w-1 h-1 rounded-full bg-current opacity-70" />
                            )}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}


          {/* Bottom items */}
          {!isSuperAdmin &&
            bottomItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${isActive ? activeCls : inactiveCls}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`p-1 rounded-lg transition-all ${isActive ? "bg-white/20" : "bg-[hsl(var(--sidebar-hover))]"}`}>
                      {item.icon}
                    </span>
                    {item.label}

                    {/* ── What's New badge ── */}
                    {item.to === "/whats/new/media" && !isActive && (
                      <span className="ml-auto flex items-center gap-1">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                        </span>
                        <span className="text-[9px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-200">
                          NEW
                        </span>
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
        </nav>

        {/* ── Logout ───────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-sidebar-border px-2.5 py-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all duration-150 group"
          >
            <span className="p-1 rounded-lg bg-red-500/10 group-hover:bg-red-500/20 transition-all">
              <LogOut className="h-3.5 w-3.5" />
            </span>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}