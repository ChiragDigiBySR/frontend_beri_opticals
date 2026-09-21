import { useState, useEffect, useCallback, useMemo } from "react";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getFilteredRowModel, flexRender } from "@tanstack/react-table";
import api from "../../utils/api";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { FiSearch, FiRefreshCw, FiTrash2, FiX, FiPhone, FiChevronRight, FiChevronLeft, FiTool, FiInfo } from "react-icons/fi";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";

/* ─── Constants ─────────────────────────────────────────────────────────── */
const STATUS_CFG = {
  Pending: { cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  "In Progress": { cls: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-400" },
  Completed: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-400" },
  Cancelled: { cls: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-400" },
};
const ALL_STATUSES = ["Pending", "In Progress", "Completed", "Cancelled"];
const FETCH_LIMIT = 100;
const PAGE_SIZE = 100;

const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all placeholder-gray-300";
const fmt = (v) => v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/* ─── Status Badge ──────────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || { cls: "bg-gray-100 text-gray-500 border-gray-200", dot: "bg-gray-300" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${cfg.cls}`}>
      {status || "—"}
    </span>
  );
};

/* ─── Detail Modal ──────────────────────────────────────────────────────── */
const DetailModal = ({ repair, onClose, onStatusChange }) => {
  const [status, setStatus] = useState(repair.status);
  const [saving, setSaving] = useState(false);

  const saveStatus = async () => {
    if (status === repair.status) return;
    try {
      setSaving(true);
      await api.patch(`/repair/${repair.repairNumber}/status`, { status });
      onStatusChange(repair.repairNumber, status);
      toast.success("Status updated");
    } catch { toast.error("Failed to update status"); }
    finally { setSaving(false); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fadeIn"
        onClick={e => e.stopPropagation()}
      >
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(.97) translateY(6px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
          .animate-fadeIn { animation: fadeIn .18s ease both; }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
              <FiTool size={15} className="text-orange-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Repair Details</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition cursor-pointer">
            <FiX size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Customer */}
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-0.5 h-4 rounded-full bg-orange-400 inline-block" />
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Name</p>
                <p className="text-sm font-semibold text-gray-800">{repair.name || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Mobile</p>
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-1"><FiPhone size={10} className="text-orange-400" />{repair.mobile || "—"}</p>
              </div>
              {repair.email && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Email</p>
                  <p className="text-sm font-semibold text-gray-800">{repair.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Repair Info */}
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-0.5 h-4 rounded-full bg-orange-400 inline-block" />
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Repair Info / </h3>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{repair.repairNumber}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Item</p>
                <p className="text-sm font-semibold text-gray-800">{repair.item || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Price</p>
                <p className="text-sm font-bold text-orange-600">₹{repair.price || 0}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Repair Date</p>
                <p className="text-sm font-semibold text-gray-800">{fmt(repair.repairDate || repair.createdAt)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Delivery Date</p>
                <p className="text-sm font-semibold text-gray-800">{fmt(repair.deliveryDate)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Status</p>
                <StatusBadge status={repair.status} />
              </div>
            </div>
          </div>

          {repair.issue && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Issue</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-xl border border-gray-100 p-3 leading-relaxed">{repair.issue}</p>
            </div>
          )}

          {repair.remark && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Remark</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-xl border border-gray-100 p-3 leading-relaxed">{repair.remark}</p>
            </div>
          )}

          {/* Photos — click opens in new tab */}
          {repair.images?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Photos ({repair.images.length}) — click to open
              </p>
              <div className="grid grid-cols-4 gap-2">
                {repair.images.map((img, i) => (
                  <a
                    key={i}
                    href={img}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:opacity-80 hover:shadow-md transition block"
                  >
                    <img src={img} alt={`photo-${i + 1}`} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Update status */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Update Status</p>
            <div className="flex gap-2">
              <select value={status} onChange={e => setStatus(e.target.value)} className={`${inputCls} flex-1`}>
                {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                onClick={saveStatus}
                disabled={saving || status === repair.status}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                {saving ? "…" : "Save"}
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function RepairList() {
  const { permissions = [], role } = useSelector(s => s.auth.user || {});
  const canDelete = role === "ADMIN" || permissions.includes("DELETE REPAIR");

  const [allData, setAllData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState(null);
  const [globalFilter, setGlobalFilter] = useState("");

  const [keyword, setKeyword] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const dispatch = useDispatch();

  /* ── Fetch (paginated, appends) ── */
  const fetchRepairs = useCallback(async (pg = 1, append = false) => {
    try {
      pg === 1 ? dispatch(showLoader()) : setLoadingMore(true);
      const res = await api.get(`/repair?page=${pg}&limit=${FETCH_LIMIT}`);
      if (res.data.success) {
        setAllData(prev => append ? [...prev, ...(res.data.repairs || [])] : (res.data.repairs || []));
        setHasMore(res.data.hasMore);
        setPage(pg);
      }
    } catch { toast.error("Failed to load repairs"); }
    finally { dispatch(hideLoader());; setLoadingMore(false); }
  }, []);

  /* ── Search ── */
  const searchRepairs = async () => {
    if (!startDate && !endDate && !keyword) {
      toast.warning("Please provide at least one filter.");
      return;
    }

    if ((startDate && !endDate) || (!startDate && endDate)) {
      toast.warning("Please select both Start and End dates.");
      return;
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      toast.warning("Start date cannot be greater than End date.");
      return;
    }

    if (keyword && keyword.trim().length < 4) {
      toast.warning("Keyword must be at least 4 characters.");
      return;
    }

    try {
      setPage(1);
      dispatch(showLoader());

      const res = await api.post("/repair/search", {
        keyword: keyword?.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (res.data.success) {
        setFilteredData(res.data.repairsData || []);
        setIsSearching(true);
      } else {
        toast.warning(res.data.message);
      }

    } catch (err) {
      console.error("Search error:", err);
      toast.error("Search failed");
    } finally {
      dispatch(hideLoader());
    }
  };

  const handleResetSearch = () => {
    setFilteredData([]); setIsSearching(false);
    setKeyword(""); setStartDate(""); setEndDate("");
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    fetchRepairs(page + 1, true);
  };

  /* ── Delete ── */
  const handleDeleteRepair = async (repair) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `You won't be able to recover this repair (${repair.name})`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
    });
    if (!result.isConfirmed) return;
    try {
      Swal.fire({ title: "Deleting...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      await api.delete(`/repair/${repair.repairNumber}`);
      setAllData(prev => prev.filter(r => r.repairNumber !== repair.repairNumber));
      setFilteredData(prev => prev.filter(r => r.repairNumber !== repair.repairNumber));
      Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Something went wrong" });
    }
  };

  /* ── Status update (from modal) ── */
  const handleStatusChange = (id, newStatus) => {
    const update = arr => arr.map(r => r._id === id ? { ...r, status: newStatus } : r);
    setAllData(update);
    setFilteredData(update);
    setSelected(prev => prev?._id === id ? { ...prev, status: newStatus } : prev);
  };

  useEffect(() => { fetchRepairs(1); }, []);

  /* ── Tanstack columns ── */
  const columns = useMemo(() => [
    {
      header: "Action",
      id: "actions",
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex items-center justify-center gap-0.5">
            <button
              onClick={e => { e.stopPropagation(); setSelected(r); }}
              className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-400 transition cursor-pointer"
              title="View details"
            >
              <FiInfo size={14} />
            </button>

          </div>
        );
      },
    },
    {
      header: "Date",
      accessorKey: "repairDate",
      cell: ({ row }) => fmt(row.original.repairDate || row.original.createdAt),
    },
    { header: "Name", accessorKey: "name" },
    { header: "Mobile", accessorKey: "mobile" },
    { header: "Item", accessorKey: "item" },
    {
      header: "Price",
      accessorKey: "price",
      cell: ({ getValue }) => <span className="font-bold text-gray-800">₹{getValue() || 0}</span>,
    },
    {
      header: "Delivery Date",
      accessorKey: "deliveryDate",
      cell: ({ getValue }) => fmt(getValue()),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: ({ getValue }) => (
        <div className="flex justify-center">
          <StatusBadge status={getValue()} />
        </div>
      ),
    },
    {
      header: "Delete",
      id: "delete",
      cell: ({ row }) => canDelete ? (
        <button
          onClick={e => { e.stopPropagation(); handleDeleteRepair(row.original); }}
          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 transition mx-auto block cursor-pointer"
          title="Delete"
        >
          <FiTrash2 size={14} />
        </button>
      ) : "—",
    },
  ], [canDelete]);

  /* ── Tanstack table ── */
  const table = useReactTable({
    data: isSearching ? filteredData : allData,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    initialState: { pagination: { pageIndex: 0, pageSize: PAGE_SIZE } },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const currentPage = table.getState().pagination.pageIndex;
  const totalPages = table.getPageCount();
  const MAX_PAGES = 5;
  const startPage = Math.max(0, currentPage - Math.floor(MAX_PAGES / 2));
  const endPage = Math.min(totalPages, startPage + MAX_PAGES);
  const pages = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);


  // const displayData = isSearching ? filteredData : allData;

  return (
    <div className="p-6 min-h-screen bg-gray-50">

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">

          <button
            onClick={isSearching ? handleResetSearch : () => fetchRepairs(1)}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-xs font-semibold rounded-lg transition shadow-sm w-fit cursor-pointer"
          >
            <FiRefreshCw size={13} /> {isSearching ? "Reset" : "Refresh"}
          </button>

          <div className="flex flex-col sm:flex-row gap-3 flex-1 lg:justify-end items-end">

            {/* Date range */}
            <div className="flex gap-3">
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-500 mb-1">From Date</label>
                <input
                  type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-300 transition w-36 text-gray-700"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-500 mb-1">To Date</label>
                <input
                  type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-300 transition w-36 text-gray-700"
                />
              </div>
            </div>


            {/* Keyword */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-500 mb-1">Keyword</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} />
                <input
                  type="text"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && searchRepairs()}
                  placeholder="Name, mobile, item…"
                  className="pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-300 transition w-52 text-gray-700 placeholder:text-gray-300"
                />
                {keyword && (
                  <button onClick={() => setKeyword("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition cursor-pointer">
                    <FiX size={12} />
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={searchRepairs}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-xs font-semibold rounded-lg transition shadow-sm cursor-pointer"
            >
              <FiSearch size={12} /> Search
            </button>
          </div>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 px-5 py-4 border-b border-gray-100">

          <div className="relative w-full sm:w-56">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={13} />
            <input
              type="text"
              value={globalFilter ?? ""}
              onChange={e => setGlobalFilter(e.target.value)}
              placeholder="Quick search..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition text-gray-600 placeholder:text-gray-300"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-200 border-b border-gray-100">
                {table.getHeaderGroups().map(hg => hg.headers.map(h => (
                  <th key={h.id} className="px-4 py-3 text-center text-xs font-semibold text-gray-800 whitespace-nowrap uppercase tracking-wider">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                )))}
              </tr>
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-14 text-center text-gray-400 text-sm">No repairs found</td>
                </tr>
              ) : table.getRowModel().rows.map(row => (
                <tr key={row.id} className="border-b border-gray-50 text-center hover:bg-orange-50 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-2.5 text-gray-700 whitespace-nowrap text-sm">
                      {flexRender(cell.column.columnDef.cell ?? cell.column.columnDef.accessorKey, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-gray-100">
          <button
            onClick={isSearching ? handleResetSearch : handleLoadMore}
            disabled={loadingMore || (!isSearching && !hasMore)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition
              ${loadingMore || (!isSearching && !hasMore)
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : isSearching
                  ? "bg-gray-200 hover:bg-gray-300 text-gray-700 cursor-pointer"
                  : "bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
              }`}
          >
            {loadingMore ? "Loading..." : isSearching ? "Reset Search" : "Load More"}
          </button>

          {/* Page buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition cursor-pointer"
            >
              <FiChevronLeft size={14} />
            </button>

            {startPage > 0 && (
              <>
                <button onClick={() => table.setPageIndex(0)} className="w-8 h-8 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold cursor-pointer">1</button>
                <span className="text-gray-300 text-xs">…</span>
              </>
            )}

            {pages.map(p => (
              <button
                key={p}
                onClick={() => table.setPageIndex(p)}
                className={`w-8 h-8 text-xs rounded-lg font-semibold transition cursor-pointer ${p === currentPage ? "bg-orange-500 text-white shadow-sm" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
              >
                {p + 1}
              </button>
            ))}

            {endPage < totalPages && (
              <>
                <span className="text-gray-300 text-xs">…</span>
                <button onClick={() => table.setPageIndex(totalPages - 1)} className="w-8 h-8 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold cursor-pointer">{totalPages}</button>
              </>
            )}

            <button
              onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition cursor-pointer"
            >
              <FiChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {selected && (
        <DetailModal
          repair={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      )}

    </div>
  );
}