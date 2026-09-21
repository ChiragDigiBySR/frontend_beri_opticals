import { useEffect, useMemo, useRef, useState } from "react";
import {
    useReactTable, getCoreRowModel, getPaginationRowModel,
    getFilteredRowModel, flexRender,
} from "@tanstack/react-table";
import {
    FiInfo, FiSearch, FiRefreshCw, FiX, FiUser, FiPhone, FiClock,
    FiChevronLeft, FiChevronRight, FiAlertTriangle,
} from "react-icons/fi";
import api from "../../utils/api";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";

const FETCH_LIMIT = 100;
const PAGE_SIZE = 100;
const LONG_WAIT_MINUTES = 45;
const TICK_MS = 30000; // refresh live timers every 30s

// Statuses grouped for a friendlier dropdown — values are stored exactly as listed.
const STATUS_GROUPS = [
    {
        label: "Front Desk",
        options: ["Appointment Scheduled", "Walk-in Registered", "Checked In", "Waiting"],
    },
    {
        label: "Clinical",
        options: [
            "Pre-testing", "Optometrist Consultation", "Doctor Consultation", "Diagnostic Testing",
            "Dilation (Live Timer)", "Binocular Vision Assessment",
        ],
    },
    {
        label: "Specialty Clinics",
        options: [
            "Vision Therapy", "Neuro Vision Rehabilitation", "Low Vision Rehabilitation", "Myopia Management",
            "Dry Eye Clinic", "Pediatric Optometry", "Specialty Contact Lens", "Scleral Lens Fitting",
            "Orthokeratology (Ortho-K)",
        ],
    },
    {
        label: "Dispensing & Billing",
        options: ["Optical Dispensing", "Pharmacy", "Counselling", "Billing"],
    },
    {
        label: "Follow-up & Referral",
        options: [
            "Follow-up Scheduled", "Review Visit", "Home Therapy Issued",
            "Referred Internally", "Referred Externally", "Procedure Completed",
        ],
    },
    {
        label: "Closure / Admin",
        options: ["Checked Out", "No Show", "Cancelled", "Rescheduled", "Emergency", "On Hold"],
    },
];

const ALL_STATUSES = STATUS_GROUPS.flatMap(g => g.options);
const TERMINAL_STATUSES = ["Checked Out", "No Show", "Cancelled"];

const STATUS_COLORS = {
    "Appointment Scheduled": "bg-blue-50 text-blue-600",
    "Walk-in Registered": "bg-indigo-50 text-indigo-600",
    "Checked In": "bg-cyan-50 text-cyan-600",
    "Waiting": "bg-amber-50 text-amber-600",
    "Checked Out": "bg-green-50 text-green-600",
    "No Show": "bg-gray-100 text-gray-500",
    "Cancelled": "bg-red-50 text-red-500",
    "Rescheduled": "bg-purple-50 text-purple-600",
    "Emergency": "bg-red-100 text-red-600",
    "On Hold": "bg-yellow-50 text-yellow-600",
};
const defaultStatusColor = "bg-orange-50 text-orange-600";

// Clinic hours + slot length for the reschedule calendar — keep in sync with the booking form.
const SLOT_START_HOUR = 9;
const SLOT_END_HOUR = 20;
const SLOT_MINUTES = 15;

const generateDaySlots = () => {
    const slots = [];
    for (let h = SLOT_START_HOUR; h < SLOT_END_HOUR; h++) {
        for (let m = 0; m < 60; m += SLOT_MINUTES) {
            slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
        }
    }
    return slots;
};

const DAY_SLOTS = generateDaySlots();

const formatSlotLabel = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDuration = (mins) => {
    if (mins == null) return "-";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export default function AppointmentList() {
    const [allData, setAllData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [keyword, setKeyword] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [globalFilter, setGlobalFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [todayOnly, setTodayOnly] = useState(true);
    const [now, setNow] = useState(Date.now());
    const [viewAppointment, setViewAppointment] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);

    const [rescheduleAppointment, setRescheduleAppointment] = useState(null);
    const [rescheduleDate, setRescheduleDate] = useState("");
    const [rescheduleTime, setRescheduleTime] = useState("");
    const [rescheduleSelectedSlot, setRescheduleSelectedSlot] = useState(""); // "HH:mm" for grid highlighting
    const [rescheduleBookedSlots, setRescheduleBookedSlots] = useState([]);
    const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
    const [rescheduleDateError, setRescheduleDateError] = useState("");

    const dispatch = useDispatch();

    // live timer tick
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), TICK_MS);
        return () => clearInterval(id);
    }, []);

    const fetchAppointments = async (pageNumber = 1, append = false) => {
        try {
            dispatch(showLoader());
            pageNumber === 1 ? setLoading(true) : setLoadingMore(true);
            const res = await api.get("/appointments", {
                params: { page: pageNumber, limit: FETCH_LIMIT, today: todayOnly ? "true" : undefined },
            });
            if (res.data.success) {
                setAllData(prev => append ? [...prev, ...(res.data.appointments || [])] : (res.data.appointments || []));
                setHasMore(res.data.hasMore);
            }
        } catch (err) { console.error("Failed to fetch appointments", err); }
        finally { setLoading(false); setLoadingMore(false); dispatch(hideLoader()); }
    };

    useEffect(() => { fetchAppointments(1, false); }, [todayOnly]);

    const searchAppointments = async () => {
        if (!fromDate && !toDate && !keyword && !statusFilter) { toast.warning("Please provide at least one filter."); return; }
        if ((fromDate && !toDate) || (!fromDate && toDate)) { toast.warning("Please select both From and To dates."); return; }
        try {
            setLoading(true); setPage(1); dispatch(showLoader());
            const res = await api.post("/appointments/search", {
                startDate: fromDate || undefined,
                endDate: toDate || undefined,
                keyword: keyword || undefined,
                status: statusFilter || undefined,
            });
            if (res.data.success) { setFilteredData(res.data.appointmentsData || []); setIsSearching(true); }
            else toast.warning(res.data.message);
        } catch (err) { console.error("Search error:", err); }
        finally { setLoading(false); dispatch(hideLoader()); }
    };

    const handleResetSearch = () => { setFilteredData([]); setIsSearching(false); };
    const handleLoadMore = () => { if (!hasMore || loadingMore) return; const next = page + 1; setPage(next); fetchAppointments(next, true); };
    const handleRefresh = () => fetchAppointments(1, false);

    // waiting minutes: live if not terminal, frozen (waitingMinutes) if terminal
    const getWaitMinutes = (apt) => {
        if (!apt.checkInAt) return null;
        if (TERMINAL_STATUSES.includes(apt.status)) return apt.waitingMinutes;
        return Math.floor((now - new Date(apt.checkInAt).getTime()) / 60000);
    };

    // const handleStatusChange = async (apt, newStatus) => {
    //     try {
    //         setUpdatingId(apt._id);
    //         const res = await api.put(`/appointments/${apt.appointmentNumber}/status`, { status: newStatus });
    //         if (res.data.success) {
    //             setAllData(prev => prev.map(a => a._id === apt._id ? res.data.appointment : a));
    //             if (isSearching) setFilteredData(prev => prev.map(a => a._id === apt._id ? res.data.appointment : a));
    //             toast.success("Status updated");
    //         }
    //     } catch (err) {
    //         toast.error(err.response?.data?.message || "Failed to update status");
    //     } finally { setUpdatingId(null); }
    // };


    const handleStatusChange = async (apt, newStatus) => {

        if (newStatus === "Rescheduled") {
            setRescheduleAppointment(apt);
            setRescheduleDateError("");

            if (apt.scheduledAt) {
                const date = new Date(apt.scheduledAt);

                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");

                const hours = String(date.getHours()).padStart(2, "0");
                const minutes = String(date.getMinutes()).padStart(2, "0");

                setRescheduleDate(`${year}-${month}-${day}`);
                setRescheduleTime(`${hours}:${minutes}`);
                setRescheduleSelectedSlot(`${hours}:${minutes}`);
            } else {
                setRescheduleDate("");
                setRescheduleTime("");
                setRescheduleSelectedSlot("");
            }

            return;
        }

        try {
            setUpdatingId(apt._id);

            const res = await api.put(
                `/appointments/${apt.appointmentNumber}/status`,
                {
                    status: newStatus
                }
            );

            if (res.data.success) {
                setAllData(prev =>
                    prev.map(a =>
                        a._id === apt._id
                            ? res.data.appointment
                            : a
                    )
                );

                if (isSearching) {
                    setFilteredData(prev =>
                        prev.map(a =>
                            a._id === apt._id
                                ? res.data.appointment
                                : a
                        )
                    );
                }

                toast.success("Status updated");
            }

        } catch (err) {
            toast.error(
                err.response?.data?.message ||
                "Failed to update status"
            );
        } finally {
            setUpdatingId(null);
        }
    };


    const rescheduleSlotsDebounceRef = useRef(null);

    // Load the doctor's booked times for the chosen date, excluding this appointment's own
    // current slot (so re-picking the same time it already has doesn't show as "booked").
    useEffect(() => {
        clearTimeout(rescheduleSlotsDebounceRef.current);

        const doctorId = rescheduleAppointment?.assignedDoctor;
        if (!rescheduleAppointment || !rescheduleDate || !doctorId) {
            setRescheduleBookedSlots([]);
            return;
        }

        let cancelled = false;
        rescheduleSlotsDebounceRef.current = setTimeout(async () => {
            try {
                setRescheduleSlotsLoading(true);
                const res = await api.get("/appointments/slots", {
                    params: {
                        date: rescheduleDate,
                        doctorId,
                        excludeAppointmentId: rescheduleAppointment._id,
                    },
                });
                if (!cancelled && res.data.success) {
                    const times = res.data.bookedSlots.map(s => {
                        const d = new Date(s.time);
                        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                    });
                    setRescheduleBookedSlots(times);
                }
            } catch (err) {
                console.error("Failed to load booked slots:", err);
            } finally {
                if (!cancelled) setRescheduleSlotsLoading(false);
            }
        }, 400);

        return () => {
            cancelled = true;
            clearTimeout(rescheduleSlotsDebounceRef.current);
        };
    }, [rescheduleDate, rescheduleAppointment]);

    const handleRescheduleDateChange = (e) => {
        const date = e.target.value;
        if (date && date < todayStr()) {
            setRescheduleDateError("Cannot select a past date");
            return; // controlled input reverts to the last valid value
        }
        setRescheduleDateError("");
        setRescheduleDate(date);
        setRescheduleTime("");
        setRescheduleSelectedSlot("");
    };

    // hhmm is local/store time; build a real Date (parsed in the browser's local timezone)
    // so downstream .toISOString() in handleReschedule stays timezone-safe.
    const handleRescheduleSlotClick = (hhmm) => {
        setRescheduleTime(hhmm);
        setRescheduleSelectedSlot(hhmm);
    };

    const closeRescheduleModal = () => {
        setRescheduleAppointment(null);
        setRescheduleDate("");
        setRescheduleTime("");
        setRescheduleSelectedSlot("");
        setRescheduleBookedSlots([]);
        setRescheduleDateError("");
    };


    const handleReschedule = async () => {

        if (!rescheduleDate || !rescheduleTime) {
            toast.warning("Please select new date and time.");
            return;
        }

        if (!rescheduleAppointment) return;

        try {
            setUpdatingId(rescheduleAppointment._id);

            const scheduledAt = new Date(
                `${rescheduleDate}T${rescheduleTime}`
            ).toISOString();

            const res = await api.put(
                `/appointments/${rescheduleAppointment.appointmentNumber}/status`,
                {
                    status: "Rescheduled",
                    scheduledAt
                }
            );

            if (res.data.success) {

                setAllData(prev =>
                    prev.map(a =>
                        a._id === rescheduleAppointment._id
                            ? res.data.appointment
                            : a
                    )
                );

                if (isSearching) {
                    setFilteredData(prev =>
                        prev.map(a =>
                            a._id === rescheduleAppointment._id
                                ? res.data.appointment
                                : a
                        )
                    );
                }

                setRescheduleAppointment(null);
                setRescheduleDate("");
                setRescheduleTime("");
                setRescheduleSelectedSlot("");
                setRescheduleBookedSlots([]);
                setRescheduleDateError("");

                toast.success("Appointment rescheduled successfully");
            }

        } catch (err) {
            toast.error(
                err.response?.data?.message ||
                "Failed to reschedule appointment"
            );
        } finally {
            setUpdatingId(null);
        }
    };



    const columns = useMemo(() => [
        {
            header: "Action", id: "actions",
            cell: ({ row }) => (
                <button onClick={e => { e.stopPropagation(); setViewAppointment(row.original); }}
                    className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-400 transition" title="View">
                    <FiInfo size={14} />
                </button>
            ),
        },
        {
            header: "Type / Time",
            cell: ({ row }) => {
                const apt = row.original;
                return (
                    <div className="text-left">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${apt.appointmentType === "Scheduled" ? "bg-blue-50 text-blue-600" : "bg-indigo-50 text-indigo-600"}`}>
                            {apt.appointmentType}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                            {apt.appointmentType === "Scheduled" && apt.scheduledAt
                                ? new Date(apt.scheduledAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                                : new Date(apt.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                    </div>
                );
            },
        },
        { header: "Appt No", accessorKey: "appointmentNumber" },
        {
            header: "Patient",
            cell: ({ row }) => (
                <div className="text-left">
                    <div className="font-semibold text-gray-800">{row.original.patientName}</div>
                    <div className="text-xs text-gray-400">{row.original.patNumber}</div>
                </div>
            ),
        },
        {
            header: "Mobile",
            cell: ({ row }) => <span>{row.original.countryCode} {row.original.mobile}</span>,
        },
        {
            header: "Doctor",
            cell: ({ row }) => row.original.assignedDoctorName || <span className="text-gray-300">Unassigned</span>,
        },
        {
            header: "Status",
            cell: ({ row }) => {
                const apt = row.original;
                const colorCls = STATUS_COLORS[apt.status] || defaultStatusColor;
                return (
                    <select
                        value={apt.status}
                        disabled={updatingId === apt._id}
                        onChange={e => handleStatusChange(apt, e.target.value)}
                        className={`text-xs font-semibold rounded-lg px-2 py-1.5 border-0 outline-none cursor-pointer ${colorCls} disabled:opacity-50`}
                    >
                        {STATUS_GROUPS.map(group => (
                            <optgroup key={group.label} label={group.label}>
                                {group.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </optgroup>
                        ))}
                    </select>
                );
            },
        },
        {
            header: "Wait Time",
            cell: ({ row }) => {
                const apt = row.original;
                const mins = getWaitMinutes(apt);
                if (mins == null) return <span className="text-gray-300">-</span>;
                const isLong = mins >= LONG_WAIT_MINUTES && !TERMINAL_STATUSES.includes(apt.status);
                return (
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${isLong ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500"}`}>
                        {isLong && <FiAlertTriangle size={11} />}
                        <FiClock size={11} /> {formatDuration(mins)}
                    </span>
                );
            },
        },
    ], [updatingId, now]);

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

    if (loading) return (
        <div className="flex items-center justify-center h-48 text-gray-400 gap-3">
            <div className="w-5 h-5 border-2 border-orange-300 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading appointments...</span>
        </div>
    );

    return (
        <div className="p-6 mb-24 min-h-screen bg-gray-50">

            {/* Filter bar */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={handleRefresh}
                            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-xs font-semibold rounded-lg transition shadow-sm w-fit">
                            <FiRefreshCw size={13} /> Refresh
                        </button>
                        <button onClick={() => setTodayOnly(v => !v)}
                            className={`px-4 py-2 text-xs font-semibold rounded-lg transition border ${todayOnly ? "bg-orange-50 border-orange-200 text-orange-600" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                            {todayOnly ? "Showing Today" : "Showing All"}
                        </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 flex-1 lg:justify-end items-end flex-wrap">
                        <div className="flex gap-3">
                            <div className="flex flex-col">
                                <label className="text-xs font-medium text-gray-500 mb-1">From Date</label>
                                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                                    className="border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-300 transition w-32 sm:w-40 text-gray-700" />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-medium text-gray-500 mb-1">To Date</label>
                                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                                    className="border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-300 transition w-32 sm:w-40 text-gray-700" />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs font-medium text-gray-500 mb-1">Status</label>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                                className="border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-300 transition w-44 text-gray-700">
                                <option value="">Any status</option>
                                {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs font-medium text-gray-500 mb-1">Keyword</label>
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} />
                                <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)}
                                    placeholder="Name, mobile, appt no..."
                                    className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-300 transition w-52 text-gray-700 placeholder:text-gray-300" />
                            </div>
                        </div>
                        <button onClick={searchAppointments}
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
                        <input type="text" value={globalFilter ?? ""} onChange={e => setGlobalFilter(e.target.value)} placeholder="Quick search..."
                            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition text-gray-600 placeholder:text-gray-300" />
                    </div>
                </div>
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
                                <tr><td colSpan={columns.length} className="py-14 text-center text-gray-400 text-sm">No appointments found</td></tr>
                            )}
                            {table.getRowModel().rows.map(row => {
                                const apt = row.original;
                                const mins = getWaitMinutes(apt);
                                const isLong = mins != null && mins >= LONG_WAIT_MINUTES && !TERMINAL_STATUSES.includes(apt.status);
                                return (
                                    <tr key={row.id} className={`border-b border-gray-50 text-center transition-colors ${isLong ? "bg-red-50/70 hover:bg-red-50" : "hover:bg-orange-50"}`}>
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id} className="px-4 py-2.5 text-gray-700 whitespace-nowrap text-sm">
                                                {flexRender(cell.column.columnDef.cell ?? cell.column.columnDef.accessorKey, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
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
                        {pages.map(p => (
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

            {/* View Appointment Modal */}
            {viewAppointment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setViewAppointment(null)}>
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center"><FiUser size={15} className="text-orange-500" /></div>
                                <div>
                                    <h2 className="text-sm font-bold text-gray-800">{viewAppointment.appointmentNumber}</h2>
                                    <p className="text-xs text-gray-400 mt-0.5">{viewAppointment.patientName}</p>
                                </div>
                            </div>
                            <button onClick={() => setViewAppointment(null)} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition"><FiX size={15} /></button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Patient</p><p className="text-sm font-semibold text-gray-800">{viewAppointment.patientName} ({viewAppointment.patNumber})</p></div>
                                <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Mobile</p><p className="text-sm font-semibold text-gray-800">{viewAppointment.countryCode} {viewAppointment.mobile}</p></div>
                                <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Type</p><p className="text-sm font-semibold text-gray-800">{viewAppointment.appointmentType}</p></div>
                                <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Doctor</p><p className="text-sm font-semibold text-gray-800">{viewAppointment.assignedDoctorName || "-"}</p></div>
                                <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Checked In</p><p className="text-sm font-semibold text-gray-800">{viewAppointment.checkInAt ? new Date(viewAppointment.checkInAt).toLocaleTimeString("en-IN") : "-"}</p></div>
                                <div><p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Checked Out</p><p className="text-sm font-semibold text-gray-800">{viewAppointment.checkOutAt ? new Date(viewAppointment.checkOutAt).toLocaleTimeString("en-IN") : "-"}</p></div>
                            </div>
                            {viewAppointment.reason && (
                                <div className="pt-3 border-t border-gray-100">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Reason</p>
                                    <p className="text-sm text-gray-700">{viewAppointment.reason}</p>
                                </div>
                            )}
                            <div className="pt-3 border-t border-gray-100">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Status History</p>
                                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                    {(viewAppointment.statusHistory || []).slice().reverse().map((h, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-gray-700">{h.status}</span>
                                            <span className="text-gray-400">{new Date(h.changedAt).toLocaleTimeString("en-IN")}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">
                            <button onClick={() => setViewAppointment(null)}
                                className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Reschedule Modal */}
            {rescheduleAppointment && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                    onClick={closeRescheduleModal}
                >
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md"
                        onClick={e => e.stopPropagation()}
                    >

                        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">

                            <div>
                                <h2 className="text-sm font-bold text-gray-800">
                                    Reschedule Appointment
                                </h2>

                                <p className="text-xs text-gray-400 mt-1">
                                    {rescheduleAppointment.appointmentNumber}
                                    {" · "}
                                    {rescheduleAppointment.patientName}
                                    {rescheduleAppointment.assignedDoctorName ? ` · ${rescheduleAppointment.assignedDoctorName}` : ""}
                                </p>
                            </div>

                            <button
                                onClick={closeRescheduleModal}
                                className="p-2 rounded-full text-gray-400 hover:bg-gray-100"
                            >
                                <FiX size={15} />
                            </button>

                        </div>

                        <div className="px-6 py-5 space-y-4">

                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1 block">
                                    New Appointment Date
                                </label>

                                <input
                                    type="date"
                                    value={rescheduleDate}
                                    onChange={handleRescheduleDateChange}
                                    min={todayStr()}
                                    className="w-full border border-gray-200 px-3 py-2.5 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                                />
                                {rescheduleDateError && (
                                    <p className="text-[10px] text-red-500 mt-1 font-medium">{rescheduleDateError}</p>
                                )}
                            </div>

                            {rescheduleDate && (
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">
                                        New Appointment Time
                                    </label>

                                    {!rescheduleAppointment.assignedDoctor ? (
                                        // No doctor on this appointment — nothing to conflict-check against.
                                        <input
                                            type="time"
                                            value={rescheduleTime}
                                            onChange={e => { setRescheduleTime(e.target.value); setRescheduleSelectedSlot(e.target.value); }}
                                            className="w-full border border-gray-200 px-3 py-2.5 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                                        />
                                    ) : rescheduleSlotsLoading ? (
                                        <p className="text-xs text-gray-400">Loading availability...</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-1">
                                            {DAY_SLOTS.map((hhmm) => {
                                                const isBooked = rescheduleBookedSlots.includes(hhmm);
                                                const isSelected = rescheduleSelectedSlot === hhmm;
                                                const isPast = new Date(`${rescheduleDate}T${hhmm}:00`) < new Date();
                                                const disabled = isBooked || isPast;

                                                return (
                                                    <button
                                                        type="button"
                                                        key={hhmm}
                                                        disabled={disabled}
                                                        onClick={() => handleRescheduleSlotClick(hhmm)}
                                                        title={isBooked ? "Already booked" : isPast ? "This time has passed" : ""}
                                                        className={[
                                                            "px-3 py-1.5 rounded-lg text-xs font-semibold border transition",
                                                            isSelected
                                                                ? "bg-orange-500 border-orange-500 text-white"
                                                                : disabled
                                                                    ? "bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed line-through"
                                                                    : "bg-white border-gray-200 text-gray-600 hover:border-orange-300 hover:bg-orange-50",
                                                        ].join(" ")}
                                                    >
                                                        {formatSlotLabel(hhmm)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>

                        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">

                            <button
                                onClick={closeRescheduleModal}
                                className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleReschedule}
                                disabled={updatingId === rescheduleAppointment._id}
                                className="px-4 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-50"
                            >
                                {updatingId === rescheduleAppointment._id
                                    ? "Rescheduling..."
                                    : "Confirm Reschedule"}
                            </button>

                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}