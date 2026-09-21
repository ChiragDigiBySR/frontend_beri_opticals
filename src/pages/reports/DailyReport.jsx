import { useState } from "react";
import { useSelector } from "react-redux";
import api from "../../utils/api";
import { toast } from "react-toastify";
import CategoryFilteredReport from "./CategoryFilteredReport"; // adjust path
import {
  FiCalendar, FiSearch, FiTrendingUp, FiTrendingDown,
  FiDollarSign, FiFileText, FiAlertCircle, FiActivity,
  FiTag, FiPackage, FiLayers,
} from "react-icons/fi";

const fmt = (n) =>
  `₹${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
const today = () => new Date().toISOString().split("T")[0];
const firstOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0]; };

const StatCard = ({ icon: Icon, label, value, sub, color = "orange" }) => {
  const colors = {
    orange: "from-orange-500 to-orange-600",
    green: "from-emerald-500 to-emerald-600",
    red: "from-red-500 to-red-600",
    blue: "from-blue-500 to-blue-600",
    teal: "from-teal-500 to-teal-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-xl bg-gradient-to-br ${colors[color]} flex-shrink-0`}>
        <Icon className="text-white w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-xl font-bold text-gray-800 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

const DataCard = ({ title, icon: Icon, children, footer, accent = "orange" }) => {
  const accents = {
    orange: "bg-orange-50 border-orange-100 text-orange-500",
    blue: "bg-blue-50 border-blue-100 text-blue-500",
    teal: "bg-teal-50 border-teal-100 text-teal-500",
    purple: "bg-purple-50 border-purple-100 text-purple-500",
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
      <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[300px]">
        {children}
      </div>
      {footer !== undefined && (
        <div className="px-5 py-2 border-t border-gray-50 bg-gray-50/60">
          <p className="text-xs text-gray-400">{footer}</p>
        </div>
      )}
    </div>
  );
};

const SectionLabel = ({ icon: Icon, label, color = "orange" }) => {
  const colors = {
    orange: "text-orange-500 bg-orange-50 border-orange-200",
    blue: "text-blue-500 bg-blue-50 border-blue-200",
    teal: "text-teal-600 bg-teal-50 border-teal-200",
    purple: "text-purple-500 bg-purple-50 border-purple-200",
  };
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border w-fit mb-3 ${colors[color]}`}>
      {Icon && <Icon size={13} />}
      <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
    </div>
  );
};

const InnerTable = ({ headers, rows, emptyMsg = "No Data Available", highlightLast = false }) => (
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b border-gray-100">
        {headers.map((h, i) => (
          <th key={i} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.length === 0
        ? <tr><td colSpan={headers.length} className="px-4 py-6 text-center text-sm text-gray-400 bg-gray-50/50">{emptyMsg}</td></tr>
        : rows.map((row, i) => {
          const hi = highlightLast && i === rows.length - 1;
          return (
            <tr key={i} className={`border-b border-gray-50 transition-colors ${hi ? "bg-orange-400" : "hover:bg-orange-50/40"}`}>
              {row.map((cell, j) => (
                <td key={j} className={`px-4 py-2.5 whitespace-nowrap ${hi ? "text-white font-bold" : "text-gray-700"}`}>{cell}</td>
              ))}
            </tr>
          );
        })
      }
    </tbody>
  </table>
);

const footerText = (arr, label = "entries") =>
  arr?.length ? `Showing 1 to ${arr.length} of ${arr.length} ${label}` : `Showing 0 to 0 of 0 ${label}`;

// ─── Lens type classification helper ─────────────────────────────────────────
const LENS_KEYWORDS = {
  "Bifocal":     ["bifocal", "bf", "kryptok", "d-seg", "flat-top", "ft"],
  "Progressive": ["progressive", "prog", "paf", "varifocal", "multifocal", "no-line"],
  "Single Vision": ["single", "sv", "spherical", "cylinder", "drivesafe", "drivewear"],
  "Photochromic": ["photochromic", "transitions", "light responsive", "sensity"],
  "Anti-Reflective": ["anti-reflex", "anti-reflective", "ar coat", "hmc", "mc"],
};

const classifyLensType = (name = "") => {
  const lower = name.toLowerCase();
  for (const [type, keywords] of Object.entries(LENS_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return type;
  }
  return "Other";
};

// ─── Build lens breakdown from raw products data ──────────────────────────────
const buildLensBreakdown = (products = []) => {
  const lenses = products.filter(
    (p) => (p.finalCategory || "").toLowerCase() === "lens"
  );
  const map = {};
  lenses.forEach((p) => {
    const type = classifyLensType(p.finalProductName || p.lensType || "");
    if (!map[type]) map[type] = { count: 0 };
    map[type].count++;
  });
  return Object.entries(map)
    .map(([type, v]) => ({ type, count: v.count }))
    .sort((a, b) => b.count - a.count);
};

// ─── Build brand breakdown from raw products data ─────────────────────────────
const buildBrandBreakdown = (products = []) => {
  const map = {};
  products.forEach((p) => {
    const brand = p.brand || p.brandName || "Unknown";
    if (!map[brand]) map[brand] = { count: 0 };
    map[brand].count++;
  });
  return Object.entries(map)
    .map(([brand, v]) => ({ brand, count: v.count }))
    .sort((a, b) => b.count - a.count);
};

// ─── Build product-wise breakdown ─────────────────────────────────────────────
const buildProductBreakdown = (products = []) => {
  const map = {};
  products.forEach((p) => {
    const name = p.finalProductName || p.productName || "Unknown";
    const cat = p.finalCategory || "-";
    const key = `${cat}__${name}`;
    if (!map[key]) map[key] = { name, category: cat, count: 0 };
    map[key].count++;
  });
  return Object.values(map).sort((a, b) => b.count - a.count);
};

export default function DailyReport() {
  const settings = useSelector((state) => state.settings.data);
  const [form, setForm] = useState({ startDate: today(), endDate: today() });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const validate = () => {
    const e = {};
    if (!form.startDate) e.startDate = "Start date is required";
    if (!form.endDate) e.endDate = "End date is required";
    if (form.startDate && form.endDate && form.startDate > form.endDate) e.endDate = "End date must be after start date";
    if (form.endDate && form.endDate > today()) e.endDate = "End date cannot be in the future";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleFetch = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.post("/jc/report/daily", form);
      if (res.data.success) {
        setReport(res.data);
        toast.success("Report loaded");
        console.log(res.data);
      } else toast.error(res.data.message || "Failed to load report");
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally { setLoading(false); }
  };

  const presets = [
    { label: "Today", fn: () => ({ startDate: today(), endDate: today() }) },
    { label: "This Month", fn: () => ({ startDate: firstOfMonth(), endDate: today() }) },
    { label: "Last 7 Days", fn: () => { const d = new Date(); d.setDate(d.getDate() - 6); return { startDate: d.toISOString().split("T")[0], endDate: today() }; } },
    { label: "Last 30 Days", fn: () => { const d = new Date(); d.setDate(d.getDate() - 29); return { startDate: d.toISOString().split("T")[0], endDate: today() }; } },
  ];

  const inputCls = (err) =>
    `w-full pl-10 pr-3 py-2.5 text-sm text-gray-700 bg-gray-50 border rounded-xl outline-none transition-all ${err
      ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
      : "border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 hover:border-orange-300"
    }`;

  const d = report;
  const ds = d?.dashboardSummary;

  const salesTxMap = {};
  (d?.sales?.transactionSummary || []).forEach(t => { salesTxMap[t._id] = t.totalAmount; });
  const jcTxMap = {};
  (d?.jobCardStatus?.transactionTypeSummary || []).forEach(t => { jcTxMap[t._id] = t.totalAmount; });

  const cashInHand = (jcTxMap["CASH"] || 0) + (salesTxMap["CASH"] || 0);
  const credit = (jcTxMap["CARD"] || 0) + (salesTxMap["CARD"] || 0);
  const upi = (jcTxMap["UPI"] || 0) + (salesTxMap["UPI"] || 0);
  const expense = d?.expenses?.totalExpenseAmount || 0;

  const txRows = d?.jobCardStatus?.transactionTypeSummary || [];
  const txTotal = txRows.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
  const txDisplay = [
    ...txRows.map(t => [t._id || "NA", fmt(t.totalAmount)]),
    ["Total", fmt(txTotal)],
  ];

  const newNetCollection = (txTotal + (d?.sales?.totalSalesAmount || 0));

  // ── Product breakdown computations ──────────────────────────────────────────
  // Use backend-provided data first, fallback to frontend computation
  const allProducts = d?.products?.data || [];

  // Category-wise: prefer backend categoryCount, else derive from raw data
  const categoryRows = (d?.products?.categoryCount || []).map(c => [c._id || "-", c.count]);

  // Brand-wise: prefer backend brandCount if available, else compute from raw
  const brandRows = (() => {
    if (d?.products?.brandCount?.length) {
      return d.products.brandCount.map(b => [b._id || "Unknown", b.count]);
    }
    return buildBrandBreakdown(allProducts).map(b => [b.brand, b.count]);
  })();

  // Product-wise: prefer backend productCount if available, else compute from raw
  const productRows = (() => {
    if (d?.products?.productCount?.length) {
      return d.products.productCount.map(p => [p.category || "-", p.name || "-", p.count]);
    }
    return buildProductBreakdown(allProducts).map(p => [p.category, p.name, p.count]);
  })();

  // Lens type breakdown: prefer backend lensTypeCount if available, else compute from raw
  const lensTypeRows = (() => {
    if (d?.products?.lensTypeCount?.length) {
      return d.products.lensTypeCount.map(l => [l._id || "Other", l.count]);
    }
    return buildLensBreakdown(allProducts).map(l => [l.type, l.count]);
  })();

  const totalLensSold = lensTypeRows.reduce((s, r) => s + (Number(r[1]) || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50/70 px-4 py-2 max-w-7xl mx-auto">

      {/* ── Date Filter ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {presets.map(({ label, fn }) => (
            <button key={label} type="button" onClick={() => { setForm(fn()); setErrors({}); }}
              className="px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-200 text-gray-600 hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 transition-all">
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Start Date</label>
            <div className="relative">
              <FiCalendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="date" value={form.startDate} max={today()}
                onChange={(e) => { setForm(p => ({ ...p, startDate: e.target.value })); setErrors(p => ({ ...p, startDate: "" })); }}
                className={inputCls(errors.startDate)} />
            </div>
            {errors.startDate && <p className="flex items-center gap-1 text-xs text-red-500 mt-1"><FiAlertCircle size={11} /> {errors.startDate}</p>}
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">End Date</label>
            <div className="relative">
              <FiCalendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="date" value={form.endDate} min={form.startDate} max={today()}
                onChange={(e) => { setForm(p => ({ ...p, endDate: e.target.value })); setErrors(p => ({ ...p, endDate: "" })); }}
                className={inputCls(errors.endDate)} />
            </div>
            {errors.endDate && <p className="flex items-center gap-1 text-xs text-red-500 mt-1"><FiAlertCircle size={11} /> {errors.endDate}</p>}
          </div>
          <button type="button" onClick={handleFetch} disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60 shadow-sm">
            {loading
              ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
              : <FiSearch size={15} />}
            {loading ? "Loading..." : "Generate Report"}
          </button>
        </div>
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {!report && !loading && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-300">
          <FiFileText size={52} className="mb-3" />
          <p className="text-sm font-medium">Select a date range and generate report</p>
        </div>
      )}

      {report && (
        <>
          {/* ── Stat Cards Row 1 ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <StatCard icon={FiTrendingUp} label="Net Collection" value={fmt(newNetCollection)} color="green" />
            <StatCard icon={FiActivity} label="Net Profit" value={fmt(ds?.netProfit)} color={ds?.netProfit >= 0 ? "teal" : "red"} />
            <StatCard icon={FiDollarSign} label="Addln Sales" value={fmt(d?.sales?.totalSalesAmount)} sub={`${d?.sales?.totalRecords} records`} color="blue" />
            <StatCard icon={FiTrendingDown} label="Total Expenses" value={fmt(expense)} sub={`${d?.expenses?.totalRecords} records`} color="red" />
          </div>

          {/* ── Stat Cards Row 2 ──────────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={FiFileText} label="Total JCs" value={d?.jobCards?.totalRecords ?? 0} color="orange" />
            <StatCard icon={FiDollarSign} label="JC Total" value={fmt(d?.jobCards?.grossTotal)} color="blue" />
            <StatCard icon={FiDollarSign} label="JC Collected" value={fmt(d?.jobCards?.totalCollected)} color="green" />
            <StatCard icon={FiDollarSign} label="JC Pending" value={fmt(d?.jobCards?.totalBalance)} color="red" />
          </div>

          {/* ── Row 1: Expense / Sold Stock / Sold Stock Count ──────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <DataCard title="Daily Expense List" footer={footerText(d?.expenses?.data)}>
              <InnerTable
                headers={["Date", "Name", "Type", "Amount"]}
                rows={(d?.expenses?.data || []).map(e => [
                  fmtDate(e.createdAt),
                  e.name || e.title || "-",
                  e.type || e.category || "-",
                  fmt(e.amount),
                ])}
              />
            </DataCard>

            <DataCard title="Sold Stock" footer={footerText(d?.products?.data)}>
              <InnerTable
                headers={["Booking Type", "Model"]}
                rows={(d?.products?.data || []).map(p => [
                  p.finalCategory || "-",
                  p.finalProductName || "-",
                ])}
              />
            </DataCard>

            <DataCard title="Sold Stock Count" footer={footerText(d?.products?.categoryCount)}>
              <InnerTable
                headers={["Booking Type", "Count"]}
                rows={(d?.products?.categoryCount || []).map(c => [c._id || "-", c.count])}
              />
            </DataCard>
          </div>

          {/* ── Row 2: Transactions / Sales Txns / Delivery Count ────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <DataCard title="List of Transactions" footer={footerText(txRows)}>
              <InnerTable headers={["Transaction Type", "Amount"]} highlightLast={true} rows={txDisplay} />
            </DataCard>

            <DataCard title="Sales Transactions" footer={footerText(d?.sales?.data)}>
              <InnerTable
                headers={["Date", "Name", "Type", "Amount"]}
                rows={(d?.sales?.data || []).map(s => [
                  fmtDate(s.createdAt),
                  s.item || "-",
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-gray-100 text-gray-600">{s.paymentMode || "-"}</span>,
                  <span className="font-semibold text-emerald-600">{fmt(s.amount)}</span>,
                ])}
              />
            </DataCard>

            <DataCard title="Delivery Count" footer={footerText(d?.jobCards?.data)}>
              <InnerTable
                headers={["Count", "Collected"]}
                rows={[[
                  d?.jobCards?.deliveredSummary?.count ?? "-",
                  d?.jobCards?.deliveredSummary?.totalCollected || 0,
                ]]}
              />
            </DataCard>
          </div>

          {/* ── Row 3: Prescription Count ─────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <DataCard title="Prescription Count">
              <InnerTable
                headers={["Count", "Total"]}
                rows={[[
                  d?.prescriptions?.totalRecords ?? "-",
                  <span className="font-semibold text-emerald-600">{fmt(d?.prescriptions?.totalAmount || 0)}</span>,
                ]]}
              />
            </DataCard>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              PRODUCT / CATEGORY / BRAND WISE REPORTING SECTION
          ════════════════════════════════════════════════════════════════ */}
          <div className="mb-2">
            <SectionLabel icon={FiPackage} label="Product & Category-Wise Sales Report" color="blue" />
          </div>

          {/* ── Category-Wise + Brand-Wise ───────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">

            {/* Category-Wise Sales */}
            <DataCard
              title="Category-Wise Sales"
              icon={FiLayers}
              accent="blue"
              footer={`${categoryRows.length} categories`}
            >
              {categoryRows.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">No category data</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Category</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Units Sold</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const total = categoryRows.reduce((s, r) => s + (Number(r[1]) || 0), 0);
                      return categoryRows.map(([cat, count], i) => {
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/30">
                            <td className="px-4 py-2.5">
                              <span className="font-semibold text-gray-700">{cat}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="inline-flex items-center justify-center w-8 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold">{count}</span>
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
              )}
            </DataCard>

            {/* Brand-Wise Sales */}
            <DataCard
              title="Brand-Wise Sales"
              icon={FiTag}
              accent="teal"
              footer={`${brandRows.length} brands`}
            >
              {brandRows.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">
                  No brand data — add <code className="text-xs bg-gray-100 px-1 rounded">brand</code> field to products
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Brand</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Units Sold</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const total = brandRows.reduce((s, r) => s + (Number(r[1]) || 0), 0);
                      return brandRows.map(([brand, count], i) => {
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <tr key={i} className="border-b border-gray-50 hover:bg-teal-50/30">
                            <td className="px-4 py-2.5 font-semibold text-gray-700">{brand}</td>
                            <td className="px-4 py-2.5">
                              <span className="inline-flex items-center justify-center w-8 h-6 rounded-lg bg-teal-100 text-teal-700 text-xs font-bold">{count}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 rounded-full bg-gray-100 w-20 overflow-hidden">
                                  <div className="h-full rounded-full bg-teal-400" style={{ width: `${pct}%` }} />
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
              )}
            </DataCard>
          </div>

          {/* ── Lens Type Breakdown ────────────────────────────────────────── */}
          <div className="mb-2">
            <SectionLabel icon={FiLayers} label="Lens Type Breakdown" color="purple" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">

            {/* Lens type summary cards */}
            {["Bifocal", "Progressive", "Single Vision"].map((type) => {
              const row = lensTypeRows.find(r => r[0] === type);
              const count = row ? Number(row[1]) : 0;
              return (
                <div key={type} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 flex-shrink-0">
                    <FiLayers className="text-purple-500 w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-0.5">{type} Lenses</p>
                    <p className="text-2xl font-black text-gray-800">{count}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {totalLensSold > 0 ? `${Math.round((count / totalLensSold) * 100)}% of lens sales` : "No lens sales"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lens type full table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <DataCard
              title="All Lens Types"
              icon={FiLayers}
              accent="purple"
              footer={`${totalLensSold} total lenses sold`}
            >
              {lensTypeRows.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">No lens sales in this period</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Lens Type</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Count</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lensTypeRows.map(([type, count], i) => {
                      const pct = totalLensSold > 0 ? Math.round((count / totalLensSold) * 100) : 0;
                      return (
                        <tr key={i} className="border-b border-gray-50 hover:bg-purple-50/30">
                          <td className="px-4 py-2.5 font-semibold text-gray-700">{type}</td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center justify-center w-8 h-6 rounded-lg bg-purple-100 text-purple-700 text-xs font-bold">{count}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 rounded-full bg-gray-100 w-24 overflow-hidden">
                                <div className="h-full rounded-full bg-purple-400" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-400">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </DataCard>

            {/* Product-Wise Sales */}
            <DataCard
              title="Product-Wise Sales"
              icon={FiPackage}
              accent="blue"
              footer={`${productRows.length} products sold`}
            >
              {productRows.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400">No product data</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Category</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Product</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productRows.map(([cat, name, count], i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/30">
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-500 uppercase">{cat}</span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 font-medium">{name}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center justify-center w-8 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold">{count}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </DataCard>
</div>

          {/* ── Filterable Category/Brand/Product Report ─────────────────── */}
          <div className="mb-5">
            <CategoryFilteredReport
              startDate={form.startDate}
              endDate={form.endDate}
              categories={settings?.allCategories || []}
              brands={settings?.brands || []}
            />
          </div>
        </>
      )}
    </div>
  );
}