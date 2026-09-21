import { useState } from "react";
import { toast } from "react-toastify";
import { FiFilter, FiSearch, FiX, FiDownload, FiLayers } from "react-icons/fi";
import api from "../../utils/api";
import * as XLSX from "xlsx";

const fmt = (n) => `₹${Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CategoryFilteredReport({ startDate, endDate, categories = [], brands = [] }) {
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [productName, setProductName] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const handleFetch = async () => {
    if (!startDate || !endDate) {
      toast.warning("Select a date range in the report filter above first");
      return;
    }
    try {
      setLoading(true);
      const res = await api.post("/jc/report/category-filtered", {
        startDate,
        endDate,
        category: category || undefined,
        brand: brand || undefined,
        productName: productName.trim() || undefined,
      });
      if (res.data.success) {
        setRows(res.data.data || []);
        setFetched(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCategory(""); setBrand(""); setProductName("");
    setRows([]); setFetched(false);
  };

  const handleExport = () => {
    if (!rows.length) { toast.warning("No data to export"); return; }
    const exportRows = rows.map((r) => ({
      Category: r.category,
      Brand: r.brand,
      "Product Name": r.productName,
      "Model No.": r.modelNo || "-",
      "Sell Price": r.price,
      MRP: r.mrp,
      "Qty Sold": r.qtySold,
      "Total Sale Amount": r.totalSaleAmount,
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Category Filtered Report");
    XLSX.writeFile(wb, `category_filtered_report_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const totalQty = rows.reduce((s, r) => s + (r.qtySold || 0), 0);
  const totalAmount = rows.reduce((s, r) => s + (r.totalSaleAmount || 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg border bg-blue-50 border-blue-100 text-blue-500 flex items-center justify-center flex-shrink-0">
          <FiLayers size={12} />
        </span>
        <h3 className="text-sm font-bold text-gray-700">Filterable Category / Brand / Product Report</h3>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 bg-gray-50 text-gray-700">
              <option value="">All Categories</option>
              {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Brand</label>
            <select value={brand} onChange={(e) => setBrand(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 bg-gray-50 text-gray-700">
              <option value="">All Brands</option>
              {brands.map((b, i) => <option key={i} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Product Name</label>
            <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
              placeholder="Search product..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 bg-gray-50 text-gray-700 placeholder:text-gray-300" />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleFetch} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-60">
            <FiSearch size={12} /> {loading ? "Loading..." : "Apply Filters"}
          </button>
          <button onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-semibold rounded-xl transition">
            <FiX size={12} /> Reset
          </button>
          {rows.length > 0 && (
            <button onClick={handleExport}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl transition shadow-sm">
              <FiDownload size={12} /> Export Excel
            </button>
          )}
        </div>

        {fetched && (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Category</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Brand</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Product Name</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Model No.</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Sell Price</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">MRP</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">Qty Sold</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Sale Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-sm text-gray-400">No sales found for these filters</td></tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={i} className="border-t border-gray-50 hover:bg-orange-50/30">
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-500 uppercase">{r.category}</span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{r.brand || "-"}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{r.productName}</td>
                      <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{r.modelNo || "-"}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{fmt(r.price)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{fmt(r.mrp)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold">{r.qtySold}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">{fmt(r.totalSaleAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                    <td colSpan={6} className="px-4 py-2.5 text-right text-xs text-gray-500">Totals →</td>
                    <td className="px-4 py-2.5 text-center text-blue-700">{totalQty}</td>
                    <td className="px-4 py-2.5 text-right text-emerald-600">{fmt(totalAmount)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}