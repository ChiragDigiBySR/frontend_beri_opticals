import { useEffect, useMemo, useRef, useState } from "react";
import {
    useReactTable, getCoreRowModel, getPaginationRowModel,
    getFilteredRowModel, flexRender,
} from "@tanstack/react-table";
import {
    FiTrash2, FiRefreshCw, FiSearch, FiX,
    FiChevronLeft, FiChevronRight, FiDollarSign,
} from "react-icons/fi";
import api from "../../utils/api";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";

const FETCH_LIMIT = 100;
const PAGE_SIZE = 100;

// ─────────────────────────────────────────────────────────────────────────────
// Keyword input with expense suggestion dropdown
// ─────────────────────────────────────────────────────────────────────────────
function ExpenseKeywordInput({ value, onChange }) {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef(null);
    const containerRef = useRef(null);


    const handleChange = (e) => {
        onChange(e.target.value);
        clearTimeout(debounceRef.current);
    };

    const handleSelect = (s) => {
        const q = value.trim().toLowerCase();
        const catMatch = s.category ? s.category.toLowerCase().includes(q) : false;
        const noteMatch = s.notes ? s.notes.toLowerCase().includes(q) : false;
        const txMatch = s.transactionType ? s.transactionType.toLowerCase().includes(q) : false;

        let filled = s.category || "";
        if (noteMatch && !catMatch && !txMatch) filled = s.notes;
        else if (txMatch && !catMatch && !noteMatch) filled = s.transactionType;
        else filled = s.category || "";

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
                    placeholder="Category or notes..."
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
                                        <FiDollarSign size={11} className="text-orange-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{s.category || "-"}</p>
                                        <p className="text-xs text-gray-400 truncate">
                                            {s.transactionType || ""}
                                            {s.totalAmount ? ` · ₹${s.totalAmount}` : ""}
                                        </p>
                                    </div>
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
export default function ExpenseList() {
    const [allData, setAllData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [keyword, setKeyword] = useState("");
    const [loadingMore, setLoadingMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [globalFilter, setGlobalFilter] = useState("");

    const dispatch = useDispatch();
    const permissions = useSelector((state) => state.auth.user.permissions);

    // ── fetch ────────────────────────────────────────────────────────────────
    const fetchExpenses = async (pageNumber = 1, append = false) => {
        try {
            pageNumber === 1 ? setLoading(true) : setLoadingMore(true);
            dispatch(showLoader());
            const res = await api.get("/expense", { params: { page: pageNumber, limit: FETCH_LIMIT } });
            if (res.data.success) {
                setAllData(prev => append ? [...prev, ...(res.data.expenses || [])] : (res.data.expenses || []));
                setHasMore(res.data.hasMore);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); setLoadingMore(false); dispatch(hideLoader()); }
    };

    useEffect(() => { fetchExpenses(1, false); }, []);

    const searchExpenses = async () => {
        if (!fromDate && !toDate && !keyword) { toast.warning("Provide at least one filter."); return; }
        if ((fromDate && !toDate) || (!fromDate && toDate)) { toast.warning("Select both From and To dates."); return; }
        if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) { toast.warning("From date cannot be greater than To date."); return; }
        if (keyword && keyword.trim().length < 3) { toast.warning("Keyword must be at least 3 characters."); return; }
        try {
            dispatch(showLoader());
            const res = await api.post("/expense/search", {
                startDate: fromDate || undefined, endDate: toDate || undefined, keyword: keyword || undefined,
            });
            if (res.data.success) { setFilteredData(res.data.expenses || []); setIsSearching(true); }
        } catch (err) { toast.error(err.response?.data?.message || "Search failed"); }
        finally { dispatch(hideLoader()); }
    };

    const handleReset = () => { setFromDate(""); setToDate(""); setKeyword(""); setFilteredData([]); setIsSearching(false); };

    const handleRefresh = async () => {
        const result = await Swal.fire({
            title: "Refresh expenses?", text: "Filters will be cleared.", icon: "question",
            showCancelButton: true, confirmButtonColor: "#ea580c", cancelButtonColor: "#9ca3af",
        });
        if (result.isConfirmed) handleReset();
    };

    const handleLoadMore = () => {
        if (!hasMore || loadingMore || isSearching) return;
        const next = page + 1; setPage(next); fetchExpenses(next, true);
    };

    const handleDelete = async (expense) => {
        const result = await Swal.fire({
            title: "Delete expense?", icon: "warning",
            showCancelButton: true, confirmButtonColor: "#dc2626", cancelButtonColor: "#6b7280",
        });
        if (!result.isConfirmed) return;
        try {
            const res = await api.delete(`/expense/${expense._id}`);
            if (res.data.success) {
                setAllData(prev => prev.filter(e => e._id !== expense._id));
                setFilteredData(prev => prev.filter(e => e._id !== expense._id));
                toast.success("Expense deleted");
            }
        } catch { toast.error("Delete failed"); }
    };

    // ── columns ──────────────────────────────────────────────────────────────
    const columns = useMemo(() => [
        {
            header: "Date", accessorKey: "expenseDate",
            cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString("en-IN") : "-",
        },
        {
            header: "Category",
            accessorKey: "category",
            cell: ({ getValue, row }) => {
                const category = getValue();
                const otherCategory = row.original.otherCategory;

                const displayValue =
                    category === "OTHER" && otherCategory
                        ? `${category} (${otherCategory})`
                        : category;

                return (
                    <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full border bg-orange-50 text-orange-500 border-orange-200 whitespace-nowrap">
                        {displayValue || "-"}
                    </span>
                );
            },
        },
        { header: "Amount", accessorKey: "amount", cell: ({ getValue }) => `₹${getValue()}` },
        { header: "GST %", accessorKey: "gst", cell: ({ getValue }) => `${getValue() || 0}%` },
        { header: "GST Amt", accessorKey: "gstAmt", cell: ({ getValue }) => `₹${getValue() || 0}` },
        {
            header: "Total", accessorKey: "totalAmount",
            cell: ({ getValue }) => <span className="font-semibold text-emerald-600">₹{getValue()}</span>,
        },
        {
            header: "Txn Type", accessorKey: "transactionType",
            cell: ({ getValue }) => {
                const val = getValue();
                const map = {
                    CASH: "bg-emerald-50 text-emerald-600 border-emerald-200",
                    CARD: "bg-blue-50 text-blue-600 border-blue-200",
                    UPI: "bg-purple-50 text-purple-600 border-purple-200",
                    CHEQUE: "bg-yellow-50 text-yellow-600 border-yellow-200",
                };
                return (
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border whitespace-nowrap ${map[val] || "bg-gray-100 text-gray-500 border-gray-200"}`}>
                        {val || "-"}
                    </span>
                );
            },
        },
        {
            header: "Notes", accessorKey: "notes",
            cell: ({ getValue }) => <span className="text-gray-500 text-xs">{getValue() || "-"}</span>,
        },
        {
            header: "Expense By", accessorKey: "expenseByName",
            cell: ({ getValue }) => <span className="text-gray-500 text-xs">{getValue() || "-"}</span>,
        },

        ...(permissions.includes("DELETE EXPENSES") ? [{
            header: "Delete", id: "delete",
            cell: ({ row }) => (
                <div className="flex justify-center">
                    <button onClick={() => handleDelete(row.original)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 transition" title="Delete">
                        <FiTrash2 size={14} />
                    </button>
                </div>
            ),
        }] : []),
    ], [permissions]);

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
            <span className="text-sm">Loading expenses...</span>
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

                        <ExpenseKeywordInput value={keyword} onChange={setKeyword} />

                        <button onClick={searchExpenses}
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
                                <tr>
                                    <td colSpan={columns.length} className="py-14 text-center text-gray-400 text-sm">
                                        No expenses found
                                    </td>
                                </tr>
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
                        onClick={isSearching ? handleReset : handleLoadMore}
                        disabled={loadingMore || (!isSearching && !hasMore)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition
                            ${loadingMore || (!isSearching && !hasMore)
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : isSearching
                                    ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                                    : "bg-orange-500 hover:bg-orange-600 text-white"}`}
                    >
                        {loadingMore ? "Loading..." : isSearching ? "Reset Search" : "Load More"}
                    </button>

                    <div className="flex items-center gap-1">
                        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition">
                            <FiChevronLeft size={14} />
                        </button>

                        {startPage > 0 && (
                            <>
                                <button onClick={() => table.setPageIndex(0)}
                                    className="w-8 h-8 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold">
                                    1
                                </button>
                                <span className="text-gray-300 text-xs">…</span>
                            </>
                        )}

                        {pages.map(p => (
                            <button key={p} onClick={() => table.setPageIndex(p)}
                                className={`w-8 h-8 text-xs rounded-lg font-semibold transition
                                    ${p === currentPage
                                        ? "bg-orange-500 text-white shadow-sm"
                                        : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                                {p + 1}
                            </button>
                        ))}

                        {endPage < totalPages && (
                            <>
                                <span className="text-gray-300 text-xs">…</span>
                                <button onClick={() => table.setPageIndex(totalPages - 1)}
                                    className="w-8 h-8 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold">
                                    {totalPages}
                                </button>
                            </>
                        )}

                        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition">
                            <FiChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}