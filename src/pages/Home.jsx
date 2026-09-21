import { useEffect, useState, useMemo } from "react";
import api from "../utils/api";
import {
  useReactTable, getCoreRowModel, getPaginationRowModel,
  getFilteredRowModel, flexRender,
} from "@tanstack/react-table";
import { toast } from "react-toastify";
import {
  FiInfo, FiEdit2, FiTrash2, FiRefreshCw, FiDownload, FiFileText,
  FiX, FiPrinter, FiChevronLeft, FiChevronRight, FiUsers, FiImage,
  FiClipboard, FiCheckCircle, FiClock, FiAlertCircle, FiLayers, FiEye, FiSend
} from "react-icons/fi";
import { MdOutlineReceiptLong } from "react-icons/md";
import { IoPrintOutline } from "react-icons/io5";
import { showLoader, hideLoader } from "../features/loader/loaderSlice";
import { useDispatch, useSelector } from "react-redux";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";


// direct print invoice
import {
  buildInvoiceData,
  generateAdvanceInvoiceWithGstHTML,
  generateAdvanceInvoiceWithoutGstHTML,
  generateDeliveredInvoiceWithGstHTML,
  generateDeliveredInvoiceWithoutGstHTML,
  printInvoiceHTML,
  generateThermalAdvanceInvoiceHTML,
  generateThermalDeliveredInvoiceHTML,

  generateSlipHTML, // Nazar opticals thermal slip
} from "../utils/invoiceTemplates";

const FETCH_LIMIT = 100;
const PAGE_SIZE = 10;

// ─── Print helpers (matches JobCardList) ─────────────────────────────────────
const triggerPrint = (html, title = "Job Card") => {
  const win = window.open("", "_blank", "width=860,height=1100");
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); win.close(); }, 400);
};

// print preview
const triggerPrintA5 = (innerHTML, title = "Print", pageSize = "A4") => {
  const win = window.open("", "_blank");
  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          @page {
            size: ${pageSize};
            margin: 0;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 0;
            font-family: sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #printContent {
            width: 148mm;
            min-height: 210mm;
            padding: 14mm;
            background: #fff;
          }
        </style>
      </head>
      <body>
        <div id="printContent">${innerHTML}</div>
        <script>
          window.onload = () => { window.print(); window.close(); }
        </script>
      </body>
    </html>
  `);
  win.document.close();
};

const buildQuickViewHtml = (jc, auth, pageField) => `
    <!DOCTYPE html><html><head><meta charset="UTF-8"/>
    <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;font-size:11px;color:#1f2937;padding:28px 32px}
    .page-header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #f97316;padding-bottom:12px;margin-bottom:18px}
    .shop-name{font-size:20px;font-weight:800;color:#ea580c;letter-spacing:-0.3px}
    .logo{max-height:55px;max-width:160px;object-fit:contain}
    h1{font-size:15px;font-weight:700;color:#111827;margin-bottom:4px}
    .meta{font-size:10px;color:#6b7280;margin-bottom:18px}
    h2{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#9ca3af;border-left:3px solid #f97316;padding-left:7px;margin:16px 0 8px}
    .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px 16px;background:#f9fafb;border:1px solid #f3f4f6;border-radius:8px;padding:12px}
    .field label{font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:2px}
    .field p{font-size:11px;font-weight:600;color:#111827}
    .total{color:#059669;font-weight:700;font-size:13px}
    @media print{body{padding:16px 20px}@page{margin:10mm}}
    </style></head><body>
    <div class="page-header">
      <div class="shop-name">${auth?.store?.storeName || ""}</div>
      ${auth?.store?.logo ? `<img src="${auth.store.logo}" class="logo"/>` : ""}
    </div>
    <h1>Job Card — Quick View</h1>
    <div class="meta">Bill No: ${jc?.billNo || "-"} &nbsp;·&nbsp; Printed: ${new Date().toLocaleString("en-IN")}</div>
    <h2>Customer & Payment</h2>
    <div class="grid4">
      <div class="field"><label>Date</label><p>${jc?.orderDate ? new Date(jc.orderDate).toLocaleDateString("en-GB") : "-"}</p></div>

      ${pageField?.jcPage?.bill_no?.visible ? `<div class="field"><label>Bill No.</label><p>${jc?.billNo || "-"}</p></div>` : ""}
      <div class="field"><label>Name</label><p>${jc?.name || "-"}</p></div>
      <div class="field"><label>Mobile</label><p>${jc?.mobile || "-"}</p></div>

      ${pageField?.jcPage?.email?.visible ? `<div class="field"><label>Email</label><p>${jc?.email || "-"}</p></div>` : ""}

      <div class="field"><label>Total</label><p class="total">&#8377;${jc?.total || 0}</p></div>

      ${pageField?.jcPage?.add_discount?.visible ? `<div class="field"><label>Add. Discount</label><p class="total">&#8377;${jc?.additionalDiscount || 0}</p></div>` : ""}

      ${pageField?.jcPage?.loyalty_discount?.visible ? `<div class="field"><label>Loyalty Discount</label><p class="total">&#8377;${jc?.loyaltyDiscount || 0}</p></div>` : ""}

      <div class="field"><label>Advance</label><p>&#8377;${jc?.advance || 0}</p></div>
      <div class="field"><label>Balance</label><p>&#8377;${jc?.balance || 0}</p></div>
      <div class="field"><label>Tx Type</label><p>${jc?.transactionType || "-"}</p></div>
      <div class="field"><label>Remark</label><p>${jc?.remark || "-"}</p></div>
    </div>
    </body></html>
`;

const buildFullDetailsHtml = (jc, products, prescription, activePrescription, auth) => {


  // reusable eye card (NOW accepts data)
  const eyeCard = (eyeKey, data) => {
    const e = data?.[eyeKey] || {};

    return `
        <div class="eye-card">
            <div class="eye-title">${eyeKey === "rightEye" ? "Right Eye" : "Left Eye"}</div>

            <div class="eye-grid">
                <span></span>
                <span class="eye-head">SPH</span>
                <span class="eye-head">CYL</span>
                <span class="eye-head">AXIS</span>
                <span class="eye-head">VIS</span>

                <span class="eye-row-label">D.V</span>
                <span class="eye-val">${e.sph || "-"}</span>
                <span class="eye-val">${e.cyl || "-"}</span>
                <span class="eye-val">${e.axis || "-"}</span>
                <span class="eye-val">${e.vis || "-"}</span>

                <span class="eye-row-label">N.V</span>
                <span class="eye-val">${e.nv_sph || "-"}</span>
                <span class="eye-val">${e.nv_cyl || "-"}</span>
                <span class="eye-val">${e.nv_axis || "-"}</span>
                <span class="eye-val">${e.nv_vis || "-"}</span>
            </div>

            <div class="add-row">
                <strong>ADD:</strong> ${e.add || "-"}
            </div>
        </div>`;
  };

  // 🔥 build ALL prescription blocks
  const prescriptionBlocks = (Array.isArray(prescription) ? prescription : [prescription])
    .map((pres, index) => {

      const key = pres?._id ?? index;

      const selectedType = activePrescription?.[key] ?? "eyewear";

      const data =
        selectedType === "eyewear"
          ? pres?.eyewear
          : selectedType === "transpose"
            ? pres?.transpose
            : pres?.contactLens;

      // 🔥 LINKED PRODUCT LOGIC (same as UI)
      const linkedProduct = products?.find(p => p.productKey === pres?.productKey);
      const productIndex = products?.findIndex(p => p.productKey === pres?.productKey);

      const productLabel = linkedProduct
        ? `${productIndex >= 0 ? `Product #${productIndex + 1} — ` : ""}${linkedProduct.category === "OTHER"
          ? linkedProduct.otherProductName
          : linkedProduct.productName
        }`
        : "Product not found";

      return `
        <div style="margin-bottom:16px;">
            <div style="
                font-size:10px;
                font-weight:700;
                color:#374151;
                margin-bottom:6px;
                border-left:3px solid #f97316;
                padding-left:6px;
                display:flex;
                justify-content:space-between;
                gap:10px;
            ">
                <span>Prescription ${index + 1}</span>

                <span style="color:#1d4ed8; font-weight:600;">
                    ${productLabel}
                </span>

                <span style="color:#ea580c;">
                    ${selectedType === "eyewear"
          ? "Eyewear"
          : selectedType === "transpose"
            ? "Transpose"
            : "Contact Lens"}
                </span>
            </div>

            <div class="eye-wrap">
                ${eyeCard("rightEye", data)}
                ${eyeCard("leftEye", data)}
            </div>
        </div>
        `;
    })
    .join("");

  // product rows
  const prodRows = (products || [])
    .map(
      (p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${p.category === "OTHER" ? p.otherCategory : p.category}</td>
            <td>${p.category === "OTHER" ? p.otherProductName : p.productName}</td>
            <td>${p.quantity}</td>
            <td>&#8377;${p.price}</td>
            <td>${p.discountPercent}%</td>
            <td>&#8377;${p.discount}</td>
            <td>${p.gstMode}</td>
            <td>${p.gstPercent}%</td>
            <td class="total-cell">&#8377;${p.total}</td>
        </tr>`
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8"/>

    <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,sans-serif;font-size:11px;color:#1f2937;padding:28px 32px;}

    .page-header{
        display:flex;justify-content:space-between;align-items:center;
        border-bottom:2px solid #f97316;padding-bottom:12px;margin-bottom:18px;
    }

    .shop-name{font-size:20px;font-weight:800;color:#ea580c;}
    .logo{max-height:55px;max-width:160px;object-fit:contain;}

    h1{font-size:15px;font-weight:700;margin-bottom:4px;}
    h2{
        font-size:9px;font-weight:700;text-transform:uppercase;
        color:#9ca3af;border-left:3px solid #f97316;
        padding-left:7px;margin:16px 0 8px;
    }

    .grid4{
        display:grid;grid-template-columns:repeat(4,1fr);
        gap:8px 16px;background:#f9fafb;
        border:1px solid #f3f4f6;border-radius:8px;padding:12px;
    }

    .field label{font-size:9px;color:#9ca3af;}
    .field p{font-size:11px;font-weight:600;}

    .eye-wrap{display:flex;gap:16px;}
    .eye-card{
        flex:1;border:1px solid #fed7aa;border-radius:8px;
        padding:10px;background:#fff7ed;
    }

    .eye-title{font-size:10px;font-weight:700;color:#c2410c;margin-bottom:8px;}
    .eye-grid{display:grid;grid-template-columns:36px repeat(4,1fr);gap:4px;text-align:center;}
    .eye-head{font-size:9px;font-weight:700;color:#ea580c;}
    .eye-row-label{font-size:9px;font-weight:700;text-align:left;}
    .eye-val{font-size:11px;}

    .add-row{margin-top:8px;font-size:10px;border-top:1px dashed #fed7aa;padding-top:6px;}

    .product-table{width:100%;border-collapse:collapse;margin-top:6px;font-size:10px;}
    .product-table th{
        background:#fff7ed;color:#c2410c;font-weight:700;
        padding:6px;border:1px solid #fed7aa;
    }
    .product-table td{padding:6px;border:1px solid #f3f4f6;}
    .total-cell{font-weight:700;color:#059669;}
    </style>

    </head>

    <body>

    <div class="page-header">
        <div class="shop-name">${auth?.store?.storeName || ""}</div>
        ${auth?.store?.logo ? `<img src="${auth.store.logo}" class="logo"/>` : ``}
    </div>

    <h1>Job Card Details</h1>

    <h2>Customer Information</h2>
    <div class="grid4">
        <div class="field"><label>Name</label><p>${jc?.name || "-"}</p></div>
        <div class="field"><label>Mobile</label><p>${jc?.mobile || "-"}</p></div>
        <div class="field"><label>Order Date</label><p>${jc?.orderDate ? new Date(jc.orderDate).toLocaleDateString("en-GB") : "-"}</p></div>
        <div class="field"><label>Delivery Date</label><p>${jc?.deliveryDate ? new Date(jc.deliveryDate).toLocaleDateString("en-GB") : "-"}</p></div>
    </div>

    

    ${prescriptionBlocks}

    <h2>Products</h2>
    <table class="product-table">
        <thead>
        <tr>
            <th>#</th><th>Category</th><th>Product</th><th>Qty</th>
            <th>Price</th><th>Disc%</th><th>Disc Amt</th>
            <th>GST Mode</th><th>GST%</th><th>Total</th>
        </tr>
        </thead>
        <tbody>
        ${prodRows || `<tr><td colspan="10">No products</td></tr>`}
        </tbody>
    </table>

    </body>
    </html>
    `;
};

// ─── Shared primitives ────────────────────────────────────────────────────────
const Modal = ({ children, onClose, maxWidth = "max-w-5xl" }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
    <div className={`bg-white w-full ${maxWidth} max-h-[92vh] rounded-2xl shadow-2xl flex flex-col animate-fadeIn`} onClick={e => e.stopPropagation()}>
      {children}
    </div>
    <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(.97) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}.animate-fadeIn{animation:fadeIn .18s ease both}`}</style>
  </div>
);

const ModalHeader = ({ title, subtitle, onClose, onPrint }) => (
  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
    <div>
      <h2 className="text-sm font-bold text-gray-800">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    <div className="flex items-center gap-1.5">
      {onPrint && (
        <button onClick={onPrint}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-500 bg-orange-50 hover:bg-orange-100 rounded-lg transition">
          <FiPrinter size={12} /> Print
        </button>
      )}
      <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition">
        <FiX size={15} />
      </button>
    </div>
  </div>
);

const ModalFooter = ({ children }) => (
  <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl flex-shrink-0">
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="w-0.5 h-4 bg-orange-400 rounded-full" />
    <span className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">{children}</span>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
    <p className="text-sm font-semibold text-gray-800">{value ?? "-"}</p>
  </div>
);

const StatusBadge = ({ value }) => {
  const map = {
    Active: "bg-blue-50   text-blue-600   border-blue-200",
    Delivered: "bg-emerald-50 text-emerald-600 border-emerald-200",
    Cancelled: "bg-red-50    text-red-500    border-red-200",
    Draft: "bg-gray-100  text-gray-500   border-gray-200",
    "Ready To Deliver": "bg-orange-50 text-orange-600 border-orange-200",
    "Lens Ordered": "bg-purple-50 text-purple-600 border-purple-200",
  };
  return (
    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border whitespace-nowrap ${map[value] || "bg-gray-100 text-gray-500 border-gray-200"}`}>
      {value || "-"}
    </span>
  );
};

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color, onClick, active }) => {
  const map = {
    orange: { bg: "bg-orange-50", icon: "text-orange-500", ring: "ring-orange-200" },
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-500", ring: "ring-emerald-200" },
    blue: { bg: "bg-blue-50", icon: "text-blue-500", ring: "ring-blue-200" },
    purple: { bg: "bg-purple-50", icon: "text-purple-500", ring: "ring-purple-200" },
    amber: { bg: "bg-amber-50", icon: "text-amber-500", ring: "ring-amber-200" },
    gray: { bg: "bg-gray-100", icon: "text-gray-500", ring: "ring-gray-200" },
  };
  const c = map[color] || map.orange;
  return (
    <div onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 transition
                ${onClick ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : ""}
                ${active ? `ring-2 ${c.ring}` : ""}`}>
      <div className={`w-11 h-11 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className={c.icon} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800 leading-none">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{label}</p>
      </div>
    </div>
  );
};

const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition";
const labelCls = "text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1";

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [statusCount, setStatusCount] = useState({
    totalJobCards: 0, activeJobCards: 0, draftJobCards: 0,
    deliveredJobCards: 0, readyToDeliverJobCards: 0,
    lensFollowupJobCards: 0, totalEmployees: 0, totalTasks: 0,
  });

  const [jobCards, setJobCards] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedJcProducts, setSelectedJcProducts] = useState(null);
  const [selectedJcStatus, setSelectedJcStatus] = useState(null);
  const [selectedJcPresciption, setSelectedJcPresciption] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [selectedJC, setSelectedJC] = useState(null);
  const [viewJCInfo, setViewJCInfo] = useState(false);
  const [viewJC, setViewJC] = useState(false);
  const [viewTemplate, setViewTemplate] = useState(false);    // view A5 template print
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  // direct invoice print modal
  const [printInvoiceModalOpen, setPrintInvoiceModalOpen] = useState(false);

  const [sendInvoiceModalOpen, setSendInvoiceModalOpen] = useState(false);
  const [activePrescription, setActivePrescription] = useState("eyewear");

  const store = useSelector((state) => state.auth.store);
  const settings = useSelector((s) => s?.settings?.data);
  const pageField = useSelector((state) => state.pageField.data);
  const permissions = useSelector((s) => s?.auth?.user?.permissions || []);
  const auth = useSelector((s) => s?.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [waModalOpen, setWaModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const resetAllStates = () => {
    setJobCards([]); setPage(1); setHasMore(true); setLoadingMore(false);
    setSelectedJcProducts(null); setSelectedJcStatus(null);
    setSelectedJcPresciption(null); setSelectedFilter(null); setSelectedJC(null);
    setViewJCInfo(false); setViewJC(false); setStatusModalOpen(false);
  };

  const fetchStats = async () => {
    try {
      dispatch(showLoader());
      const res = await api.get("/jc/count");
      if (res.data?.success) {
        const s = res.data.statusCounts || {};
        setStatusCount({
          totalJobCards: s.totalJobCards || 0,
          activeJobCards: s.activeJobCards || 0,
          draftJobCards: s.draftJobCards || 0,
          deliveredJobCards: s.deliveredJobCards || 0,
          readyToDeliverJobCards: s.readyToDeliverJobCards || 0,
          lensFollowupJobCards: s.lensFollowupJobCards || 0,
          totalEmployees: s.totalEmployees || 0,
          totalTasks: res.data?.totalTasks || 0,
        });
      }
    } catch (err) { console.error(err); }
    finally { dispatch(hideLoader()); }
  };

  useEffect(() => { fetchStats(); }, []);

  const getJobCardsByStatus = async (status, pstatus) => {
    try {
      dispatch(showLoader());
      setSelectedFilter({ status, pstatus }); setPage(1);
      const res = await api.get("/jc/filter", { params: { status, pstatus, page: 1, limit: FETCH_LIMIT } });
      if (res.data?.success) { setHasMore(res.data.hasMore); setJobCards(res.data.jobCards || []); }
    } catch (err) { console.error(err); }
    finally { dispatch(hideLoader()); }
  };

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || !selectedFilter) return;
    try {
      dispatch(showLoader()); setLoadingMore(true);
      const nextPage = page + 1;
      const res = await api.get("/jc/filter", {
        params: { status: selectedFilter.status, pstatus: selectedFilter.pstatus, page: nextPage, limit: FETCH_LIMIT },
      });
      if (res.data?.success) {
        setJobCards(prev => [...prev, ...(res.data.jobCards || [])]);
        setHasMore(res.data.hasMore); setPage(nextPage);
      }
    } catch (err) { console.error(err); }
    finally { setLoadingMore(false); dispatch(hideLoader()); }
  };

  const fetchJobCardProducts = async (jobCardId) => {
    try {
      const res = await api.get(`/jc/jc-product/${jobCardId}`);
      if (res.data?.success) {
        setSelectedJcProducts(res.data.products);
        setSelectedJcStatus(res.data.jcStatus);
        setSelectedJcPresciption(res.data.prescription);
      } else { setSelectedJcProducts([]); setSelectedJcStatus([]); }
    } catch { setSelectedJcProducts([]); setSelectedJcStatus([]); }
  };

  const handleDownloadInvoice = async (showPrescription, prescriptionType, showGst, thermal = false, pageSize) => {
    dispatch(showLoader());
    try {
      const response = await api.post(
        `/invoice/download/${selectedJC._id}`,
        { showPrescription, prescriptionType, showGst, thermal, pageSize },
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url; link.setAttribute("download", `invoice-${selectedJC.jcNo}.pdf`);
      document.body.appendChild(link); link.click(); link.remove();
      toast.success("Invoice downloaded"); setInvoiceModalOpen(false);
    } catch { toast.error("Failed to download invoice"); }
    finally { dispatch(hideLoader()); }
  };

  const handleSendInvoice = async (showPrescription, prescriptionType, showGst, thermal = false, pageSize) => {
    dispatch(showLoader());
    try {
      const response = await api.post(`/invoice/send/${selectedJC._id}`, { showPrescription, prescriptionType, showGst, thermal, pageSize });
      if (!response.data.success) throw new Error();
      toast.success("Invoice sent"); setSendInvoiceModalOpen(false);
    } catch { toast.error("Failed to send invoice"); }
    finally { dispatch(hideLoader()); }
  };

  const handleDeleteJobCard = async (jc) => {
    const result = await Swal.fire({
      title: "Are you sure?", text: "You won't be able to recover this job card",
      icon: "warning", showCancelButton: true,
      confirmButtonColor: "#dc2626", cancelButtonColor: "#6b7280", confirmButtonText: "Yes, delete it",
    });
    if (!result.isConfirmed) return;
    try {
      Swal.fire({ title: "Deleting...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const res = await api.delete(`/jc/${jc.jcNumber}`);
      if (res.data.success) {
        setJobCards(prev => prev.filter(j => j._id !== jc._id));
        Swal.fire({ icon: "success", title: "Deleted!", timer: 1500, showConfirmButton: false });
      }
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error", text: error.response?.data?.message || "Something went wrong" });
    }
  };


  // direct invoice print
  const handlePrintInvoice = (showPrescription, showGst) => {
    const store = auth?.store;
    const invoiceData = buildInvoiceData(selectedJC, selectedJcProducts || [], selectedJcPresciption || [], store);
    invoiceData.showPrescription = showPrescription;

    let html = "";
    if (selectedJC.status === "Active") {
      html = showGst
        ? generateAdvanceInvoiceWithGstHTML(invoiceData)
        : generateAdvanceInvoiceWithoutGstHTML(invoiceData);
    } else {
      html = showGst
        ? generateDeliveredInvoiceWithGstHTML(invoiceData)
        : generateDeliveredInvoiceWithoutGstHTML(invoiceData);
    }

    printInvoiceHTML(html);
    setPrintInvoiceModalOpen(false);
  };

  const handleThermalPrint = (showGst) => {
    const store = auth?.store;
    const invoiceData = buildInvoiceData(selectedJC, selectedJcProducts || [], selectedJcPresciption || [], store);

    const html = selectedJC.status === "Active"
      ? generateThermalAdvanceInvoiceHTML(invoiceData, showGst)
      : generateThermalDeliveredInvoiceHTML(invoiceData, showGst);

    printInvoiceHTML(html, true);
    setThermalPrintModalOpen(false);
  };


  // Nazar opticals client slip
  const handleSlipPrint = () => {
    const store = auth?.store;
    const invoiceData = buildInvoiceData(selectedJC, selectedJcProducts || [], selectedJcPresciption || [], store);
    const html = generateSlipHTML(invoiceData);
    printInvoiceHTML(html, true);
  };


  // Copy to clipboard msg
  // const copyJobCardMessage = async (jcrow) => {
  //   try {
  //     if (!jcrow) return;

  //     let msg = "";

  //     const jobCardId = jcrow?.jcNumber;
  //     const name = jcrow?.name;
  //     const total = jcrow?.total;
  //     const advance = jcrow?.advance;
  //     const balance = jcrow?.balance;

  //     const bdate = new Date(jcrow?.orderDate).toLocaleDateString();
  //     const ddate = new Date(jcrow?.deliveryDate).toLocaleDateString();

  //     switch (jcrow?.pstatus) {
  //       case "In-process":

  //         msg = `DELIVERY CARD \n🗒️ REF NO. ${jobCardId} \n📆 Date of Booking: ${bdate} \n📆 Date of Delivery: ${ddate} \n💰 Total Amount: ${total} \n💵 Advance: ${advance} \n💳 Balance: ${balance} \n🕗 Store Timings: ${auth?.store?.storeTiming || ""} \n\nRegards \n${auth?.store?.storeName} \nWhatsApp: +91 ${auth?.store?.mobile}`;

  //         break;

  //       case "Delivered":
  //         msg = `✅ *Order Delivered* \n\nDear ${name}, \n\nWe are pleased to inform you that your order has been successfully delivered.\n\nWe hope you are satisfied with your purchase. \n\nThank you for choosing ${auth?.store?.storeName}. \n\nRegards \nContact us: +91 ${auth?.store?.mobile}`;

  //         break;

  //       case "Ready To Deliver":
  //         msg = `📦 *Order Ready for Pickup* \n\nDear Customer, \n\nYour Order is now *ready for delivery*. \n\nKindly collect it at your convenience. \n\n🕒 Store Timings: ${auth?.store?.storeTiming} \n\nThank you for choosing us 🙏 \n\nRegards, \n\n${auth?.store?.storeName} \n📱 WhatsApp: +91 ${auth?.store?.mobile}`;

  //         break;

  //       default:
  //         toast.error("Invalid status");
  //         return;
  //     }

  //     await navigator.clipboard.writeText(msg);
  //     toast.success("Message copied");
  //   } catch (err) {
  //     console.error(err);
  //     toast.error("Copy failed");
  //   }
  // };


  const buildWhatsAppMessage = (jcrow, status) => {
    const jobCardId = jcrow?.jcNumber;
    const name = jcrow?.name;
    const total = jcrow?.total;
    const advance = jcrow?.advance;
    const balance = jcrow?.balance;

    const bdate = new Date(jcrow?.orderDate).toLocaleDateString();
    const ddate = new Date(jcrow?.deliveryDate).toLocaleDateString();

    switch (status) {
      case "In-process":
        return `DELIVERY CARD \n🗒️ REF NO. ${jobCardId} \n📆 Date of Booking: ${bdate} \n📆 Date of Delivery: ${ddate} \n💰 Total Amount: ${total} \n💵 Advance: ${advance} \n💳 Balance: ${balance} \n🕗 Store Timings: ${auth?.store?.storeTiming || ""} \n\nRegards \n${auth?.store?.storeName} \nWhatsApp: +91 ${auth?.store?.mobile}`;

      case "Delivered":
        return `✅ *Order Delivered* \n\nDear ${name}, \n\nWe are pleased to inform you that your order has been successfully delivered.\n\nWe hope you are satisfied with your purchase. \n\nThank you for choosing ${auth?.store?.storeName}. \n\nRegards \nContact us: +91 ${auth?.store?.mobile}`;

      case "Ready To Deliver":
        return `📦 *Order Ready for Pickup* \n\nDear Customer, \n\nYour Order is now *ready for delivery*. \n\nKindly collect it at your convenience. \n\n🕒 Store Timings: ${auth?.store?.storeTiming} \n\nThank you for choosing us 🙏 \n\nRegards, \n\n${auth?.store?.storeName} \n📱 WhatsApp: +91 ${auth?.store?.mobile}`;

      default:
        return "";
    }
  };


  const sendWhatsAppMessage = (status) => {
    try {
      if (!selectedRow) return;

      const msg = buildWhatsAppMessage(selectedRow, status);
      if (!msg) {
        toast.error("Invalid status");
        return;
      }

      const rawMobile = (selectedRow?.mobile || "").replace(/\D/g, "");

      if (!rawMobile) {
        toast.error("Customer mobile number not found");
        return;
      }

      const formattedMobile = rawMobile.startsWith("91")
        ? rawMobile
        : `91${rawMobile}`;

      const url = `https://wa.me/${formattedMobile}?text=${encodeURIComponent(
        msg
      )}`;

      const isMobile =
        /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(
          navigator.userAgent
        );

      const desktopUrl = `https://web.whatsapp.com/send?phone=${formattedMobile}&text=${encodeURIComponent(msg)}`;
      const mobileUrl = `https://wa.me/${formattedMobile}?text=${encodeURIComponent(msg)}`;

      if (isMobile) {
        window.location.href = mobileUrl;
      } else {
        window.open(desktopUrl, "_blank", "noopener,noreferrer");
      }

      setWaModalOpen(false);
      setSelectedRow(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to open WhatsApp");
    }
  };



  const columns = useMemo(() => [
    {
      header: "Actions", id: "actions",
      cell: ({ row }) => {
        const jcrow = row.original;
        return (
          <div className="flex items-center gap-0.5">
            <button onClick={e => { e.stopPropagation(); setSelectedJC(jcrow); setViewJCInfo(true); }}
              className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition" title="Quick View">
              <FiPrinter size={14} />
            </button>
            {permissions.includes("EDIT JC") && (
              <button onClick={e => { e.stopPropagation(); navigate("/edit/jc", { state: { jobCardId: jcrow.jcNumber } }); }}
                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition" title="Edit">
                <FiEdit2 size={14} />
              </button>
            )}
            <button onClick={async e => { e.stopPropagation(); setSelectedJC(jcrow); await fetchJobCardProducts(jcrow.jcNumber); setViewJC(true); }}
              className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-400 transition" title="View Details">
              <FiInfo size={14} />
            </button>

            {/* Copy to clipboard whatsapp msg */}
            {/* Send message */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRow(jcrow);
                setWaModalOpen(true);
              }}
              className="p-1.5 rounded-lg hover:bg-green-50 text-green-400 transition"
              title="Send WhatsApp msg"
            >
              <FiSend size={14} />
            </button>


            {permissions.includes("UPDATE JOB CARD STATUS") && (
              <button onClick={() => { setStatusModalOpen(true); setSelectedJC(jcrow); }}
                className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-400 transition" title="Update Status">
                <FiRefreshCw size={14} />
              </button>
            )}


            {/* Direct Print invoice modal */}
            <button
              onClick={async e => {
                e.stopPropagation();
                setSelectedJC(jcrow);
                await fetchJobCardProducts(jcrow.jcNumber);
                setPrintInvoiceModalOpen(true);
              }}
              className="p-1.5 rounded-lg hover:bg-amber-50 transition" title="Print Invoice">
              <IoPrintOutline color="#eb6e34" size={14} />
            </button>

            <button onClick={e => { e.stopPropagation(); setSelectedJC(jcrow); setInvoiceModalOpen(true); }}
              className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500 transition" title="Download Invoice">
              <FiDownload size={14} />
            </button>
            <button onClick={e => { e.stopPropagation(); setSelectedJC(jcrow); setSendInvoiceModalOpen(true); }}
              className="p-1.5 rounded-lg hover:bg-sky-50 text-sky-500 transition" title="Send Invoice">
              <FiFileText size={14} />
            </button>
          </div>
        );
      },
    },
    // { header: "Date", accessorKey: "createdAt", cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleDateString("en-IN") : "-" },
    {
      header: "Date",
      accessorKey: "orderDate",
      cell: ({ getValue }) => {
        const value = getValue();
        if (!value) return "-";

        const [year, month, day] = value.slice(0, 10).split("-");
        return `${day}-${month}-${year}`;
      },
    },
    { header: "JC ID", accessorKey: "jcNumber" },

    // conditional column - Bill number
    ...(pageField?.jcPage?.bill_no?.visible !== false ? [{ header: "Bill No.", accessorKey: "billNo" }] : []),

    { header: "Customer", accessorKey: "name" },
    { header: "Mobile", accessorKey: "mobile" },

    // conditional column - email
    ...(pageField?.jcPage?.bill_no?.visible !== false ? [{ header: "Email", accessorKey: "email" }] : []),

    { header: "Net Total", accessorKey: "netTotal", cell: ({ getValue }) => <span className="font-semibold text-gray-800">₹{getValue() ?? "-"}</span> },
    { header: "Advance", accessorKey: "advance" },
    { header: "Balance", accessorKey: "balance", cell: ({ getValue }) => <span className={getValue() > 0 ? "font-semibold text-red-500" : "text-gray-400"}>{getValue()}</span> },
    { header: "Tx Type", accessorKey: "transactionType", cell: ({ getValue }) => <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">{getValue()}</span> },
    { header: "Status", accessorKey: "status", cell: ({ getValue }) => <StatusBadge value={getValue()} /> },
    { header: "Process", accessorKey: "pstatus", cell: ({ getValue }) => <span className="text-xs text-gray-500 whitespace-nowrap">{getValue()}</span> },
    ...(permissions.includes("DELETE JC") ? [{
      header: "Delete", id: "delete",
      cell: ({ row }) => (
        <button onClick={e => { e.stopPropagation(); handleDeleteJobCard(row.original); }}
          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition mx-auto block" title="Delete">
          <FiTrash2 size={14} />
        </button>
      ),
    }] : []),
  ], [permissions]);

  const table = useReactTable({
    data: jobCards, columns,
    initialState: { pagination: { pageIndex: 0, pageSize: PAGE_SIZE } },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const currentPage = table.getState().pagination.pageIndex;
  const totalPages = table.getPageCount();
  const MAX_PAGES = 5;
  let startPage = Math.max(0, currentPage - Math.floor(MAX_PAGES / 2));
  let endPage = Math.min(totalPages, startPage + MAX_PAGES);
  const pages = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);
  const filterLabel = selectedFilter ? (selectedFilter.pstatus || selectedFilter.status) : "";


  const A4_OPTIONS = [
    {
      label: "With Prescription + GST",
      desc: "Full A4 invoice with prescription and GST",
      args: [true, "eyewear", true, false, "A4"],
      dot: "bg-emerald-400",
      hover: "hover:border-emerald-200 hover:bg-emerald-50/60",
    },
    {
      label: "GST Only",
      desc: "A4 invoice with GST, no prescription",
      args: [false, "eyewear", true, false, "A4"],
      dot: "bg-orange-400",
      hover: "hover:border-orange-200 hover:bg-orange-50/60",
    },
    {
      label: "Without GST",
      desc: "Simple A4 invoice without GST",
      args: [true, "eyewear", false, false, "A4"],
      dot: "bg-sky-400",
      hover: "hover:border-sky-200 hover:bg-sky-50/60",
    },
  ];

  const A5_OPTIONS = [
    {
      label: "With Prescription + GST",
      desc: "Includes prescription details and GST breakdown",
      args: [true, "eyewear", true, false, "A5"],
      dot: "bg-emerald-400",
      hover: "hover:border-emerald-200 hover:bg-emerald-50/60",
    },
    {
      label: "GST Only",
      desc: "Invoice with GST breakdown, no prescription",
      args: [false, "eyewear", true, false, "A5"],
      dot: "bg-orange-400",
      hover: "hover:border-orange-200 hover:bg-orange-50/60",
    },
    {
      label: "Without GST",
      desc: "Simple invoice without GST or prescription",
      args: [true, "eyewear", false, false, "A5"],
      dot: "bg-sky-400",
      hover: "hover:border-sky-200 hover:bg-sky-50/60",
    },
  ];

  const THERMAL_OPTIONS = [
    {
      label: "Thermal + GST",
      desc: "80mm thermal receipt with GST breakdown",
      args: [false, "eyewear", true, true],
      dot: "bg-violet-400",
      hover: "hover:border-violet-200 hover:bg-violet-50/60",
    },
    {
      label: "Thermal — No GST",
      desc: "80mm thermal receipt without GST",
      args: [false, "eyewear", false, true],
      dot: "bg-pink-400",
      hover: "hover:border-pink-200 hover:bg-pink-50/60",
    },
  ];

  // ── Shared button renderer ─────────────────────────────────────────────────
  const OptionButton = ({ label, desc, args, dot, hover }) => (
    <button
      key={label}
      onClick={() => handleSendInvoice(...args)}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white transition-all text-left group ${hover}`}
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-800">{label}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
      </div>
      <FiChevronRight size={13} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition" />
    </button>
  );



  const closeViewJC = () => {
    setSelectedJC(null); setSelectedJcProducts(null); setSelectedJcStatus(null);
    setSelectedJcPresciption(null); setActivePrescription("eyewear"); setViewJC(false);
    // also close A5 print preview
    setViewTemplate(false);
  };

  return (
    <div className="p-6 mb-24 bg-gray-50 min-h-screen space-y-6">

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Active Cards" value={statusCount.activeJobCards} icon={FiCheckCircle} color="emerald"
          active={selectedFilter?.status === "Active" && !selectedFilter?.pstatus}
          onClick={() => getJobCardsByStatus("Active", "")} />
        <StatCard label="Total Cards" value={statusCount.totalJobCards} icon={FiLayers} color="orange" />
        <StatCard label="Employees" value={statusCount.totalEmployees} icon={FiUsers} color="blue" />
        <StatCard label="Total Tasks" value={statusCount.totalTasks} icon={FiClipboard} color="purple" />
        <StatCard label="Delivered" value={statusCount.deliveredJobCards} icon={FiCheckCircle} color="blue"
          active={selectedFilter?.status === "Delivered"}
          onClick={() => getJobCardsByStatus("Delivered", "")} />
        <StatCard label="Lens Followup" value={statusCount.lensFollowupJobCards} icon={FiEye} color="purple"
          active={selectedFilter?.pstatus === "Lens Ordered"}
          onClick={() => getJobCardsByStatus("Active", "Lens Ordered")} />
        <StatCard label="Ready to Deliver" value={statusCount.readyToDeliverJobCards} icon={FiAlertCircle} color="amber"
          active={selectedFilter?.pstatus === "Ready To Deliver"}
          onClick={() => getJobCardsByStatus("Active", "Ready To Deliver")} />
        <StatCard label="Draft Cards" value={statusCount.draftJobCards} icon={FiClock} color="gray"
          active={selectedFilter?.status === "Draft"}
          onClick={() => getJobCardsByStatus("Draft", "Draft")} />
      </div>

      {/* ── Job Cards Table ── */}
      {selectedFilter && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-4 bg-orange-400 rounded-full" />
              <span className="text-sm font-bold text-gray-800">Job Cards</span>
              <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-[10px] font-bold border border-orange-100">
                {filterLabel}
              </span>
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
                  <tr><td colSpan={columns.length} className="py-14 text-center text-gray-400 text-sm">No job cards found</td></tr>
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
            <button onClick={handleLoadMore} disabled={!hasMore || loadingMore}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition
                                ${loadingMore || !hasMore ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600 text-white"}`}>
              {loadingMore ? "Loading..." : "Load More"}
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
      )}

      {/* ── Quick View Modal ── */}
      {viewJCInfo && selectedJC && (
        <Modal onClose={() => { setSelectedJC(null); setViewJCInfo(false); }} maxWidth="max-w-2xl">
          <ModalHeader
            title="Job Card"
            subtitle={`Bill No. ${selectedJC.billNo} · ${selectedJC.name}`}
            onClose={() => { setSelectedJC(null); setViewJCInfo(false); }}
            onPrint={() => triggerPrint(buildQuickViewHtml(selectedJC, auth, pageField), `JC - ${selectedJC?.billNo}`)}
          />
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <InfoRow label="Date" value={selectedJC?.orderDate ? new Date(selectedJC.orderDate).toLocaleDateString("en-GB") : "-"} />

              {
                pageField?.jcPage?.bill_no?.visible && <InfoRow label="Bill No." value={selectedJC?.billNo} />
              }

              <InfoRow label="Name" value={selectedJC?.name} />
              <InfoRow label="Mobile" value={selectedJC?.mobile} />

              {
                pageField?.jcPage?.email?.visible && <InfoRow label="Email" value={selectedJC?.email} />
              }
              <InfoRow label="Net Total" value={`₹${selectedJC?.netTotal}`} />

              {
                pageField?.jcPage?.add_discount?.visible && <InfoRow label="Add. Discount" value={`₹${selectedJC?.additionalDiscount}`} />
              }

              {
                pageField?.jcPage?.loyalty_discount?.visible && <InfoRow label="Loyalty Discount" value={`₹${selectedJC?.loyaltyDiscount}`} />
              }
              <InfoRow label="Advance" value={`₹${selectedJC?.advance}`} />
              <InfoRow label="Balance" value={`₹${selectedJC?.balance}`} />
              <InfoRow label="Transaction Type" value={selectedJC?.transactionType} />
              <InfoRow label="Remark" value={selectedJC?.remark} />
            </div>
          </div>
          <ModalFooter>

            {/* Nazar opticals client only */}
            {auth?.store?.storeName?.includes("Nazar") &&
              <button onClick={handleSlipPrint}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition">
                <FiPrinter size={12} /> Print Slip
              </button>
            }

            <button onClick={() => { setSelectedJC(null); setViewJCInfo(false); }}
              className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
              Close
            </button>
          </ModalFooter>
        </Modal>
      )}

      {/* ── Full Details Modal ── */}
      {viewJC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-7xl h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white flex-shrink-0">
              <div>
                <h2 className="text-sm font-bold text-gray-800">Job Card Details</h2>
                <p className="text-xs text-gray-400 mt-0.5">{selectedJC?.billNo} · {selectedJC?.jcNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Print Layout button — from Doc 9 */}
                <button
                  onClick={() => setViewTemplate(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-600 bg-orange-100 hover:bg-orange-200 rounded-lg transition">
                  <FiPrinter size={12} /> Print Layout
                </button>
                <button
                  onClick={() => triggerPrint(buildFullDetailsHtml(selectedJC, selectedJcProducts, selectedJcPresciption, activePrescription, auth), `JC - ${selectedJC?.billNo}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-600 bg-orange-100 hover:bg-orange-200 rounded-lg transition">
                  <FiPrinter size={12} /> Print
                </button>
                <button onClick={closeViewJC} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition">
                  <FiX size={15} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* ── Customer Information ── */}
              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
                <SectionTitle>Customer Information</SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  <InfoRow label="Order Date" value={selectedJC?.orderDate ? new Date(selectedJC.orderDate).toLocaleDateString("en-GB") : "-"} />
                  <InfoRow label="Delivery Date" value={selectedJC?.deliveryDate ? new Date(selectedJC.deliveryDate).toLocaleDateString("en-GB") : "-"} />
                  <InfoRow label="Name" value={selectedJC?.name} />
                  <InfoRow label="Mobile" value={selectedJC?.mobile} />

                  {pageField?.jcPage?.email?.visible && (
                    <InfoRow label="Email" value={selectedJC?.email} />
                  )}
                  {pageField?.jcPage?.address?.visible && (
                    <InfoRow label="Address" value={selectedJC?.address} />
                  )}
                  {pageField?.jcPage?.employee?.visible && (
                    <InfoRow label="Tested By" value={selectedJC?.testedByName} />
                  )}
                  {pageField?.jcPage?.refferredBy?.visible && (
                    <InfoRow label="Referred By" value={[selectedJC?.referredByType, selectedJC?.referName].filter(Boolean).join(" ") || "-"} />
                  )}
                </div>
              </div>

              {/* ── Payment Summary ── */}
              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
                <SectionTitle>Payment Summary</SectionTitle>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  <InfoRow label="Sub Total" value={`₹${selectedJC?.subTotal}`} />

                  {pageField?.jcPage?.add_discount?.visible && (
                    <InfoRow label="Additional Discount" value={`₹${selectedJC?.additionalDiscount}`} />
                  )}
                  {pageField?.jcPage?.loyalty_discount?.visible && (
                    <InfoRow label="Loyalty Discount" value={`₹${selectedJC?.loyaltyDiscount}`} />
                  )}

                  <InfoRow label="Net Total" value={<span className="text-emerald-600">₹{selectedJC?.netTotal}</span>} />
                  <InfoRow label="Advance" value={`₹${selectedJC?.advance}`} />
                  <InfoRow label="Balance" value={<span className={selectedJC?.balance > 0 ? "text-red-500" : ""}>₹{selectedJC?.balance}</span>} />
                  <InfoRow label="Transaction Type" value={selectedJC?.transactionType} />
                  <InfoRow label="Remark" value={selectedJC?.remark} />
                </div>
              </div>



              {/* ── Prescriptions (multi-Rx, per-product) ── */}
              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
                <SectionTitle>Prescriptions</SectionTitle>

                {(!selectedJcPresciption || selectedJcPresciption.length === 0) ? (
                  <p className="text-xs text-gray-400 italic">No prescriptions added for this job card.</p>
                ) : (
                  <div className="space-y-5">
                    {selectedJcPresciption.map((rx, rxIdx) => {
                      // Find the linked product by productKey
                      const linkedProduct = selectedJcProducts?.find(p => p.productKey === rx.productKey);
                      const productIndex = selectedJcProducts?.findIndex(p => p.productKey === rx.productKey);

                      return (
                        <div key={rx._id || rxIdx} className="border border-blue-100 rounded-2xl p-4 bg-white">

                          {/* Rx Header — which product it belongs to */}
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-base">🔬</span>
                            <span className="text-xs font-bold text-gray-700">
                              Prescription {rxIdx + 1}
                            </span>
                            {linkedProduct ? (
                              <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                                {productIndex >= 0 ? `Product #${productIndex + 1} — ` : ""}
                                {linkedProduct.category === "OTHER"
                                  ? linkedProduct.otherProductName
                                  : linkedProduct.productName}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                Product not found
                              </span>
                            )}
                          </div>

                          {/* Tab switcher — per-Rx active state keyed by rx._id */}
                          <div className="flex gap-2 mb-4">
                            {["eyewear", "transpose", "contactLens"].map(type => (
                              <button
                                key={type}
                                onClick={() => setActivePrescription(prev => ({
                                  ...prev,
                                  [rx._id || rxIdx]: type
                                }))}
                                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all
                                                              ${(activePrescription?.[rx._id || rxIdx] ?? "eyewear") === type
                                    ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                                    : "bg-white text-gray-500 border-gray-200 hover:border-orange-200 hover:text-orange-500"
                                  }`}
                              >
                                {type === "eyewear" ? "Eyewear" : type === "transpose" ? "Transpose" : "Contact Lens"}
                              </button>
                            ))}
                          </div>

                          {/* Eye data grid */}
                          {(() => {
                            const activeType = activePrescription?.[rx._id || rxIdx] ?? "eyewear";
                            const data = rx[activeType];
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {["rightEye", "leftEye"].map(eyeKey => (
                                  <div key={eyeKey} className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                                    <div className="flex items-center gap-2 mb-3">
                                      <span className="w-1.5 h-1.5 rounded-full bg-orange-300" />
                                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        {eyeKey === "rightEye" ? "Right Eye" : "Left Eye"}
                                      </h4>
                                    </div>
                                    <div className="grid grid-cols-[36px_1fr_1fr_1fr_1fr] gap-1.5 text-center text-xs">
                                      <span />
                                      {["SPH", "CYL", "AXIS", "VIS"].map(h => (
                                        <span key={h} className="font-bold text-gray-400 py-1">{h}</span>
                                      ))}
                                      <span className="text-gray-400 font-semibold text-right pr-1 self-center text-[10px]">D.V</span>
                                      {["sph", "cyl", "axis", "vis"].map(f => (
                                        <div key={f} className="py-1.5 bg-white border border-gray-100 rounded-lg text-gray-700 font-medium">
                                          {data?.[eyeKey]?.[f] || "-"}
                                        </div>
                                      ))}
                                      <span className="text-gray-400 font-semibold text-right pr-1 self-center text-[10px]">N.V</span>
                                      {["nv_sph", "nv_cyl", "nv_axis", "nv_vis"].map(f => (
                                        <div key={f} className="py-1.5 bg-white border border-gray-100 rounded-lg text-gray-700 font-medium">
                                          {data?.[eyeKey]?.[f] || "-"}
                                        </div>
                                      ))}
                                    </div>
                                    <div className="grid grid-cols-[36px_1fr_1fr_1fr_1fr] gap-1.5 text-center text-xs">
                                      <span className="font-bold text-gray-400 py-1">ADD</span>
                                      <div className="px-3 py-1 bg-white border border-gray-100 rounded-lg text-gray-700 font-medium">
                                        {data?.[eyeKey]?.add || "-"}
                                      </div>
                                      <span className="font-bold text-gray-400 py-1">PD</span>
                                      <div className="px-3 py-1 bg-white border border-gray-100 rounded-lg text-gray-700 font-medium">
                                        {data?.[eyeKey]?.pd || "-"}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Job Card Products ── */}
              <div>
                <SectionTitle>Job Card Products</SectionTitle>
                <div className="overflow-x-auto rounded-2xl border border-gray-200">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-200">
                        {[
                          "Category", "Product", "Qty", "Price", "Disc %", "Disc Amt",
                          ...(auth?.store?.hasGst ? ["GST Mode", "GST Type", "GST %", "GST Amt"] : []),
                          "Total", "Image", "Lens Avl", "Order To", "HSN",
                          "Booked By", "Commission", "Is Free Item"
                        ].map((h, i) => (
                          <th key={i} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-800 whitespace-nowrap uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedJcProducts || []).map((p, idx) => (
                        <tr
                          key={idx}
                          className={`border-b border-gray-50 whitespace-nowrap ${p.isFreeItem ? "bg-teal-50/40 hover:bg-teal-50" : "hover:bg-gray-50"}`}
                        >
                          <td className="px-3 py-2">{p.category === "OTHER" ? p.otherCategory : p.category}</td>
                          <td className="px-3 py-2">
                            {p.category === "OTHER" ? p.otherProductName : p.productName}
                          </td>
                          <td className="px-3 py-2">{p.quantity}</td>
                          <td className="px-3 py-2">₹{p.price}</td>
                          <td className="px-3 py-2">{p.discountPercent}%</td>
                          <td className="px-3 py-2">₹{p.discount}</td>
                          {auth?.store?.hasGst ? (
                            <>
                              <td className="px-3 py-2">{p.gstMode}</td>
                              <td className="px-3 py-2">{p.gstType}</td>
                              <td className="px-3 py-2">{p.gstPercent}%</td>
                              <td className="px-3 py-2">₹{p.gstAmount}</td>
                            </>
                          ) : null}
                          <td className="px-3 py-2 font-semibold text-emerald-600">
                            {p.isFreeItem ? <span className="text-teal-600">₹0.00</span> : `₹${p.total}`}
                          </td>
                          <td className="px-3 py-2">
                            {p?.image && (
                              <button onClick={() => window.open(p.image, "_blank")}
                                className="px-2 py-1 bg-orange-50 text-orange-500 rounded-lg hover:bg-orange-100 font-medium">
                                View
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-2">{p.lensAvailibility}</td>
                          <td className="px-3 py-2">{p.vendorName}</td>
                          <td className="px-3 py-2">{p.hsnSac}</td>
                          <td className="px-3 py-2">{p.bookedByName}</td>
                          <td className="px-3 py-2">{p.commissionAmount}</td>
                          <td className="px-3 py-2">
                            {p.isFreeItem ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-teal-100 text-teal-700 border border-teal-200">
                                Free
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-600">
                                Paid
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Status History ── */}
              <div>
                <SectionTitle>Status History</SectionTitle>
                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-200">
                        {["Date", "Status", "Amount", "Transaction Type", "Note"].map((h, i) => (
                          <th key={i} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-800 whitespace-nowrap uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedJcStatus || []).map((s, idx) => (
                        <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap">{s.createdAt ? new Date(s.createdAt).toLocaleString() : "-"}</td>
                          <td className="px-4 py-2"><StatusBadge value={s.status} /></td>
                          <td className="px-4 py-2 font-semibold text-emerald-600">{s.amount ? `₹${s.amount}` : "-"}</td>
                          <td className="px-4 py-2">
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-600">
                              {s.transactionType}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-500">{s.statusNote}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
              <button onClick={closeViewJC}
                className="px-5 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── JC A5 print Details Modal ── */}
      {viewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "94vh" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white flex-shrink-0">
              <div>
                <h2 className="text-sm font-bold text-gray-800">Print Preview</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedJC?.billNo} · {selectedJC?.jcNumber}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    triggerPrintA5(
                      document.getElementById("printArea").innerHTML,
                      `JC - ${selectedJC?.billNo}`,
                      "A5"
                    )
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition">
                  <FiPrinter size={12} /> Print
                </button>
                <button
                  onClick={() => { closeViewJC(); }}
                  className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition">
                  <FiX size={15} />
                </button>
              </div>
            </div>

            {/* Body - Print Preview Only */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
              <div className="flex justify-center">
                <div
                  id="printArea"
                  style={{
                    width: "148mm",
                    minHeight: "210mm",
                    background: "#fff",
                    border: "0.5px solid #e5e5e5",
                    borderRadius: 8,
                    padding: "14mm",
                    fontSize: 11,
                    color: "#222",
                    fontFamily: "sans-serif",
                    boxSizing: "border-box",
                  }}
                >

                  {/* Logo + Title */}
                  <div style={{ textAlign: "center", marginBottom: 12 }}>
                    <img
                      src={auth?.store?.logo}
                      alt={auth?.store?.storeName}
                      style={{ height: 34, marginBottom: 6, display: "inline-block" }}
                    />
                    <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: "0.3px" }}>Order Form</div>
                    <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>Computer generated document</div>
                  </div>

                  <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "10px 0" }} />

                  {/* Order Details */}
                  <div style={{ fontSize: 10, color: "#666", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>
                    Order Details
                  </div>
                  <div style={{ border: "0.5px solid #ddd", borderRadius: 6, padding: "8px 10px", marginBottom: 12 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
                      <tbody>
                        {[
                          ["Customer", selectedJC?.name],
                          ["SO No.", selectedJC?.jcNumber],
                          ["Order Date", selectedJC?.orderDate ? new Date(selectedJC.orderDate).toLocaleDateString("en-GB") : "—"],
                          ["Mobile", selectedJC?.mobile],
                          ["Remarks", selectedJC?.remark],
                        ].map(([label, value]) => (
                          <tr key={label}>
                            <td style={{ color: "#888", padding: "3px 0", width: "38%" }}>{label}</td>
                            <td style={{ color: "#111", fontWeight: 500 }}>{value || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Products */}
                  <div style={{ fontSize: 10, color: "#666", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>
                    Products
                  </div>
                  <div style={{ border: "0.5px solid #e5e5e5", borderRadius: 6, padding: "8px 10px", marginBottom: 12 }}>


                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                      <thead>
                        <tr style={{ borderBottom: "0.5px solid #eee" }}>
                          <th style={{ textAlign: "left", color: "#999", fontWeight: 500, padding: "2px 6px 6px 0", fontSize: 9.5 }}>Type</th>
                          <th style={{ textAlign: "left", color: "#999", fontWeight: 500, padding: "2px 6px 6px 0", fontSize: 9.5 }}>Brand</th>
                          <th style={{ textAlign: "left", color: "#999", fontWeight: 500, padding: "2px 6px 6px 0", fontSize: 9.5 }}>Product</th>
                          <th style={{ textAlign: "left", color: "#999", fontWeight: 500, padding: "2px 6px 6px 0", fontSize: 9.5 }}>Type</th>
                          <th style={{ textAlign: "left", color: "#999", fontWeight: 500, padding: "2px 6px 6px 0", fontSize: 9.5 }}>Lens</th>
                        </tr>
                      </thead>

                      <tbody>
                        {(selectedJcProducts || []).map((p, i) => (
                          <tr key={i} style={{ borderBottom: "0.5px solid #f5f5f5" }}>
                            {/* Column 1 */}
                            <td style={{ padding: "4px 6px 4px 0", color: "#555" }}>
                              {p.category == "OTHER" ? (p.otherCategory || "—") : (p.category || "—")}
                            </td>

                            {/* Column 2 merged (span 4 columns) */}
                            <td style={{ padding: "4px 6px 4px 0", color: "#555" }} colSpan={4}>
                              {p.category == "OTHER" ? (p.otherProductName || "—") : (p.productName || "—")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                  </div>

                  {/* Prescription */}
                  <div style={{ fontSize: 10, color: "#666", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>
                    Prescription
                  </div>

                  {(!selectedJcPresciption || selectedJcPresciption.length === 0) ? (
                    <div style={{ border: "0.5px solid #e5e5e5", borderRadius: 6, padding: "8px 10px", marginBottom: 16, fontSize: 10, color: "#aaa", fontStyle: "italic" }}>
                      No prescriptions added.
                    </div>
                  ) : (
                    (selectedJcPresciption || []).map((rx, rxIdx) => {
                      const linkedProduct = (selectedJcProducts || []).find(p => p.productKey === rx.productKey);
                      const productIndex = (selectedJcProducts || []).findIndex(p => p.productKey === rx.productKey);
                      const eyeData = rx?.eyewear;

                      return (
                        <div
                          key={rx._id || rxIdx}
                          style={{ border: "0.5px solid #e5e5e5", borderRadius: 6, padding: "8px 10px", marginBottom: 10 }}
                        >
                          {/* Rx header */}
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#444" }}>
                              Prescription {rxIdx + 1}
                            </span>
                            {linkedProduct && (
                              <span style={{
                                fontSize: 9, color: "#1d6fa8", background: "#e8f2fb",
                                border: "0.5px solid #b5d4f4", borderRadius: 20,
                                padding: "1px 7px", fontWeight: 600
                              }}>
                                {productIndex >= 0 ? `Product #${productIndex + 1} — ` : ""}
                                {linkedProduct.category === "OTHER"
                                  ? linkedProduct.otherProductName
                                  : linkedProduct.productName}
                              </span>
                            )}
                          </div>

                          {/* Eyewear table */}
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                            <thead>
                              <tr style={{ borderBottom: "0.5px solid #eee" }}>
                                {["Eye", "SPH", "CYL", "AXIS", "ADD", "VIS"].map(h => (
                                  <th key={h} style={{ textAlign: "left", color: "#999", fontWeight: 500, padding: "2px 6px 6px 0", fontSize: 9.5 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                ["Right", eyeData?.rightEye],
                                ["Left", eyeData?.leftEye],
                              ].map(([eye, data]) => (
                                <tr key={eye} style={{ borderBottom: "0.5px solid #f5f5f5" }}>
                                  <td style={{ padding: "4px 6px 4px 0", fontWeight: 600, color: "#333" }}>{eye}</td>
                                  <td style={{ padding: "4px 6px 4px 0", color: "#111" }}>{data?.sph || "—"}</td>
                                  <td style={{ padding: "4px 6px 4px 0", color: "#111" }}>{data?.cyl || "—"}</td>
                                  <td style={{ padding: "4px 6px 4px 0", color: "#111" }}>{data?.axis || "—"}</td>
                                  <td style={{ padding: "4px 6px 4px 0", color: "#111" }}>{data?.add || "—"}</td>
                                  <td style={{ padding: "4px 0", color: "#111" }}>{data?.vis || "—"}</td>
                                </tr>
                              ))}

                            </tbody>
                          </table>
                        </div>
                      );
                    })
                  )}

                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end px-6 py-4 border-t bg-gray-50 gap-2">
              <button
                onClick={() =>
                  triggerPrintA5(
                    document.getElementById("printArea").innerHTML,
                    `JC - ${selectedJC?.billNo}`,
                    "A5"
                  )
                }
                className="px-5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition">
                Print
              </button>
              <button
                onClick={() => { closeViewJC(); }}
                className="px-5 py-2 text-xs border rounded-xl hover:bg-gray-100 transition">
                Close
              </button>
            </div>

          </div>
        </div>
      )}


      {/* ── Download Invoice Modal ── */}
      {invoiceModalOpen && (
        <Modal onClose={() => setInvoiceModalOpen(false)} maxWidth="max-w-sm">
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <FiDownload size={18} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800">Download Invoice</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedJC?.name} · {selectedJC?.jcNo || selectedJC?.billNo}
                </p>
              </div>
            </div>
            <button onClick={() => setInvoiceModalOpen(false)} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 transition">
              <FiX size={15} />
            </button>
          </div>

          <div className="px-6 py-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
              Download Format
            </p>

            {/* A4 + A5 side by side */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { size: "A4", options: A4_OPTIONS },
                { size: "A5", options: A5_OPTIONS },
              ].map(({ size, options }) => (
                <div key={size} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1 mb-1">
                    <FiFileText size={11} className="text-gray-400" />
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{size}</p>
                  </div>
                  {options.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => handleDownloadInvoice(...opt.args)}
                      className={`w-full flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-white transition-all text-left group ${opt.hover}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${opt.dot}`} />
                      <p className="text-[11px] font-semibold text-gray-700 leading-tight">{opt.label}</p>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-200 mb-4" />

            {/* Thermal below */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <FiPrinter size={11} className="text-gray-400" />
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Thermal Print (80mm)</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {THERMAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => handleDownloadInvoice(...opt.args)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-white transition-all text-left group ${opt.hover}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${opt.dot}`} />
                    <p className="text-[11px] font-semibold text-gray-700 leading-tight">{opt.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ModalFooter>
            <button onClick={() => setInvoiceModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition w-full">
              Cancel
            </button>
          </ModalFooter>
        </Modal>
      )}

      {/* ── Send Invoice Modal ── */}
      {sendInvoiceModalOpen && (
        <Modal onClose={() => setSendInvoiceModalOpen(false)} maxWidth="max-w-sm">
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <FiFileText size={18} className="text-orange-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800">Send Invoice</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedJC?.name} · {selectedJC?.jcNo || selectedJC?.billNo}
                </p>
              </div>
            </div>
            <button onClick={() => setSendInvoiceModalOpen(false)} className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 transition">
              <FiX size={15} />
            </button>
          </div>

          <div className="px-6 py-5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
              Send Format
            </p>

            {/* A4 + A5 side by side */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { size: "A4", options: A4_OPTIONS },
                { size: "A5", options: A5_OPTIONS },
              ].map(({ size, options }) => (
                <div key={size} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1 mb-1">
                    <FiFileText size={11} className="text-gray-400" />
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{size}</p>
                  </div>
                  {options.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => handleSendInvoice(...opt.args)}
                      className={`w-full flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-white transition-all text-left group ${opt.hover}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${opt.dot}`} />
                      <p className="text-[11px] font-semibold text-gray-700 leading-tight">{opt.label}</p>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-200 mb-4" />

            {/* Thermal below */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <FiPrinter size={11} className="text-gray-400" />
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Thermal Print (80mm)</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {THERMAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => handleSendInvoice(...opt.args)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 bg-white transition-all text-left group ${opt.hover}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${opt.dot}`} />
                    <p className="text-[11px] font-semibold text-gray-700 leading-tight">{opt.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ModalFooter>
            <button onClick={() => setSendInvoiceModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition w-full">
              Cancel
            </button>
          </ModalFooter>
        </Modal>
      )}



      {/* ── Direct Print Invoice Modal ── */}
      {/* ── Thermal Print Modal ── */}
      {printInvoiceModalOpen && (
        <Modal onClose={() => setPrintInvoiceModalOpen(false)} maxWidth="max-w-sm">
          {/* ── Header ── */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <FiPrinter size={18} className="text-orange-500" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800">Print Invoice</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedJC?.name} · {selectedJC?.jcNo || selectedJC?.billNo}
                </p>
              </div>
            </div>
            <button onClick={() => setPrintInvoiceModalOpen(false)}
              className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 transition">
              <FiX size={15} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">

            {/* ── A4 Invoice Section ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FiPrinter size={12} className="text-orange-400" />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">A4 Invoice</p>
              </div>
              <div className="space-y-2">
                {[
                  { label: "With Prescription + GST", desc: "Includes prescription details and GST breakdown", args: [true, true], dot: "bg-emerald-400", hover: "hover:border-emerald-200 hover:bg-emerald-50/60" },
                  { label: "GST Only", desc: "Invoice with GST breakdown, no prescription", args: [false, true], dot: "bg-orange-400", hover: "hover:border-orange-200 hover:bg-orange-50/60" },
                  { label: "Without GST", desc: "Simple invoice without GST or prescription", args: [true, false], dot: "bg-sky-400", hover: "hover:border-sky-200 hover:bg-sky-50/60" },
                  { label: "Without GST + No Prescription", desc: "Minimal invoice, no GST, no prescription", args: [false, false], dot: "bg-gray-400", hover: "hover:border-gray-300 hover:bg-gray-50/60" },
                ].map(({ label, desc, args, dot, hover }) => (
                  <button key={label} onClick={() => handlePrintInvoice(...args)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white transition-all text-left group ${hover}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800">{label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
                    </div>
                    <FiPrinter size={13} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition" />
                  </button>
                ))}
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="border-t border-dashed border-gray-200" />

            {/* ── Thermal Section ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MdOutlineReceiptLong size={12} className="text-blue-400" />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Thermal 80mm</p>
              </div>
              <div className="space-y-2">
                {[
                  { label: "With GST", desc: "80mm thermal receipt with tax summary", showGst: true, dot: "bg-emerald-400", hover: "hover:border-emerald-200 hover:bg-emerald-50/60" },
                  { label: "Without GST", desc: "80mm thermal receipt, no tax breakdown", showGst: false, dot: "bg-sky-400", hover: "hover:border-sky-200 hover:bg-sky-50/60" },
                ].map(({ label, desc, showGst, dot, hover }) => (
                  <button key={label} onClick={() => handleThermalPrint(showGst)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white transition-all text-left group ${hover}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800">{label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
                    </div>
                    <MdOutlineReceiptLong size={13} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition" />
                  </button>
                ))}
              </div>
            </div>

          </div>

          <ModalFooter>
            <button onClick={() => setPrintInvoiceModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition w-full">
              Cancel
            </button>
          </ModalFooter>
        </Modal>
      )}

      {/* ── Status Modal ── */}
      {statusModalOpen && (
        <JCStatusModal
          statusModalOpen={statusModalOpen} setStatusModalOpen={setStatusModalOpen}
          jcData={selectedJC} settings={settings}
          fetchStats={fetchStats} resetAllStates={resetAllStates}
        />
      )}


      {waModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setWaModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-lg p-5 w-72"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Send WhatsApp message for {selectedRow?.jcNumber}
            </h3>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => sendWhatsAppMessage("In-process")}
                className="px-3 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm font-medium transition"
              >
                In-process
              </button>

              <button
                onClick={() => sendWhatsAppMessage("Ready To Deliver")}
                className="px-3 py-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 text-sm font-medium transition"
              >
                Ready To Deliver
              </button>

              <button
                onClick={() => sendWhatsAppMessage("Delivered")}
                className="px-3 py-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 text-sm font-medium transition"
              >
                Delivered
              </button>
            </div>

            <button
              onClick={() => setWaModalOpen(false)}
              className="mt-4 w-full text-xs text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}


    </div>
  );
};

export default Dashboard;


// ─── JCStatusModal ────────────────────────────────────────────────────────────
function JCStatusModal({ statusModalOpen, setStatusModalOpen, jcData, settings, fetchStats, resetAllStates }) {
  const [status, setStatus] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionType, setTransactionType] = useState("");
  const [lensDeliveryDate, setLensDeliveryDate] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [paymentDelayDate, setPaymentDelayDate] = useState("");
  const [updating, setUpdating] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    if (statusModalOpen) {
      setStatus(""); setAmount(""); setTransactionType("");
      setLensDeliveryDate(""); setStatusNote(""); setPaymentDelayDate("");
    }
  }, [statusModalOpen]);

  if (!statusModalOpen) return null;

  const handleStatusChange = (value) => {
    setStatus(value);
    setAmount(""); setTransactionType(""); setLensDeliveryDate("");
    setStatusNote(""); setPaymentDelayDate("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (updating) return;
    const balance = Number(jcData?.balance || 0);
    const enteredAmount = Number(amount);
    if (status === "Delivered" || status === "Part Payment") {
      if (!amount) return toast.error("Amount is required");
      if (enteredAmount < 0) return toast.error("Amount cannot be negative");
      if (enteredAmount > balance) return toast.error("Amount cannot exceed balance");
      if (!transactionType) return toast.error("Transaction type is required");
    }
    if (status === "Payment Delay" && !paymentDelayDate) return toast.error("Payment delay date is required");
    if (status === "Lens Ordered" && !lensDeliveryDate) return toast.error("Lens delivery date is required");
    setUpdating(true);
    try {
      dispatch(showLoader());
      const payload = {
        jobCardId: jcData._id, status,
        jcNumber: jcData.jcNumber,
        custNumber: jcData.custNumber,
        amount: (status === "Delivered" || status === "Part Payment") ? enteredAmount : "",
        transactionType: (status === "Delivered" || status === "Part Payment") ? transactionType : "",
        lensDeliveryDate: status === "Lens Ordered" ? lensDeliveryDate : "",
        statusNote,
        paymentDelayDate: status === "Payment Delay" ? paymentDelayDate : "",
        jcData,
      };
      const response = await api.post("/jc/update-status", payload);
      if (response.data.success) {
        toast.success(response.data.status || "Status updated");
        setStatusModalOpen(false);
        if (fetchStats) fetchStats();
        if (resetAllStates) resetAllStates();
      }
    } catch { toast.error("Something went wrong"); }
    finally { setUpdating(false); dispatch(hideLoader()); }
  };

  const fieldCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition";
  const labelCls = "text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1";

  return (
    <Modal onClose={() => setStatusModalOpen(false)} maxWidth="max-w-2xl">
      <ModalHeader
        title="Update Job Card Status"
        subtitle={`Current: ${jcData?.pstatus || jcData?.status || "—"}`}
        onClose={() => setStatusModalOpen(false)}
      />
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Status</label>
            <select value={status} onChange={e => handleStatusChange(e.target.value)} className={fieldCls}>
              <option value="">Select Status</option>
              {jcData?.status !== "Delivered"
                ? settings?.status?.map((val, i) => <option key={i} value={val}>{val}</option>)
                : <><option value="JC Feed">JC Feed</option><option value="JC Cross Checked">JC Cross Checked</option><option value="Part Payment">Part Payment</option></>
              }
            </select>
          </div>
          {(status === "Delivered" || status === "Part Payment") && (<>
            <div>
              <label className={labelCls}>Amount <span className="normal-case font-normal">(Bal ₹{jcData?.balance})</span></label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" className={fieldCls} />
            </div>
            <div>
              <label className={labelCls}>Transaction Type</label>
              <select value={transactionType} onChange={e => setTransactionType(e.target.value)} className={fieldCls}>
                <option value="">Select</option>
                {settings?.transactionType?.map((val, i) => <option key={i} value={val}>{val}</option>)}
              </select>
            </div>
          </>)}
          {status === "Lens Ordered" && (
            <div>
              <label className={labelCls}>Lens Expected Delivery Date</label>
              <input type="date" value={lensDeliveryDate} onChange={e => setLensDeliveryDate(e.target.value)} className={fieldCls} />
            </div>
          )}
          <div>
            <label className={labelCls}>Status Note</label>
            <input type="text" value={statusNote} onChange={e => setStatusNote(e.target.value)} placeholder="Optional..." className={fieldCls} />
          </div>
          {status === "Payment Delay" && (
            <div>
              <label className={labelCls}>Payment Delay Date</label>
              <input type="date" value={paymentDelayDate} onChange={e => setPaymentDelayDate(e.target.value)} className={fieldCls} />
            </div>
          )}
        </div>
      </div>
      <ModalFooter>
        <button onClick={() => setStatusModalOpen(false)}
          className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
          Cancel
        </button>
        <button type="button" disabled={updating} onClick={handleSubmit}
          className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition disabled:opacity-60">
          {updating && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {updating ? "Updating..." : "Update Status"}
        </button>
      </ModalFooter>
    </Modal>
  );
}