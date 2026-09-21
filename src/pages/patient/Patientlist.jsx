import { useEffect, useMemo, useState } from "react";
import {
    useReactTable, getCoreRowModel, getPaginationRowModel,
    getFilteredRowModel, flexRender,
} from "@tanstack/react-table";
import {
    FiInfo, FiEdit2, FiTrash2, FiRefreshCw, FiX, FiSearch,
    FiChevronLeft, FiChevronRight, FiPaperclip, FiFileText,
} from "react-icons/fi";
import api from "../../utils/api";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import "react-phone-input-2/lib/style.css";
import PatientDocumentsModal from "./PatientDocumentsModal";
import EditPatientModal from "./modals/EditPatientModal";
import OpdReportHistoryModal from "./modals/Opdreporthistorymodal";

const FETCH_LIMIT = 100;
const PAGE_SIZE = 100;

export const GENDER_OPTIONS = ["MALE", "FEMALE", "OTHER"];
export const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI primitives
// ─────────────────────────────────────────────────────────────────────────────
export const Modal = ({ onClose, children, maxWidth = "max-w-lg" }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
        <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} animate-fadeIn`} onClick={e => e.stopPropagation()}>
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

const InfoRow = ({ label, value }) => (
    <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-gray-800">{value || "-"}</p>
    </div>
);

export const SectionTitle = ({ children }) => (
    <div className="flex items-center gap-2 mb-4">
        <span className="w-0.5 h-4 rounded-full bg-orange-400 inline-block" />
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{children}</h3>
    </div>
);

const labelCls = "block text-xs font-medium text-gray-600 mb-1.5";
const iconInputCls = "w-full pl-9 pr-3 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 hover:border-orange-300 transition placeholder-gray-400";

// ─────────────────────────────────────────────────────────────────────────────
// Main PatientList
// ─────────────────────────────────────────────────────────────────────────────
export default function PatientList() {

    const permissions = useSelector((s) => s?.auth?.user?.permissions || []);
    const [allData, setAllData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [keyword, setKeyword] = useState("");
    const [globalFilter, setGlobalFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [viewPatient, setViewPatient] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [editPatient, setEditPatient] = useState(null);

    const [docsPatient, setDocsPatient] = useState(null);

    // OPD report history modal — all fetching now lives inside OpdReportHistoryModal
    const [opdHistoryPatient, setOpdHistoryPatient] = useState(null);

    const dispatch = useDispatch();

    // fetch patients data
    const fetchPatients = async (pageNumber = 1, append = false) => {
        try {
            dispatch(showLoader());
            pageNumber === 1 ? setLoading(true) : setLoadingMore(true);
            const res = await api.get("/patients", { params: { page: pageNumber, limit: FETCH_LIMIT } });
            if (res.data.success) {
                setAllData(prev => append ? [...prev, ...(res.data.patients || [])] : (res.data.patients || []));
                setHasMore(res.data.hasMore);
            }
        } catch (err) { console.error("Failed to fetch patients", err); }
        finally { setLoading(false); setLoadingMore(false); dispatch(hideLoader()); }
    };

    useEffect(() => { fetchPatients(1, false); }, []);

    // search patients
    const searchPatients = async () => {
        if (!fromDate && !toDate && !keyword) { toast.warning("Please provide at least one filter."); return; }
        if ((fromDate && !toDate) || (!fromDate && toDate)) { toast.warning("Please select both From and To dates."); return; }
        if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) { toast.warning("From date cannot be greater than To date."); return; }
        if (keyword && keyword.trim().length < 4) { toast.warning("Keyword must be at least 4 characters."); return; }
        try {
            setLoading(true); setPage(1); dispatch(showLoader());
            const res = await api.post("/patients/search", {
                startDate: fromDate || undefined,
                endDate: toDate || undefined,
                keyword: keyword || undefined,
            });
            if (res.data.success) { setFilteredData(res.data.patientsData || []); setIsSearching(true); }
            else toast.warning(res.data.message);
        } catch (err) { console.error("Search error:", err); }
        finally { setLoading(false); dispatch(hideLoader()); }
    };

    const handleResetSearch = () => { setFilteredData([]); setIsSearching(false); };
    const handleLoadMore = () => { if (!hasMore || loadingMore) return; const next = page + 1; setPage(next); fetchPatients(next, true); };

    const handleRefresh = () => {
        Swal.fire({ title: "Are you sure?", text: "The page will be refreshed.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ea580c", cancelButtonColor: "#9ca3af", confirmButtonText: "Yes, refresh!" })
            .then(r => { if (r.isConfirmed) window.location.reload(); });
    };

    // handle delete patient
    const handleDeletePatient = async (patient) => {
        const result = await Swal.fire({ title: "Are you sure?", text: `You won't be able to recover ${patient.patNumber} (${patient.name})`, icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626", cancelButtonColor: "#6b7280", confirmButtonText: "Yes, delete it" });
        if (!result.isConfirmed) return;
        try {
            Swal.fire({ title: "Deleting...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const res = await api.delete(`/patients/${patient.patNumber}`);
            if (res.data.success) {
                setAllData(prev => prev.filter(p => p.patNumber !== patient.patNumber));
                Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false });
            }
        } catch (error) {
            Swal.fire({ icon: "error", title: "Error", text: error.response?.data?.message || "Something went wrong" });
        }
    };

    const columns = useMemo(() => [
        {
            header: "Action", id: "actions",
            cell: ({ row }) => {
                const p = row.original;
                return (
                    <div className="flex items-center justify-center gap-0.5">

                        {permissions.includes("EDIT PATIENT") && (
                            <button onClick={e => { e.stopPropagation(); setEditPatient(p); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition" title="Edit"><FiEdit2 size={14} /></button>
                        )}
                        <button onClick={e => { e.stopPropagation(); setSelectedPatient(p); setViewPatient(true); }} className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-400 transition" title="View"><FiInfo size={14} /></button>

                        {permissions.includes("MANAGE FILES") && (
                            <button onClick={e => { e.stopPropagation(); setDocsPatient(p); }} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500 transition" title="Prior Prescriptions"><FiPaperclip size={14} /></button>
                        )}

                        <button onClick={e => { e.stopPropagation(); setOpdHistoryPatient(p); }} className="p-1.5 rounded-lg hover:bg-green-50 text-green-500 transition" title="OPD Report History"><FiFileText size={14} /></button>

                    </div>
                );
            },
        },
        { header: "Date", accessorKey: "createdAt", cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString("en-IN") : "-" },
        { header: "Id", accessorKey: "patNumber" },
        { header: "Name", accessorKey: "name" },
        {
            header: "Mobile",
            cell: ({ row }) => (
                <span>
                    {row.original.countryCode || ""} {row.original.mobile}
                </span>
            ),
        },
        { header: "Email", accessorKey: "email" },
        { header: "Gender", accessorKey: "gender" },
        { header: "Blood Group", accessorKey: "bloodGroup" },
        {
            header: "Delete",
            id: "delete",
            cell: ({ row }) => (
                permissions.includes("DELETE PATIENT") ? (
                    <button
                        onClick={e => {
                            e.stopPropagation();
                            handleDeletePatient(row.original);
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 transition mx-auto block"
                        title="Delete"
                    >
                        <FiTrash2 size={14} />
                    </button>
                ) : null
            ),
        },
    ], []);

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
            <span className="text-sm">Loading patients...</span>
        </div>
    );

    return (
        <div className="p-6 mb-24 min-h-screen bg-gray-50">

            {/* Filter bar */}
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
                                    className="border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-300 transition w-32 sm:w-40 lg:w-44 text-gray-700" />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-medium text-gray-500 mb-1">To Date</label>
                                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                                    className="border border-gray-200 px-3 py-2 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-300 transition w-32 sm:w-40 lg:w-44 text-gray-700" />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs font-medium text-gray-500 mb-1">Keyword</label>
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} />
                                <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)}
                                    placeholder="Name or mobile..."
                                    className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-300 transition w-56 text-gray-700 placeholder:text-gray-300" />
                            </div>
                        </div>
                        <button onClick={searchPatients}
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
                                <tr><td colSpan={columns.length} className="py-14 text-center text-gray-400 text-sm">No patients found</td></tr>
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

            {/* View Patient Modal */}
            {viewPatient && selectedPatient && (
                <Modal onClose={() => { setSelectedPatient(null); setViewPatient(false); }} maxWidth="max-w-2xl">
                    <ModalHeader title="Patient Details" subtitle={selectedPatient?.mobile}
                        onClose={() => { setSelectedPatient(null); setViewPatient(false); }} />
                    <div className="px-6 py-5 space-y-5">
                        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
                            <SectionTitle>Personal Information</SectionTitle>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                                <InfoRow label="Date" value={selectedPatient?.createdAt ? new Date(selectedPatient.createdAt).toLocaleDateString("en-GB") : "-"} />
                                <InfoRow label="Id" value={selectedPatient?.patNumber} />
                                <InfoRow label="Name" value={selectedPatient?.name} />
                                <InfoRow label="Mobile" value={(selectedPatient?.countryCode || "+91") + " " + selectedPatient?.mobile} />
                                <InfoRow label="Email" value={selectedPatient?.email} />
                                <InfoRow label="Address" value={selectedPatient?.address} />
                                <InfoRow label="Date of Birth" value={selectedPatient?.dob ? new Date(selectedPatient.dob).toLocaleDateString("en-GB") : "-"} />
                                <InfoRow label="Gender" value={selectedPatient?.gender} />
                                <InfoRow label="Blood Group" value={selectedPatient?.bloodGroup} />
                                <InfoRow label="Guardian Name" value={selectedPatient?.guardianName} />
                            </div>
                            {selectedPatient?.notes && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <InfoRow label="Notes" value={selectedPatient?.notes} />
                                </div>
                            )}
                        </div>
                    </div>


                    <ModalFooter>
                        <button onClick={() => { setSelectedPatient(null); setViewPatient(false); }}
                            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                            Close
                        </button>
                    </ModalFooter>
                </Modal>
            )}

            {/* Open Edit patient Modal */}
            {editPatient && <EditPatientModal patient={editPatient} onClose={() => setEditPatient(null)} onSuccess={() => fetchPatients()} />}

            {/* Open Patient Documents modal */}
            {docsPatient && (
                <PatientDocumentsModal
                    patient={docsPatient}
                    onClose={() => setDocsPatient(null)}
                    onChange={(docs) => {
                        setDocsPatient(prev => ({ ...prev, documents: docs }));
                        setAllData(prev => prev.map(p => p.patNumber === docsPatient.patNumber ? { ...p, documents: docs } : p));
                    }}
                />
            )}

            {/* OPD Report History (list + drill-into-full-report) */}
            {opdHistoryPatient && (
                <OpdReportHistoryModal
                    patient={opdHistoryPatient}
                    onClose={() => setOpdHistoryPatient(null)}
                />
            )}

        </div>
    );
}