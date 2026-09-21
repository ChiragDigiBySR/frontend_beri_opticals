import { useEffect, useMemo, useState } from "react";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getFilteredRowModel, flexRender } from "@tanstack/react-table";
import { FiTrash2, FiRefreshCw, FiSearch, FiCamera, FiEye, FiX, FiUpload, FiImage } from "react-icons/fi";
import { HiOutlineClipboardList, HiOutlineUserGroup } from "react-icons/hi";
import api from "../../utils/api";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import { useRef } from "react";

const FETCH_LIMIT = 100;
const PAGE_SIZE = 50;

const ALL_STATUSES = ["pending", "in_progress", "completed", "cancelled"];

const STATUS_COLORS = {
    pending: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    in_progress: "bg-blue-100 text-blue-700 border border-blue-200",
    completed: "bg-green-100 text-green-700 border border-green-200",
    cancelled: "bg-red-100 text-red-700 border border-red-200",
};

const TYPE_COLORS = {
    daily: "bg-purple-100 text-purple-700",
    "one time": "bg-gray-100 text-gray-600",
    weekly: "bg-indigo-100 text-indigo-700",
    monthly: "bg-orange-100 text-orange-700",
};

const Badge = ({ value, colorMap }) => (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${colorMap[value] || "bg-gray-100 text-gray-500"}`}>
        {value?.replace("_", " ") || "-"}
    </span>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Task Detail Modal
// ─────────────────────────────────────────────────────────────────────────────

function TaskDetailModal({ task, onClose, onStatusUpdate, isAdmin }) {
    const [status, setStatus] = useState(task?.status || "pending");
    const [updating, setUpdating] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    if (!task) return null;

    // reduce image size
    const normalizeToJpeg = (file) =>
        new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const MAX = 1024;
                let w = img.naturalWidth;
                let h = img.naturalHeight;
                if (w > MAX || h > MAX) {
                    if (w > h) { h = Math.round((h / w) * MAX); w = MAX; }
                    else { w = Math.round((w / h) * MAX); h = MAX; }
                }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext("2d").drawImage(img, 0, 0, w, h);
                URL.revokeObjectURL(url);
                canvas.toBlob(
                    (blob) => {
                        resolve(new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" }));
                    },
                    "image/jpeg",
                    0.6
                );
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
            img.src = url;
        });

    const applyImage = async (file, normalize = false) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Please select a valid image file.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be under 5MB.");
            return;
        }
        const processed = normalize ? await normalizeToJpeg(file) : file;
        setImageFile(processed);
        setImagePreview(URL.createObjectURL(processed));
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (cameraInputRef.current) cameraInputRef.current.value = "";
    };

    const handleStatusUpdate = async () => {
        if (status === task.status && !imageFile) {
            toast.info("No changes to save.");
            return;
        }
        try {
            setUpdating(true);
            const formData = new FormData();
            formData.append("status", status);
            if (imageFile) formData.append("image", imageFile);
            const res = await api.patch(`/tasks/${task._id}/status`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            if (res.data.success) {
                toast.success("Status updated successfully.");
                onStatusUpdate(task._id, status);
                onClose();
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to update status.");
        } finally {
            setUpdating(false);
        }
    };

    const DetailRow = ({ label, value }) => (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</span>
            <span className="text-sm text-gray-700 font-medium">{value || <span className="text-gray-300">—</span>}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
            onClick={(e) => e.target === e.currentTarget && onClose()}>

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                style={{ animation: "modalIn 0.22s ease" }}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"
                    style={{ background: "linear-gradient(135deg,#fff8f5,#fff)" }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
                            <HiOutlineClipboardList size={18} className="text-orange-500" />
                        </div>
                        <h3 className="font-bold text-gray-800 text-sm">Task Details</h3>
                    </div>
                    <button onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition text-gray-500">
                        <FiX size={15} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">

                    {/* Task description */}
                    <div className="bg-gray-50 rounded-xl px-4 py-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block mb-1">Task</span>
                        <p className="text-sm text-gray-700 leading-relaxed">{task.task}</p>
                    </div>

                    {/* Grid details */}
                    <div className="grid grid-cols-2 gap-4">
                        <DetailRow label="Task Type" value={<Badge value={task.taskType} colorMap={TYPE_COLORS} />} />
                        <DetailRow label="Current Status" value={<Badge value={task.status} colorMap={STATUS_COLORS} />} />
                        <DetailRow label="Schedule Date"
                            value={task.scheduleDate ? new Date(task.scheduleDate).toLocaleDateString("en-IN") : null} />
                        <DetailRow label="Assigned To" value={task.assignedTo?.name || task.assignedTo || null} />
                        {task.weekDay && <DetailRow label="Week Day" value={task.weekDay} />}
                        {task.monthDay && <DetailRow label="Month Day" value={task.monthDay} />}
                        <DetailRow label="Assigned By" value={task.assignedBy?.name || task.assignedBy || null} />
                        <DetailRow label="Created At"
                            value={task.createdAt ? new Date(task.createdAt).toLocaleDateString("en-IN") : null} />
                    </div>


                    {/* Existing Images */}
                    {task.images && task.images.length > 0 && (
                        <div className="border-t border-gray-100 pt-4">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block mb-2">
                                Attached Images
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {task.images.map((url, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => window.open(url, "_blank")}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-500 text-gray-500 text-xs font-medium transition">
                                        <FiImage size={12} />
                                        Image {i + 1}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}


                    {/* Image Upload */}
                    <div className="border-t border-gray-100 pt-4">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block mb-2">
                            Attach Image <span className="text-gray-300 normal-case font-normal">(optional)</span>
                        </span>

                        {!imagePreview ? (
                            /* Upload / Camera buttons */
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-200 rounded-xl py-4 flex flex-col items-center gap-1.5 text-gray-400 hover:border-orange-300 hover:text-orange-400 transition-colors bg-gray-50 hover:bg-orange-50">
                                    <FiUpload size={18} />
                                    <span className="text-xs font-medium">Upload Photo</span>
                                    <span className="text-[10px] text-gray-300">PNG, JPG, WEBP · 5MB</span>
                                </button>
                                <button type="button" onClick={() => cameraInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-200 rounded-xl py-4 flex flex-col items-center gap-1.5 text-gray-400 hover:border-orange-300 hover:text-orange-400 transition-colors bg-gray-50 hover:bg-orange-50">
                                    <FiCamera size={18} />
                                    <span className="text-xs font-medium">Take Photo</span>
                                    <span className="text-[10px] text-gray-300">Auto-compressed</span>
                                </button>
                            </div>
                        ) : (
                            /* Preview card */
                            <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                                <div className="relative">
                                    <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                                    <button type="button" onClick={handleRemoveImage}
                                        className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white shadow-md flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 transition">
                                        <FiX size={14} />
                                    </button>
                                </div>
                                <div className="px-3 py-2 flex items-center gap-2">
                                    <FiImage size={12} className="text-gray-400 shrink-0" />
                                    <span className="text-[11px] text-gray-500 truncate">{imageFile?.name}</span>
                                    <span className="text-[10px] text-gray-300 shrink-0 ml-auto">
                                        {(imageFile?.size / 1024).toFixed(0)} KB
                                    </span>
                                </div>
                                {/* Re-capture / Re-upload buttons shown when image is present */}
                                <div className="px-3 pb-3 flex gap-2">
                                    <button type="button" onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-orange-500 hover:border-orange-300 text-xs font-medium transition">
                                        <FiUpload size={12} /> Replace
                                    </button>
                                    <button type="button" onClick={() => cameraInputRef.current?.click()}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-orange-500 hover:border-orange-300 text-xs font-medium transition">
                                        <FiCamera size={12} /> Retake
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Hidden file inputs */}
                        <input ref={fileInputRef} type="file" accept="image/*"
                            onChange={(e) => applyImage(e.target.files[0], false)} className="hidden" />
                        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
                            onChange={(e) => applyImage(e.target.files[0], true)} className="hidden" />
                    </div>

                    {/* Status Update */}
                    <div className="border-t border-gray-100 pt-4">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 block mb-2">
                            Update Status
                        </span>
                        <div className="flex items-center gap-3">
                            <select value={status} onChange={e => setStatus(e.target.value)}
                                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-300 appearance-none"
                                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%23999'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: "32px" }}>
                                {ALL_STATUSES.map(s => (
                                    <option key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
                                ))}
                            </select>
                            <button onClick={handleStatusUpdate} disabled={updating}
                                className="px-5 py-2 rounded-xl text-white text-sm font-semibold transition disabled:opacity-50 shrink-0"
                                style={{ background: "linear-gradient(135deg,#F26522,#e05510)" }}>
                                {updating ? "Saving…" : "Update"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.95) translateY(8px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Reusable Table Block
// ─────────────────────────────────────────────────────────────────────────────
function TaskTable({ title, icon: Icon, data, columns }) {
    const [globalFilter, setGlobalFilter] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [filteredData, setFilteredData] = useState([]);

    const tableData = isSearching ? filteredData : data;

    const table = useReactTable({
        data: tableData,
        columns,
        state: { globalFilter },
        onGlobalFilterChange: setGlobalFilter,
        initialState: { pagination: { pageSize: PAGE_SIZE } },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const currentPage = table.getState().pagination.pageIndex;
    const totalPages = table.getPageCount();
    const MAX_PAGES = 5;
    let startPage = Math.max(0, currentPage - Math.floor(MAX_PAGES / 2));
    let endPage = Math.min(totalPages, startPage + MAX_PAGES);
    if (endPage - startPage < MAX_PAGES) startPage = Math.max(0, endPage - MAX_PAGES);
    const pages = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-gray-100"
                style={{ background: "linear-gradient(135deg,#fff8f5 0%,#fff 100%)" }}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
                        <Icon size={18} className="text-orange-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
                        <p className="text-xs text-gray-400">{tableData.length} record{tableData.length !== 1 ? "s" : ""}</p>
                    </div>
                </div>
                <div className="relative">
                    <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={globalFilter} onChange={e => setGlobalFilter(e.target.value)}
                        placeholder="Quick search…"
                        className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 w-44" />
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        {table.getHeaderGroups().map(hg => (
                            <tr key={hg.id} className="bg-gray-50 border-b border-gray-100">
                                {hg.headers.map(h => (
                                    <th key={h.id}
                                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">
                                        {flexRender(h.column.columnDef.header, h.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="text-center py-16 text-gray-400 text-sm">
                                    <HiOutlineClipboardList size={36} className="mx-auto mb-2 opacity-30" />
                                    No tasks found.
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row, i) => (
                                <tr key={row.id}
                                    className={`hover:bg-orange-50/40 transition ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                                            {flexRender(cell.column.columnDef.cell ?? cell.column.columnDef.accessorKey, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-t border-gray-100 bg-gray-50/50">
                <span className="text-xs text-gray-400">
                    Page {currentPage + 1} of {totalPages || 1} &nbsp;·&nbsp; {tableData.length} total
                </span>
                <div className="flex items-center gap-1">
                    <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
                        className="px-3 py-1 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition">
                        Prev
                    </button>
                    {startPage > 0 && (
                        <>
                            <button onClick={() => table.setPageIndex(0)}
                                className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-white">1</button>
                            <span className="text-gray-300 text-xs px-1">…</span>
                        </>
                    )}
                    {pages.map(p => (
                        <button key={p} onClick={() => table.setPageIndex(p)}
                            className={`px-3 py-1 text-xs rounded-lg border transition ${p === currentPage ? "bg-orange-500 text-white border-transparent" : "border-gray-200 hover:bg-white"}`}>
                            {p + 1}
                        </button>
                    ))}
                    {endPage < totalPages && (
                        <>
                            <span className="text-gray-300 text-xs px-1">…</span>
                            <button onClick={() => table.setPageIndex(totalPages - 1)}
                                className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-white">{totalPages}</button>
                        </>
                    )}
                    <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
                        className="px-3 py-1 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-white transition">
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function TaskList() {
    const dispatch = useDispatch();
    const user = useSelector(state => state.auth.user);
    const permissions = useSelector(state => state.auth.user.permissions);
    const isAdmin = user?.role === "ADMIN";

    const [allTasks, setAllTasks] = useState([]);
    const [myTasks, setMyTasks] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);

    // Modal state
    const [selectedTask, setSelectedTask] = useState(null);

    // ── Status update callback — updates both tables in-place ─────────────────
    const handleStatusUpdate = (taskId, newStatus) => {
        const updater = prev =>
            prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t);
        setAllTasks(updater);
        setMyTasks(updater);
    };


    // fetch tasks
    const fetchTasks = async (pageNumber = 1, append = false) => {
        try {
            if (pageNumber === 1) setLoadingMore(true);
            dispatch(showLoader());

            const res = await api.get("/tasks", {
                params: { page: pageNumber, limit: FETCH_LIMIT },
            });

            if (res.data.success) {
                const tasks = res.data.data || [];

                if (isAdmin) {
                    setAllTasks(prev => append ? [...prev, ...tasks] : tasks);
                    setMyTasks(prev => [
                        ...prev,
                        ...tasks.filter(t =>
                            String(t.assignedTo?._id ?? t.assignedTo) === String(user.id)
                        )
                    ]);
                } else {
                    setMyTasks(prev => append ? [...prev, ...tasks] : tasks);
                }

                const { page: pg, totalPages } = res.data.pagination || {};
                setHasMore(pg < totalPages);
            }
        } catch (err) {
            toast.error("Failed to fetch tasks.");
            console.error(err);
        } finally {
            setLoadingMore(false);
            dispatch(hideLoader());
        }
    };

    // handle page refresh
    const handleRefresh = async () => {
        const result = await Swal.fire({
            title: "Refresh tasks?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#F26522",
            cancelButtonColor: "#6b7280",
        });
        if (!result.isConfirmed) return;
        setPage(1);
        fetchTasks(1, false);
    };


    // handle task delete by _id
    const handleDelete = async (task) => {
        const result = await Swal.fire({
            title: "Delete this task?",
            text: task.task?.slice(0, 80),
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#dc2626",
            cancelButtonColor: "#6b7280",
        });
        if (!result.isConfirmed) return;

        try {
            const res = await api.delete(`/tasks/${task._id}`);
            if (res.data.success) {
                setAllTasks(prev => prev.filter(t => t._id !== task._id));
                setMyTasks(prev => prev.filter(t => t._id !== task._id));
                toast.success("Task deleted.");
            }
        } catch {
            toast.error("Delete failed.");
        }
    };

    useEffect(() => { fetchTasks(1, false); }, []);

    // ── Action buttons cell (shared by both tables) ───────────────────────────
    // View button — always visible
    // Delete button — admin only, only in allTasksColumns
    const viewActionCol = useMemo(() => ({
        header: "Actions",
        id: "actions",
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                {/* View Details */}
                <button
                    onClick={() => setSelectedTask(row.original)}
                    title="View Details"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500 transition">
                    <FiEye size={13} />
                </button>
            </div>
        ),
    }), []);

    const adminActionCol = useMemo(() => ({
        header: "Actions",
        id: "actions",
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                {/* View Details */}
                <button
                    onClick={() => setSelectedTask(row.original)}
                    title="View Details"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-500 transition">
                    <FiEye size={13} />
                </button>

                {/* Delete — admin only */}
                <button
                    onClick={() => handleDelete(row.original)}
                    title="Delete Task"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition">
                    <FiTrash2 size={13} />
                </button>
            </div>
        ),
    }), [permissions]);

    // ── Base columns (my tasks table — no delete) ─────────────────────────────
    const baseColumns = useMemo(() => [
        {
            header: "#",
            id: "index",
            cell: ({ row }) => (
                <span className="text-gray-400 font-mono text-xs">{row.index + 1}</span>
            ),
        },
        {
            header: "Task",
            accessorKey: "task",
            cell: ({ getValue }) => (
                <span className="max-w-xs truncate block" title={getValue()}>{getValue() || "-"}</span>
            ),
        },
        {
            header: "Type",
            accessorKey: "taskType",
            cell: ({ getValue }) => <Badge value={getValue()} colorMap={TYPE_COLORS} />,
        },
        {
            header: "Schedule Date",
            accessorKey: "scheduleDate",
            cell: ({ getValue }) =>
                getValue() ? new Date(getValue()).toLocaleDateString("en-IN") : "-",
        },
        {
            header: "Week Day",
            accessorKey: "weekDay",
            cell: ({ getValue }) => getValue() || <span className="text-gray-300 text-xs">—</span>,
        },
        {
            header: "Month Day",
            accessorKey: "monthDay",
            cell: ({ getValue }) => getValue() || <span className="text-gray-300 text-xs">—</span>,
        },
        {
            header: "Status",
            accessorKey: "status",
            cell: ({ getValue }) => <Badge value={getValue()} colorMap={STATUS_COLORS} />,
        },
        viewActionCol, // view only — no delete for employee / my-tasks
    ], [viewActionCol]);

    // ── All tasks columns (admin table — includes Assigned To + delete) ────────
    const allTasksColumns = useMemo(() => {
        const assignedCol = {
            header: "Assigned To",
            id: "assignedTo",
            cell: ({ row }) => {
                const u = row.original.assignedTo;
                return u ? (
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs">{u.name}</span>
                    </div>
                ) : "-";
            },
        };
        const cols = [...baseColumns];
        // Replace viewActionCol with adminActionCol (has delete too)
        cols[cols.length - 1] = adminActionCol;
        cols.splice(3, 0, assignedCol); // insert Assigned To after Type
        return cols;
    }, [baseColumns, adminActionCol]);

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen p-6 space-y-6" style={{ background: "#f4f6fb", fontFamily: "'Segoe UI', sans-serif" }}>

            {/* Task Detail Modal */}
            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onStatusUpdate={handleStatusUpdate}
                    isAdmin={isAdmin}
                />
            )}

            {/* Page Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <button onClick={handleRefresh}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-90 transition"
                    style={{ background: "linear-gradient(135deg,#F26522,#e05510)" }}>
                    <FiRefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* Admin: All Tasks */}
            {isAdmin && (
                <TaskTable
                    title="All Tasks"
                    icon={HiOutlineUserGroup}
                    data={allTasks}
                    columns={allTasksColumns}
                />
            )}

            {/* My Tasks */}
            <TaskTable
                title={isAdmin ? "My Tasks" : "My Assigned Tasks"}
                icon={HiOutlineClipboardList}
                data={myTasks}
                columns={baseColumns}
            />

            {/* Load More */}
            {hasMore && (
                <div className="flex justify-center pb-4">
                    <button onClick={() => { const next = page + 1; setPage(next); fetchTasks(next, true); }}
                        disabled={loadingMore}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-orange-200 text-orange-600 text-sm font-semibold bg-white hover:bg-orange-50 transition shadow-sm disabled:opacity-50">
                        {loadingMore
                            ? <><span className="animate-spin">↻</span> Loading…</>
                            : <> Load More</>}
                    </button>
                </div>
            )}
        </div>
    );
}