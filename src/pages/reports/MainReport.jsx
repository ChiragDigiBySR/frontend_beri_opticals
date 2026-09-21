import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import {
  useReactTable, getCoreRowModel,
  getFilteredRowModel, flexRender
} from "@tanstack/react-table";
import api from "../../utils/api";
import { useDispatch } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import { FiDownload, FiTag, FiPackage, FiLayers } from "react-icons/fi";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import CategoryFilteredReport from "./CategoryFilteredReport"; // adjust path

// ─── Report download options ──────────────────────────────────────────────────
const REPORT_OPTIONS = [
  { label: "Job Card", value: "jobCard" },
  { label: "Job Card Products", value: "jobCardProducts" },
  { label: "Job Card Status", value: "jobCardStatus" },
  { label: "Customer", value: "customer" },
  { label: "Prescription", value: "prescription" },
  { label: "Vendor", value: "vendor" },
  { label: "Vendor Order", value: "vendorOrder" },
  { label: "Vendor Order Products", value: "vendorOrderProducts" },
];

// ─── Date helpers ─────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];
const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
};

const PRESETS = [
  { label: "Today", fn: () => ({ startDate: today(), endDate: today() }) },
  { label: "This Month", fn: () => ({ startDate: firstOfMonth(), endDate: today() }) },
  {
    label: "Last 7 Days", fn: () => {
      const d = new Date(); d.setDate(d.getDate() - 6);
      return { startDate: d.toISOString().split("T")[0], endDate: today() };
    }
  },
  {
    label: "Last 30 Days", fn: () => {
      const d = new Date(); d.setDate(d.getDate() - 29);
      return { startDate: d.toISOString().split("T")[0], endDate: today() };
    }
  },
];

// ─── Lens type classification ─────────────────────────────────────────────────
const LENS_KEYWORDS = {
  "Bifocal":       ["bifocal", "bf", "kryptok", "d-seg", "flat-top", "ft"],
  "Progressive":   ["progressive", "prog", "paf", "varifocal", "multifocal", "no-line"],
  "Single Vision": ["single", "sv", "spherical", "drivesafe", "drivewear"],
  "Photochromic":  ["photochromic", "transitions", "light responsive", "sensity"],
  "Anti-Reflective": ["anti-reflex", "hmc", "mc"],
};
const classifyLensType = (name = "") => {
  const lower = name.toLowerCase();
  for (const [type, kws] of Object.entries(LENS_KEYWORDS)) {
    if (kws.some(k => lower.includes(k))) return type;
  }
  return "Other";
};

const buildLensBreakdown = (products = []) => {
  const lenses = products.filter(p => (p.finalCategory || "").toLowerCase() === "lens");
  const map = {};
  lenses.forEach(p => {
    const type = classifyLensType(p.finalProductName || p.lensType || "");
    if (!map[type]) map[type] = 0;
    map[type]++;
  });
  return Object.entries(map).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
};

const buildBrandBreakdown = (products = []) => {
  const map = {};
  products.forEach(p => {
    const brand = p.brand || p.brandName || "Unknown";
    if (!map[brand]) map[brand] = 0;
    map[brand]++;
  });
  return Object.entries(map).map(([brand, count]) => ({ brand, count })).sort((a, b) => b.count - a.count);
};

const buildProductBreakdown = (products = []) => {
  const map = {};
  products.forEach(p => {
    const name = p.finalProductName || p.productName || "Unknown";
    const cat = p.finalCategory || "-";
    const key = `${cat}__${name}`;
    if (!map[key]) map[key] = { name, category: cat, count: 0 };
    map[key].count++;
  });
  return Object.values(map).sort((a, b) => b.count - a.count);
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Ico = {
  Booking:    () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" /></svg>,
  Pending:    () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  Delivered:  () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" /></svg>,
  Commission: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" /></svg>,
  Calendar:   () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  Refresh:    () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M23 4v6h-6M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>,
  Chart:      () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>,
};

// ─── Status badge ─────────────────────────────────────────────────────────────
const Badge = ({ v }) => {
  const cfg = {
    Active:      "bg-emerald-50 text-emerald-700 ring-emerald-200",
    Delivered:   "bg-sky-50 text-sky-700 ring-sky-200",
    Draft:       "bg-gray-100 text-gray-500 ring-gray-200",
    "In-process":"bg-amber-50 text-amber-700 ring-amber-200",
    Pending:     "bg-rose-50 text-rose-700 ring-rose-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ring-1 ${cfg[v] || "bg-gray-100 text-gray-500 ring-gray-200"}`}>
      {v || "—"}
    </span>
  );
};

// ─── Summary stat card ────────────────────────────────────────────────────────
const StatChip = ({ label, value, valueClass = "text-gray-800" }) => (
  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
    <p className={`text-lg font-black leading-none ${valueClass}`}>{value ?? 0}</p>
  </div>
);

// ─── Transaction pill ─────────────────────────────────────────────────────────
const TxnPill = ({ label, count, amount, color }) => (
  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${color}`}>
    <div className="flex-1">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-base font-black text-gray-800 mt-0.5">{count ?? 0} orders</p>
    </div>
    <div className="text-right">
      <p className="text-[10px] text-gray-400 font-semibold">Amount</p>
      <p className="text-sm font-bold text-gray-700">&#8377;{amount ?? 0}</p>
    </div>
  </div>
);

// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ icon: Ic, title, children, accentColor = "orange" }) => {
  const accents = {
    orange: "bg-orange-50 border-orange-100 text-orange-500",
    blue:   "bg-blue-50 border-blue-100 text-blue-500",
    rose:   "bg-rose-50 border-rose-100 text-rose-500",
    emerald:"bg-emerald-50 border-emerald-100 text-emerald-600",
    purple: "bg-purple-50 border-purple-100 text-purple-500",
    teal:   "bg-teal-50 border-teal-100 text-teal-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-50">
        <span className={`w-7 h-7 rounded-lg border flex items-center justify-center ${accents[accentColor]}`}>
          <Ic />
        </span>
        <span className="text-sm font-bold text-gray-800">{title}</span>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
};

// ─── Data table ───────────────────────────────────────────────────────────────
const DataTable = ({ table, colCount, empty = "No data found" }) => {
  const rows = table.getRowModel().rows;
  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[500px] rounded-xl border border-gray-100">
      <table className="min-w-max w-full border-collapse text-sm">
        <thead className="sticky top-0 z-20 bg-gray-50">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id} className="bg-gray-50/80">
              {hg.headers.map(h => (
                <th key={h.id} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100 whitespace-nowrap">
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={colCount} className="text-center py-12 text-sm text-gray-300 font-medium">{empty}</td></tr>
            : rows.map((row, i) => (
              <tr key={row.id} className={`hover:bg-orange-50/30 transition-colors ${i % 2 !== 0 ? "bg-gray-50/40" : "bg-white"}`}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-3 text-gray-700 whitespace-nowrap border-b border-gray-50/80">
                    {flexRender(cell.column.columnDef.cell ?? cell.column.columnDef.accessorKey, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Mini bar table (used for category/brand/lens) ────────────────────────────
const BarTable = ({ rows, totalRows, accentColor = "blue" }) => {
  const accents = {
    blue:   "bg-blue-100 text-blue-700",
    teal:   "bg-teal-100 text-teal-700",
    purple: "bg-purple-100 text-purple-700",
    orange: "bg-orange-100 text-orange-700",
  };
  const bars = {
    blue:   "bg-blue-400",
    teal:   "bg-teal-400",
    purple: "bg-purple-400",
    orange: "bg-orange-400",
  };
  const hovers = {
    blue:   "hover:bg-blue-50/30",
    teal:   "hover:bg-teal-50/30",
    purple: "hover:bg-purple-50/30",
    orange: "hover:bg-orange-50/30",
  };
  const total = totalRows ?? rows.reduce((s, r) => s + (Number(r.count) || 0), 0);
  if (rows.length === 0) return <p className="text-sm text-gray-400 text-center py-6">No data available</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-100">
          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Name</th>
          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Count</th>
          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Share</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
          return (
            <tr key={i} className={`border-b border-gray-50 ${hovers[accentColor]}`}>
              <td className="px-4 py-2.5 font-semibold text-gray-700">{r.label}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex items-center justify-center w-8 h-6 rounded-lg text-xs font-bold ${accents[accentColor]}`}>{r.count}</span>
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 rounded-full bg-gray-100 w-24 overflow-hidden">
                    <div className={`h-full rounded-full ${bars[accentColor]}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400">{pct}%</span>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// ─── DataCard for product sections ───────────────────────────────────────────
const DataCard = ({ title, icon: Icon, children, footer, accent = "blue" }) => {
  const accents = {
    blue:   "bg-blue-50 border-blue-100 text-blue-500",
    teal:   "bg-teal-50 border-teal-100 text-teal-600",
    purple: "bg-purple-50 border-purple-100 text-purple-500",
    orange: "bg-orange-50 border-orange-100 text-orange-500",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
        {Icon && (
          <span className={`w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 ${accents[accent]}`}>
            <Icon size={12} />
          </span>
        )}
        <h3 className="text-sm font-bold text-gray-700">{title}</h3>
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[320px]">{children}</div>
      {footer !== undefined && (
        <div className="px-5 py-2 border-t border-gray-50 bg-gray-50/60">
          <p className="text-xs text-gray-400">{footer}</p>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
export default function MainReport() {
  const dispatch = useDispatch();
  const settings = useSelector((state) => state.settings.data);
  const store = useSelector((state) => state.auth.store);

  // ── Date state ──
  const [activePreset, setActivePreset] = useState(0);
  const [fromDate, setFromDate] = useState(() => today());
  const [toDate, setToDate] = useState(() => today());

  // ── Data state ──
  const [jobCards, setJobCards]                     = useState([]);
  const [deliveredJC, setDeliveredJC]               = useState([]);
  const [commissionByDelivered, setCommissionByDelivered] = useState([]);
  const [totalJobCards, setTotalJobCards]           = useState(0);
  const [deliveredCount, setDeliveredCount]         = useState(0);
  const [totalAdvance, setTotalAdvance]             = useState(0);
  const [totalBalance, setTotalBalance]             = useState(0);
  const [deliveredTotalSum, setDeliveredTotalSum]   = useState(0);
  const [deliveredJcBalanceReceived, setDeliveredJcBalanceReceived] = useState(0);
  const [transactionSummary, setTransactionSummary] = useState({});
  const [totalCommission, setTotalCommission]       = useState(0);
  const [afterDeliveryCommission, setAfterDeliveryCommission] = useState(0);
  const [fetched, setFetched]                       = useState(false);

  // ── Product data state (new) ──
  const [allProducts, setAllProducts]               = useState([]);
  const [categoryCount, setCategoryCount]           = useState([]);
  const [brandCount, setBrandCount]                 = useState([]);
  const [productCount, setProductCount]             = useState([]);
  const [lensTypeCount, setLensTypeCount]           = useState([]);

  // ── Pending orders state (new) ──
  const [pendingJobCards, setPendingJobCards]        = useState([]);
  const [pendingCount, setPendingCount]              = useState(0);
  const [pendingAdvance, setPendingAdvance]          = useState(0);
  const [pendingBalance, setPendingBalance]          = useState(0);

  // ── Apply preset ──
  const applyPreset = (idx) => {
    setActivePreset(idx);
    const { startDate, endDate } = PRESETS[idx].fn();
    setFromDate(startDate);
    setToDate(endDate);
    return { startDate, endDate };
  };

  // ── Fetch ──
  const fetchReport = useCallback(async (start, end) => {
    if (!start || !end) return toast.error("Please select date range");
    if (end < start) return toast.error("Invalid date range");
    try {
      dispatch(showLoader());
      const res = await api.post("/jc/report/main", { startDate: start, endDate: end });
      if (res.data?.success) {
        const r = res.data;

        // Existing data
        setJobCards(r.jobCards || []);
        setDeliveredJC(r.deliveredJobCards || []);
        setTotalAdvance(r.totalAdvance || 0);
        setTotalBalance(r.totalBalance || 0);
        setTotalJobCards(r.totalJobCards || 0);
        setDeliveredTotalSum(r.deliveredTotalSum || 0);
        setDeliveredJcBalanceReceived(r.deliveredJcBalanceReceived || 0);
        setTransactionSummary(r.transactionSummary || {});
        setDeliveredCount(r.deliveredCount || 0);
        setTotalCommission(r.totalCommissionCreated || 0);
        setAfterDeliveryCommission(r.totalCommissionDelivered || 0);
        setCommissionByDelivered(r.commissionByDelivered || []);

        // Product/category/brand/lens data (new — from backend if available)
        const prods = r.products?.data || r.allProducts || [];
        setAllProducts(prods);
        setCategoryCount(r.products?.categoryCount || r.categoryCount || []);
        setBrandCount(r.products?.brandCount || r.brandCount || []);
        setProductCount(r.products?.productCount || r.productCount || []);
        setLensTypeCount(r.products?.lensTypeCount || r.lensTypeCount || []);

        // Pending orders (new — from backend if available)
        const pendingJCs = r.pendingJobCards || jobCards.filter(jc =>
          (jc.status === "Active" || jc.status === "In-process") && Number(jc.balance) > 0
        );
        setPendingJobCards(pendingJCs);
        if (r.pendingCount !== undefined) {
          setPendingCount(r.pendingCount);
          setPendingAdvance(r.pendingAdvance || 0);
          setPendingBalance(r.pendingBalance || 0);
        } else {
          // Derive from jobCards if backend doesn't send separately
          const pending = (r.jobCards || []).filter(jc =>
            (jc.status === "Active" || jc.status === "In-process")
          );
          setPendingCount(pending.length);
          setPendingAdvance(pending.reduce((s, jc) => s + (Number(jc.advance) || 0), 0));
          setPendingBalance(pending.reduce((s, jc) => s + (Number(jc.balance) || 0), 0));
        }

        setFetched(true);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch report");
    } finally {
      dispatch(hideLoader());
    }
  }, [dispatch]);

  // ── Auto-fetch Today on mount ──
  useEffect(() => {
    const { startDate, endDate } = PRESETS[0].fn();
    fetchReport(startDate, endDate);
  }, []);

  // ── Date formatting ──
  const fmt = (v) => v ? new Date(v).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  }) : "—";

  // ── Booking Stats ──
  const bookingTotal = (transactionSummary?.CASH?.totalAmount || 0)
    + (transactionSummary?.CARD?.totalAmount || 0)
    + (transactionSummary?.UPI?.totalAmount || 0);
  const bookingAmountDue = totalBalance;
  const bookingCollected = totalAdvance;

  // ── Delivered Stats ──
  const deliveredCollected = deliveredJcBalanceReceived + deliveredJC.reduce((s, jc) => s + (Number(jc.advance) || 0), 0);
  const deliveredDue = deliveredJC.reduce((s, jc) => s + (Number(jc.balance) || 0), 0);

  // ── Product breakdowns (backend-first, frontend-fallback) ──
  const catRows = categoryCount.length
    ? categoryCount.map(c => ({ label: c._id || "Unknown", count: c.count }))
    : (() => {
        const map = {};
        allProducts.forEach(p => {
          const k = p.finalCategory || "-";
          map[k] = (map[k] || 0) + 1;
        });
        return Object.entries(map).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
      })();

  const brdRows = brandCount.length
    ? brandCount.map(b => ({ label: b._id || "Unknown", count: b.count }))
    : buildBrandBreakdown(allProducts).map(b => ({ label: b.brand, count: b.count }));

  const prdRows = productCount.length
    ? productCount.map(p => ({ category: p.category || "-", name: p.name || "-", count: p.count }))
    : buildProductBreakdown(allProducts);

  const lensRows = lensTypeCount.length
    ? lensTypeCount.map(l => ({ label: l._id || "Other", count: l.count }))
    : buildLensBreakdown(allProducts).map(l => ({ label: l.type, count: l.count }));

  const totalLensSold = lensRows.reduce((s, r) => s + r.count, 0);

  // ── Table columns ──
  const bookingCols = useMemo(() => [
    { header: "Date", accessorKey: "createdAt", cell: ({ getValue }) => <span className="text-gray-500 text-xs">{fmt(getValue())}</span> },
    { header: "Customer", accessorKey: "name", cell: ({ getValue }) => <span className="font-semibold text-gray-800">{getValue() || "—"}</span> },
    { header: "Mobile", accessorKey: "mobile" },
    { header: "Delivery Date", accessorKey: "deliveryDate", cell: ({ getValue }) => <span className="text-gray-500 text-xs">{fmt(getValue())}</span> },
    { header: "Txn", accessorKey: "transactionType", cell: ({ getValue }) => <span className="text-[10px] font-bold uppercase text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{getValue() || "—"}</span> },
    { header: "Total", accessorKey: "total", cell: ({ getValue }) => <span className="font-bold text-gray-800">&#8377;{getValue() ?? 0}</span> },
    { header: "Advance", accessorKey: "advance" },
    { header: "Balance", accessorKey: "balance", cell: ({ getValue }) => <span className={`font-semibold ${Number(getValue()) > 0 ? "text-rose-600" : "text-emerald-600"}`}>&#8377;{getValue() ?? 0}</span> },
    { header: "Status", accessorKey: "status", cell: ({ getValue }) => <Badge v={getValue()} /> },
    { header: "Process", accessorKey: "pstatus", cell: ({ getValue }) => <Badge v={getValue()} /> },
  ], []);

  const pendingCols = useMemo(() => [
    { header: "Date", accessorKey: "createdAt", cell: ({ getValue }) => <span className="text-gray-500 text-xs">{fmt(getValue())}</span> },
    { header: "Customer", accessorKey: "name", cell: ({ getValue }) => <span className="font-semibold text-gray-800">{getValue() || "—"}</span> },
    { header: "Mobile", accessorKey: "mobile" },
    { header: "Delivery Date", accessorKey: "deliveryDate", cell: ({ getValue }) => <span className="text-gray-500 text-xs">{fmt(getValue())}</span> },
    { header: "Txn", accessorKey: "transactionType", cell: ({ getValue }) => <span className="text-[10px] font-bold uppercase text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{getValue() || "—"}</span> },
    { header: "Total", accessorKey: "total", cell: ({ getValue }) => <span className="font-bold text-gray-800">&#8377;{getValue() ?? 0}</span> },
    { header: "Advance", accessorKey: "advance" },
    { header: "Balance", accessorKey: "balance", cell: ({ getValue }) => <span className="font-semibold text-rose-600">&#8377;{getValue() ?? 0}</span> },
    { header: "Status", accessorKey: "status", cell: ({ getValue }) => <Badge v={getValue()} /> },
    { header: "Process", accessorKey: "pstatus", cell: ({ getValue }) => <Badge v={getValue()} /> },
  ], []);

  const deliveredCols = useMemo(() => [
    { header: "Date", accessorKey: "createdAt", cell: ({ getValue }) => <span className="text-gray-500 text-xs">{fmt(getValue())}</span> },
    { header: "Customer", accessorKey: "name", cell: ({ getValue }) => <span className="font-semibold text-gray-800">{getValue() || "—"}</span> },
    { header: "Mobile", accessorKey: "mobile" },
    { header: "Delivered", accessorKey: "deliveredDate", cell: ({ getValue }) => <span className="text-gray-500 text-xs">{fmt(getValue())}</span> },
    { header: "Txn", accessorKey: "transactionType", cell: ({ getValue }) => <span className="text-[10px] font-bold uppercase text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{getValue() || "—"}</span> },
    { header: "Total", accessorKey: "total", cell: ({ getValue }) => <span className="font-bold text-gray-800">&#8377;{getValue() ?? 0}</span> },
    { header: "Advance", accessorKey: "advance" },
    { header: "Balance", accessorKey: "balance", cell: ({ getValue }) => <span className={`font-semibold ${Number(getValue()) > 0 ? "text-rose-600" : "text-emerald-600"}`}>&#8377;{getValue() ?? 0}</span> },
    { header: "Status", accessorKey: "status", cell: ({ getValue }) => <Badge v={getValue()} /> },
    { header: "Process", accessorKey: "pstatus", cell: ({ getValue }) => <Badge v={getValue()} /> },
  ], []);

  const commissionCols = useMemo(() => [
    { header: "Employee", accessorKey: "bookedByName", cell: ({ getValue }) => <span className="font-semibold text-gray-800">{getValue() || "—"}</span> },
    { header: "Commission", accessorKey: "totalCommission", cell: ({ getValue }) => <span className="font-bold text-orange-600">&#8377;{getValue() ?? 0}</span> },
    { header: "Orders", accessorKey: "count", cell: ({ getValue }) => <span className="font-bold text-gray-700">{getValue() ?? 0}</span> },
  ], []);

  // Pending table derives from jobCards (Active/In-process with balance > 0)
  const pendingData = useMemo(() =>
    pendingJobCards.length
      ? pendingJobCards
      : jobCards.filter(jc => jc.status === "Active" || jc.status === "In-process"),
    [pendingJobCards, jobCards]
  );

  const bookingTable    = useReactTable({ data: jobCards,    columns: bookingCols,    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel() });
  const pendingTable    = useReactTable({ data: pendingData, columns: pendingCols,    getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel() });
  const deliveredTable  = useReactTable({ data: deliveredJC, columns: deliveredCols,  getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel() });
  const commissionTable = useReactTable({ data: commissionByDelivered, columns: commissionCols, getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel() });

  return (
    <div className="min-h-screen bg-[#f7f8fa] p-5 space-y-5">

      {/* ══ FILTER BAR ════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
              <Ico.Calendar /> Quick Select
            </p>
            <div className="flex gap-2 flex-wrap">
              {PRESETS.map((p, i) => (
                <button key={p.label} onClick={() => applyPreset(i)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold border transition-all duration-150 cursor-pointer
                    ${activePreset === i
                      ? "bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-200"
                      : "bg-white text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-500"
                    }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">From</p>
              <input type="date" value={fromDate}
                onChange={e => { setFromDate(e.target.value); setActivePreset(null); }}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">To</p>
              <input type="date" value={toDate}
                onChange={e => { setToDate(e.target.value); setActivePreset(null); }}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all" />
            </div>
            <button onClick={() => fetchReport(fromDate, toDate)}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-orange-200 cursor-pointer whitespace-nowrap">
              <Ico.Refresh /> Generate
            </button>
          </div>
        </div>
      </div>

      {/* ══ BOOKING ORDERS ════════════════════════════════════════════════════ */}
      <Section icon={Ico.Booking} title="Booking Orders" accentColor="orange">

        {/* Cash / UPI / Card pills — RETAINED as requested */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <TxnPill label="Cash"  count={transactionSummary?.CASH?.count}  amount={transactionSummary?.CASH?.totalAmount}  color="bg-emerald-50/60 border-emerald-100" />
          <TxnPill label="UPI"   count={transactionSummary?.UPI?.count}   amount={transactionSummary?.UPI?.totalAmount}   color="bg-sky-50/60 border-sky-100" />
          <TxnPill label="Card"  count={transactionSummary?.CARD?.count}  amount={transactionSummary?.CARD?.totalAmount}  color="bg-violet-50/60 border-violet-100" />
        </div>

        {/* Booking summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          <StatChip label="Total Orders"    value={totalJobCards} />
          <StatChip label="Total Amount"   value={`₹${bookingCollected.toLocaleString("en-IN")}`} valueClass="text-emerald-600" />
          <StatChip label="Total Advance"         value={`₹${bookingAmountDue.toLocaleString("en-IN")}`} valueClass="" />
        </div>

        <DataTable table={bookingTable} colCount={bookingCols.length} empty="No job cards found for selected range" />
      </Section>

      {/* ══ PENDING ORDERS ════════════════════════════════════════════════════ */}
      <Section icon={Ico.Pending} title="Pending Orders" accentColor="rose">

        {/* Pending summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          <StatChip label="Pending Orders" value={pendingCount || pendingData.length} />
          <StatChip label="Amount Collected"       value={`₹${(pendingAdvance || pendingData.reduce((s, jc) => s + (Number(jc.advance) || 0), 0)).toLocaleString("en-IN")}`} valueClass="text-emerald-600" />
          <StatChip label="Amount Due"             value={`₹${(pendingBalance || pendingData.reduce((s, jc) => s + (Number(jc.balance) || 0), 0)).toLocaleString("en-IN")}`} valueClass="text-rose-600" />
        </div>

        <DataTable table={pendingTable} colCount={pendingCols.length} empty="No pending orders in this range" />
      </Section>

      {/* ══ DELIVERED ORDERS ══════════════════════════════════════════════════ */}
      <Section icon={Ico.Delivered} title="Delivered Statistics" accentColor="emerald">

        {/* Delivered summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatChip label="Total Delivered"   value={deliveredCount} />
          <StatChip label="Total Amount"        value={`₹${deliveredTotalSum.toLocaleString("en-IN")}`} />
          <StatChip label="Balance Received"    value={`₹${deliveredJcBalanceReceived.toLocaleString("en-IN")}`} valueClass="text-emerald-600" />
          <StatChip label="Commission"          value={`₹${afterDeliveryCommission.toLocaleString("en-IN")}`} valueClass="text-orange-600" />
        </div>

        <DataTable table={deliveredTable} colCount={deliveredCols.length} empty="No delivered orders in this range" />
      </Section>

    {/* ══ COMMISSION ════════════════════════════════════════════════════════ */}
      <Section icon={Ico.Commission} title="Commission Statistics" accentColor="orange">
        <DataTable table={commissionTable} colCount={commissionCols.length} empty="No commission data found" />
      </Section>

      {/* ══ SALESPERSON — BRAND & PRODUCT WISE SALES ═════════════════════════ */}
      <Section icon={Ico.Commission} title="Salesperson — Brand & Product Wise Sales" accentColor="orange">
        {commissionByDelivered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No salesperson data for this range</p>
        ) : (
          <div className="space-y-4">
            {commissionByDelivered.map((emp, i) => (
              <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <span className="text-sm font-bold text-gray-800">{emp.bookedByName || "Unknown"}</span>
                  <span className="text-xs text-gray-400">
                    {emp.count ?? 0} orders · ₹{emp.totalCommission ?? 0} commission
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Category-wise</p>
                    {emp.categoryBreakdown?.length
                      ? <BarTable rows={emp.categoryBreakdown.map(c => ({ label: c._id || c.label, count: c.count }))} accentColor="blue" />
                      : <p className="text-xs text-gray-300 italic py-3 text-center">Waiting on backend field: categoryBreakdown</p>}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Brand-wise</p>
                    {emp.brandBreakdown?.length
                      ? <BarTable rows={emp.brandBreakdown.map(b => ({ label: b._id || b.label, count: b.count }))} accentColor="teal" />
                      : <p className="text-xs text-gray-300 italic py-3 text-center">Waiting on backend field: brandBreakdown</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          PRODUCT / CATEGORY / BRAND WISE REPORTING
      ══════════════════════════════════════════════════════════════════════ */}
      <Section icon={Ico.Chart} title="Product & Category-Wise Sales Report" accentColor="blue">

        {/* ── Category + Brand ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <DataCard title="Category-Wise Sales" icon={FiLayers} accent="blue" footer={`${catRows.length} categories`}>
            <BarTable rows={catRows} accentColor="blue" />
          </DataCard>

          <DataCard title="Brand-Wise Sales" icon={FiTag} accent="teal" footer={`${brdRows.length} brands`}>
            {brdRows.length === 0
              ? <p className="text-sm text-gray-400 text-center py-6">No brand data — add <code className="text-xs bg-gray-100 px-1 rounded">brand</code> field to products</p>
              : <BarTable rows={brdRows} accentColor="teal" />
            }
          </DataCard>
        </div>

        {/* ── Product-Wise ── */}
        <div className="mb-5">
          <DataCard title="Product-Wise Sales" icon={FiPackage} accent="blue" footer={`${prdRows.length} products`}>
            {prdRows.length === 0
              ? <p className="text-sm text-gray-400 text-center py-6">No product data</p>
              : (
                <div className="overflow-x-auto overflow-y-auto max-h-[320px]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Category</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Product</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Qty Sold</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const total = prdRows.reduce((s, p) => s + p.count, 0);
                        return prdRows.map((p, i) => {
                          const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
                          return (
                            <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/30">
                              <td className="px-4 py-2.5">
                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-500 uppercase">{p.category}</span>
                              </td>
                              <td className="px-4 py-2.5 text-gray-700 font-medium">{p.name}</td>
                              <td className="px-4 py-2.5">
                                <span className="inline-flex items-center justify-center w-8 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold">{p.count}</span>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 rounded-full bg-gray-100 w-20 overflow-hidden">
                                    <div className="h-full rounded-full bg-blue-400" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-xs text-gray-400">{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              )
            }
          </DataCard>
        </div>

        {/* ── Lens Type Breakdown ── */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-purple-500 mb-3 flex items-center gap-2">
            <FiLayers size={13} /> Lens Type Breakdown
          </p>

          {/* Quick summary cards for top 3 lens types */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {["Bifocal", "Progressive", "Single Vision"].map((type) => {
              const row = lensRows.find(r => r.label === type);
              const count = row ? row.count : 0;
              return (
                <div key={type} className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-purple-50/50 border-purple-100">
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400">{type}</p>
                    <p className="text-xl font-black text-gray-800 mt-0.5">{count}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-semibold">of {totalLensSold} lenses</p>
                    <p className="text-sm font-bold text-purple-500">
                      {totalLensSold > 0 ? `${Math.round((count / totalLensSold) * 100)}%` : "—"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full lens breakdown table */}
          <DataCard title="All Lens Types" icon={FiLayers} accent="purple" footer={`${totalLensSold} total lenses sold`}>
            {lensRows.length === 0
              ? <p className="text-sm text-gray-400 text-center py-6">No lens sales in this period</p>
              : <BarTable rows={lensRows} accentColor="purple" />
            }
          </DataCard>
        </div>
      </Section>


       {/* ══ FILTERABLE CATEGORY/BRAND/PRODUCT REPORT ═══════════════════════════ */}
      <CategoryFilteredReport
        startDate={fromDate}
        endDate={toDate}
        categories={settings?.allCategories || []}
        brands={settings?.brands || []}
      />


      {/* ══ DATA DOWNLOADER ═══════════════════════════════════════════════════ */}
      <DataDownloader />

      {/* ══ GST REPORT DOWNLOADER ═════════════════════════════════════════════ */}
      {store?.hasGst && <ReportDownloader />}
    </div>
  );
}

/* ── Data Downloader ──────────────────────────────────────────────────────── */
const DataDownloader = () => {
  const dispatch = useDispatch();
  const [reportType, setReportType] = useState("");

  const handleDownload = async () => {
    if (!reportType) return toast.error("Select data type");
    try {
      dispatch(showLoader());
      const res = await api.post("/jc/report/download", { type: reportType }, { responseType: "blob" });
      let fileName = "report.xlsx";
      const disposition = res.headers?.["content-disposition"];
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) fileName = match[1];
      }
      const blob = new Blob([res.data], { type: res.headers["content-type"] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error("Download failed");
    } finally {
      dispatch(hideLoader());
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex justify-end items-end gap-3 flex-wrap">
        <div className="min-w-[160px]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Download Data</p>
          <select value={reportType} onChange={e => setReportType(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all cursor-pointer">
            <option value="">Select</option>
            {REPORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <button onClick={handleDownload}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-[11px] font-semibold px-4 py-2 rounded-lg transition-all shadow-sm shadow-orange-200 cursor-pointer">
          <FiDownload /> Download Data
        </button>
      </div>
    </div>
  );
};

// -----------------------------
// ------- GST REPORT ----------
// -----------------------------
const ReportDownloader = () => {
  const dispatch = useDispatch();

  // =====================================================
  // STATES
  // =====================================================

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [startSno, setStartSno] = useState("");

  // =====================================================
  // RESET FILTERS
  // =====================================================

  const resetFilters = () => {
    setFromDate("");
    setToDate("");
    setStartSno("");
  };

  // =====================================================
  // COMMON DOWNLOAD FUNCTION
  // =====================================================

  const downloadFile = (response, fallbackName) => {
    let fileName = fallbackName;
    const disposition = response.headers?.["content-disposition"];
    if (disposition) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match?.[1]) fileName = match[1];
    }
    const blob = new Blob([response.data], {
      type: response.headers["content-type"],
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  // =====================================================
  // GST REPORT DOWNLOAD
  // =====================================================

  const fetchGstReport = async () => {
    if (!fromDate || !toDate) {
      return toast.error("Please select both From Date and To Date");
    }

    // Validation
    if ((fromDate && !toDate) || (!fromDate && toDate)) {
      return toast.error("Please select both From Date and To Date");
    }

    if (fromDate && toDate && new Date(toDate) < new Date(fromDate)) {
      return toast.error("To Date cannot be earlier than From Date");
    }

    if (startSno && Number(startSno) < 1) {
      return toast.error("Start Sr. No. must be greater than 0");
    }

    try {
      dispatch(showLoader());

      const payload = {};
      if (fromDate && toDate) {
        payload.startDate = fromDate;
        payload.endDate = toDate;
      }
      if (startSno && Number(startSno) >= 1) {
        payload.startSno = Number(startSno);
      }

      const res = await api.post("/jc/report/gst", payload, {
        responseType: "blob",
      });

      downloadFile(res, "GST_Report.xlsx");
      resetFilters();
    } catch (error) {
      console.log(error);
      toast.error("Failed to download GST report");
    } finally {
      dispatch(hideLoader());
    }
  };

  // =====================================================
  // SHARED INPUT CLASS
  // =====================================================

  const inputCls =
    "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-[7px] text-sm text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all";

  const labelCls =
    "text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1";

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      {/* HEADER */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
        <div className="w-7 h-7 rounded-md bg-orange-50 flex items-center justify-center shadow-sm shrink-0">
          <Download className="text-orange-500" size={14} />
        </div>
        <h2 className="text-sm font-bold text-gray-800">Download GST Reports</h2>
      </div>

      <div className="flex flex-col gap-4">
        {/* ================================================= */}
        {/* DATE RANGE — shared by both report types          */}
        {/* ================================================= */}

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Date Range
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[150px] flex-1">
              <p className={labelCls}>From</p>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="min-w-[150px] flex-1">
              <p className={labelCls}>To</p>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="w-[120px] shrink-0">
              <p className={labelCls}>Start Sr. No.</p>
              <input
                type="number"
                min="1"
                value={startSno}
                onChange={(e) => setStartSno(e.target.value)}
                placeholder="1"
                className={inputCls}
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchGstReport}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-[11px] font-semibold px-4 py-2 rounded-lg transition-all shadow-sm shadow-orange-200 cursor-pointer shrink-0"
              >
                <FileText size={13} />
                Download GST Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};