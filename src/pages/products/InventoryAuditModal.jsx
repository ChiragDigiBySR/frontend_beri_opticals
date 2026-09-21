import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import {
  FiX, FiRefreshCw, FiCheckCircle,
  FiTrendingUp, FiTrendingDown, FiDownload,
} from "react-icons/fi";
import api from "../../utils/api";
import * as XLSX from "xlsx";

import { Scan as FiScan } from "lucide-react";

// ─── Status badge ─────────────────────────────────────────────────────────
const STATUS_STYLES = {
  MATCH:       { cls: "bg-emerald-50 text-emerald-600 border-emerald-200", label: "Match" },
  SHORTAGE:    { cls: "bg-red-50 text-red-500 border-red-200",             label: "Shortage" },
  SURPLUS:     { cls: "bg-blue-50 text-blue-600 border-blue-200",          label: "Surplus" },
  NOT_AUDITED: { cls: "bg-gray-100 text-gray-400 border-gray-200",         label: "Not audited" },
};
const StatusBadge = ({ value }) => {
  const s = STATUS_STYLES[value] || STATUS_STYLES.NOT_AUDITED;
  return (
    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border whitespace-nowrap ${s.cls}`}>
      {s.label}
    </span>
  );
};

export default function InventoryAuditModal({ onClose }) {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, audited: 0, matched: 0, shortage: 0, surplus: 0 });
  const [loading, setLoading] = useState(true);
  const [scanValue, setScanValue] = useState("");
  const [scanning, setScanning] = useState(false);
  const [filterView, setFilterView] = useState("ALL"); // ALL | MISMATCH | NOT_AUDITED
  const [quickSearch, setQuickSearch] = useState("");
  const scanInputRef = useRef(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.get("/product/audit/report");
      if (res.data.success) {
        setRows(res.data.data || []);
        setSummary(res.data.summary || {});
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load audit report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  // Keep scan input focused for continuous barcode-gun scanning
  useEffect(() => { scanInputRef.current?.focus(); }, [loading]);

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    const code = scanValue.trim();
    if (!code) return;

    setScanning(true);
    try {
      const res = await api.post("/product/audit/scan", { productCode: code, qty: 1 });
      if (res.data.success) {
        const p = res.data.product;
        setRows((prev) =>
          prev.map((r) =>
            r.productCode === p.productCode
              ? {
                  ...r,
                  physicalQty: p.physicalQty,
                  status: res.data.isMatch ? "MATCH" : p.physicalQty > p.qty ? "SURPLUS" : "SHORTAGE",
                  difference: p.physicalQty - p.qty,
                  lastAuditedAt: p.lastAuditedAt,
                }
              : r
          )
        );
        toast.success(`${p.productName || p.productCode} — physical qty: ${p.physicalQty}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Scan failed — product not found");
    } finally {
      setScanValue("");
      setScanning(false);
      scanInputRef.current?.focus();
    }
  };

  const handleManualSet = async (productCode, value) => {
    try {
      const res = await api.post("/product/audit/set", { productCode, physicalQty: Number(value) || 0 });
      if (res.data.success) {
        const p = res.data.product;
        setRows((prev) =>
          prev.map((r) =>
            r.productCode === p.productCode
              ? {
                  ...r,
                  physicalQty: p.physicalQty,
                  status: res.data.isMatch ? "MATCH" : p.physicalQty > p.qty ? "SURPLUS" : "SHORTAGE",
                  difference: p.physicalQty - p.qty,
                }
              : r
          )
        );
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update quantity");
    }
  };

  const handleReset = async () => {
    const result = await Swal.fire({
      title: "Start a new audit?",
      text: "This clears all physical counts recorded so far. This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, reset audit",
    });
    if (!result.isConfirmed) return;

    try {
      const res = await api.post("/product/audit/reset");
      if (res.data.success) {
        toast.success(res.data.message);
        fetchReport();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset audit");
    }
  };

  const handleExport = () => {
    if (!rows.length) { toast.warning("No data to export"); return; }
    const exportRows = rows.map((r) => ({
      Code: r.productCode,
      Name: r.productName,
      Category: r.category,
      Brand: r.brand,
      "System Qty": r.qty,
      "Physical Qty": r.physicalQty ?? "Not audited",
      Difference: r.difference ?? "-",
      Status: STATUS_STYLES[r.status]?.label || "Not audited",
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory Audit");
    XLSX.writeFile(wb, `inventory_audit_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const filteredRows = rows.filter((r) => {
    if (filterView === "MISMATCH" && !["SHORTAGE", "SURPLUS"].includes(r.status)) return false;
    if (filterView === "NOT_AUDITED" && r.status !== "NOT_AUDITED") return false;
    if (quickSearch.trim()) {
      const q = quickSearch.trim().toLowerCase();
      const hay = `${r.productCode} ${r.productName} ${r.category} ${r.brand}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-6xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
              <FiScan size={16} className="text-orange-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Total Inventory Audit</h2>
              <p className="text-xs text-gray-400 mt-0.5">Scan products to record physical stock count</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-500 hover:border-emerald-300 hover:text-emerald-600 transition">
              <FiDownload size={12} /> Export
            </button>
            <button onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-500 hover:border-red-300 hover:text-red-500 transition">
              <FiRefreshCw size={12} /> Reset Audit
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition">
              <FiX size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">

          {/* Scan bar */}
          <form onSubmit={handleScanSubmit} className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-center gap-3">
            <FiScan size={18} className="text-orange-400 flex-shrink-0" />
            <input
              ref={scanInputRef}
              type="text"
              value={scanValue}
              onChange={(e) => setScanValue(e.target.value)}
              placeholder="Scan or type product code and press Enter"
              disabled={scanning}
              className="flex-1 px-3 py-2.5 text-sm border border-orange-200 rounded-xl outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 bg-white text-gray-700 transition placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={scanning || !scanValue.trim()}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50"
            >
              {scanning ? "Adding..." : "Add +1"}
            </button>
          </form>

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Total Products</p>
              <p className="text-xl font-black text-gray-800">{summary.total ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Audited</p>
              <p className="text-xl font-black text-blue-600">{summary.audited ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-emerald-100 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1 flex items-center gap-1">
                <FiCheckCircle size={10} /> Matched
              </p>
              <p className="text-xl font-black text-emerald-600">{summary.matched ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-red-100 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-1 flex items-center gap-1">
                <FiTrendingDown size={10} /> Shortage
              </p>
              <p className="text-xl font-black text-red-500">{summary.shortage ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-blue-100 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1 flex items-center gap-1">
                <FiTrendingUp size={10} /> Surplus
              </p>
              <p className="text-xl font-black text-blue-600">{summary.surplus ?? 0}</p>
            </div>
          </div>

          {/* View filter + search */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { key: "ALL", label: "All" },
              { key: "MISMATCH", label: "Mismatches only" },
              { key: "NOT_AUDITED", label: "Not audited yet" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterView(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  filterView === f.key
                    ? "border-orange-300 bg-orange-50 text-orange-600"
                    : "border-gray-200 bg-white text-gray-500 hover:border-orange-200"
                }`}
              >
                {f.label}
              </button>
            ))}
            <input
              type="text"
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              placeholder="Quick search..."
              className="ml-auto px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-orange-300 bg-white text-gray-600 w-48"
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-3">
              <div className="w-5 h-5 border-2 border-orange-300 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Loading audit report...</span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Code</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Name</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Category</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">System Qty</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Physical Qty</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Difference</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-10 text-sm text-gray-400">No products match this view</td></tr>
                  ) : (
                    filteredRows.map((r) => {
                      const isMismatch = r.status === "SHORTAGE" || r.status === "SURPLUS";
                      return (
                        <tr
                          key={r.productCode}
                          className={`border-t border-gray-50 ${isMismatch ? "bg-red-50/40" : r.status === "MATCH" ? "bg-emerald-50/30" : ""}`}
                        >
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{r.productCode}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-800">{r.productName}</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{r.category}</td>
                          <td className="px-4 py-2.5 text-center font-semibold text-gray-700">{r.qty}</td>
                          <td className="px-4 py-2.5 text-center">
                            <input
                              type="number"
                              defaultValue={r.physicalQty ?? ""}
                              placeholder="-"
                              onBlur={(e) => {
                                if (e.target.value !== "" && Number(e.target.value) !== r.physicalQty) {
                                  handleManualSet(r.productCode, e.target.value);
                                }
                              }}
                              className="w-16 text-center text-sm border border-gray-200 rounded-lg px-1.5 py-1 outline-none focus:border-orange-300 bg-white"
                            />
                          </td>
                          <td className={`px-4 py-2.5 text-center font-bold ${
                            r.difference > 0 ? "text-blue-600" : r.difference < 0 ? "text-red-500" : "text-gray-400"
                          }`}>
                            {r.difference === null || r.difference === undefined
                              ? "-"
                              : r.difference > 0 ? `+${r.difference}` : r.difference}
                          </td>
                          <td className="px-4 py-2.5 text-center"><StatusBadge value={r.status} /></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}