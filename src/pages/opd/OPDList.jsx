import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    useReactTable, getCoreRowModel, getPaginationRowModel,
    getFilteredRowModel, flexRender
} from "@tanstack/react-table";
import {
    FiSearch, FiChevronLeft, FiChevronRight, FiRefreshCw,
    FiDroplet, FiClock, FiX, FiEdit2, FiEye, FiPrinter, FiCheckCircle
} from "react-icons/fi";

import {FaWhatsapp} from "react-icons/fa"
import api from "../../utils/api";
import Swal from "sweetalert2";
import OPDReportView from "./OPDReportView";
import OPDPrintTemplate from "./Opdprinttemplate";
import StatusUpdateModal from "./modal/StatusUpdateModal";
import SendPrescriptionModal from "./modal/Sendprescriptionmodal";

// Letterhead shown at the top of the printed report. Hardcoded for now — move this
// into store Settings if it needs to differ per store or be editable by the client.
const CLINIC_DETAILS = {
    doctorName: "Beri Optical",
    title: "Optometrist & Eye Specialist",
    clinicName: "Beri Optical and Eyecare",
    addressLines: ["4a, Malhar Road, Sarabha Nagar, Ludhiana 141001"],
    phone: "+91 8847491061",
};
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";

const FETCH_LIMIT = 100;
const PAGE_SIZE = 100;
const DOSE_MAX_MINUTES = 45;

// ─────────────────────────────────────────────────────────────────────────────
// Dilation timing helpers
// data shape: dilation.doses = [{ dropName, eye, start, end }, ...] — grows as doses
// are recorded (up to 3), each dose has its OWN dropName/eye rather than one shared
// pair for the whole encounter. `end` is stored as start + 45min at record time.
// ─────────────────────────────────────────────────────────────────────────────

const minutesSince = (dateVal, now) => (now - new Date(dateVal).getTime()) / 60000;

// The dose window is split into 4 equal stops across the 45-minute cap.
// Past 45 minutes, there's no color — the window has closed.
const getDoseColor = (elapsedMin) => {
    if (elapsedMin === null || elapsedMin >= DOSE_MAX_MINUTES) return null;
    const quarter = DOSE_MAX_MINUTES / 4;
    if (elapsedMin < quarter) return "green";
    if (elapsedMin < quarter * 2) return "yellow";
    if (elapsedMin < quarter * 3) return "orange";
    return "red";
};

const ROW_COLOR_CLASSES = {
    green: "bg-green-50/70 border-l-4 border-l-green-400",
    yellow: "bg-yellow-50/70 border-l-4 border-l-yellow-400",
    orange: "bg-orange-50/70 border-l-4 border-l-orange-400",
    red: "bg-red-50/70 border-l-4 border-l-red-400",
};

const DOT_COLOR_CLASSES = {
    green: "bg-green-400",
    yellow: "bg-yellow-400",
    orange: "bg-orange-400",
    red: "bg-red-400",
};

const EYE_LABELS = { right: "OD", left: "OS", both: "OU" };

// Given a report's dilation data, figure out where it stands right now.
// `end` is only ever set by the doctor clicking "End Dose" — it's never auto-computed.
// While a dose has no end, it's "open": elapsed ticks live and colors by the 45-min
// quartile scale (past 45 min = no color, but still open — the End button stays available
// so it can be closed late). Once ended, the dose shows its final fixed duration, no color,
// and the next dose unlocks.
const getDilationStatus = (dilation, now) => {
    const doses = dilation?.doses || [];
    if (doses.length === 0) {
        return { stage: "notStarted", elapsedMin: null, color: null, doseCount: 0, lastDose: null, isOpen: false, overdue: false };
    }

    const lastDose = doses[doses.length - 1];
    const isOpen = !lastDose.end;
    const elapsedMin = isOpen
        ? minutesSince(lastDose.start, now)
        : (new Date(lastDose.end).getTime() - new Date(lastDose.start).getTime()) / 60000;
    const color = isOpen ? getDoseColor(elapsedMin) : null;
    const overdue = isOpen && elapsedMin >= DOSE_MAX_MINUTES;

    return {
        stage: doses.length === 3 && !isOpen ? "complete" : "inProgress",
        elapsedMin, color, doseCount: doses.length, lastDose, isOpen, overdue,
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI primitives
// ─────────────────────────────────────────────────────────────────────────────
export const Modal = ({ onClose, children, maxWidth = "max-w-md" }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
        <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} animate-fadeIn`} onClick={(e) => e.stopPropagation()}>
            {children}
        </div>
        <style>{`
            @keyframes fadeIn { from { opacity:0; transform:scale(.97) translateY(6px); } to { opacity:1; transform:scale(1) translateY(0); } }
            .animate-fadeIn { animation: fadeIn .18s ease both; }
        `}</style>
    </div>
);

export const ModalHeader = ({ title, subtitle, onClose, icon }) => (
    <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
            {icon && <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">{icon}</div>}
            <div>
                <h2 className="text-sm font-bold text-gray-800">{title}</h2>
                {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition"><FiX size={15} /></button>
    </div>
);

export const ModalFooter = ({ children }) => (
    <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">{children}</div>
);

const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-50 hover:border-gray-300 bg-white text-gray-700 transition-all placeholder:text-gray-300";
const labelCls = "text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5";

const DROP_SUGGESTIONS = [
    "Tropicamide", "Cyclopentolate",
    "Homatropine", "Atropine", "Phenylephrine",
    "CTC", "HAT",
];

const EYE_OPTIONS = [
    { value: "right", label: "Right (OD)" },
    { value: "left", label: "Left (OS)" },
    { value: "both", label: "Both (OU)" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Record Dose modal — used for all 3 doses; each dose gets its own drop name + eye.
// Pre-fills from the previous dose as a convenience default (usually the same drop),
// but it's fully editable in case a different drop or eye is used for this dose.
// ─────────────────────────────────────────────────────────────────────────────
function RecordDoseModal({ report, doseIndex, onClose, onSaved }) {
    const existingDoses = report.dilation?.doses || [];
    const lastDose = existingDoses[existingDoses.length - 1];
    const [dropName, setDropName] = useState(lastDose?.dropName || "");
    const [eye, setEye] = useState(lastDose?.eye || null);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!dropName || !eye) { toast.warning("Select a drop name and eye first."); return; }
        const start = new Date();
        const doses = [...existingDoses, { dropName, eye, start: start.toISOString(), end: null }];

        try {
            setSaving(true);
            const res = await api.put(`/opd/${report.opdNumber}`, { dilation: { doses } });
            if (res.data.success) {
                toast.success(`Dose ${doseIndex + 1} recorded`);
                onSaved(res.data.report);
                onClose();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to record dose");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal onClose={onClose}>
            <ModalHeader title={`Record Dose ${doseIndex + 1}`} subtitle={report.patient?.name || report.opdNumber} onClose={onClose}
                icon={<FiDroplet size={15} className="text-orange-500" />} />
            <div className="px-6 py-5 space-y-4">
                <div>
                    <label className={labelCls}>Drop Name</label>
                    <input
                        list="dilation-drop-suggestions"
                        value={dropName}
                        onChange={(e) => setDropName(e.target.value)}
                        placeholder="e.g. Tropicamide + Phenylephrine"
                        className={inputCls}
                    />
                    <datalist id="dilation-drop-suggestions">
                        {DROP_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
                    </datalist>
                </div>
                <div>
                    <label className={labelCls}>Eye</label>
                    <div className="flex gap-2 flex-wrap">
                        {EYE_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => setEye(opt.value)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition
                                    ${eye === opt.value ? "bg-orange-50 text-orange-600 border-orange-300" : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <ModalFooter>
                <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed">
                    {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {saving ? "Saving..." : `Record Dose ${doseIndex + 1}`}
                </button>
            </ModalFooter>
        </Modal>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dilation cell — per-row status, End Dose button, Add Dose button
// ─────────────────────────────────────────────────────────────────────────────
function DilationCell({ report, now, onOpenDoseModal, onEndDose }) {
    const status = getDilationStatus(report.dilation, now);

    if (status.stage === "notStarted") {
        return (
            <button
                type="button"
                onClick={() => onOpenDoseModal(report, 0)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100 transition mx-auto"
            >
                <FiDroplet size={12} /> Start Dilation
            </button>
        );
    }

    const nextIndex = status.doseCount < 3 && !status.isOpen ? status.doseCount : null;

    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                {status.color && <span className={`w-2 h-2 rounded-full ${DOT_COLOR_CLASSES[status.color]}`} />}
                <FiClock size={12} className="text-gray-400" />
                {status.elapsedMin !== null ? `${Math.floor(status.elapsedMin)} min` : "-"}
                <span className="text-gray-300">· Dose {status.doseCount}/3</span>
                {status.overdue && <span className="text-red-400 font-bold">· overdue</span>}
            </div>
            <p className="text-[10px] text-gray-400 truncate max-w-[160px]">
                {status.lastDose?.dropName} · {EYE_LABELS[status.lastDose?.eye] || ""}
            </p>

            {status.isOpen ? (
                <button
                    type="button"
                    onClick={() => onEndDose(report)}
                    className="px-3 py-1 rounded-lg text-[10px] font-semibold border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 transition"
                >
                    End Dose {status.doseCount}
                </button>
            ) : nextIndex !== null ? (
                <button
                    type="button"
                    onClick={() => onOpenDoseModal(report, nextIndex)}
                    className="px-3 py-1 rounded-lg text-[10px] font-semibold border border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100 transition"
                >
                    Record Dose {nextIndex + 1}
                </button>
            ) : (
                <span className="text-[10px] font-semibold text-gray-400">All doses given</span>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard strip — active dilation count + per-patient live time
// ─────────────────────────────────────────────────────────────────────────────
function DilationDashboard({ reports, now }) {
    const active = reports
        .map((r) => ({ report: r, status: getDilationStatus(r.dilation, now) }))
        .filter(({ status }) => status.isOpen);

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <div className="flex items-center gap-2 mb-4">
                <FiDroplet size={14} className="text-orange-500" />
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                    Active Dilations — {active.length} patient{active.length === 1 ? "" : "s"}
                </span>
            </div>

            {active.length === 0 ? (
                <p className="text-xs text-gray-300">No patients currently dilating</p>
            ) : (
                <div className="flex gap-3 flex-wrap">
                    {active.map(({ report, status }) => (
                        <div key={report._id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${status.color ? DOT_COLOR_CLASSES[status.color] : "bg-gray-300"}`} />
                            <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{report.patient?.name || report.opdNumber}</span>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                                {status.lastDose?.dropName ? `${status.lastDose.dropName} · ` : ""}{Math.floor(status.elapsedMin)} min
                                {status.overdue && <span className="text-red-400 font-semibold"> · overdue</span>}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main OPDList
// ─────────────────────────────────────────────────────────────────────────────
export default function OPDList({ onSelectReport }) {
    const navigate = useNavigate();

    // Goes to the /opd/edit/:id route, passing the row data via navigation state
    // so EditOPDReportPage can skip its fetch (falls back to fetching by id if
    // state isn't there, e.g. on a hard refresh or direct link).
    const goToEdit = (report) => {
        onSelectReport?.(report);
        navigate(`/opd/edit/${report._id}`, { state: { report } });
    };

    const userAllowedPages = useSelector((state) => state?.auth?.user?.pages);


    const [viewingReport, setViewingReport] = useState(null);
    const [printingReport, setPrintingReport] = useState(null);
    const [allData, setAllData] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [filteredData, setFilteredData] = useState([]);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [keyword, setKeyword] = useState("");
    const [globalFilter, setGlobalFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const [statusModalReport, setStatusModalReport] = useState(null);
    const [sendPrescriptionReport, setSendPrescriptionReport] = useState(null);

    const [doseModal, setDoseModal] = useState(null); // { report, doseIndex } | null
    const [now, setNow] = useState(Date.now());
    const dispatch = useDispatch();

    // Live tick every 30s so elapsed times / colors / the dashboard stay current
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(id);
    }, []);

    const fetchReports = async (pageNumber = 1, append = false) => {
        try {
            dispatch(showLoader());
            pageNumber === 1 ? setLoading(true) : setLoadingMore(true);
            const res = await api.get("/opd", { params: { page: pageNumber, limit: FETCH_LIMIT } });
            if (res.data.success) {
                setAllData((prev) => append ? [...prev, ...(res.data.reports || [])] : (res.data.reports || []));
                setHasMore(res.data.hasMore);
            }
        } catch (err) { console.error("Failed to fetch OPD reports", err); }
        finally { setLoading(false); setLoadingMore(false); dispatch(hideLoader()); }
    };

    useEffect(() => { fetchReports(1, false); }, []);

    const searchReports = async () => {
        if (!fromDate && !toDate && !keyword) { toast.warning("Please provide at least one filter."); return; }
        if ((fromDate && !toDate) || (!fromDate && toDate)) { toast.warning("Please select both From and To dates."); return; }
        if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) { toast.warning("From date cannot be greater than To date."); return; }
        try {
            setLoading(true); setPage(1); dispatch(showLoader());
            const res = await api.post("/opd/search", {
                startDate: fromDate || undefined,
                endDate: toDate || undefined,
                keyword: keyword || undefined,
            });
            if (res.data.success) { setFilteredData(res.data.reportsData || []); setIsSearching(true); }
            else toast.warning(res.data.message);
        } catch (err) { console.error("Search error:", err); }
        finally { setLoading(false); dispatch(hideLoader()); }
    };

    const handleResetSearch = () => { setFilteredData([]); setIsSearching(false); };
    const handleLoadMore = () => { if (!hasMore || loadingMore) return; const next = page + 1; setPage(next); fetchReports(next, true); };

    const handleRefresh = () => {
        Swal.fire({ title: "Are you sure?", text: "The page will be refreshed.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ea580c", cancelButtonColor: "#9ca3af", confirmButtonText: "Yes, refresh!" })
            .then((r) => { if (r.isConfirmed) window.location.reload(); });
    };

    const patchReportInState = (updated) => {
        const apply = (list) => list.map((r) => (r.opdNumber === updated.opdNumber ? updated : r));
        setAllData(apply);
        if (isSearching) setFilteredData(apply);
    };

    // Doctor explicitly closes the current dose — this is what unlocks the next dose,
    // not any elapsed-time timer
    const handleEndDose = async (report) => {
        const doses = [...(report.dilation?.doses || [])];
        if (doses.length === 0) return;
        const lastIndex = doses.length - 1;

        const confirm = await Swal.fire({
            title: "End this dose?",
            text: `Mark dose ${lastIndex + 1} as ended for ${report.patient?.name || report.opdNumber}.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#ea580c",
            cancelButtonColor: "#9ca3af",
            confirmButtonText: "Yes, end it",
        });
        if (!confirm.isConfirmed) return;

        doses[lastIndex] = { ...doses[lastIndex], end: new Date().toISOString() };
        try {
            const res = await api.put(`/opd/${report.opdNumber}`, { dilation: { doses } });
            if (res.data.success) {
                toast.success(`Dose ${lastIndex + 1} ended`);
                patchReportInState(res.data.report);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to end dose");
        }
    };


    const data = isSearching ? filteredData : allData;

    const columns = useMemo(() => [
        {
            header: "OPD #", accessorKey: "opdNumber",
            cell: ({ row }) => <span className="font-semibold text-gray-700">{row.original.opdNumber}</span>,
        },
        {
            header: "Patient",
            cell: ({ row }) => {
                const p = row.original.patient;
                return (
                    <>
                        <p className="text-sm font-semibold text-gray-800">{p?.name || "-"}</p>
                        <p className="text-xs text-gray-400">{p?.mobile || ""}</p>
                    </>
                );
            },
        },
        {
            header: "Status", accessorKey: "status",
            cell: ({ row }) => (
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide
                    ${row.original.status === "completed" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                    {row.original.status || "draft"}
                </span>
            ),
        },
        {
            header: "Date",
            cell: ({ row }) => (
                <span className="text-xs text-gray-500">
                    {row.original.opdDate
                        ? new Date(row.original.opdDate).toLocaleDateString("en-IN")
                        : row.original.createdAt
                            ? new Date(row.original.createdAt).toLocaleDateString("en-IN")
                            : "-"}
                </span>
            ),
        },
        {
            header: "Dilation",
            cell: ({ row }) => (
                <DilationCell
                    report={row.original}
                    now={now}
                    onOpenDoseModal={(report, doseIndex) => setDoseModal({ report, doseIndex })}
                    onEndDose={handleEndDose}
                />
            ),
        },
        {
            header: "Actions",
            cell: ({ row }) => {
                const isCompleted = row.original.status === "completed";

                return (
                    <div className="flex items-center justify-center gap-2">
                        {userAllowedPages?.includes("EDIT OPD") && (
                            <button
                                type="button"
                                onClick={() => goToEdit(row.original)}
                                title="Edit OPD report"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 hover:border-gray-300 transition"
                            >
                                <FiEdit2 size={12} />
                                Edit
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setViewingReport(row.original)}
                            title="View OPD report"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 transition"
                        >
                            <FiEye size={12} />
                            View
                        </button>

                        <button
                            type="button"
                            onClick={() => setPrintingReport(row.original)}
                            title="Print on clinic letterhead"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 hover:border-gray-300 transition"
                        >
                            <FiPrinter size={12} />
                            Print
                        </button>

                        <button
                            type="button"
                            onClick={() => setSendPrescriptionReport(row.original)}
                            title="Send prescription on WhatsApp"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-green-200 text-green-600 bg-green-50 hover:bg-green-100 transition"
                        >
                            <FaWhatsapp size={12} />
                            Send
                        </button>

                        {/* Reserve space but hide completed button */}
                        <div className="w-8 h-8 flex-shrink-0">
                            {!isCompleted && (
                                <button
                                    type="button"
                                    onClick={() => setStatusModalReport(row.original)}
                                    title="Mark report as completed"
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-green-200 text-green-600 bg-green-50 hover:bg-green-100 transition"
                                >
                                    <FiCheckCircle size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                );
            },
        },
    ], [now, isSearching]);

    const table = useReactTable({
        data, columns,
        state: { globalFilter },
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        initialState: { pagination: { pageSize: PAGE_SIZE } },
    });

    const currentPage = table.getState().pagination.pageIndex;
    const totalPages = table.getPageCount();
    const startPage = Math.max(0, currentPage - 2);
    const endPage = Math.min(totalPages - 1, currentPage + 2);
    const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-6">

                {/* Dashboard */}
                <DilationDashboard reports={data} now={now} />

                {/* Filters */}
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
                                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                                        className="border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-300 transition w-32 sm:w-40 lg:w-44 text-gray-700" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs font-medium text-gray-500 mb-1">To Date</label>
                                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                                        className="border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-300 transition w-32 sm:w-40 lg:w-44 text-gray-700" />
                                </div>
                            </div>
                            <div className="relative w-full sm:w-56">
                                <label className="text-xs font-medium text-gray-500 mb-1 block">Keyword</label>
                                <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
                                    placeholder="Name, mobile, OPD #..."
                                    className="w-full border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition text-gray-600 placeholder:text-gray-300" />
                            </div>
                            <button onClick={searchReports}
                                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-xs font-semibold rounded-lg transition shadow-sm">
                                <FiSearch size={12} /> Search
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table card */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 px-5 py-3 border-b border-gray-100">
                        <div className="relative w-full sm:w-56">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={13} />
                            <input type="text" value={globalFilter ?? ""} onChange={(e) => setGlobalFilter(e.target.value)} placeholder="Quick search..."
                                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition text-gray-600 placeholder:text-gray-300" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                {table.getHeaderGroups().map((hg) => (
                                    <tr key={hg.id} className="bg-gray-200 border-b border-gray-100">
                                        {hg.headers.map((h) => (
                                            <th key={h.id} className="px-4 py-3 text-center text-xs font-semibold text-gray-800 whitespace-nowrap uppercase tracking-wider">
                                                {flexRender(h.column.columnDef.header, h.getContext())}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={columns.length} className="py-14 text-center text-gray-400 text-sm">Loading...</td></tr>
                                ) : table.getRowModel().rows.length === 0 ? (
                                    <tr><td colSpan={columns.length} className="py-14 text-center text-gray-400 text-sm">No OPD reports found</td></tr>
                                ) : (
                                    table.getRowModel().rows.map((row) => {
                                        const status = getDilationStatus(row.original.dilation, now);
                                        const rowColorCls = status.color ? ROW_COLOR_CLASSES[status.color] : "";
                                        return (
                                            <tr key={row.id} className={`border-b border-gray-50 text-center hover:bg-orange-50/60 transition-colors ${rowColorCls}`}>
                                                {row.getVisibleCells().map((cell) => (
                                                    <td key={cell.id} className="px-4 py-2.5 text-gray-700 text-sm">
                                                        {flexRender(cell.column.columnDef.cell ?? cell.column.columnDef.accessorKey, cell.getContext())}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-gray-100">
                        <button onClick={isSearching ? handleResetSearch : handleLoadMore}
                            disabled={loadingMore || (!isSearching && !hasMore)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition
                                ${loadingMore || (!isSearching && !hasMore) ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : isSearching ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                                        : "bg-orange-500 hover:bg-orange-600 text-white"}`}>
                            {loadingMore ? "Loading..." : isSearching ? "Reset Search" : "Load More"}
                        </button>
                        <div className="flex items-center gap-1">
                            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition">
                                <FiChevronLeft size={14} />
                            </button>
                            {startPage > 0 && (
                                <>
                                    <button onClick={() => table.setPageIndex(0)} className="w-8 h-8 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold">1</button>
                                    <span className="text-gray-300 text-xs">…</span>
                                </>
                            )}
                            {pages.map((p) => (
                                <button key={p} onClick={() => table.setPageIndex(p)}
                                    className={`w-8 h-8 text-xs rounded-lg font-semibold transition ${p === currentPage ? "bg-orange-500 text-white shadow-sm" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                                    {p + 1}
                                </button>
                            ))}
                            {endPage < totalPages && (
                                <>
                                    <span className="text-gray-300 text-xs">…</span>
                                    <button onClick={() => table.setPageIndex(totalPages - 1)} className="w-8 h-8 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold">{totalPages}</button>
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

            {doseModal && (
                <RecordDoseModal
                    report={doseModal.report}
                    doseIndex={doseModal.doseIndex}
                    onClose={() => setDoseModal(null)}
                    onSaved={patchReportInState}
                />
            )}

            {viewingReport && (
                <Modal onClose={() => setViewingReport(null)} maxWidth="max-w-3xl">
                    <ModalHeader
                        title="OPD Report"
                        subtitle={viewingReport.patient?.name ? `${viewingReport.patient.name} · ${viewingReport.opdNumber}` : viewingReport.opdNumber}
                        onClose={() => setViewingReport(null)}
                        icon={<FiEye size={15} className="text-orange-500" />}
                    />
                    <div className="max-h-[75vh] overflow-y-auto px-6 py-5 sm:px-8">
                        <OPDReportView report={viewingReport} embedded />
                    </div>
                    <ModalFooter>
                        <button onClick={() => setViewingReport(null)} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                            Close
                        </button>
                        <button
                            onClick={() => { setPrintingReport(viewingReport); setViewingReport(null); }}
                            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition"
                        >
                            <FiPrinter size={13} /> Print
                        </button>
                    </ModalFooter>
                </Modal>
            )}

            {printingReport && (
                <Modal onClose={() => setPrintingReport(null)} maxWidth="max-w-5xl">
                    <ModalHeader
                        title="Print Report"
                        subtitle={printingReport.patient?.name ? `${printingReport.patient.name} · ${printingReport.opdNumber}` : printingReport.opdNumber}
                        onClose={() => setPrintingReport(null)}
                        icon={<FiPrinter size={15} className="text-orange-500" />}
                    />
                    <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
                        <OPDPrintTemplate
                            report={printingReport}
                            clinic={CLINIC_DETAILS}
                            onBack={() => setPrintingReport(null)}
                        />
                    </div>
                </Modal>
            )}


            {sendPrescriptionReport && (
                <SendPrescriptionModal
                    report={sendPrescriptionReport}
                    onClose={() => setSendPrescriptionReport(null)}
                />
            )}


            {statusModalReport && (
                <StatusUpdateModal
                    report={statusModalReport}
                    onClose={() => setStatusModalReport(null)}
                    onUpdated={patchReportInState}
                />
            )}

        </div>
    );
}