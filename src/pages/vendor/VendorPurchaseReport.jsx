import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import {
  FiSearch, FiX, FiChevronDown, FiChevronUp, FiTruck,
  FiCalendar, FiPackage, FiDownload,
} from "react-icons/fi";
import api from "../../utils/api";
import * as XLSX from "xlsx";

const fmt = (n) => `₹${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");

const STATUS_MAP = {
  PENDING: "bg-gray-100 text-gray-500 border-gray-200",
  RECEIVED: "bg-orange-50 text-orange-500 border-orange-200",
  RETURN: "bg-yellow-50 text-yellow-600 border-yellow-200",
  COMPLETED: "bg-emerald-50 text-emerald-600 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-500 border-red-200",
};
const StatusBadge = ({ value }) => (
  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border whitespace-nowrap ${STATUS_MAP[value] || STATUS_MAP.PENDING}`}>
    {value || "-"}
  </span>
);

export default function VendorPurchaseReport() {
  const dispatch = useDispatch();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expanded, setExpanded] = useState({}); // vendorNumber -> bool
  const [search, setSearch] = useState("");

  const fetchReport = async () => {
    try {
      setLoading(true);
      dispatch(showLoader());
      const params = {};
      if (fromDate) params.startDate = fromDate;
      if (toDate) params.endDate = toDate;
      const res = await api.get("/vendor-order/report/purchase", { params });
      if (res.data.success) {
        setVendors(res.data.vendors || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load vendor purchase report");
    } finally {
      setLoading(false);
      dispatch(hideLoader());
    }
  };

  useEffect(() => { fetchReport(); }, []); // eslint-disable-line

  const handleReset = () => {
    setFromDate(""); setToDate("");
    setTimeout(fetchReport, 0);
  };

  const toggleExpand = (vendorNumber) =>
    setExpanded((prev) => ({ ...prev, [vendorNumber]: !prev[vendorNumber] }));

  const handleExport = () => {
    if (!vendors.length) { toast.warning("No data to export"); return; }
    const wb = XLSX.utils.book_new();

    const summaryRows = vendors.map((v) => ({
      "Vendor Name": v.vendorName,
      Mobile: v.mobile,
      Email: v.email,
      "Total Orders": v.totalOrders,
      "Total Amount": v.totalAmount,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Vendor Summary");

    const productRows = [];
    vendors.forEach((v) => {
      v.products.forEach((p) => {
        productRows.push({
          Vendor: v.vendorName,
          "Product Code": p.productCode,
          "Product Name": p.productName,
          Category: p.category,
          "Total Qty Purchased": p.totalQty,
          "Total Amount": p.totalAmount,
          "Purchase Count": p.purchaseCount,
          "Last Purchased": fmtDate(p.lastPurchasedAt),
        });
      });
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productRows), "Product-Wise Purchases");

    XLSX.writeFile(wb, `vendor_purchase_report_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const filteredVendors = vendors.filter((v) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (v.vendorName || "").toLowerCase().includes(q) || (v.mobile || "").includes(q);
  });

  const grandTotalOrders = vendors.reduce((s, v) => s + v.totalOrders, 0);
  const grandTotalAmount = vendors.reduce((s, v) => s + v.totalAmount, 0);

  return (
    <div className="p-6 min-h-screen bg-gray-50">

      {/* ── Filter bar ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h1 className="text-sm font-bold text-gray-800">Vendor Purchase Report</h1>
            <p className="text-xs text-gray-400 mt-0.5">What was purchased, when, and from which vendor</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex gap-3">
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-500 mb-1">From Date</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                  className="border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 text-gray-700 w-40" />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-500 mb-1">To Date</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                  className="border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 text-gray-700 w-40" />
              </div>
            </div>
            <button onClick={fetchReport}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-xs font-semibold rounded-lg transition shadow-sm">
              <FiSearch size={12} /> Apply
            </button>
            <button onClick={handleReset}
              className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 text-xs font-semibold rounded-lg transition">
              <FiX size={12} /> Reset
            </button>
            {vendors.length > 0 && (
              <button onClick={handleExport}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 text-xs font-semibold rounded-lg transition shadow-sm">
                <FiDownload size={12} /> Export
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Overall summary ── */}
      {!loading && vendors.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Vendors</p>
            <p className="text-xl font-black text-gray-800">{vendors.length}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Total Orders</p>
            <p className="text-xl font-black text-blue-600">{grandTotalOrders}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Total Purchase Amount</p>
            <p className="text-xl font-black text-emerald-600">{fmt(grandTotalAmount)}</p>
          </div>
        </div>
      )}

      {/* Quick search */}
      {!loading && vendors.length > 0 && (
        <div className="relative w-full sm:w-72 mb-4">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={13} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendor name or mobile..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition text-gray-600 placeholder:text-gray-300 bg-white" />
        </div>
      )}

      {/* ── Vendor cards ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 gap-3">
          <div className="w-5 h-5 border-2 border-orange-300 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading vendor purchase report...</span>
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center text-gray-400 text-sm">
          No vendor purchase data found
        </div>
      ) : (
        <div className="space-y-4">
          {filteredVendors.map((v) => {
            const isOpen = !!expanded[v.vendorNumber];
            return (
              <div key={v.vendorNumber} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleExpand(v.vendorNumber)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
                      <FiTruck size={15} className="text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">{v.vendorName}</p>
                      <p className="text-xs text-gray-400">{v.mobile}{v.email ? ` · ${v.email}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Orders</p>
                      <p className="text-sm font-bold text-gray-700">{v.totalOrders}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total Purchase</p>
                      <p className="text-sm font-bold text-emerald-600">{fmt(v.totalAmount)}</p>
                    </div>
                    {isOpen ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 p-5 space-y-5 bg-gray-50/50">

                    {/* Product-wise purchase history */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
                        <FiPackage size={11} /> Products Purchased
                      </p>
                      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Product</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Category</th>
                              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Qty Purchased</th>
                              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Times Ordered</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Total Amount</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Last Purchased</th>
                            </tr>
                          </thead>
                          <tbody>
                            {v.products.map((p, i) => (
                              <tr key={i} className="border-t border-gray-50">
                                <td className="px-4 py-2 font-medium text-gray-800">
                                  {p.productName}
                                  <span className="text-gray-400 font-mono text-[10px] ml-1">({p.productCode})</span>
                                </td>
                                <td className="px-4 py-2 text-gray-500">{p.category || "-"}</td>
                                <td className="px-4 py-2 text-center">
                                  <span className="inline-flex items-center justify-center w-8 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold">{p.totalQty}</span>
                                </td>
                                <td className="px-4 py-2 text-center text-gray-600">{p.purchaseCount}</td>
                                <td className="px-4 py-2 text-right font-semibold text-emerald-600">{fmt(p.totalAmount)}</td>
                                <td className="px-4 py-2 text-gray-500 text-xs flex items-center gap-1">
                                  <FiCalendar size={10} /> {fmtDate(p.lastPurchasedAt)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Order history */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Order History</p>
                      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Order No.</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Bill/Invoice No.</th>
                              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Status</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {v.orders.map((o, i) => (
                              <tr key={i} className="border-t border-gray-50">
                                <td className="px-4 py-2 font-mono text-xs text-gray-700">{o.orderNumber}</td>
                                <td className="px-4 py-2 text-gray-600">{fmtDate(o.orderDate)}</td>
                                <td className="px-4 py-2 text-gray-500">{o.billInvoiceNo || "-"}</td>
                                <td className="px-4 py-2 text-center"><StatusBadge value={o.status} /></td>
                                <td className="px-4 py-2 text-right font-semibold text-gray-700">{fmt(o.grandTotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}