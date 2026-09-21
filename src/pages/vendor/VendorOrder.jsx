import { useEffect, useMemo, useRef, useState } from "react";
import {
    useReactTable, getCoreRowModel, getPaginationRowModel,
    getFilteredRowModel, flexRender,
} from "@tanstack/react-table";
import {
    FiInfo, FiCornerUpLeft, FiTrash2, FiRefreshCw, FiX, FiSearch,
    FiChevronLeft, FiChevronRight, FiRefreshCcw, FiPackage,
} from "react-icons/fi";
import api from "../../utils/api";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";

const FETCH_LIMIT = 100;
const PAGE_SIZE = 100;

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI primitives
// ─────────────────────────────────────────────────────────────────────────────
const Modal = ({ onClose, children, maxWidth = "max-w-lg" }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
        <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} animate-fadeIn`} onClick={e => e.stopPropagation()}>
            {children}
        </div>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(.97) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}.animate-fadeIn{animation:fadeIn .18s ease both}`}</style>
    </div>
);

const ModalHeader = ({ title, subtitle, onClose }) => (
    <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
        <div>
            <h2 className="text-sm font-bold text-gray-800">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition">
            <FiX size={15} />
        </button>
    </div>
);

const ModalFooter = ({ children }) => (
    <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">
        {children}
    </div>
);

const InfoRow = ({ label, value }) => (
    <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-gray-800">{value || "-"}</p>
    </div>
);

const SectionTitle = ({ children }) => (
    <div className="flex items-center gap-2 mb-4">
        <span className="w-0.5 h-4 rounded-full bg-orange-400 inline-block" />
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{children}</h3>
    </div>
);

const fieldCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 hover:border-orange-300 transition bg-gray-50 text-gray-700";
const readonlyCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-100 text-gray-500 cursor-default";
const labelCls = "block text-xs font-medium text-gray-600 mb-1.5";

const OrderStatusBadge = ({ value }) => {
    const map = {
        COMPLETED: "bg-emerald-50 text-emerald-600 border-emerald-200",
        RECEIVED:  "bg-orange-50 text-orange-500 border-orange-200",
        RETURN:    "bg-yellow-50 text-yellow-600 border-yellow-200",
        PENDING:   "bg-gray-100 text-gray-500 border-gray-200",
        CANCELLED: "bg-red-50 text-red-500 border-red-200",
    };
    return (
        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border whitespace-nowrap ${map[value] || "bg-gray-100 text-gray-500 border-gray-200"}`}>
            {value || "-"}
        </span>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Keyword input with vendor-order suggestion dropdown
// ─────────────────────────────────────────────────────────────────────────────
function OrderKeywordInput({ value, onChange }) {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef(null);
    const containerRef = useRef(null);

    const fetchSuggestions = async (q) => {
        if (!q || q.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
        try {
            setSearching(true);
            const res = await api.get("/vendor-order/suggestion", { params: { q } });
            if (res.data.success) { setSuggestions(res.data.data || []); setShowSuggestions(true); }
        } catch { /* silent */ }
        finally { setSearching(false); }
    };

    const handleChange = (e) => {
        onChange(e.target.value);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchSuggestions(e.target.value), 320);
    };

    const handleSelect = (s) => {
        const q = value.trim().toLowerCase();
        const nameMatch   = s.name        ? s.name.toLowerCase().includes(q)        : false;
        const orderMatch  = s.orderNumber ? s.orderNumber.toLowerCase().includes(q) : false;
        const mobileMatch = s.mobile      ? s.mobile.toLowerCase().includes(q)      : false;

        let filled = s.name || s.orderNumber || "";
        if (orderMatch && !nameMatch && !mobileMatch) filled = s.orderNumber;
        else if (mobileMatch && !nameMatch && !orderMatch) filled = s.mobile;
        else filled = s.name || s.orderNumber || "";

        onChange(filled);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target))
                setShowSuggestions(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={containerRef} className="relative flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1">Keyword</label>
            <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} />
                {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-orange-300 border-t-transparent rounded-full animate-spin pointer-events-none" />
                )}
                <input
                    type="text"
                    value={value}
                    onChange={handleChange}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="Name or order no..."
                    className="pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-300 transition w-56 text-gray-700 placeholder:text-gray-300"
                />
                {value && !searching && (
                    <button onClick={() => { onChange(""); setSuggestions([]); setShowSuggestions(false); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition">
                        <FiX size={12} />
                    </button>
                )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    <div className="px-3 py-2 bg-orange-50 border-b border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Suggestions</p>
                    </div>
                    <ul className="max-h-52 overflow-y-auto">
                        {suggestions.map((s, i) => (
                            <li key={i}>
                                <button onMouseDown={() => handleSelect(s)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-orange-50 transition text-left">
                                    <div className="w-7 h-7 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
                                        <FiPackage size={11} className="text-orange-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{s.name || "-"}</p>
                                        <p className="text-xs text-gray-400 truncate">
                                            {s.orderNumber || ""}
                                            {s.mobile ? ` · ${s.mobile}` : ""}
                                        </p>
                                    </div>
                                    {s.status && <OrderStatusBadge value={s.status} />}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function VendorOrder() {
    const [allData, setAllData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [keyword, setKeyword] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [globalFilter, setGlobalFilter] = useState("");
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [viewOrder, setViewOrder] = useState(false);
    const [orderProducts, setOrderProducts] = useState([]);

    const [returnSingleModal, setReturnSingleModal] = useState(false);
    const [returnAllModal, setReturnAllModal] = useState(false);
    const [singleReturnData, setSingleReturnData] = useState(null);
    const [allReturnProducts, setAllReturnProducts] = useState([]);

    const [statusModal, setStatusModal] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState("");
    const [statusLoading, setStatusLoading] = useState(false);

    const dispatch = useDispatch();

    // ── fetch ────────────────────────────────────────────────────────────────
    const fetchVendorOrders = async (pageNumber = 1, append = false) => {
        try {
            pageNumber === 1 ? setLoading(true) : setLoadingMore(true);
            dispatch(showLoader());
            const res = await api.get("/vendor-order/", { params: { page: pageNumber, limit: FETCH_LIMIT } });
            if (res.data.success) {
                setAllData(prev => append ? [...prev, ...(res.data.orders || [])] : (res.data.orders || []));
                setHasMore(res.data.hasMore);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); setLoadingMore(false); dispatch(hideLoader()); }
    };

    useEffect(() => { fetchVendorOrders(1, false); }, []);

    const fetchVendorOrderDetails = async (orderrow) => {
        try {
            dispatch(showLoader());
            console.log(orderrow)
            const res = await api.get(`/vendor-order/${orderrow.orderNumber}`);
            if (res.data.success) setOrderProducts(res.data.items);
            else setOrderProducts([]);
        } catch { toast.error("Something went wrong"); setOrderProducts([]); }
        finally { dispatch(hideLoader()); }
    };

    const searchVendorsOrders = async () => {
        if (!fromDate && !toDate && !keyword) { toast.warning("Please provide at least one filter."); return; }
        if ((fromDate && !toDate) || (!fromDate && toDate)) { toast.warning("Please select both From and To dates."); return; }
        if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) { toast.warning("From date cannot be greater than To date."); return; }
        if (keyword && keyword.trim().length < 4) { toast.warning("Keyword must be at least 4 characters."); return; }
        try {
            setLoading(true); dispatch(showLoader());
            const res = await api.post("/vendor-order/search", { startDate: fromDate || undefined, endDate: toDate || undefined, keyword: keyword || undefined });
            if (res.data.success) { setFilteredData(res.data.orders || []); setIsSearching(true); }
            else toast.warning(res.data.message);
        } catch (err) { toast.error(err.response?.data?.message || "Search failed"); }
        finally { setLoading(false); dispatch(hideLoader()); }
    };

    const handleResetSearch = () => { setFilteredData([]); setIsSearching(false); setFromDate(""); setToDate(""); setKeyword(""); };

    const handleLoadMore = () => {
        if (!hasMore || loadingMore) return;
        const next = page + 1; setPage(next); fetchVendorOrders(next, true);
    };

    const handleRefresh = () => {
        Swal.fire({
            title: "Are you sure?", text: "The page will be refreshed.", icon: "warning",
            showCancelButton: true, confirmButtonColor: "#ea580c", cancelButtonColor: "#9ca3af",
            confirmButtonText: "Yes, refresh!",
        }).then(r => { if (r.isConfirmed) window.location.reload(); });
    };


    // Delete vendor order with order items
    const handleDeleteVendorOrder = async (order) => {
        const result = await Swal.fire({
            title: "Are you sure?", text: `Delete order (${order.orderNumber})?`, icon: "warning",
            showCancelButton: true, confirmButtonColor: "#dc2626", cancelButtonColor: "#6b7280",
        });
        if (!result.isConfirmed) return;
        try {
            dispatch(showLoader());
            const res = await api.delete(`/vendor-order/${order.orderNumber}`);
            if (res.data.success) {
                setAllData(prev => prev.filter(v => v.orderNumber !== order.orderNumber));
                setFilteredData(prev => prev.filter(v => v.orderNumber !== order.orderNumber));
                Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false });
            }
        } catch (error) {
            Swal.fire("Error", error.response?.data?.message || "Error", "error");
        } finally { dispatch(hideLoader()); }
    };


    // return single vendor order item
    const handleSingleReturnSubmit = async () => {
        const damaged = +singleReturnData.damagedQty || 0;
        const missing = +singleReturnData.missingQty || 0;
        if (damaged === 0 && missing === 0) { toast.error("Enter damaged or missing quantity"); return; }
        if (damaged + missing > singleReturnData.quantity) { toast.error("Return quantity exceeds ordered quantity"); return; }
        try {
            dispatch(showLoader());
            console.log(singleReturnData._id)
            const res = await api.put(`vendor-order/issues/${selectedOrder.orderNumber}`, {
                items: [{ itemId: singleReturnData._id, damageQty: damaged, missingQty: missing, remark: singleReturnData.remark || "" }]
            });
            if (res.data.success) {
                toast.success("Issues updated successfully");
                setReturnSingleModal(false); setSingleReturnData(null); setViewOrder(false);
            }
        } catch (err) { toast.error(err.response?.data?.message || "Something went wrong"); }
        finally { dispatch(hideLoader()); }
    };


    // return all vendor order item
    const handleAllReturnSubmit = async () => {
        if (!allReturnProducts.length) { toast.error("No products available for return"); return; }
        for (let p of allReturnProducts) {
            const total = (+p.damagedQty || 0) + (+p.missingQty || 0);
            if (total === 0) { toast.error(`Enter return qty for ${p.productName}`); return; }
            if (total > p.quantity) { toast.error(`Return qty exceeds ordered qty for ${p.productName}`); return; }
        }
        try {
            dispatch(showLoader());
            const res = await api.put(`vendor-order/issues/${selectedOrder.orderNumber}`, {
                items: allReturnProducts.map(p => ({ itemId: p._id, damageQty: +p.damagedQty || 0, missingQty: +p.missingQty || 0, remark: p.remark || "" }))
            });
            toast.success(res.data.message || "All product issues updated successfully");
            setReturnAllModal(false); setAllReturnProducts([]); setViewOrder(false);
        } catch (err) { toast.error(err.response?.data?.message || "Something went wrong"); }
        finally { dispatch(hideLoader()); }
    };


    // update order status
    const handleStatusUpdate = async () => {
        try {
            setStatusLoading(true); dispatch(showLoader());
            await api.put(`/vendor-order/${selectedOrder.orderNumber}/status`, { status: selectedStatus });
            toast.success("Order status updated successfully");
            setStatusModal(false);
        } catch (err) { toast.error(err.response?.data?.message || "Failed to update status"); }
        finally { setStatusLoading(false); dispatch(hideLoader()); }
    };


    // ── columns ──────────────────────────────────────────────────────────────
    const columns = useMemo(() => [
        {
            header: "Action", id: "actions",
            cell: ({ row }) => {
                const o = row.original;
                return (
                    <div className="flex items-center justify-center gap-0.5">
                        <button onClick={e => { e.stopPropagation(); setSelectedOrder(o); fetchVendorOrderDetails(o); setViewOrder(true); }}
                            className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-400 transition" title="View Details">
                            <FiInfo size={14} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setSelectedOrder(o); setSelectedStatus(o.status); setStatusModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500 transition" title="Update Status">
                            <FiRefreshCcw size={14} />
                        </button>
                    </div>
                );
            },
        },
        { header: "Date", accessorKey: "createdAt", cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString("en-IN") : "-" },
        { header: "Bill/Invoice No.", accessorKey: "billInvoiceNo" },
        { header: "Order No.", accessorKey: "orderNumber" },
        { header: "Name", accessorKey: "name" },
        { header: "Mobile", accessorKey: "mobile" },
        { header: "Email", accessorKey: "email" },
        { header: "Status", accessorKey: "status", cell: ({ getValue }) => <OrderStatusBadge value={getValue()} /> },
        { header: "Subtotal", accessorKey: "subTotal", cell: ({ getValue }) => `₹${getValue() ?? 0}` },
        { header: "GST Amt", accessorKey: "gstTotal", cell: ({ getValue }) => `₹${getValue() ?? 0}` },
        { header: "Total", accessorKey: "grandTotal", cell: ({ getValue }) => <span className="font-semibold text-gray-800">₹{getValue() ?? 0}</span> },
        {
            header: "Delete", id: "delete",
            cell: ({ row }) => {
                const o = row.original;
                return (
                    <div className="flex items-center justify-center gap-0.5">
                        <button onClick={e => { e.stopPropagation(); handleDeleteVendorOrder(o); }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 transition" title="Delete">
                            <FiTrash2 size={14} />
                        </button>
                    </div>
                );
            },
        },
    ], []);

    const table = useReactTable({
        data: isSearching ? filteredData : allData,
        columns, state: { globalFilter },
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

    if (loading) return (
        <div className="flex items-center justify-center h-48 text-gray-400 gap-3">
            <div className="w-5 h-5 border-2 border-orange-300 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading orders...</span>
        </div>
    );

    return (
        <div className="p-6 min-h-screen bg-gray-50">

            {/* ── Filter bar ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                    <button onClick={handleRefresh}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-xs font-semibold rounded-lg transition shadow-sm w-fit">
                        <FiRefreshCw size={13} /> Refresh
                    </button>
                    <div className="flex flex-col sm:flex-row gap-3 flex-1 lg:justify-end items-end">
                        <div className="flex gap-3">
                            <div className="flex flex-col">
                                <label className="text-xs font-medium text-gray-500 mb-1">From Date</label>
                                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                                    className="border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-300 transition w-32 sm:w-40 lg:w-44 text-gray-700"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-medium text-gray-500 mb-1">To Date</label>
                                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                                    className="border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-300 transition w-32 sm:w-40 lg:w-44 text-gray-700"
                                />
                            </div>
                        </div>
                        <OrderKeywordInput value={keyword} onChange={setKeyword} />
                        <button onClick={searchVendorsOrders}
                            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-xs font-semibold rounded-lg transition shadow-sm">
                            <FiSearch size={12} /> Search
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Table card ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                {/* Table top bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 px-5 py-4 border-b border-gray-100">
                    <div className="relative w-full sm:w-56">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={13} />
                        <input type="text" value={globalFilter ?? ""} onChange={e => setGlobalFilter(e.target.value)}
                            placeholder="Quick search..."
                            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition text-gray-600 placeholder:text-gray-300"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            {table.getHeaderGroups().map(hg => (
                                <tr key={hg.id} className="bg-gray-200 border-b border-gray-800 border-gray-100">
                                    {hg.headers.map(h => (
                                        <th key={h.id} className="px-4 py-3 text-center text-xs font-semibold text-gray-800 whitespace-nowrap uppercase tracking-wider">
                                            {flexRender(h.column.columnDef.header, h.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.length === 0 && (
                                <tr><td colSpan={columns.length} className="py-14 text-center text-gray-400 text-sm">No orders found</td></tr>
                            )}
                            {table.getRowModel().rows.map(row => (
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
                                : isSearching ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                                    : "bg-orange-500 hover:bg-orange-600 text-white"}`}
                    >
                        {loadingMore ? "Loading..." : isSearching ? "Reset Search" : "Load More"}
                    </button>
                    <div className="flex items-center gap-1">
                        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition">
                            <FiChevronLeft size={14} />
                        </button>
                        {startPage > 0 && (<><button onClick={() => table.setPageIndex(0)} className="w-8 h-8 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold">1</button><span className="text-gray-300 text-xs">…</span></>)}
                        {pages.map(p => (
                            <button key={p} onClick={() => table.setPageIndex(p)}
                                className={`w-8 h-8 text-xs rounded-lg font-semibold transition ${p === currentPage ? "bg-orange-500 text-white shadow-sm" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                                {p + 1}
                            </button>
                        ))}
                        {endPage < totalPages && (<><span className="text-gray-300 text-xs">…</span><button onClick={() => table.setPageIndex(totalPages - 1)} className="w-8 h-8 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold">{totalPages}</button></>)}
                        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition">
                            <FiChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── View Order Details Modal ── */}
            {viewOrder && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-6xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                            <div>
                                <h2 className="text-sm font-bold text-gray-800">Order Details</h2>
                                <p className="text-xs text-gray-400 mt-0.5">{selectedOrder.orderNumber} · {selectedOrder.name}</p>
                            </div>
                            <button onClick={() => { setSelectedOrder(null); setViewOrder(false); }}
                                className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition">
                                <FiX size={15} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">

                            {/* Order Info */}
                            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
                                <SectionTitle>Order Information</SectionTitle>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                                    <InfoRow label="Date" value={selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString("en-GB") : "-"} />
                                    <InfoRow label="Vendor Name" value={selectedOrder.name} />
                                    <InfoRow label="Mobile" value={selectedOrder.mobile} />
                                    <InfoRow label="Email" value={selectedOrder.email} />
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Status</p>
                                        <OrderStatusBadge value={selectedOrder.status} />
                                    </div>
                                    <InfoRow label="Subtotal" value={`₹ ${selectedOrder.subTotal}`} />
                                    <InfoRow label="GST Amount" value={`₹ ${selectedOrder.gstTotal}`} />
                                    <InfoRow label="Grand Total" value={<span className="text-emerald-600">₹ {selectedOrder.grandTotal}</span>} />
                                    {selectedOrder.notes && <div className="col-span-2 md:col-span-4"><InfoRow label="Notes" value={selectedOrder.notes} /></div>}
                                </div>
                            </div>

                            {/* Products Table */}
                            <div>
                                <SectionTitle>Products</SectionTitle>
                                <div className="overflow-x-auto rounded-2xl border border-gray-200">
                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-gray-200 border-b border-gray-800 border-gray-100">
                                                {["Return", "Code", "Category", "Product", "Qty", "Price", "Subtotal", "GST %", "GST Amt", "Total", "Expected"].map((h, i) => (
                                                    <th key={i} className="px-4 py-3 text-center text-xs font-semibold text-gray-800 whitespace-nowrap uppercase tracking-wider">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orderProducts.map((p, idx) => (
                                                <tr key={idx} className="border-b border-gray-50 hover:bg-orange-50 transition-colors whitespace-nowrap">
                                                    <td className="px-3 py-2.5">
                                                        <button
                                                            onClick={() => { setSingleReturnData({ ...p, damagedQty: "", missingQty: "", remark: "" }); setReturnSingleModal(true); }}
                                                            className="p-1.5 rounded-lg hover:bg-orange-100 text-orange-400 hover:text-orange-600 transition" title="Return">
                                                            <FiCornerUpLeft size={14} />
                                                        </button>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-gray-700">{p.productCode}</td>
                                                    <td className="px-3 py-2.5 text-gray-700">{p.category}</td>
                                                    <td className="px-3 py-2.5 font-medium text-gray-800">{p.productName}</td>
                                                    <td className="px-3 py-2.5 text-center text-gray-700">{p.quantity}</td>
                                                    <td className="px-3 py-2.5 text-center text-gray-700">₹{p.price}</td>
                                                    <td className="px-3 py-2.5 text-center text-gray-700">₹{p.subTotal}</td>
                                                    <td className="px-3 py-2.5 text-center text-gray-700">{p.gstPercent}%</td>
                                                    <td className="px-3 py-2.5 text-center text-gray-700">₹{p.gstAmount}</td>
                                                    <td className="px-3 py-2.5 text-center font-semibold text-emerald-600">₹{p.total}</td>
                                                    <td className="px-3 py-2.5 text-center text-gray-500">{p.expectedDate ? new Date(p.expectedDate).toLocaleDateString("en-IN") : "-"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                            <button
                                onClick={() => {
                                    setAllReturnProducts(orderProducts.map(p => ({ ...p, damagedQty: "", missingQty: "", remark: "" })));
                                    setReturnAllModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition shadow-sm">
                                <FiCornerUpLeft size={12} /> Return All
                            </button>
                            <button onClick={() => { setSelectedOrder(null); setViewOrder(false); }}
                                className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Single Return Modal ── */}
            {returnSingleModal && singleReturnData && (
                <Modal onClose={() => setReturnSingleModal(false)} maxWidth="max-w-2xl">
                    <ModalHeader title="Return Purchase Order" subtitle={`Order: ${selectedOrder?.orderNumber}`} onClose={() => setReturnSingleModal(false)} />
                    <div className="px-6 py-5 space-y-5">
                        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
                            <SectionTitle>Product Information</SectionTitle>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {[
                                    ["Order ID", selectedOrder?.orderNumber],
                                    ["Product Code", singleReturnData.productCode],
                                    ["Category", singleReturnData.category],
                                    ["Product Name", singleReturnData.productName],
                                    ["Ordered Qty", singleReturnData.quantity],
                                    ["Price / Unit", `₹${singleReturnData.price}`],
                                ].map(([lbl, val]) => (
                                    <div key={lbl}>
                                        <label className={labelCls}>{lbl}</label>
                                        <input value={val} readOnly className={readonlyCls} />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
                            <SectionTitle>Return Details</SectionTitle>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className={labelCls}>Damaged Quantity</label>
                                    <input type="number" min="0" placeholder="0"
                                        value={singleReturnData.damagedQty || ""}
                                        onChange={e => setSingleReturnData({ ...singleReturnData, damagedQty: e.target.value })}
                                        className={fieldCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Missing Quantity</label>
                                    <input type="number" min="0" placeholder="0"
                                        value={singleReturnData.missingQty || ""}
                                        onChange={e => setSingleReturnData({ ...singleReturnData, missingQty: e.target.value })}
                                        className={fieldCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Remark</label>
                                    <input type="text" placeholder="Optional..."
                                        value={singleReturnData.remark || ""}
                                        onChange={e => setSingleReturnData({ ...singleReturnData, remark: e.target.value })}
                                        className={fieldCls}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <ModalFooter>
                        <button onClick={() => setReturnSingleModal(false)}
                            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                            Cancel
                        </button>
                        <button onClick={handleSingleReturnSubmit}
                            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition shadow-sm">
                            <FiCornerUpLeft size={12} /> Submit Return
                        </button>
                    </ModalFooter>
                </Modal>
            )}

            {/* ── Return All Modal ── */}
            {returnAllModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                            <div>
                                <h2 className="text-sm font-bold text-gray-800">Return All Products</h2>
                                <p className="text-xs text-gray-400 mt-0.5">Order: {selectedOrder?.orderNumber} · {allReturnProducts.length} products</p>
                            </div>
                            <button onClick={() => setReturnAllModal(false)} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition"><FiX size={15} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {allReturnProducts.map((product, index) => (
                                <div key={index} className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="w-0.5 h-4 rounded-full bg-orange-400" />
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{product.productName}</p>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                                        {[
                                            ["Code", product.productCode, true],
                                            ["Category", product.category, true],
                                            ["Product", product.productName, true],
                                            ["Ordered Qty", product.quantity, true],
                                            ["Price/Unit", product.price, true],
                                        ].map(([lbl, val]) => (
                                            <div key={lbl}>
                                                <label className={labelCls}>{lbl}</label>
                                                <input value={val} readOnly className={readonlyCls} />
                                            </div>
                                        ))}
                                        <div>
                                            <label className={labelCls}>Damaged Qty</label>
                                            <input type="number" min="0" placeholder="0"
                                                value={product.damagedQty || ""}
                                                onChange={e => { const u = [...allReturnProducts]; u[index].damagedQty = e.target.value; setAllReturnProducts(u); }}
                                                className={fieldCls}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Missing Qty</label>
                                            <input type="number" min="0" placeholder="0"
                                                value={product.missingQty || ""}
                                                onChange={e => { const u = [...allReturnProducts]; u[index].missingQty = e.target.value; setAllReturnProducts(u); }}
                                                className={fieldCls}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Remark</label>
                                            <input type="text" placeholder="Optional..."
                                                value={product.remark || ""}
                                                onChange={e => { const u = [...allReturnProducts]; u[index].remark = e.target.value; setAllReturnProducts(u); }}
                                                className={fieldCls}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                            <button onClick={() => setReturnAllModal(false)}
                                className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                                Cancel
                            </button>
                            <button onClick={handleAllReturnSubmit}
                                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition shadow-sm">
                                <FiCornerUpLeft size={12} /> Submit All Returns
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Update Order Status Modal ── */}
            {statusModal && selectedOrder && (
                <Modal onClose={() => setStatusModal(false)} maxWidth="max-w-sm">
                    <ModalHeader title="Update Order Status" subtitle={selectedOrder.orderNumber} onClose={() => setStatusModal(false)} />
                    <div className="px-6 py-5 space-y-4">
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Current Status</p>
                            <OrderStatusBadge value={selectedOrder.status} />
                        </div>
                        <div>
                            <label className={labelCls}>Select New Status</label>
                            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className={fieldCls}>
                                {["PENDING", "RECEIVED", "RETURN", "COMPLETED", "CANCELLED"].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <p className={labelCls}>Preview</p>
                            <OrderStatusBadge value={selectedStatus} />
                        </div>
                    </div>
                    <ModalFooter>
                        <button onClick={() => setStatusModal(false)}
                            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                            Cancel
                        </button>
                        <button onClick={handleStatusUpdate} disabled={statusLoading}
                            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed">
                            {statusLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                            {statusLoading ? "Updating..." : "Update Status"}
                        </button>
                    </ModalFooter>
                </Modal>
            )}
        </div>
    );
}