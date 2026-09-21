import { useEffect, useMemo, useState } from "react";
import {
  useReactTable, getCoreRowModel, getPaginationRowModel, flexRender,
} from "@tanstack/react-table";
import api from "../../utils/api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  FiEye, FiEdit2, FiCheckCircle, FiXCircle, FiShield,
  FiToggleLeft, FiToggleRight, FiRefreshCw, FiSearch,
  FiX, FiExternalLink, FiMessageCircle, FiCalendar,
  FiMapPin, FiMail, FiPhone, FiPercent, FiClock,
  FiUser, FiImage,
} from "react-icons/fi";

// ── shared style tokens ──────────────────────────────────────────────────────
const thCls = "px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap text-center bg-gray-50 border-b border-gray-100";
const tdCls = "px-4 py-3 text-sm text-gray-700 whitespace-nowrap text-center border-b border-gray-50";

// status badge helper
const Badge = ({ color, label }) => {
  const colors = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-red-50 text-red-600 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    gray: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${colors[color] || colors.gray}`}>
      {label}
    </span>
  );
};

export default function StoresList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");

  // modal states
  const [confirmModal, setConfirmModal] = useState(null); // { id, name, currentState }
  const [verifyModal, setVerifyModal] = useState(null); // { id, storeNumber }
  const [detailModal, setDetailModal] = useState(null); // store object
  const [detailLoading, setDetailLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [expiryModal, setExpiryModal] = useState(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [updatingExpiry, setUpdatingExpiry] = useState(false);

  const navigate = useNavigate();
  const LIMIT = 100;

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchStores = async (pageNum = 1, append = false) => {
    try {
      pageNum === 1 ? setLoading(true) : setLoadingMore(true);
      const res = await api.get("/store", { params: { page: pageNum, limit: LIMIT } });
      const stores = res.data.data || [];
      setData(prev => append ? [...prev, ...stores] : stores);
      setHasMore(res.data.hasMore);
    } catch { toast.error("Failed to fetch stores"); }
    finally { setLoading(false); setLoadingMore(false); }
  };

  useEffect(() => { fetchStores(1, false); }, []);

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    const next = page + 1;
    setPage(next);
    fetchStores(next, true);
  };

  // ── verify ─────────────────────────────────────────────────────────────────
  const handleVerify = async (id) => {
    try {
      setVerifyingId(id);
      const res = await api.put(`/store/verify/${id}`);
      if (res.data.success) {
        setData(prev => prev.map(s => s._id === id ? { ...s, isVerified: 1 } : s));
        toast.success(res.data.message || "Store verified");
      }
    } catch { toast.error("Failed to verify store"); }
    finally { setVerifyingId(null); setVerifyModal(null); }
  };

  // ── toggle active ──────────────────────────────────────────────────────────
  const handleToggleActive = async (id) => {
    try {
      setTogglingId(id);
      const res = await api.patch(`/store/toggle-active/${id}`);
      if (res.data.success) {
        setData(prev => prev.map(s => s._id === id ? { ...s, isActive: !s.isActive } : s));
        toast.success(res.data.message || "Status updated");
      }
    } catch { toast.error("Failed to update status"); }
    finally { setTogglingId(null); setConfirmModal(null); }
  };

  // ── update expiry ─────────────────────────────────────────────────────────
  const handleUpdateExpiry = async () => {
    if (!expiryDate) return toast.error("Please select a date");
    try {
      setUpdatingExpiry(true);
      const res = await api.patch(`/store/toggle-expiry/${expiryModal.id}`, { expiry: expiryDate });
      if (res.data.success) {
        setData(prev => prev.map(s => s._id === expiryModal.id ? { ...s, expiry: expiryDate } : s));
        toast.success(res.data.message || "Expiry updated");
        setExpiryModal(null);
        setExpiryDate("");
      }
    } catch { toast.error("Failed to update expiry"); }
    finally { setUpdatingExpiry(false); }
  };

  // ── open detail modal ──────────────────────────────────────────────────────
  const openDetail = async (storeId) => {
    try {
      setDetailLoading(true);
      setDetailModal({ _id: storeId }); // open modal with loader
      const res = await api.get(`/store/details/${storeId}`);
      if (res.data.success) setDetailModal({ ...res.data.store, owner: res.data.owner });
    } catch { toast.error("Failed to load store details"); setDetailModal(null); }
    finally { setDetailLoading(false); }
  };

  // ── filtered data ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(s =>
      s.storeName?.toLowerCase().includes(q) ||
      s.ownerName?.toLowerCase().includes(q) ||
      s.mobile?.includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      String(s.storeNumber)?.includes(q)
    );
  }, [data, search]);

  // ── columns ────────────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      header: "Actions",
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="flex items-center justify-center gap-1.5">
            {/* View detail */}
            <button onClick={() => openDetail(s._id)}
              title="View Details"
              className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition cursor-pointer">
              <FiEye size={13} />
            </button>

            {/* Edit */}
            <button onClick={() => navigate(`/stores/edit/${s._id}`)}
              title="Edit Store"
              className="w-7 h-7 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-500 flex items-center justify-center transition cursor-pointer">
              <FiEdit2 size={13} />
            </button>

            {/* WhatsApp settings */}
            <button onClick={() => navigate(`/store/${s._id}/whatsapp-settings`)}
              title="WhatsApp Settings"
              className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition cursor-pointer">
              <FiMessageCircle size={13} />
            </button>

            {/* Verify */}
            {!s.isVerified && (
              <button
                onClick={() => setVerifyModal({ id: s._id, storeNumber: s.storeNumber, name: s.storeName })}
                disabled={verifyingId === s._id}
                title="Verify Store"
                className="w-7 h-7 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition cursor-pointer disabled:opacity-50">
                <FiShield size={13} />
              </button>
            )}

            {/* Toggle active */}
            <button
              onClick={() => setConfirmModal({ id: s._id, name: s.storeName, currentState: s.isActive })}
              disabled={togglingId === s._id}
              title={s.isActive ? "Deactivate" : "Activate"}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer disabled:opacity-50
                ${s.isActive ? "bg-red-50 hover:bg-red-100 text-red-500" : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600"}`}>
              {s.isActive ? <FiToggleLeft size={14} /> : <FiToggleRight size={14} />}
            </button>

            {/* Update expiry */}
            <button
              onClick={() => {
                setExpiryModal({ id: s._id, name: s.storeName, currentExpiry: s.expiry });
                setExpiryDate(s.expiry ? s.expiry.split("T")[0] : "");
              }}
              title="Update Expiry"
              className="w-7 h-7 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600 flex items-center justify-center transition cursor-pointer">
              <FiCalendar size={13} />
            </button>
          </div>
        );
      },
    },
    {
      header: "Store No.",
      cell: ({ row }) => (
        <span className="text-xs font-bold text-gray-400">{row.original.storeNumber}</span>
      ),
    },
    {
      header: "Store",
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="flex items-center gap-2.5 text-left">
            {s.logo ? (
              <img src={s.logo} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-100 shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 text-orange-400 flex items-center justify-center shrink-0 text-xs font-black">
                {s.storeName?.charAt(0)}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-gray-800 leading-none">{s.storeName}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.ownerName}</p>
            </div>
          </div>
        );
      },
    },
    { header: "Email", cell: ({ row }) => <span className="text-xs text-gray-600">{row.original.email}</span> },
    { header: "Mobile", cell: ({ row }) => <span className="text-xs text-gray-600">{row.original.mobile}</span> },
    {
      header: "Expiry",
      cell: ({ row }) => {
        const expired = new Date(row.original.expiry) < new Date();
        return (
          <span className={`text-xs font-semibold ${expired ? "text-red-500" : "text-gray-600"}`}>
            {new Date(row.original.expiry).toLocaleDateString("en-IN")}
          </span>
        );
      },
    },
    {
      header: "Variant",
      cell: ({ row }) => {
        const v = row.original.varient;
        const colors = { PRO: "amber", PREMIUM: "blue", CUSTOM: "gray" };
        return <Badge color={colors[v] || "gray"} label={v || "—"} />;
      },
    },
    {
      header: "Verified",
      cell: ({ row }) => row.original.isVerified
        ? <Badge color="green" label="Verified" />
        : <Badge color="red" label="Unverified" />,
    },
    {
      header: "Status",
      cell: ({ row }) => {
        const s = row.original;
        if (!s.isActive) return <Badge color="red" label="Deactivated" />;
        const expired = new Date(s.expiry) < new Date();
        return expired ? <Badge color="amber" label="Expired" /> : <Badge color="green" label="Active" />;
      },
    },
    {
      header: "Utility WA",
      cell: ({ row }) => {
        const ok = row.original.whatsapp?.utility?.credentials?.isActive;
        return <Badge color={ok ? "green" : "red"} label={ok ? "Connected" : "Not Connected"} />;
      },
    },
    {
      header: "Promo WA",
      cell: ({ row }) => {
        const ok = row.original.whatsapp?.promotion?.credentials?.isActive;
        return <Badge color={ok ? "green" : "red"} label={ok ? "Connected" : "Not Connected"} />;
      },
    },
  ], [verifyingId, togglingId]);

  // ── table ──────────────────────────────────────────────────────────────────
  const table = useReactTable({
    data: filtered,
    columns,
    initialState: { pagination: { pageSize: 20, pageIndex: 0 } },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const curPage = table.getState().pagination.pageIndex;
  const totalPgs = table.getPageCount();
  const MAX = 5;
  let start = Math.max(0, curPage - Math.floor(MAX / 2));
  let end = Math.min(totalPgs, start + MAX);
  if (end - start < MAX) start = Math.max(0, end - MAX);
  const pageNums = Array.from({ length: end - start }, (_, i) => start + i);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="w-6 h-6 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f8fa] p-4 md:p-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-4">
        <button onClick={() => { setSearch(""); fetchStores(1, false); setPage(1); }}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-xs font-semibold rounded-lg transition shadow-sm w-fit">
          <FiRefreshCw size={13} /> Refresh
        </button>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Quick Search"
              className="pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all w-52 placeholder-gray-300"
            />
          </div>
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => (
                    <th key={h.id} className={thCls}>
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-16 text-center text-sm text-gray-400 font-semibold">
                    No stores found
                  </td>
                </tr>
              ) : table.getRowModel().rows.map((row, i) => (
                <tr key={row.id} className={`hover:bg-orange-50/30 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className={tdCls}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-50">
          <button onClick={handleLoadMore} disabled={!hasMore || loadingMore}
            className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer">
            {loadingMore ? <><div className="w-3 h-3 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" />Loading…</> : "Load More"}
          </button>

          <div className="flex items-center gap-1.5">
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
              className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition cursor-pointer">
              Prev
            </button>
            {start > 0 && (<><button onClick={() => table.setPageIndex(0)} className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">1</button><span className="text-gray-400 text-xs">…</span></>)}
            {pageNums.map(p => (
              <button key={p} onClick={() => table.setPageIndex(p)}
                className={`px-3 py-1.5 text-xs font-bold border rounded-lg transition cursor-pointer ${p === curPage ? "bg-orange-500 border-orange-500 text-white" : "border-gray-200 hover:bg-gray-50"}`}>
                {p + 1}
              </button>
            ))}
            {end < totalPgs && (<><span className="text-gray-400 text-xs">…</span><button onClick={() => table.setPageIndex(totalPgs - 1)} className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">{totalPgs}</button></>)}
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
              className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition cursor-pointer">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ══ CONFIRM ACTIVATE/DEACTIVATE MODAL ══ */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${confirmModal.currentState ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"}`}>
              {confirmModal.currentState ? <FiToggleLeft size={22} /> : <FiToggleRight size={22} />}
            </div>
            <h3 className="text-base font-black text-gray-900 text-center">
              {confirmModal.currentState ? "Deactivate Store?" : "Activate Store?"}
            </h3>
            <p className="text-sm text-gray-500 text-center mt-2">
              Are you sure you want to <strong>{confirmModal.currentState ? "deactivate" : "activate"}</strong>{" "}
              <strong className="text-gray-800">{confirmModal.name}</strong>?
              {confirmModal.currentState && " The store will lose access immediately."}
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer">
                Cancel
              </button>
              <button onClick={() => handleToggleActive(confirmModal.id)}
                disabled={togglingId === confirmModal.id}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition cursor-pointer disabled:opacity-60
                  ${confirmModal.currentState ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"}`}>
                {togglingId === confirmModal.id ? "Updating…" : confirmModal.currentState ? "Yes, Deactivate" : "Yes, Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ CONFIRM VERIFY MODAL ══ */}
      {verifyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <FiShield size={22} />
            </div>
            <h3 className="text-base font-black text-gray-900 text-center">Verify Store?</h3>
            <p className="text-sm text-gray-500 text-center mt-2">
              Verify <strong className="text-gray-800">{verifyModal.name}</strong> (#{verifyModal.storeNumber})?
              This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setVerifyModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer">
                Cancel
              </button>
              <button onClick={() => handleVerify(verifyModal.id)}
                disabled={verifyingId === verifyModal.id}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-bold text-white transition cursor-pointer disabled:opacity-60">
                {verifyingId === verifyModal.id ? "Verifying…" : "Yes, Verify"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ UPDATE EXPIRY MODAL ══ */}
      {expiryModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto mb-4">
              <FiCalendar size={22} />
            </div>
            <h3 className="text-base font-black text-gray-900 text-center">Update Expiry</h3>
            <p className="text-sm text-gray-500 text-center mt-1 mb-4">
              <strong className="text-gray-800">{expiryModal.name}</strong>
            </p>

            {expiryModal.currentExpiry && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 mb-4 text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Current Expiry</p>
                <p className={`text-sm font-bold ${new Date(expiryModal.currentExpiry) < new Date() ? "text-red-500" : "text-gray-700"}`}>
                  {new Date(expiryModal.currentExpiry).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  {new Date(expiryModal.currentExpiry) < new Date() && " (Expired)"}
                </p>
              </div>
            )}

            <div className="mb-5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                New Expiry Date
              </label>
              <input
                type="date"
                value={expiryDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setExpiryModal(null); setExpiryDate(""); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer">
                Cancel
              </button>
              <button onClick={handleUpdateExpiry}
                disabled={updatingExpiry || !expiryDate}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-sm font-bold text-white transition cursor-pointer disabled:opacity-60">
                {updatingExpiry ? "Updating…" : "Update Expiry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ STORE DETAIL MODAL ══ */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                {detailModal.logo ? (
                  <img src={detailModal.logo} alt="" className="w-10 h-10 rounded-xl object-cover border border-gray-100" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center font-black text-sm">
                    {detailModal.storeName?.charAt(0)}
                  </div>
                )}
                <div>
                  <h2 className="text-base font-black text-gray-900 leading-none">{detailModal.storeName || "Loading…"}</h2>
                  {detailModal.storeNumber && <p className="text-xs text-gray-400 mt-0.5">Store #{detailModal.storeNumber}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {detailModal._id && (
                  <button onClick={() => { setDetailModal(null); navigate(`/stores/edit/${detailModal._id}`); }}
                    className="flex items-center gap-1.5 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-xl transition cursor-pointer">
                    <FiEdit2 size={12} /> Edit
                  </button>
                )}
                <button onClick={() => setDetailModal(null)}
                  className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition cursor-pointer">
                  <FiX size={14} />
                </button>
              </div>
            </div>

            {detailLoading && !detailModal.storeName ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="p-6 space-y-5">

                {/* Status badges */}
                <div className="flex flex-wrap gap-2">
                  {detailModal.isVerified ? <Badge color="green" label="✓ Verified" /> : <Badge color="red" label="✗ Not Verified" />}
                  {detailModal.isActive ? <Badge color="green" label="Active" /> : <Badge color="red" label="Deactivated" />}
                  {detailModal.varient && <Badge color="amber" label={detailModal.varient} />}
                  {detailModal.hasGst && <Badge color="blue" label="GST Registered" />}
                  {detailModal.showAds && <Badge color="gray" label="Ads Enabled" />}
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: FiMail, label: "Email", val: detailModal.email },
                    { icon: FiPhone, label: "Mobile", val: detailModal.mobile },
                    { icon: FiMapPin, label: "Address", val: detailModal.address },
                    { icon: FiClock, label: "Store Timing", val: detailModal.storeTiming },
                    { icon: FiCalendar, label: "Expiry", val: detailModal.expiry ? new Date(detailModal.expiry).toLocaleDateString("en-IN") : "—" },
                    { icon: FiPercent, label: "Commission", val: detailModal.owner?.commission != null ? `${detailModal.owner.commission}%` : "—" },
                    { icon: FiUser, label: "Loyalty Pts", val: detailModal.loyaltyPoints ? `Rs.${detailModal.loyaltyPoints} = 1 pt` : "—" },
                    { icon: FiUser, label: "Pt Value", val: detailModal.valueOfloyaltyPoints ?? "—" },
                  ].map(({ icon: Ic, label, val }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Ic size={11} className="text-gray-400" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{val || "—"}</p>
                    </div>
                  ))}
                </div>

                {/* GST number */}
                {detailModal.hasGst && detailModal.gstNumber && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">GST Number</p>
                    <p className="text-sm font-bold text-blue-800">{detailModal.gstNumber}</p>
                  </div>
                )}

                {/* Pages */}
                {detailModal.pages?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Pages ({detailModal.pages.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {detailModal.pages.map(p => (
                        <span key={p} className="text-[10px] font-bold bg-orange-50 border border-orange-100 text-orange-600 px-2.5 py-1 rounded-lg">{p}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* WhatsApp config */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Utility WhatsApp", data: detailModal.whatsapp?.utility },
                    { label: "Promotion WhatsApp", data: detailModal.whatsapp?.promotion },
                  ].map(({ label, data: wa }) => (
                    <div key={label} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</p>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Provider: <span className="text-orange-500">{wa?.provider?.toUpperCase() || "—"}</span></p>
                      <Badge color={wa?.credentials?.isActive ? "green" : "red"} label={wa?.credentials?.isActive ? "Connected" : "Not Connected"} />
                    </div>
                  ))}
                </div>

                {/* Document images */}
                {(detailModal.gstImg || detailModal.panImg || detailModal.aadharImg) && (
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Documents</p>
                    <div className="flex gap-3">
                      {[
                        { label: "GST", url: detailModal.gstImg },
                        { label: "PAN", url: detailModal.panImg },
                        { label: "Aadhar", url: detailModal.aadharImg },
                      ].filter(d => d.url).map(({ label, url }) => (
                        <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 transition">
                          <FiImage size={12} /> {label} <FiExternalLink size={10} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}