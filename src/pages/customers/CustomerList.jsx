import { useEffect, useMemo, useRef, useState } from "react";
import {
    useReactTable, getCoreRowModel, getPaginationRowModel,
    getFilteredRowModel, flexRender,
} from "@tanstack/react-table";
import {
    FiInfo, FiEdit2, FiTrash2, FiRefreshCw, FiX, FiUser, FiPhone,
    FiMail, FiMapPin, FiCalendar, FiStar, FiSearch, FiChevronLeft, FiChevronRight,
    FiFileText, FiTool, FiGitMerge, FiEye, FiBriefcase, FiUsers 
} from "react-icons/fi";
import api from "../../utils/api";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";

import MembershipModal from "./MembershipModal";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

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
        <style>{`
            @keyframes fadeIn { from { opacity:0; transform:scale(.97) translateY(6px); } to { opacity:1; transform:scale(1) translateY(0); } }
            .animate-fadeIn { animation: fadeIn .18s ease both; }
        `}</style>
    </div>
);

const ModalHeader = ({ title, subtitle, onClose, icon }) => (
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

const ModalFooter = ({ children }) => (
    <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">{children}</div>
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

const labelCls = "block text-xs font-medium text-gray-600 mb-1.5";
const iconInputCls = "w-full pl-9 pr-3 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 hover:border-orange-300 transition placeholder-gray-400";

// ─────────────────────────────────────────────────────────────────────────────
// EyeGrid — reusable eye data display
// ─────────────────────────────────────────────────────────────────────────────
function EyeGrid({ data, label, color = "blue" }) {
    const fields = ["sph", "cyl", "axis", "vis", "add", "nv_sph", "nv_cyl", "nv_axis", "nv_vis"];
    const textColor = color === "blue" ? "text-blue-500" : "text-purple-500";
    return (
        <div>
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${textColor}`}>{label}</p>
            <div className="grid grid-cols-5 gap-1 text-center">
                {fields.map(f => (
                    <div key={f} className="bg-white rounded-lg px-1 py-1.5 border border-gray-100">
                        <p className="text-[9px] text-gray-400 uppercase font-semibold">{f.replace("nv_", "NV·")}</p>
                        <p className="text-xs font-bold text-gray-700">{data?.[f] ?? "-"}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Prescription Detail Modal
// ─────────────────────────────────────────────────────────────────────────────
function PrescriptionDetailModal({ prescription: p, onClose }) {
    const [tab, setTab] = useState("eyewear");
    const tabs = [{ key: "eyewear", label: "Eyewear" }, { key: "transpose", label: "Transpose" }, { key: "contactLens", label: "Contact Lens" }];

    return (
        <Modal onClose={onClose} maxWidth="max-w-2xl">
            <ModalHeader title="Prescription Detail" subtitle={p.presNumber} onClose={onClose}
                icon={<FiFileText size={15} className="text-orange-500" />} />
            <div className="px-6 py-5 max-h-[75vh] overflow-y-auto space-y-4">
                {/* Meta */}
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                    <InfoRow label="Pres No" value={p.presNumber} />
                    <InfoRow label="Date" value={p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "-"} />
                    <InfoRow label="Name" value={p.name} />
                    <InfoRow label="Mobile" value={p.mobile} />
                    <InfoRow label="Tested By" value={p.testedByName || p.testedBy} />
                    <InfoRow label="Created By" value={p.createdByName} />
                </div>
                {/* Tabs */}
                <div className="flex gap-1">
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${tab === t.key ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="space-y-3">
                    <EyeGrid data={p[tab]?.rightEye} label="Right Eye (OD)" color="blue" />
                    <EyeGrid data={p[tab]?.leftEye} label="Left Eye (OS)" color="purple" />
                </div>
                {/* Billing */}
                {(p.totalAmount > 0 || p.amount > 0) && (
                    <div className="bg-orange-50 rounded-xl border border-orange-100 p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <InfoRow label="Amount" value={p.amount ? `₹${p.amount}` : "-"} />
                        <InfoRow label="Discount" value={p.discount ? `₹${p.discount}` : "-"} />
                        <InfoRow label="GST" value={p.gstAmount ? `₹${p.gstAmount} (${p.gstPercent}%)` : "-"} />
                        <InfoRow label="Total" value={p.totalAmount ? `₹${p.totalAmount}` : "-"} />
                    </div>
                )}
                {p.pdfUrl && (
                    <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs font-semibold text-orange-500 hover:underline w-fit">
                        <FiFileText size={12} /> View PDF
                    </a>
                )}
            </div>
            <ModalFooter>
                <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">Close</button>
            </ModalFooter>
        </Modal>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Job Card Detail Modal
// ─────────────────────────────────────────────────────────────────────────────
function JobCardDetailModal({ jobCard: jc, onClose }) {
    const [tab, setTab] = useState("eyewear");
    const tabs = [{ key: "eyewear", label: "Eyewear" }, { key: "transpose", label: "Transpose" }, { key: "contactLens", label: "Contact Lens" }];
    const hasPrescription = !!jc.prescription;

    return (
        <Modal onClose={onClose} maxWidth="max-w-2xl">
            <ModalHeader title="Job Card Detail" subtitle={jc.jcNumber || jc.jobCardNumber} onClose={onClose}
                icon={<FiTool size={15} className="text-orange-500" />} />
            <div className="px-6 py-5 max-h-[75vh] overflow-y-auto space-y-4">
                {/* Meta */}
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <InfoRow label="Job Card No" value={jc.jcNumber || jc.jobCardNumber} />
                    <InfoRow label="Date" value={jc.createdAt ? new Date(jc.createdAt).toLocaleDateString("en-IN") : "-"} />
                    <InfoRow label="Status" value={jc.status} />
                    <InfoRow label="Total" value={`₹${jc.total || 0}`} />
                    <InfoRow label="Advance" value={`₹${jc.advance || 0}`} />
                    <InfoRow label="Add. Discount" value={`₹${jc.additionalDiscount || 0}`} />
                    <InfoRow label="Loyalty Discount" value={`₹${jc.loyaltyDiscount || 0}`} />
                    <InfoRow label="Balance" value={`₹${jc.balance || 0}`} />
                    <InfoRow label="Transaction Type" value={jc.transactionType} />
                </div>

                {hasPrescription ? (
                    <>
                        <div className="flex items-center gap-2">
                            <span className="w-0.5 h-4 rounded-full bg-orange-400 inline-block" />
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Prescription</p>
                            <span className="text-[10px] text-gray-400">· {jc.prescription.presNumber}</span>
                        </div>
                        <div className="flex gap-1">
                            {tabs.map(t => (
                                <button key={t.key} onClick={() => setTab(t.key)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${tab === t.key ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <div className="space-y-3">
                            <EyeGrid data={jc.prescription[tab]?.rightEye} label="Right Eye (OD)" color="blue" />
                            <EyeGrid data={jc.prescription[tab]?.leftEye} label="Left Eye (OS)" color="purple" />
                        </div>
                    </>
                ) : (
                    <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-xl border border-gray-100">
                        <FiFileText size={24} className="mx-auto mb-2 opacity-40" />
                        <p className="text-xs">No prescription attached to this job card</p>
                    </div>
                )}
            </div>
            <ModalFooter>
                <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">Close</button>
            </ModalFooter>
        </Modal>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compare Modal
// item shape:
//   prescription source → { label, date, source: "prescription", prescription }
//   jobcard source      → { label, date, jcNumber, source: "jobcard", prescription }
//
// To add/remove a meta row → edit metaFields array only
// To add/remove an eye field row → edit eyeFields array only
// ─────────────────────────────────────────────────────────────────────────────
function CompareModal({ items, onClose }) {
    const [tab, setTab] = useState("eyewear");

    console.log(items)

    const tabs = [
        { key: "eyewear", label: "Eyewear" },
        { key: "transpose", label: "Transpose" },
        { key: "contactLens", label: "Contact Lens" },
    ];

    // ── Add / remove / reorder eye field rows here ──────────────────────────
    const eyeFields = [
        { label: "SPH", key: "sph" },
        { label: "CYL", key: "cyl" },
        { label: "AXIS", key: "axis" },
        { label: "VIS", key: "vis" },
        { label: "ADD", key: "add" },
        { label: "NV SPH", key: "nv_sph" },
        { label: "NV CYL", key: "nv_cyl" },
        { label: "NV AXIS", key: "nv_axis" },
        { label: "NV VIS", key: "nv_vis" },
    ];

    // ── Add / remove / reorder meta info rows here ──────────────────────────
    const metaFields = [
        {
            label: "Date",
            get: item => item.date || "-",               // date stored when selecting in both modals
        },
        {
            label: "Tested By",
            get: item => item.source === "jobcard"
                ? (item?.testedByName || item?.testedBy || "-")
                : (item.prescription?.testedByName || item.prescription?.testedBy || "-"),
        },
    ];
    // ────────────────────────────────────────────────────────────────────────

    const isJobcard = item => item.source === "jobcard";

    return (
        <Modal onClose={onClose} maxWidth="max-w-6xl">
            <ModalHeader title="Compare Prescriptions" subtitle={`${items.length} items selected`} onClose={onClose}
                icon={<FiGitMerge size={15} className="text-orange-500" />} />

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4">
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${tab === t.key ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="px-6 py-4 overflow-x-auto max-h-[65vh] overflow-y-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        {/* Column headers */}
                        <tr>
                            <th className="sticky left-0 bg-white z-10 w-28 py-2 pr-4" />
                            {items.map((item, i) => (
                                <th key={i} colSpan={2} className="text-center py-2 px-2 min-w-[160px]">
                                    <div className={`rounded-lg px-3 py-1.5 ${isJobcard(item) ? "bg-purple-50" : "bg-orange-50"}`}>
                                        <p className={`text-[10px] font-bold uppercase ${isJobcard(item) ? "text-purple-500" : "text-orange-500"}`}>
                                            {item.label}
                                        </p>
                                        <p className="text-[12px] text-gray-800 font-normal">{item.date}</p>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isJobcard(item) ? "bg-purple-100 text-purple-500" : "bg-orange-100 text-orange-500"}`}>
                                            {isJobcard(item) ? "Job Card" : "Prescription"}
                                        </span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                        {/* Right / Left sub-headers */}
                        <tr className="border-b border-gray-100">
                            <th className="sticky left-0 bg-white z-10 py-1.5" />
                            {items.map((_, i) => (
                                <>
                                    <th key={`r-${i}`} className="text-[10px] font-bold text-blue-400 uppercase py-1.5 px-3 text-center bg-blue-50/40 min-w-[80px]">Right Eye</th>
                                    <th key={`l-${i}`} className="text-[10px] font-bold text-purple-400 uppercase py-1.5 px-3 text-center bg-purple-50/40 min-w-[80px]">Left Eye</th>
                                </>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {/* Meta rows */}
                        {metaFields.map((f, fi) => (
                            <tr key={`meta-${fi}`} className="border-b border-gray-50 bg-gray-50/50">
                                <td className="text-[11px] font-semibold text-gray-800 py-2 pr-4 sticky left-0 bg-gray-50/70 z-10 whitespace-nowrap">
                                    {f.label}
                                </td>
                                {items.map((item, pi) => (
                                    <td key={pi} colSpan={2} className="text-center text-xs font-semibold text-gray-700 py-2 px-2">
                                        {f.get(item)}
                                    </td>
                                ))}
                            </tr>
                        ))}

                        {/* Divider */}
                        <tr>
                            <td colSpan={1 + items.length * 2} className="py-0">
                                <div className="h-px bg-orange-100" />
                            </td>
                        </tr>

                        {/* Eye field rows */}
                        {eyeFields.map((f, fi) => (
                            <tr key={fi} className={`border-b border-gray-50 ${fi % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                                <td className="text-[11px] font-semibold text-gray-500 py-2.5 pr-4 sticky left-0 bg-inherit z-10 whitespace-nowrap">
                                    {f.label}
                                </td>
                                {items.map((item, pi) => {
                                    const rx = item.prescription?.[tab]?.rightEye?.[f.key] ?? "-";
                                    const lx = item.prescription?.[tab]?.leftEye?.[f.key] ?? "-";
                                    return (
                                        <>
                                            <td key={`r-${pi}`} className="text-center text-sm font-bold text-gray-800 py-2.5 px-3 bg-blue-50/20">{rx || "-"}</td>
                                            <td key={`l-${pi}`} className="text-center text-sm font-bold text-gray-800 py-2.5 px-3 bg-purple-50/20">{lx || "-"}</td>
                                        </>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ModalFooter>
                <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">Close</button>
            </ModalFooter>
        </Modal>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Prescription card
// ─────────────────────────────────────────────────────────────────────────────
function PrescriptionCard({ p, selected, onToggle, onViewDetail }) {
    return (
        <div onClick={onToggle}
            className={`rounded-xl border p-4 cursor-pointer transition-all ${selected ? "border-orange-400 bg-orange-50 shadow-sm" : "border-gray-100 bg-gray-50 hover:border-orange-200 hover:bg-orange-50/40"}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? "bg-orange-500 border-orange-500" : "border-gray-300"}`}>
                        {selected && <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-orange-500">{p.presNumber}</p>
                        <p className="text-[11px] text-gray-400">
                            {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "-"}
                            {p.testedByName ? ` · ${p.testedByName}` : ""}
                        </p>
                    </div>
                </div>
                <button onClick={e => { e.stopPropagation(); onViewDetail(); }}
                    className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-orange-500 hover:border-orange-300 transition flex-shrink-0" title="View full detail">
                    <FiEye size={13} />
                </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                    { label: "Right Eye (OD)", data: p.eyewear?.rightEye, color: "blue" },
                    { label: "Left Eye (OS)", data: p.eyewear?.leftEye, color: "purple" },
                ].map(({ label, data, color }) => (
                    <div key={label}>
                        <p className={`text-[10px] font-semibold mb-1 ${color === "blue" ? "text-blue-400" : "text-purple-400"}`}>{label}</p>
                        <div className="grid grid-cols-4 gap-1 text-center">
                            {["sph", "cyl", "axis", "add"].map(f => (
                                <div key={f} className="bg-white rounded px-1 py-1 border border-gray-100">
                                    <p className="text-[9px] text-gray-400 uppercase">{f}</p>
                                    <p className="text-xs font-bold text-gray-700">{data?.[f] ?? "-"}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Job card card
// ─────────────────────────────────────────────────────────────────────────────
function JobCardCard({ jc, selected, onToggle, onViewDetail }) {
    const hasPrescription = !!jc.prescription;
    return (
        <div onClick={hasPrescription ? onToggle : undefined}
            className={`rounded-xl border p-4 transition-all ${hasPrescription ? "cursor-pointer" : "cursor-default opacity-75"}
                ${selected ? "border-orange-400 bg-orange-50 shadow-sm" : "border-gray-100 bg-gray-50 hover:border-orange-200 hover:bg-orange-50/40"}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
                        ${!hasPrescription ? "border-gray-200 bg-gray-100" : selected ? "bg-orange-500 border-orange-500" : "border-gray-300"}`}>
                        {selected && <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-purple-500">{jc.jcNumber || jc.jobCardNumber}</p>
                        <p className="text-[11px] text-gray-400">{jc.createdAt ? new Date(jc.createdAt).toLocaleDateString("en-IN") : "-"}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {jc.status && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-600">{jc.status}</span>}
                    {!hasPrescription && <span className="text-[10px] text-gray-400 italic">No prescription</span>}
                    <button onClick={e => { e.stopPropagation(); onViewDetail(); }}
                        className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-orange-500 hover:border-orange-300 transition" title="View full detail">
                        <FiEye size={13} />
                    </button>
                </div>
            </div>
            <div className="mt-3 flex gap-2 flex-wrap">
                {[jc.frameName, jc.lensName, jc.total ? `₹${jc.total}` : null].filter(Boolean).map((v, i) => (
                    <span key={i} className="text-[11px] bg-white border border-gray-100 rounded-lg px-2 py-1 text-gray-600 font-medium">{v}</span>
                ))}
            </div>
            {hasPrescription && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Prescription · {jc.prescription.presNumber}</p>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: "Right Eye (OD)", data: jc.prescription?.eyewear?.rightEye, color: "blue" },
                            { label: "Left Eye (OS)", data: jc.prescription?.eyewear?.leftEye, color: "purple" },
                        ].map(({ label, data, color }) => (
                            <div key={label}>
                                <p className={`text-[10px] font-semibold mb-1 ${color === "blue" ? "text-blue-400" : "text-purple-400"}`}>{label}</p>
                                <div className="grid grid-cols-4 gap-1 text-center">
                                    {["sph", "cyl", "axis", "add"].map(f => (
                                        <div key={f} className="bg-white rounded px-1 py-1 border border-gray-100">
                                            <p className="text-[9px] text-gray-400 uppercase">{f}</p>
                                            <p className="text-xs font-bold text-gray-700">{data?.[f] ?? "-"}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Prescriptions Modal
// ─────────────────────────────────────────────────────────────────────────────
function PrescriptionsModal({ customer, onClose }) {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState([]);
    const [detailItem, setDetailItem] = useState(null);
    const [showCompare, setShowCompare] = useState(false);
    const dispatch = useDispatch();

    useEffect(() => {
        (async () => {
            try {
                dispatch(showLoader());
                const res = await api.get(`/customers/${customer.custNumber}/prescriptions`);
                if (res.data.success) setPrescriptions(res.data.prescriptions || []);
            } catch { toast.error("Failed to load prescriptions"); }
            finally { setLoading(false); dispatch(hideLoader()); }
        })();
    }, [customer.custNumber]);

    const toggleSelect = (p) => {
        const key = p._id;
        setSelected(prev => prev.find(s => s.prescription._id === key)
            ? prev.filter(s => s.prescription._id !== key)
            : [...prev, {
                label: p.presNumber,
                date: p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "-",
                source: "prescription",
                prescription: p,
            }]
        );
    };

    const isSelected = (p) => selected.some(s => s.prescription._id === p._id);

    return (
        <>
            <Modal onClose={onClose} maxWidth="max-w-3xl">
                <ModalHeader title="Prescriptions" subtitle={`${customer.name} · ${customer.custNumber}`} onClose={onClose}
                    icon={<FiFileText size={15} className="text-orange-500" />} />
                <div className="px-6 py-4 max-h-[65vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
                            <div className="w-4 h-4 border-2 border-orange-300 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Loading...</span>
                        </div>
                    ) : prescriptions.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <FiFileText size={28} className="mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No prescriptions found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {prescriptions.map((p, i) => (
                                <PrescriptionCard key={p._id || i} p={p} selected={isSelected(p)}
                                    onToggle={() => toggleSelect(p)} onViewDetail={() => setDetailItem(p)} />
                            ))}
                        </div>
                    )}
                </div>
                <ModalFooter>
                    {selected.length > 0 && (
                        <span className="text-xs text-orange-500 font-semibold mr-auto">{selected.length} selected</span>
                    )}
                    <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">Close</button>
                    {selected.length >= 2 && (
                        <button onClick={() => setShowCompare(true)}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition">
                            <FiGitMerge size={13} /> Compare ({selected.length})
                        </button>
                    )}
                </ModalFooter>
            </Modal>
            {detailItem && <PrescriptionDetailModal prescription={detailItem} onClose={() => setDetailItem(null)} />}
            {showCompare && <CompareModal items={selected} onClose={() => setShowCompare(false)} />}
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Job Cards Modal
// ─────────────────────────────────────────────────────────────────────────────
function JobCardsModal({ customer, onClose }) {
    const [jobCards, setJobCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState([]);
    const [detailItem, setDetailItem] = useState(null);
    const [showCompare, setShowCompare] = useState(false);
    const dispatch = useDispatch();

    useEffect(() => {
        (async () => {
            try {
                dispatch(showLoader());
                const res = await api.get(`/customers/${customer.custNumber}/jobcards`);
                if (res.data.success) setJobCards(res.data.jobCards || []);
            } catch { toast.error("Failed to load job cards"); }
            finally { setLoading(false); dispatch(hideLoader()); }
        })();
    }, [customer.custNumber]);

    const toggleSelect = (jc) => {
        if (!jc.prescription) return;
        const key = jc._id;
        setSelected(prev => prev.find(s => s._id === key)
            ? prev.filter(s => s._id !== key)
            : [...prev, {
                _id: key,
                label: jc.jcNumber || "",  // shown in compare header
                jcNumber: jc.jcNumber || "", // used in metaFields "Number" row
                date: jc.createdAt ? new Date(jc.createdAt).toLocaleDateString("en-IN") : "-",
                source: "jobcard",
                prescription: jc.prescription,
                testedByName: jc.testedByName,
            }]
        );
    };

    const isSelected = (jc) => selected.some(s => s._id === jc._id);

    return (
        <>
            <Modal onClose={onClose} maxWidth="max-w-3xl">
                <ModalHeader title="Job Cards" subtitle={`${customer.name} · ${customer.custNumber}`} onClose={onClose}
                    icon={<FiBriefcase size={15} className="text-orange-500" />} />
                <div className="px-6 py-4 max-h-[65vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
                            <div className="w-4 h-4 border-2 border-orange-300 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Loading...</span>
                        </div>
                    ) : jobCards.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <FiBriefcase size={28} className="mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No job cards found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {jobCards.map((jc, i) => (
                                <JobCardCard key={jc._id || i} jc={jc} selected={isSelected(jc)}
                                    onToggle={() => toggleSelect(jc)} onViewDetail={() => setDetailItem(jc)} />
                            ))}
                        </div>
                    )}
                </div>
                <ModalFooter>
                    {selected.length > 0 && (
                        <span className="text-xs text-orange-500 font-semibold mr-auto">{selected.length} selected</span>
                    )}
                    <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">Close</button>
                    {selected.length >= 2 && (
                        <button onClick={() => setShowCompare(true)}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition">
                            <FiGitMerge size={13} /> Compare Prescriptions ({selected.length})
                        </button>
                    )}
                </ModalFooter>
            </Modal>
            {detailItem && <JobCardDetailModal jobCard={detailItem} onClose={() => setDetailItem(null)} />}
            {showCompare && <CompareModal items={selected} onClose={() => setShowCompare(false)} />}
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyword input
// ─────────────────────────────────────────────────────────────────────────────
function CustomerKeywordInput({ value, onChange }) {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef(null);
    const containerRef = useRef(null);

    const fetchSuggestions = async (q) => {
        if (!q || q.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
        try {
            setSearching(true);
            const res = await api.get("/jc/search", { params: { q } });
            if (res.data.success) { setSuggestions(res.data.data || []); setShowSuggestions(true); }
        } catch { }
        finally { setSearching(false); }
    };

    const handleChange = (e) => {
        onChange(e.target.value);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchSuggestions(e.target.value), 320);
    };

    const handleSelect = (s) => {
        const q = value.trim().toLowerCase();
        const mobileMatch = s.mobile?.toLowerCase().includes(q);
        const emailMatch = s.email?.toLowerCase().includes(q);
        onChange(mobileMatch && !emailMatch ? s.mobile : emailMatch && !mobileMatch ? s.email : s.name || s.mobile || "");
        setSuggestions([]); setShowSuggestions(false);
    };

    useEffect(() => {
        const handler = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setShowSuggestions(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={containerRef} className="relative flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1">Keyword</label>
            <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={13} />
                {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-orange-300 border-t-transparent rounded-full animate-spin pointer-events-none" />}
                <input type="text" value={value} onChange={handleChange} onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="Name or mobile..."
                    className="pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-300 transition w-56 text-gray-700 placeholder:text-gray-300" />
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
                                        <FiUser size={11} className="text-orange-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{s.name || "-"}</p>
                                        <p className="text-xs text-gray-400 truncate">{s.mobile || ""}{s.email ? ` · ${s.email}` : ""}</p>
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
// Main CustomerList
// ─────────────────────────────────────────────────────────────────────────────
export default function CustomerList() {
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
    const [viewCustomer, setViewCustomer] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [editCustomer, setEditCustomer] = useState(null);
    const [prescriptionsModal, setPrescriptionsModal] = useState(null);
    const [jobCardsModal, setJobCardsModal] = useState(null);
    const dispatch = useDispatch();
    const pageField = useSelector((state) => state.pageField.data);

    const [membershipModal, setMembershipModal] = useState(null);

    // fetch customers data
    const fetchCustomers = async (pageNumber = 1, append = false) => {
        try {
            dispatch(showLoader());
            pageNumber === 1 ? setLoading(true) : setLoadingMore(true);
            const res = await api.get("/customers", { params: { page: pageNumber, limit: FETCH_LIMIT } });
            if (res.data.success) {
                setAllData(prev => append ? [...prev, ...(res.data.customers || [])] : (res.data.customers || []));
                setHasMore(res.data.hasMore);
            }
        } catch (err) { console.error("Failed to fetch customers", err); }
        finally { setLoading(false); setLoadingMore(false); dispatch(hideLoader()); }
    };

    useEffect(() => { fetchCustomers(1, false); }, []);

    // search customer
    const searchCustomers = async () => {
        if (!fromDate && !toDate && !keyword) { toast.warning("Please provide at least one filter."); return; }
        if ((fromDate && !toDate) || (!fromDate && toDate)) { toast.warning("Please select both From and To dates."); return; }
        if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) { toast.warning("From date cannot be greater than To date."); return; }
        if (keyword && keyword.trim().length < 4) { toast.warning("Keyword must be at least 4 characters."); return; }
        try {
            setLoading(true); setPage(1); dispatch(showLoader());
            const res = await api.post("/customers/search", {
                startDate: fromDate || undefined,
                endDate: toDate || undefined,
                keyword: keyword || undefined,
            });
            if (res.data.success) { setFilteredData(res.data.customersData || []); setIsSearching(true); }
            else toast.warning(res.data.message);
        } catch (err) { console.error("Search error:", err); }
        finally { setLoading(false); dispatch(hideLoader()); }
    };

    const handleResetSearch = () => { setFilteredData([]); setIsSearching(false); };
    const handleLoadMore = () => { if (!hasMore || loadingMore) return; const next = page + 1; setPage(next); fetchCustomers(next, true); };

    const handleRefresh = () => {
        Swal.fire({ title: "Are you sure?", text: "The page will be refreshed.", icon: "warning", showCancelButton: true, confirmButtonColor: "#ea580c", cancelButtonColor: "#9ca3af", confirmButtonText: "Yes, refresh!" })
            .then(r => { if (r.isConfirmed) window.location.reload(); });
    };

    // handle delete customer
    const handleDeleteCustomer = async (customer) => {
        const result = await Swal.fire({ title: "Are you sure?", text: `You won't be able to recover ${customer.custNumber} (${customer.name})`, icon: "warning", showCancelButton: true, confirmButtonColor: "#dc2626", cancelButtonColor: "#6b7280", confirmButtonText: "Yes, delete it" });
        if (!result.isConfirmed) return;
        try {
            Swal.fire({ title: "Deleting...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const res = await api.delete(`/customers/${customer.custNumber}`);
            if (res.data.success) {
                setAllData(prev => prev.filter(c => c.custNumber !== customer.custNumber));
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
                const c = row.original;
                return (
                    <div className="flex items-center justify-center gap-0.5">
                        <button onClick={e => { e.stopPropagation(); setEditCustomer(c); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition" title="Edit"><FiEdit2 size={14} /></button>
                        <button onClick={e => { e.stopPropagation(); setSelectedCustomer(c); setViewCustomer(true); }} className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-400 transition" title="View"><FiInfo size={14} /></button>
                        <button onClick={e => { e.stopPropagation(); setPrescriptionsModal(c); }} className="p-1.5 rounded-lg hover:bg-green-50 text-green-500 transition" title="Prescriptions"><FiFileText size={14} /></button>
                        <button onClick={e => { e.stopPropagation(); setJobCardsModal(c); }} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500 transition" title="Job Cards"><FiBriefcase size={14} /></button>
                        <button onClick={e => { e.stopPropagation(); setMembershipModal(c); }}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500 transition" title="Membership"><FiUsers size={14} /></button>
                    </div>
                );
            },
        },
        { header: "Date", accessorKey: "createdAt", cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString("en-IN") : "-" },
        { header: "Id", accessorKey: "custNumber" },
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
        { header: "Address", accessorKey: "address" },
        {
            header: "Loyalty Points", accessorKey: "loyalty_points",
            cell: ({ getValue }) => (
                <span className="flex items-center justify-center gap-1 text-amber-500 font-semibold">
                    <FiStar size={11} /> {getValue() ?? 0}
                </span>
            ),
        },
        {
            header: "Delete", id: "delete",
            cell: ({ row }) => (
                <button onClick={e => { e.stopPropagation(); handleDeleteCustomer(row.original); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 transition mx-auto block">
                    <FiTrash2 size={14} />
                </button>
            ),
        },
    ], []);


    // filter visible columns - show/hide
    const columnVisibility = useMemo(() => ({
        address: pageField?.customerPage?.address?.visible ?? true,
        // email: pageField?.jcPage?.email?.visible ?? true,
    }), [pageField]);

    const table = useReactTable({
        data: isSearching ? filteredData : allData,
        columns,
        state: { globalFilter, columnVisibility },  // add columnVisibility here
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
            <span className="text-sm">Loading customers...</span>
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
                        <CustomerKeywordInput value={keyword} onChange={setKeyword} />
                        <button onClick={searchCustomers}
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
                                <tr><td colSpan={columns.length} className="py-14 text-center text-gray-400 text-sm">No customers found</td></tr>
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

            {/* View Customer Modal */}
            {viewCustomer && selectedCustomer && (
                <Modal onClose={() => { setSelectedCustomer(null); setViewCustomer(false); }} maxWidth="max-w-2xl">
                    <ModalHeader title="Customer Details" subtitle={selectedCustomer?.mobile}
                        onClose={() => { setSelectedCustomer(null); setViewCustomer(false); }} />
                    <div className="px-6 py-5 space-y-5">
                        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
                            <SectionTitle>Personal Information</SectionTitle>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                                <InfoRow label="Date" value={selectedCustomer?.createdAt ? new Date(selectedCustomer.createdAt).toLocaleDateString("en-GB") : "-"} />
                                <InfoRow label="Id" value={selectedCustomer?.custNumber} />
                                <InfoRow label="Name" value={selectedCustomer?.name} />
                                <InfoRow label="Mobile" value={(selectedCustomer?.countryCode || "+91") + " " + selectedCustomer?.mobile} />
                                <InfoRow label="Email" value={selectedCustomer?.email} />

                                {pageField?.customerPage?.address?.visible && (
                                    <InfoRow label="Address" value={selectedCustomer?.address} />
                                )}

                                {pageField?.customerPage?.dob?.visible && (
                                    <InfoRow label="Date of Birth" value={selectedCustomer?.dob ? new Date(selectedCustomer.dob).toLocaleDateString("en-GB") : "-"} />
                                )}

                                {pageField?.customerPage?.anniversary?.visible && (
                                    <InfoRow label="Anniversary" value={selectedCustomer?.anniversary ? new Date(selectedCustomer.anniversary).toLocaleDateString("en-GB") : "-"} />
                                )}
                                <InfoRow label="Loyalty Points" value={
                                    <span className="flex items-center gap-1 text-amber-500">
                                        <FiStar size={12} /> {selectedCustomer?.loyalty_points ?? 0}
                                    </span>
                                } />
                            </div>
                        </div>
                    </div>
                    <ModalFooter>
                        <button onClick={() => { setSelectedCustomer(null); setViewCustomer(false); }}
                            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                            Close
                        </button>
                    </ModalFooter>
                </Modal>
            )}

            {editCustomer && <EditCustomerModal customer={editCustomer} onClose={() => setEditCustomer(null)} onSuccess={() => fetchCustomers()} pageField={pageField} />}

            {prescriptionsModal && <PrescriptionsModal customer={prescriptionsModal} onClose={() => setPrescriptionsModal(null)} />}

            {jobCardsModal && <JobCardsModal customer={jobCardsModal} onClose={() => setJobCardsModal(null)} />}

            {membershipModal && (
                <MembershipModal customer={membershipModal} allCustomers={allData} onClose={() => setMembershipModal(null)} />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit Customer Modal
// ─────────────────────────────────────────────────────────────────────────────
function EditCustomerModal({ customer, onClose, onSuccess, pageField }) {
    const [form, setForm] = useState({ name: "", countryCode: "+91", mobile: "", email: "", address: "", dob: "", anniversary: "", loyalty_points: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (customer) {
            setForm({
                name: customer.name || "",
                countryCode: customer.countryCode || "+91",
                mobile: customer.mobile || "",
                email: customer.email || "",
                address: customer.address || "",
                dob: customer.dob ? customer.dob.slice(0, 10) : "",
                anniversary: customer.anniversary ? customer.anniversary.slice(0, 10) : "",
                loyalty_points: customer.loyalty_points ?? "",
            });
        }
    }, [customer]);

    const update = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async () => {
        setError("");
        if (!form.name.trim()) return setError("Name is required.");
        if (!form.mobile.trim()) return setError("Mobile is required.");

        // dynamic required from field settings
        if (pageField?.customerPage?.address?.required && !form.address.trim()) return setError("Address is required");
        if (pageField?.customerPage?.dob?.required && !form.dob) return setError("Date of Birth is required");
        if (pageField?.customerPage?.anniversary?.required && !form.anniversary) return setError("Anniversary is required");

        try {
            setLoading(true);
            const response = await api.put(`/customers/${customer.custNumber}`, form);
            if (response.data.success) {
                toast.success(response.data.message || "Customer updated successfully");
                onSuccess?.();
                onClose();
            } else {
                toast.error(response.data.message);
            }
        } catch (err) { setError(err?.response?.data?.message || "Failed to update customer."); }
        finally { setLoading(false); }
    };

    const otherFields = [
        { field: "name", metaKey: "name", label: "Name", type: "text", placeholder: "Full name", icon: <FiUser size={13} />, required: true },
        { field: "email", metaKey: "email", label: "Email", type: "email", placeholder: "Email address", icon: <FiMail size={13} /> },
        { field: "address", metaKey: "address", label: "Address", type: "text", placeholder: "Address", icon: <FiMapPin size={13} /> },
        { field: "dob", metaKey: "dob", label: "Date of Birth", type: "date", icon: <FiCalendar size={13} /> },
        { field: "anniversary", metaKey: "anniversary", label: "Anniversary", type: "date", icon: <FiCalendar size={13} /> },
        { field: "loyalty_points", metaKey: "loyalty_points", label: "Loyalty Points", type: "number", placeholder: "0", icon: <FiStar size={13} /> },
    ].filter(({ metaKey }) => pageField?.customerPage?.[metaKey]?.visible !== false);

    return (
        <Modal onClose={onClose} maxWidth="max-w-xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center"><FiUser size={15} className="text-orange-500" /></div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-800">Edit Customer</h2>
                        <p className="text-xs text-gray-400">Update customer information</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition"><FiX size={15} /></button>
            </div>
            <div className="px-6 py-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Name always first */}
                    {pageField?.customerPage?.name?.visible !== false && (
                        <div>
                            <label className={labelCls}>Name <span className="text-red-400">*</span></label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><FiUser size={13} /></span>
                                <input
                                    type="text"
                                    placeholder="Full name"
                                    value={form.name}
                                    onChange={update("name")}
                                    className={iconInputCls}
                                />
                            </div>
                        </div>
                    )}

                    {/* Country Code + Mobile side by side, spanning full row */}
                    {pageField?.customerPage?.mobile?.visible !== false && (
                        <div className="md:col-span-2 grid grid-cols-3 gap-3">
                            {/* Country Code — 1/3 */}
                            <div>
                                <label className={labelCls}>Country Code</label>
                                <PhoneInput
                                    country={"in"}
                                    value={form.countryCode}
                                    onChange={(value, country) => {
                                        setForm(prev => ({ ...prev, countryCode: `+${country.dialCode}` }));
                                    }}
                                    disableCountryCode={false}
                                    inputStyle={{
                                        width: "100%",
                                        height: "38px",
                                        fontSize: "13px",
                                        paddingLeft: "52px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "0.75rem",
                                        backgroundColor: "#f9fafb",
                                        color: "#374151",
                                        outline: "none",
                                        pointerEvents: "none",
                                    }}
                                    buttonStyle={{
                                        border: "1px solid #d1d5db",
                                        borderRight: "none",
                                        borderRadius: "0.75rem 0 0 0.75rem",
                                        backgroundColor: "#f9fafb",
                                    }}
                                    dropdownStyle={{ fontSize: "13px" }}
                                />
                            </div>
                            {/* Mobile — 2/3 */}
                            <div className="col-span-2">
                                <label className={labelCls}>Mobile <span className="text-red-400">*</span></label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><FiPhone size={13} /></span>
                                    <input
                                        type="tel"
                                        placeholder="10-digit mobile"
                                        value={form.mobile}
                                        onChange={update("mobile")}
                                        maxLength={10}
                                        className={iconInputCls}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Rest of fields */}
                    {otherFields.map(({ field, label, type, placeholder, icon, required }) => (
                        <div key={field}>
                            <label className={labelCls}>
                                {label} {required && <span className="text-red-400">*</span>}
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
                                <input
                                    type={type}
                                    placeholder={placeholder}
                                    value={form[field]}
                                    onChange={update(field)}
                                    className={iconInputCls + (type === "date" ? " cursor-pointer" : "")}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {error && <p className="mt-4 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            </div>
            <ModalFooter>
                <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
                <button onClick={handleSubmit} disabled={loading}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed">
                    {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {loading ? "Saving..." : "Save Changes"}
                </button>
            </ModalFooter>
        </Modal>
    );
}