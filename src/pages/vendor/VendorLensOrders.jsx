import { useEffect, useMemo, useState } from "react";
import {
    useReactTable, getCoreRowModel, getPaginationRowModel,
    getFilteredRowModel, flexRender,
} from "@tanstack/react-table";
import {
    FiRefreshCw, FiSearch, FiX, FiChevronLeft, FiChevronRight,
    FiPrinter, FiEye, FiTruck, FiFilter,
} from "react-icons/fi";
import api from "../../utils/api";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";

const PAGE_SIZE = 100;

const STATUS_OPTIONS = ["PENDING", "ORDERED", "RECEIVED", "READY", "CANCELLED", "COMPLETED"];

const STATUS_MAP = {
    PENDING:   "bg-gray-100 text-gray-600 border-gray-200",
    ORDERED:   "bg-blue-50 text-blue-600 border-blue-200",
    RECEIVED:  "bg-orange-50 text-orange-500 border-orange-200",
    READY:     "bg-emerald-50 text-emerald-600 border-emerald-200",
    CANCELLED: "bg-red-50 text-red-500 border-red-200",
    COMPLETED: "bg-teal-50 text-teal-600 border-teal-200",
};

const StatusBadge = ({ value }) => (
    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border whitespace-nowrap ${STATUS_MAP[value] || STATUS_MAP.PENDING}`}>
        {value || "PENDING"}
    </span>
);

const Modal = ({ onClose, children, maxWidth = "max-w-2xl" }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
        <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[88vh] flex flex-col`} onClick={e => e.stopPropagation()}>
            {children}
        </div>
    </div>
);

const ModalHeader = ({ title, subtitle, onClose }) => (
    <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
        <div>
            <h2 className="text-sm font-bold text-gray-800">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition">
            <FiX size={15} />
        </button>
    </div>
);

const InfoRow = ({ label, value }) => (
    <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-gray-800 break-words">{value || "-"}</p>
    </div>
);

const eyeRowsFromSchema = (eye) => {
    if (!eye) return [];
    const fields = ["sph", "cyl", "axis", "vis", "nv_sph", "nv_cyl", "nv_axis", "nv_vis", "add", "pd"];
    return fields
        .filter((f) => eye.rightEye?.[f] || eye.leftEye?.[f])
        .map((f) => ({ field: f, right: eye.rightEye?.[f] || "-", left: eye.leftEye?.[f] || "-" }));
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function VendorLensOrders() {
    const dispatch = useDispatch();

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [globalFilter, setGlobalFilter] = useState("");

    // Filters
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [jcNumber, setJcNumber] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [mobile, setMobile] = useState("");
    const [vendorName, setVendorName] = useState("");
    const [status, setStatus] = useState("");

    const [viewRx, setViewRx] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);

    const buildParams = () => {
        const params = {};
        if (fromDate) params.startDate = fromDate;
        if (toDate) params.endDate = toDate;
        if (jcNumber.trim()) params.jcNumber = jcNumber.trim();
        if (customerName.trim()) params.customerName = customerName.trim();
        if (mobile.trim()) params.mobile = mobile.trim();
        if (vendorName.trim()) params.vendorName = vendorName.trim();
        if (status) params.status = status;
        return params;
    };

    const fetchOrders = async () => {
        try {
            setLoading(true);
            dispatch(showLoader());
            const res = await api.get("/jc/vendor-lens-orders", { params: buildParams() });
            if (res.data.success) {
                setData(res.data.data || []);
            } else {
                toast.info(res.data.message || "No data found");
                setData([]);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to fetch vendor lens orders");
        } finally {
            setLoading(false);
            dispatch(hideLoader());
        }
    };

    useEffect(() => { fetchOrders(); }, []); // eslint-disable-line

    const handleSearch = () => {
        if (!fromDate && !toDate && !jcNumber && !customerName && !mobile && !vendorName && !status) {
            toast.warning("Provide at least one filter, or clear to view all");
        }
        fetchOrders();
    };

    const handleResetFilters = () => {
        setFromDate(""); setToDate(""); setJcNumber("");
        setCustomerName(""); setMobile(""); setVendorName(""); setStatus("");
        setTimeout(fetchOrders, 0);
    };

    const handleRefresh = () => fetchOrders();

    // ── Status update ──────────────────────────────────────────────────────
    const handleStatusChange = async (row, newStatus) => {
        setUpdatingId(row._id);
        try {
            const res = await api.put(`/jc/vendor-lens-orders/${row._id}/status`, { status: newStatus });
            if (res.data.success) {
                setData((prev) => prev.map((d) => (d._id === row._id ? { ...d, status: newStatus } : d)));
                toast.success("Status updated");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update status");
        } finally {
            setUpdatingId(null);
        }
    };

    // ── Print: current filtered list ───────────────────────────────────────
    const buildPrintHtml = (rows, title) => {
        const rowsHtml = rows.map((r, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${r.vendorName || "-"}</td>
                <td>${r.customerName || "-"}</td>
                <td>${r.mobile || "-"}</td>
                <td>${r.jcNumber || "-"}</td>
                <td>${r.orderDate ? new Date(r.orderDate).toLocaleDateString("en-IN") : "-"}</td>
                <td>${r.category || "-"}</td>
                <td>${r.productName || "-"}</td>
                <td>${r.quantity ?? "-"}</td>
                <td>${r.prescription?.powerRemark || "-"}</td>
                <td>${r.status || "PENDING"}</td>
            </tr>
        `).join("");

        return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif;}
body{padding:24px;color:#111;}
h1{font-size:16px;margin-bottom:4px;}
p.sub{font-size:11px;color:#666;margin-bottom:16px;}
table{width:100%;border-collapse:collapse;font-size:11px;}
th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;white-space:nowrap;}
th{background:#f3f4f6;font-weight:700;}
</style></head>
<body>
<h1>${title}</h1>
<p class="sub">Generated ${new Date().toLocaleString("en-IN")} · ${rows.length} orders</p>
<table>
<thead><tr>
<th>#</th><th>Vendor</th><th>Customer</th><th>Mobile</th><th>Order No</th><th>Order Date</th>
<th>Lens Type</th><th>Product</th><th>Qty</th><th>Power Remark</th><th>Status</th>
</tr></thead>
<tbody>${rowsHtml}</tbody>
</table>
<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},300)};</script>
</body></html>`;
    };

    const handlePrintFiltered = () => {
        if (!data.length) { toast.warning("No orders to print"); return; }
        const win = window.open("", "_blank", "width=1000,height=720");
        if (!win) { toast.error("Popup blocked — please allow popups"); return; }
        win.document.write(buildPrintHtml(data, "Vendor Lens Orders"));
        win.document.close();
    };

    // ── Vendor Lens Order Format (matches client reference layout) ──────────
    // Sr No | Sale No (JC + date + address) | Supplier | Customer | Product Name
    // with an embedded R/L prescription grid (DV + NV rows) per product
    const buildLensOrderFormatHtml = (rowsList) => {
        const productRowsHtml = rowsList.map((r, i) => {
            const eye = r.prescription?.eyewear || r.prescription?.contactLens || {};
            const right = eye.rightEye || {};
            const left = eye.leftEye || {};
            const addVal = right.add || left.add || "";

            return `
            <tr>
                <td class="sr">${i + 1}</td>
                <td class="saleno">
                    ${r.jcNumber || "-"}<br/>
                    ${r.orderDate ? new Date(r.orderDate).toLocaleDateString("en-GB").replace(/\//g, "-") : "-"}
                    <div class="dash">----------------</div>
                    ${r.address || ""}
                </td>
                <td class="supplier">${r.vendorName || "-"}</td>
                <td class="customer">${r.customerName || "-"}</td>
                <td class="product">
                    <div class="pname">1 ) ${r.productName || "-"} -</div>
                    <table class="rx">
                        <tr>
                            <th></th>
                            <th colspan="4">R</th>
                            <th colspan="5">L</th>
                        </tr>
                        <tr>
                            <th></th>
                            <th>Sph</th><th>Cyl</th><th>Axis</th><th>VA</th>
                            <th>Sph</th><th>Cyl</th><th>Axis</th><th>VA</th><th>ADD</th>
                        </tr>
                        <tr>
                            <td>DV</td>
                            <td>${right.sph || ""}</td><td>${right.cyl || ""}</td><td>${right.axis || ""}</td><td>${right.vis || ""}</td>
                            <td>${left.sph || ""}</td><td>${left.cyl || ""}</td><td>${left.axis || ""}</td><td>${left.vis || ""}</td>
                            <td>${addVal}</td>
                        </tr>
                        <tr>
                            <td>NV</td>
                            <td>${right.nv_sph || ""}</td><td>${right.nv_cyl || ""}</td><td>${right.nv_axis || ""}</td><td>${right.nv_vis || ""}</td>
                            <td>${left.nv_sph || ""}</td><td>${left.nv_cyl || ""}</td><td>${left.nv_axis || ""}</td><td>${left.nv_vis || ""}</td>
                            <td></td>
                        </tr>
                    </table>
                </td>
            </tr>`;
        }).join("");

        return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Vendor Lens Order Format</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Times New Roman',serif;}
body{padding:24px;color:#000;}
table.main{width:100%;border-collapse:collapse;font-size:12px;}
table.main > tbody > tr > td, table.main > thead > tr > th{border:1px solid #000;padding:8px;vertical-align:top;}
table.main thead th{font-weight:700;text-align:center;background:#fff;}
.sr{text-align:center;width:40px;}
.saleno{width:120px;}
.dash{margin:2px 0;}
.supplier{width:100px;}
.customer{width:110px;}
.pname{margin-bottom:6px;font-weight:600;}
table.rx{width:100%;border-collapse:collapse;font-size:11px;}
table.rx th, table.rx td{border:1px solid #000;padding:3px 6px;text-align:center;}
table.rx th{font-weight:700;}
</style></head>
<body>
<table class="main">
<thead><tr>
<th>Sr No</th><th>Sale No</th><th>Supplier</th><th>Customer</th><th>Product Name</th>
</tr></thead>
<tbody>${productRowsHtml}</tbody>
</table>
<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},300)};</script>
</body></html>`;
    };

    const handlePrintLensOrderFormat = () => {
        if (!data.length) { toast.warning("No orders to print"); return; }
        const win = window.open("", "_blank", "width=1000,height=720");
        if (!win) { toast.error("Popup blocked — please allow popups"); return; }
        win.document.write(buildLensOrderFormatHtml(data));
        win.document.close();
    };

    // Print all orders of a single vendor (uses vendorId of the clicked row)
    const handlePrintVendorAll = async (row) => {
        if (!row.vendorId) { toast.warning("Vendor ID not available for this row"); return; }
        try {
            dispatch(showLoader());
            const res = await api.get(`/jc/vendor-lens-orders/vendor/${row.vendorId}`);
            if (res.data.success) {
                const rows = (res.data.data || []).map((d) => ({
                    ...d,
                    prescription: { powerRemark: d.powerRemark },
                }));
                if (!rows.length) { toast.info("No orders found for this vendor"); return; }
                const win = window.open("", "_blank", "width=1000,height=720");
                if (!win) { toast.error("Popup blocked — please allow popups"); return; }
                win.document.write(buildPrintHtml(rows, `All Orders — ${row.vendorName || "Vendor"}`));
                win.document.close();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to fetch vendor orders");
        } finally {
            dispatch(hideLoader());
        }
    };

    // ── columns ──────────────────────────────────────────────────────────────
    const columns = useMemo(() => [
        {
            header: "Action", id: "actions",
            cell: ({ row }) => {
                const o = row.original;
                return (
                    <div className="flex items-center justify-center gap-0.5">
                        <button onClick={() => setViewRx(o)}
                            className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-400 transition" title="View Prescription">
                            <FiEye size={14} />
                        </button>
                        <button onClick={() => handlePrintVendorAll(o)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition" title="Print all orders of this vendor">
                            <FiTruck size={14} />
                        </button>
                    </div>
                );
            },
        },
        { header: "Order Date", accessorKey: "orderDate", cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString("en-IN") : "-" },
        { header: "Order No.", accessorKey: "jcNumber" },
        { header: "Vendor Name", accessorKey: "vendorName", cell: ({ getValue }) => getValue() || "-" },
        { header: "Customer Name", accessorKey: "customerName", cell: ({ getValue }) => getValue() || "-" },
        { header: "Mobile", accessorKey: "mobile" },
        { header: "Lens Type", accessorKey: "category", cell: ({ getValue }) => getValue() || "-" },
        { header: "Product Name", accessorKey: "productName", cell: ({ getValue }) => getValue() || "-" },
        { header: "Qty", accessorKey: "quantity" },
        {
            header: "Power Remark", id: "powerRemark",
            cell: ({ row }) => <span className="text-xs text-gray-500">{row.original.prescription?.powerRemark || "-"}</span>,
        },
        { header: "Delivery Date", accessorKey: "deliveryDate", cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString("en-IN") : "-" },
        {
            header: "Status", id: "status",
            cell: ({ row }) => {
                const o = row.original;
                return (
                    <div className="flex flex-col items-center gap-1">
                        <StatusBadge value={o.status} />
                        <select
                            value={o.status || "PENDING"}
                            disabled={updatingId === o._id}
                            onChange={(e) => handleStatusChange(o, e.target.value)}
                            className="text-[10px] border border-gray-200 rounded-md px-1.5 py-1 outline-none focus:border-orange-300 bg-white text-gray-600 disabled:opacity-50"
                        >
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                );
            },
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [updatingId]);

    const table = useReactTable({
        data, columns, state: { globalFilter },
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

    return (
        <div className="p-6 min-h-screen bg-gray-50">

            {/* ── Filter bar ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
                <div className="flex items-center gap-2 mb-4">
                    <FiFilter size={13} className="text-orange-400" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Filters</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 items-end">
                    <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-500 mb-1">From Date</label>
                        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                            className="border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 text-gray-700" />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-500 mb-1">To Date</label>
                        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                            className="border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 text-gray-700" />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-500 mb-1">JC No.</label>
                        <input type="text" value={jcNumber} onChange={e => setJcNumber(e.target.value)} placeholder="JC-102"
                            className="border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 text-gray-700 placeholder:text-gray-300" />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-500 mb-1">Customer Name</label>
                        <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Name"
                            className="border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 text-gray-700 placeholder:text-gray-300" />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-500 mb-1">Mobile</label>
                        <input type="text" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="10-digit"
                            className="border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 text-gray-700 placeholder:text-gray-300" />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-500 mb-1">Vendor Name</label>
                        <input type="text" value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="Vendor"
                            className="border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 text-gray-700 placeholder:text-gray-300" />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-xs font-medium text-gray-500 mb-1">Status</label>
                        <select value={status} onChange={e => setStatus(e.target.value)}
                            className="border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 text-gray-700">
                            <option value="">All</option>
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <button onClick={handleSearch}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-xs font-semibold rounded-lg transition shadow-sm">
                        <FiSearch size={12} /> Search
                    </button>
                    <button onClick={handleResetFilters}
                        className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 text-xs font-semibold rounded-lg transition">
                        <FiX size={12} /> Reset
                    </button>
                    <button onClick={handleRefresh}
                        className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 text-xs font-semibold rounded-lg transition">
                        <FiRefreshCw size={12} /> Refresh
                    </button>
                    <button onClick={handlePrintLensOrderFormat}
                        className="ml-auto flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-xs font-semibold rounded-lg transition shadow-sm">
                        <FiPrinter size={12} /> Vendor Order Format
                    </button>
                    <button onClick={handlePrintFiltered}
                        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 text-xs font-semibold rounded-lg transition shadow-sm">
                        <FiPrinter size={12} /> Print List ({data.length})
                    </button>
                </div>
            </div>

            {/* ── Table card ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 px-5 py-4 border-b border-gray-100">
                    <div className="relative w-full sm:w-56">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={13} />
                        <input type="text" value={globalFilter ?? ""} onChange={e => setGlobalFilter(e.target.value)}
                            placeholder="Quick search..."
                            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition text-gray-600 placeholder:text-gray-300" />
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-48 text-gray-400 gap-3">
                        <div className="w-5 h-5 border-2 border-orange-300 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Loading vendor lens orders...</span>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    {table.getHeaderGroups().map(hg => (
                                        <tr key={hg.id} className="bg-gray-200 border-b border-gray-100">
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
                                        <tr><td colSpan={columns.length} className="py-14 text-center text-gray-400 text-sm">No vendor lens orders found</td></tr>
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

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-gray-100">
                            <span className="text-xs text-gray-400">{data.length} total orders</span>
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
                    </>
                )}
            </div>

            {/* ── View Prescription Modal ── */}
            {viewRx && (
                <Modal onClose={() => setViewRx(null)} maxWidth="max-w-2xl">
                    <ModalHeader
                        title="Order & Prescription Details"
                        subtitle={`${viewRx.jcNumber} · ${viewRx.customerName || "-"}`}
                        onClose={() => setViewRx(null)}
                    />
                    <div className="px-6 py-5 space-y-5 overflow-y-auto">
                        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                                <InfoRow label="Vendor" value={viewRx.vendorName} />
                                <InfoRow label="Customer" value={viewRx.customerName} />
                                <InfoRow label="Mobile" value={viewRx.mobile} />
                                <InfoRow label="Lens Type" value={viewRx.category} />
                                <InfoRow label="Product" value={viewRx.productName} />
                                <InfoRow label="Qty" value={viewRx.quantity} />
                                <InfoRow label="Order Date" value={viewRx.orderDate ? new Date(viewRx.orderDate).toLocaleDateString("en-IN") : "-"} />
                                <InfoRow label="Delivery Date" value={viewRx.deliveryDate ? new Date(viewRx.deliveryDate).toLocaleDateString("en-IN") : "-"} />
                                <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Status</p><StatusBadge value={viewRx.status} /></div>
                            </div>
                        </div>

                        {viewRx.prescription?.powerRemark && (
                            <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
                                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1">Power Remark</p>
                                <p className="text-sm text-gray-700">{viewRx.prescription.powerRemark}</p>
                            </div>
                        )}

                        {["eyewear", "transpose", "contactLens"].map((key) => {
                            const rows = eyeRowsFromSchema(viewRx.prescription?.[key]);
                            if (!rows.length) return null;
                            return (
                                <div key={key}>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{key}</p>
                                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                                        <table className="w-full text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Field</th>
                                                    <th className="px-3 py-2 text-center font-semibold text-gray-600">Right Eye</th>
                                                    <th className="px-3 py-2 text-center font-semibold text-gray-600">Left Eye</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rows.map((r) => (
                                                    <tr key={r.field} className="border-t border-gray-50">
                                                        <td className="px-3 py-1.5 font-semibold text-gray-700 uppercase">{r.field}</td>
                                                        <td className="px-3 py-1.5 text-center text-gray-600">{r.right}</td>
                                                        <td className="px-3 py-1.5 text-center text-gray-600">{r.left}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}

                        {!viewRx.prescription && (
                            <p className="text-sm text-gray-400 text-center py-4">No prescription linked to this product</p>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
}