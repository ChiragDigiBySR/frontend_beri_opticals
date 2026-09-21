import { useEffect, useMemo, useRef, useState } from "react";
import {
  useReactTable, getCoreRowModel, getPaginationRowModel,
  getFilteredRowModel, flexRender,
} from "@tanstack/react-table";
import {
  FiInfo, FiTrash2, FiRefreshCw, FiDownload, FiFileText, FiEdit2,
  FiX, FiUser, FiPhone, FiMail, FiSearch, FiChevronLeft, FiChevronRight,
  FiEye, FiPrinter, FiMapPin, FiCalendar
} from "react-icons/fi";
import api from "../../utils/api";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import PrescriptionSection from "../../components/Prescription";
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
    <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(.97) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}.animate-fadeIn{animation:fadeIn .18s ease both}`}</style>
  </div>
);

const ModalHeader = ({ title, subtitle, onClose }) => (
  <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
    <div>
      <h2 className="text-sm font-bold text-gray-800">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition"><FiX size={15} /></button>
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
    <p className="text-sm font-semibold text-gray-800 break-words">{value || "-"}</p>
  </div>
);

const SectionTitle = ({ children }) => (
  <div className="flex items-center gap-2 mb-4">
    <span className="w-0.5 h-4 rounded-full bg-orange-400 inline-block" />
    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{children}</h3>
  </div>
);

const fieldCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 hover:border-orange-300 transition bg-gray-50 text-gray-700 placeholder-gray-400";
const iconInputCls = "w-full pl-9 pr-3 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 hover:border-orange-300 transition placeholder-gray-400";
const selectCls = "w-full px-3 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 hover:border-orange-300 transition cursor-pointer";
const labelCls = "block text-xs font-medium text-gray-600 mb-1.5";

// ─────────────────────────────────────────────────────────────────────────────
// Keyword suggestion input
// ─────────────────────────────────────────────────────────────────────────────
function PrescriptionKeywordInput({ value, onChange }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  const fetchSuggestions = async (q) => {
    if (!q || q.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    try {
      setSearching(true);
      const res = await api.get("/prescriptions/suggestion", { params: { q } });
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
    const nameMatch = s.name ? s.name.toLowerCase().includes(q) : false;
    const mobileMatch = s.mobile ? s.mobile.toLowerCase().includes(q) : false;
    const emailMatch = s.email ? s.email.toLowerCase().includes(q) : false;

    let filled = s.name || s.mobile || "";
    if (mobileMatch && !nameMatch && !emailMatch) filled = s.mobile;
    else if (emailMatch && !nameMatch && !mobileMatch) filled = s.email;
    else filled = s.name || s.mobile || "";

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
          type="text" value={value} onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder="Name or mobile..."
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
                    <FiEye size={11} className="text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{s.name || "-"}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {s.mobile || ""}
                      {s.email ? ` · ${s.email}` : ""}
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
export default function PrescriptionList() {
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
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [viewPrescription, setViewPrescription] = useState(false);
  const [editPrescription, setEditPrescription] = useState(null);
  const [activePrescriptionType, setActivePrescriptionType] = useState("eyewear");
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [sendInvoiceModalOpen, setSendInvoiceModalOpen] = useState(false);

  const dispatch = useDispatch();
  const permissions = useSelector((state) => state.auth.user.permissions);
  const employees = useSelector((state) => state.employees.data);
  const auth = useSelector((state) => state?.auth);
  const pageField = useSelector((state) => state.pageField.data);
  const settings = useSelector((state) => state.settings.data);

  // ── fetch ────────────────────────────────────────────────────────────────
  const fetchPrescriptions = async (pageNumber = 1, append = false) => {
    try {
      pageNumber === 1 ? setLoading(true) : setLoadingMore(true);
      const res = await api.get("/prescriptions", { params: { page: pageNumber, limit: FETCH_LIMIT } });
      if (res.data.success) {
        setAllData(prev => append ? [...prev, ...(res.data.prescriptions || [])] : (res.data.prescriptions || []));
        setHasMore(res.data.hasMore);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); setLoadingMore(false); }
  };

  useEffect(() => { fetchPrescriptions(1, false); }, []);

  const handleRefresh = () => {
    Swal.fire({
      title: "Are you sure?", text: "The page will be refreshed.", icon: "warning",
      showCancelButton: true, confirmButtonColor: "#ea580c", cancelButtonColor: "#9ca3af",
      confirmButtonText: "Yes, refresh!",
    }).then(r => { if (r.isConfirmed) window.location.reload(); });
  };

  const searchPrescriptions = async () => {
    if (!fromDate && !toDate && !keyword) { toast.warning("Please provide at least one filter."); return; }
    if ((fromDate && !toDate) || (!fromDate && toDate)) { toast.warning("Please select both From and To dates."); return; }
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) { toast.warning("From date cannot be greater than To date."); return; }
    if (keyword && keyword.trim().length < 4) { toast.warning("Keyword must be at least 4 characters."); return; }
    try {
      setLoading(true);
      const res = await api.post("/prescriptions/search", {
        startDate: fromDate || undefined, endDate: toDate || undefined, keyword: keyword || undefined,
      });
      if (res.data.success) { setFilteredData(res.data.prescriptions || []); setIsSearching(true); }
      else toast.warning(res.data.message);
    } catch (err) { toast.error(err.response?.data?.message || "Search failed"); }
    finally { setLoading(false); }
  };

  const handleResetSearch = () => { setFilteredData([]); setIsSearching(false); setFromDate(""); setToDate(""); setKeyword(""); };
  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    const next = page + 1; setPage(next); fetchPrescriptions(next, true);
  };

  const handleDelete = async (prescription) => {
    const result = await Swal.fire({
      title: "Are you sure?", text: `Delete prescription ${prescription.presNumber} (${prescription.name})?`, icon: "warning",
      showCancelButton: true, confirmButtonColor: "#dc2626", cancelButtonColor: "#6b7280",
    });
    if (!result.isConfirmed) return;
    try {
      const res = await api.delete(`/prescriptions/${prescription.presNumber}`);
      if (res.data.success) {
        if (isSearching) setFilteredData(prev => prev.filter(p => p.presNumber !== prescription.presNumber));
        else setAllData(prev => prev.filter(p => p.presNumber !== prescription.presNumber));
        Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false });
      }
    } catch (error) { Swal.fire("Error", error.response?.data?.message || "Error", "error"); }
  };

  const handleInvoiceAction = async (invoiceType, withStamp = false) => {
    try {
      const isDownload = invoiceType.toLowerCase().startsWith("download");
      dispatch(showLoader());
      const config = isDownload ? { responseType: "blob" } : {};
      const res = await api.post(`/prescriptions/invoice/${selectedPrescription.presNumber}/`, { invoiceType, withStamp }, config);
      if (isDownload) {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
        link.download = `Invoice_${selectedPrescription._id}.pdf`;
        link.click();
        URL.revokeObjectURL(link.href);
        toast.success("Invoice downloaded successfully");
        setInvoiceModalOpen(false);
      } else {
        toast.success(res.data.message);
        setSendInvoiceModalOpen(false);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Something went wrong");
    } finally { dispatch(hideLoader()); }
  };

  // ── build print HTML (JobCard-style) ─────────────────────────────────────
  const buildPrescriptionHtml = (p, activePrescription) => {
    const data = activePrescription === "eyewear" ? p?.eyewear
      : activePrescription === "transpose" ? p?.transpose
        : p?.contactLens;

    const typeLabel = activePrescription === "eyewear" ? "Eyewear"
      : activePrescription === "transpose" ? "Transpose"
        : "Contact Lens";

    const eyeCard = (eyeKey) => {
      const e = data?.[eyeKey] || {};
      return `<div class="eye-card">
                <div class="eye-title">${eyeKey === "rightEye" ? "Right Eye" : "Left Eye"}</div>
                <div class="eye-grid">
                    <span></span>
                    <span class="eye-head">SPH</span><span class="eye-head">CYL</span>
                    <span class="eye-head">AXIS</span><span class="eye-head">VIS</span>
                    <span class="eye-row-label">D.V</span>
                    <span class="eye-val">${e.sph || "-"}</span><span class="eye-val">${e.cyl || "-"}</span>
                    <span class="eye-val">${e.axis || "-"}</span><span class="eye-val">${e.vis || "-"}</span>
                    <span class="eye-row-label">N.V</span>
                    <span class="eye-val">${e.nv_sph || "-"}</span><span class="eye-val">${e.nv_cyl || "-"}</span>
                    <span class="eye-val">${e.nv_axis || "-"}</span><span class="eye-val">${e.nv_vis || "-"}</span>
                </div>
                <div class="add-row">
                <div><strong>ADD:</strong> ${e.add || "-"}</div>
                <div><strong>PD:</strong> ${e.pd || "-"}</div>
                </div>
            </div>`;
    };

    return `
            <h1>Prescription Details</h1>

            <h2>Customer Information</h2>
            <div class="grid5">
                <div class="field"><label>Prescription No.</label><p>${p?.presNumber || "-"}</p></div>
                <div class="field"><label>Name</label><p>${p?.name || "-"}</p></div>
                <div class="field"><label>Mobile</label><p>${p?.mobile || "-"}</p></div>
                <div class="field"><label>Address</label><p>${p?.address || "-"}</p></div>
                <div class="field"><label>Date</label><p>${p?.createdAt ? new Date(p.createdAt).toLocaleDateString("en-GB") : "-"}</p></div>
                <div class="field"><label>Tested By</label><p>${p?.testedByName || p?.testedBy || "-"}</p></div>
            </div>

            <h2>Billing Summary</h2>
            <div class="grid5">
                <div class="field"><label>Amount</label><p>&#8377;${p?.amount ?? 0}</p></div>
                <div class="field"><label>Discount</label><p>&#8377;${p?.discount ?? 0}</p></div>
                <div class="field"><label>GST (${p?.gstPercent ?? 0}% ${p?.gstType || ""})</label><p>&#8377;${p?.gstAmount ?? 0}</p></div>
                <div class="field"><label>Total</label><p class="total">&#8377;${p?.totalAmount ?? 0}</p></div>
            </div>

            <h2>Prescription — ${typeLabel}</h2>
            <div class="eye-wrap">
                ${eyeCard("rightEye")}
                ${eyeCard("leftEye")}
            </div>`;
  };

  // ── print handler ─────────────────────────────────────────────────────────
  const handlePrintPrescription = () => {
    if (!selectedPrescription) return;

    const bodyContent = buildPrescriptionHtml(selectedPrescription, activePrescriptionType);

    const html = `<!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8"/>
        <title>Prescription — ${selectedPrescription.name}</title>

        <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: Arial, sans-serif;
            font-size: 11px;
            color: #1f2937;
            padding: 28px 32px;
        }

        /* Page header */
        .page-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #f97316;
            padding-bottom: 12px;
            margin-bottom: 18px;
        }

        .shop-name {
            font-size: 20px;
            font-weight: 800;
            color: #ea580c;
            letter-spacing: -0.3px;
        }

        .shop-sub {
            font-size: 10px;
            color: #9ca3af;
            margin-top: 2px;
        }

        /* Logo container */
        .logo-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        /* Logo styling */
        .logo {
            max-height: 55px;
            max-width: 160px;
            object-fit: contain;
        }

        /* Content header */
        h1 {
            font-size: 15px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 4px;
        }

        .meta {
            font-size: 10px;
            color: #6b7280;
            margin-bottom: 18px;
        }

        /* Section titles */
        h2 {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #9ca3af;
            border-left: 3px solid #f97316;
            padding-left: 7px;
            margin: 16px 0 8px;
        }

        /* Info grid */
        .grid5 {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px 16px;
            background: #f9fafb;
            border: 1px solid #f3f4f6;
            border-radius: 8px;
            padding: 12px;
        }

        .field label {
            font-size: 9px;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            display: block;
            margin-bottom: 2px;
        }

        .field p {
            font-size: 11px;
            font-weight: 600;
            color: #111827;
        }

        .field p.total {
            color: #059669;
            font-size: 13px;
            font-weight: 700;
        }

        /* Eye cards */
        .eye-wrap {
            display: flex;
            gap: 16px;
            margin-top: 2px;
        }

        .eye-card {
            flex: 1;
            border: 1px solid #fed7aa;
            border-radius: 8px;
            padding: 10px 12px;
            background: #fff7ed;
        }

        .eye-title {
            font-size: 10px;
            font-weight: 700;
            color: #c2410c;
            text-transform: uppercase;
            letter-spacing: 0.07em;
            margin-bottom: 8px;
            border-bottom: 1px solid #fed7aa;
            padding-bottom: 5px;
        }

        .eye-grid {
            display: grid;
            grid-template-columns: 36px repeat(4, 1fr);
            gap: 4px;
            text-align: center;
        }

        .eye-head {
            font-size: 9px;
            font-weight: 700;
            color: #ea580c;
            text-transform: uppercase;
            padding: 2px 0;
        }

        .eye-row-label {
            font-size: 9px;
            font-weight: 700;
            color: #92400e;
            text-align: left;
            display: flex;
            align-items: center;
        }

        .eye-val {
            font-size: 11px;
            color: #1f2937;
            padding: 3px 0;
        }

        .add-row {
            margin-top: 8px;
            font-size: 10px;
            color: #374151;
            border-top: 1px dashed #fed7aa;
            padding-top: 6px;
        }

        /* Footer */
        .page-footer {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            color: #9ca3af;
        }

        @media print {
            body { padding: 16px 20px; }
            @page { margin: 10mm; }
        }
        </style>

        </head>

        <body>

        <div class="page-header">

            <div>
                <div class="shop-name">${auth?.store?.storeName || ""}</div>
            </div>

            <div class="logo-wrap">
                ${auth?.store?.logo
        ? `<img src="${auth?.store?.logo}" class="logo" />`
        : ``
      }
            </div>

        </div>

        ${bodyContent}

        </body>
        </html>`;

    const win = window.open("", "_blank", "width=860,height=680");
    win.document.write(html);
    win.document.close();
    win.focus();

    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  };




  // ── columns ──────────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      header: "Action", id: "action",
      cell: ({ row }) => {
        const data = row.original;
        return (
          <div className="flex items-center justify-center gap-0.5">
            <button onClick={() => { setSelectedPrescription(data); setViewPrescription(true); }}
              className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-400 transition" title="View">
              <FiInfo size={14} />
            </button>
            <button onClick={e => { e.stopPropagation(); setEditPrescription(data); }}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition" title="Edit">
              <FiEdit2 size={14} />
            </button>
            <button onClick={e => { e.stopPropagation(); setSelectedPrescription(data); setInvoiceModalOpen(true); }}
              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500 transition" title="Download Invoice">
              <FiDownload size={14} />
            </button>
            <button onClick={e => { e.stopPropagation(); setSelectedPrescription(data); setSendInvoiceModalOpen(true); }}
              className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500 transition" title="Send Invoice">
              <FiFileText size={14} />
            </button>
          </div>
        );
      },
    },
    { header: "Date", accessorKey: "createdAt", cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString("en-IN") : "-" },
    { header: "ID", accessorKey: "presNumber" },
    { header: "Name", accessorKey: "name" },
    // { header: "Mobile", accessorKey: "mobile" },
    {
      header: "Mobile",
      cell: ({ row }) => (
        <span>
          {row.original.countryCode || ""} {row.original.mobile}
        </span>
      ),
    },
    { header: "Email", accessorKey: "email" },
    { header: "Amount", accessorKey: "amount", cell: ({ getValue }) => `₹${getValue()}` },
    { header: "GST %", accessorKey: "gstPercent", cell: ({ getValue }) => `${getValue()}%` },
    {
      header: "Total", accessorKey: "totalAmount",
      cell: ({ getValue }) => <span className="font-semibold text-emerald-600">₹{getValue()}</span>,
    },
    ...(permissions.includes("DELETE JC") ? [{
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
  ], [isSearching, permissions]);


  // filter visible columns - show/hide
  const columnVisibility = useMemo(() => ({
    email: pageField?.prescriptionPage?.email?.visible ?? true,
  }), [pageField]);

  const table = useReactTable({
    data: isSearching ? filteredData : allData,
    columns, state: { globalFilter, columnVisibility },
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
      <span className="text-sm">Loading prescriptions...</span>
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
            <PrescriptionKeywordInput value={keyword} onChange={setKeyword} />
            <button onClick={searchPrescriptions}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-xs font-semibold rounded-lg transition shadow-sm">
              <FiSearch size={12} /> Search
            </button>
          </div>
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Table top bar */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-b border-gray-100">
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
                <tr><td colSpan={columns.length} className="py-14 text-center text-gray-400 text-sm">No prescriptions found</td></tr>
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
                  : "bg-orange-500 hover:bg-orange-600 text-white"}`}>
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

      {/* ── View Prescription Modal ── */}
      {viewPrescription && selectedPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="text-sm font-bold text-gray-800">Prescription Details</h2>
                <p className="text-xs text-gray-400 mt-0.5">{selectedPrescription.name} · {selectedPrescription.mobile}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={handlePrintPrescription}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-500 bg-orange-50 hover:bg-orange-100 rounded-lg transition">
                  <FiPrinter size={12} /> Print
                </button>
                <button onClick={() => setViewPrescription(false)} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition"><FiX size={15} /></button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* Customer Info */}
              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
                <SectionTitle>Customer Information</SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-5">
                  <InfoRow label="ID" value={selectedPrescription.presNumber} />
                  <InfoRow label="Name" value={selectedPrescription.name} />
                  <InfoRow label="Mobile" value={(selectedPrescription.countryCode || "+91") + " " + selectedPrescription.mobile} />
                  {
                    pageField?.prescriptionPage?.address?.visible &&
                    <InfoRow label="Address" value={selectedPrescription.address} />
                  }
                  <InfoRow label="Date" value={new Date(selectedPrescription.createdAt).toLocaleString("en-GB")} />
                  <InfoRow label="Tested By" value={selectedPrescription.testedByName || selectedPrescription.testedBy} />
                  <InfoRow label="Created By" value={selectedPrescription.createdByName} />
                  <InfoRow label="Relation Name" value={selectedPrescription.relation_name} />
                  <InfoRow label="Remark" value={selectedPrescription.remark} />
                  <InfoRow
                    label="Next Visit Period"
                    value={
                      selectedPrescription.nextVisitPeriod
                        ? `${selectedPrescription.nextVisitPeriod} ${selectedPrescription.nextVisitPeriod === 1 ? "month" : "months"
                        }`
                        : ""
                    }
                  />

                  {/* Next Visit Date */}
                  <InfoRow
                    label="Next Visit Date"
                    value={
                      selectedPrescription.nextVisitDate
                        ? new Date(selectedPrescription.nextVisitDate).toLocaleDateString("en-GB")
                        : ""
                    }
                  />
                </div>
              </div>

              {/* Billing */}
              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
                <SectionTitle>Billing Summary</SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-5">
                  <InfoRow label="Amount" value={`₹${selectedPrescription.amount}`} />
                  <InfoRow label="Discount" value={`₹${selectedPrescription.discount}`} />
                  <InfoRow label="GST %" value={`${selectedPrescription.gstPercent}%`} />
                  <InfoRow label="GST Type" value={selectedPrescription.gstType} />
                  <InfoRow label="GST Amount" value={`₹${selectedPrescription.gstAmount}`} />
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Total</p>
                    <p className="text-sm font-bold text-emerald-600">₹{selectedPrescription.totalAmount}</p>
                  </div>
                </div>
              </div>

              {/* Prescription Type tabs + table */}
              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
                <SectionTitle>Prescription Type</SectionTitle>
                <div className="flex gap-2 mb-5">
                  {["eyewear", "transpose", "contactLens"].map(type => (
                    <button key={type} onClick={() => setActivePrescriptionType(type)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${activePrescriptionType === type ? "bg-orange-500 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:bg-orange-50"}`}>
                      {type === "eyewear" ? "Eyewear" : type === "transpose" ? "Transpose" : "Contact Lens"}
                    </button>
                  ))}
                </div>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-orange-500 text-white">
                        {["Eye", "SPH", "CYL", "Axis", "VIS", "ADD", "NV SPH", "NV CYL", "NV Axis", "NV VIS", "pd"].map(h => (
                          <th key={h} className="px-3 py-2.5 text-xs font-semibold whitespace-nowrap text-center">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {["rightEye", "leftEye"].map(eye => {
                        const d = selectedPrescription[activePrescriptionType]?.[eye];
                        return (
                          <tr key={eye} className="border-t border-gray-100 even:bg-white hover:bg-orange-50 transition-colors">
                            <td className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap text-center">
                              {eye === "rightEye" ? "Right Eye" : "Left Eye"}
                            </td>
                            {["sph", "cyl", "axis", "vis", "add", "nv_sph", "nv_cyl", "nv_axis", "nv_vis", "pd"].map(k => (
                              <td key={k} className="px-3 py-2.5 text-center text-gray-700">{d?.[k] || "-"}</td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
              <button onClick={() => setViewPrescription(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Download Invoice Modal ── */}
      {invoiceModalOpen && (
        <Modal onClose={() => setInvoiceModalOpen(false)} maxWidth="max-w-sm">
          <ModalHeader
            title="Download Invoice"
            subtitle={selectedPrescription?.name || ""}
            onClose={() => setInvoiceModalOpen(false)}
          />
          <div className="px-6 py-5 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-2">
              <FiDownload size={20} className="text-emerald-500" />
            </div>
            <button onClick={() => handleInvoiceAction("Download with GST")}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition shadow-sm">
              With GST
            </button>
            <button onClick={() => handleInvoiceAction("Download without GST")}
              className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold transition shadow-sm">
              Without GST
            </button>


            {settings?.storeNumber === "store-48" && (
              <>
                <button
                  onClick={() => handleInvoiceAction("Download with GST + Stamp", true)}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition shadow-sm"
                >
                  With GST + Stamp
                </button>

                <button
                  onClick={() => handleInvoiceAction("Download without GST + Stamp", true)}
                  className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition shadow-sm"
                >
                  Without GST + Stamp
                </button>
              </>
            )}
          </div>
          <ModalFooter>
            <button onClick={() => setInvoiceModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
              Cancel
            </button>
          </ModalFooter>
        </Modal>
      )}

      {/* ── Send Invoice Modal ── */}
      {sendInvoiceModalOpen && (
        <Modal onClose={() => setSendInvoiceModalOpen(false)} maxWidth="max-w-sm">
          <ModalHeader
            title="Send Invoice"
            subtitle={selectedPrescription?.name || ""}
            onClose={() => setSendInvoiceModalOpen(false)}
          />
          <div className="px-6 py-5 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center mx-auto mb-2">
              <FiFileText size={20} className="text-purple-500" />
            </div>
            <button onClick={() => handleInvoiceAction("Send with GST")}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition shadow-sm">
              Send With GST
            </button>
            <button onClick={() => handleInvoiceAction("Send without GST")}
              className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold transition shadow-sm">
              Send Without GST
            </button>

            {settings?.storeNumber === "store-48" && (
              <>
                <button
                  onClick={() => handleInvoiceAction("Download with GST + Stamp", true)}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition shadow-sm"
                >
                  With GST + Stamp
                </button>

                <button
                  onClick={() => handleInvoiceAction("Download without GST + Stamp", true)}
                  className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition shadow-sm"
                >
                  Without GST + Stamp
                </button>
              </>
            )}

          </div>
          <ModalFooter>
            <button onClick={() => setSendInvoiceModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
              Cancel
            </button>
          </ModalFooter>
        </Modal>
      )}

      {/* ── Edit Prescription Modal ── */}
      {editPrescription && (
        <EditPrescriptionModal
          prescription={editPrescription}
          onClose={() => setEditPrescription(null)}
          employees={employees}
          onSuccess={() => fetchPrescriptions()}
          pageField={pageField}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit Prescription Modal
// ─────────────────────────────────────────────────────────────────────────────
function EditPrescriptionModal({ prescription, onClose, employees, onSuccess, pageField }) {
  const emptyEye = () => ({ sph: "", cyl: "", axis: "", vis: "", nv_sph: "", nv_cyl: "", nv_axis: "", nv_vis: "", add: "", pd: "" });
  const emptyPrescription = () => ({
    eyewear: { rightEye: emptyEye(), leftEye: emptyEye() },
    transpose: { rightEye: emptyEye(), leftEye: emptyEye() },
    contactLens: { rightEye: emptyEye(), leftEye: emptyEye() },
  });

  const [customerInfo, setCustomerInfo] = useState({ name: "", countryCode: "+91", mobile: "", email: "", testedBy: "NONE", testedByName: "", address: "", remark: "", relation_name: "", nextVisitPeriod: "", nextVisitDate: "" });
  const [prescriptionData, setPrescriptionData] = useState(emptyPrescription());
  const [payment, setPayment] = useState({ amount: "", discount: "", gstType: "Excluded", gstPercent: "0", gstAmount: "", totalAmount: "", transactionType: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!prescription) return;

    setCustomerInfo({
      name: prescription.name || "", countryCode: prescription.countryCode || "+91", mobile: prescription.mobile || "", email: prescription.email || "", testedBy: prescription.testedBy || "NONE", testedByName: prescription.testedByName || "", address: prescription.address || "", remark: prescription.remark || "", relation_name: prescription.relation_name || "",

      nextVisitPeriod: prescription.nextVisitPeriod || "", nextVisitDate: prescription.nextVisitDate ? new Date(prescription.nextVisitDate).toISOString().split("T")[0] : ""
    });

    const merge = (existing) => ({ rightEye: { ...emptyEye(), ...existing?.rightEye }, leftEye: { ...emptyEye(), ...existing?.leftEye } });

    setPrescriptionData({ eyewear: merge(prescription.eyewear), transpose: merge(prescription.transpose), contactLens: merge(prescription.contactLens) });

    setPayment({ amount: prescription.amount ?? "", discount: prescription.discount ?? "", gstType: prescription.gstType || "", gstPercent: prescription.gstPercent ?? "", gstAmount: prescription.gstAmount ?? "", totalAmount: prescription.totalAmount ?? "", transactionType: prescription.transactionType || "" });

  }, [prescription]);

  const updateCustomer = field => e => setCustomerInfo(prev => ({ ...prev, [field]: e.target.value }));
  const updatePayment = field => e => setPayment(prev => ({ ...prev, [field]: e.target.value }));

  const settings = useSelector((state) => state.settings.data);

  const updateNextVisitPeriod = (e) => {
    const value = e.target.value;
    setCustomerInfo(prev => {
      if (!value) return { ...prev, nextVisitPeriod: value, nextVisitDate: "" };
      const d = new Date();
      d.setMonth(d.getMonth() + Number(value));
      return { ...prev, nextVisitPeriod: value, nextVisitDate: d.toISOString().split("T")[0] };
    });
  };

  const handleSubmit = async () => {
    if (!customerInfo.name || customerInfo.name.trim().length < 3) {
      toast.error("Patient name must be at least 3 characters");
      return;
    }
    if (!/^[6-9]\d{9}$/.test(customerInfo.mobile)) {
      toast.error("Please enter a valid 10 digit mobile number");
      return;
    }

    // dynamic required from field settings
    if (pageField?.prescriptionPage?.email?.required && !customerInfo.email) {
      toast.error("Email is required");
      return;
    }

    if (pageField?.prescriptionPage?.address?.required && !customerInfo.address.trim()) {
      toast.error("Address is required");
      return;
    }

    if ((customerInfo.testedBy === "SELF" || customerInfo.testedBy === "OUTSIDE") && !customerInfo.testedByName?.trim()) {
      toast.error("Tested By Name is required");
      return;
    }
    try {
      setLoading(true);
      const response = await api.put(`/prescriptions/${prescription.presNumber}`,
        { ...customerInfo, ...prescriptionData, ...payment }
      );

      if (response.data.success) { toast.success(response.data.message || "Prescription updated successfully"); onSuccess?.(); onClose(); }
      else toast.error(response.data.message);
    } catch (error) { toast.error(error.response?.data?.message || "Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col animate-fadeIn" onClick={e => e.stopPropagation()}>
        <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(.97) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}.animate-fadeIn{animation:fadeIn .18s ease both}`}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
              <FiEye size={15} className="text-orange-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Edit Prescription</h2>
              <p className="text-xs text-gray-400">Update prescription details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition"><FiX size={15} /></button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* Customer Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-0.5 h-4 rounded-full bg-orange-400" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer Info</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className={labelCls}>Name</label>
                <div className="relative">
                  <FiUser size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Customer name" value={customerInfo.name} onChange={updateCustomer("name")} className={iconInputCls} />
                </div>
              </div>

              {/* Country Code */}
              <div>
                <label className={labelCls}>
                  <span className="flex items-center gap-1.5">
                    <FiPhone size={14} className="text-gray-800" />
                    Country Code
                  </span>
                </label>
                <PhoneInput
                  country={"in"}
                  value={customerInfo.countryCode}
                  onChange={(value, country) => {
                    setCustomerInfo((prev) => ({
                      ...prev,
                      countryCode: `+${country.dialCode}`,
                    }));
                  }}
                  disableCountryCode={false}
                  disableSearchIcon
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

              <div>
                <label className={labelCls}>Mobile</label>
                <div className="relative">
                  <FiPhone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="tel" placeholder="10-digit mobile" value={customerInfo.mobile} onChange={updateCustomer("mobile")} className={iconInputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <div className="relative">
                  <FiMail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" placeholder="Email address" value={customerInfo.email} onChange={updateCustomer("email")} className={iconInputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Address</label>
                <div className="relative">
                  <FiMapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" placeholder="Address" value={customerInfo.address} onChange={updateCustomer("address")} className={iconInputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Relation Name</label>
                <div className="relative">
                  <FiUser size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" placeholder="" value={customerInfo.relation_name} onChange={updateCustomer("relation_name")} className={iconInputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Remark</label>
                <div className="relative">
                  <FiFileText size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" placeholder="" value={customerInfo.remark} onChange={updateCustomer("remark")} className={iconInputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Next Visit</label>
                <select value={customerInfo.nextVisitPeriod} onChange={updateNextVisitPeriod} className={selectCls}>
                  <option value="">Select</option>
                  <option value="1">1 Month</option>
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Next Visit Date</label>
                <div className="relative">
                  <FiCalendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="date" value={customerInfo.nextVisitDate} onChange={updateCustomer("nextVisitDate")} className={iconInputCls} />
                </div>
              </div>

            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Tested By</label>
                <select value={customerInfo.testedBy} onChange={updateCustomer("testedBy")} className={selectCls}>
                  <option value="NONE">None</option>
                  <option value="SELF">Self</option>
                  <option value="OUTSIDE">Outside</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Tested By Name</label>
                {customerInfo.testedBy === "SELF" && (
                  <select value={customerInfo.testedByName} onChange={updateCustomer("testedByName")} className={selectCls}>
                    <option value="">Select Employee</option>
                    {employees?.map(emp => <option key={emp._id} value={emp.name}>{emp.name}</option>)}
                  </select>
                )}
                {customerInfo.testedBy === "OUTSIDE" && (
                  <input type="text" placeholder="Doctor / Shop name" value={customerInfo.testedByName} onChange={updateCustomer("testedByName")} className={fieldCls} />
                )}
                {customerInfo.testedBy === "NONE" && (
                  <input type="text" value="" disabled placeholder="Not Applicable" className="w-full px-3 py-2.5 text-sm text-gray-400 bg-gray-100 border border-gray-200 rounded-lg outline-none cursor-not-allowed" />
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />
          <PrescriptionSection prescription={prescriptionData} setPrescription={setPrescriptionData} />
          <div className="border-t border-gray-100" />

          {/* Payment */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-0.5 h-4 rounded-full bg-orange-400" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment Details</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[["Amount (₹)", "amount"], ["Discount (₹)", "discount"], ["GST Amount (₹)", "gstAmount"], ["Total Amount (₹)", "totalAmount"]].map(([lbl, field]) => (
                <div key={field}>
                  <label className={labelCls}>{lbl}</label>
                  <input type="number" placeholder="0" value={payment[field]} onChange={updatePayment(field)} className={fieldCls} />
                </div>
              ))}
              <div>
                <label className={labelCls}>GST %</label>
                <select value={payment.gstPercent} onChange={updatePayment("gstPercent")} className={selectCls}>
                  {/* <option value="0">Select</option> */}

                  {/* {[5, 12, 18, 28].map(g => <option key={g} value={g}>{g}%</option>)} */}

                  {/* GST Values From settings */}
                  {
                    settings?.gst?.map((val, index) => {
                      return (
                        <option key={index} value={val}>{val}%</option>
                      )
                    })
                  }
                </select>
              </div>
              <div>
                <label className={labelCls}>GST Type</label>
                <select value={payment.gstType} onChange={updatePayment("gstType")} className={selectCls}>
                  <option value="">Select</option>
                  <option value="Excluded">Excluded</option>
                  <option value="Included">Included</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Transaction Type</label>
                <select value={payment.transactionType} onChange={updatePayment("transactionType")} className={selectCls}>
                  <option value="">Select</option>
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="NA">NA</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl flex-shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed">
            {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}