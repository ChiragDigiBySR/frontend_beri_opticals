import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { toast } from "react-toastify";
import {
  FiShoppingBag, FiUser, FiMail, FiPhone, FiLock, FiCalendar,
  FiMapPin, FiPercent, FiImage, FiClock, FiStar, FiX,
  FiCheckSquare, FiMessageCircle, FiSave, FiFileText,
  FiBattery, FiAperture, FiSettings, FiUpload,
  FiTag, FiCreditCard, FiTrendingUp, FiArrowLeft,
} from "react-icons/fi";

const ALL_PAGES = [
  "DASHBOARD", "NEW JOB CARDS", "JOB CARDS LIST", "JOB CARDS EDIT",
  "ADD CUSTOMERS", "CUSTOMERS LIST", "ADD VENDORS", "VENDORS LIST", "VENDOR ORDERS",
  "ADD PRESCRIPTION", "PRESCRIPTIONS LIST", "ADD SALES", "SALES LIST",
  "ADD EXPENSES", "EXPENSES LIST", "INVENTORY", "MAIN REPORTS",
  "DAILY REPORTS", "TASKS REPORTS", "PROMOTION", "HELP", "SETTINGS",
  "ADD TASK", "TASK LIST", "WHATSAPP LOGS",
  "USERS", "ADD REPAIR", "REPAIR LIST", "ADD ASSETS", "ASSETS LIST",
  "OPD REPORT", "EDIT OPD", "OPD LIST", "ADD PATIENT", "PATIENT LIST", "ADD APPOINTMENT", "APPOINTMENT LIST"
];

const PAGES_PRO = ALL_PAGES;
const PAGES_PREMIUM = ["DASHBOARD", "NEW JOB CARDS", "JOB CARDS LIST", "JOB CARDS EDIT", "ADD CUSTOMERS", "CUSTOMERS LIST", "USERS", "INVENTORY", "MAIN REPORTS", "HELP", "SETTINGS"];

const PAGE_PERMISSIONS = {
  "JOB CARDS LIST": ["EDIT JC", "UPDATE JOB CARD STATUS", "DELETE JC"],
  "NEW JOB CARDS": ["EDIT JC", "UPDATE JOB CARD STATUS", "DELETE JC"],
  "JOB CARDS EDIT": ["EDIT JC", "UPDATE JOB CARD STATUS", "DELETE JC"],
  "SALES LIST": ["DELETE SALES"],
  "ADD SALES": ["DELETE SALES"],
  "EXPENSES LIST": ["DELETE EXPENSES"],
  "ADD EXPENSES": ["DELETE EXPENSES"],
  "USERS": ["ADD USER", "UPDATE USER", "DELETE USER"],
  "PRESCRIPTIONS LIST": ["EDIT PRESCRIPTION", "DELETE PRESCRIPTION"],
  "ADD PRESCRIPTION": ["EDIT PRESCRIPTION", "DELETE PRESCRIPTION"],
  "VENDORS LIST": ["EDIT VENDOR", "DELETE VENDOR"],
  "ADD VENDORS": ["EDIT VENDOR", "DELETE VENDOR"],
  "VENDOR ORDERS": ["ADD VENDOR ORDER", "DELETE VENDOR ORDER"],
  "REPAIR LIST": ["ADD REPAIR", "DELETE REPAIR"],
  "ADD REPAIR": ["ADD REPAIR", "DELETE REPAIR"],
  "ASSETS LIST": ["ADD ASSETS", "DELETE ASSETS"],
  "ADD ASSETS": ["ADD ASSETS", "DELETE ASSETS"],
  "PATIENT LIST": ["EDIT PATIENT", "DELETE PATIENT", "MANAGE FILES"],
};

const getPermissionsFromPages = (selectedPages) => {
  const set = new Set();
  selectedPages.forEach(page => (PAGE_PERMISSIONS[page] || []).forEach(p => set.add(p)));
  return Array.from(set);
};

// shared style tokens
const inp = "w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all placeholder-gray-300";
const lbl = "text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5";
const err = "text-[11px] text-red-500 font-semibold mt-1";
const sectionCls = "bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden";
const sHeaderCls = "flex items-center justify-between px-5 py-3.5 border-b border-gray-50 bg-gradient-to-r from-gray-50/80 to-white";
const iconCls = "absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-400 transition-colors pointer-events-none";

export default function EditStore() {
  const { storeId } = useParams();
  const navigate = useNavigate();

  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    storeName: "", ownerName: "", email: "", mobile: "",
    storeMobile: "",  // show mobile number on invoices & msg
    subStoreName: "", // show below store name in invoice and with msg
    password: "", expiry: "", address: "", commission: "",
    hasGst: false, showAds: false, hasAI: false, gstNumber: "",
    storeTiming: "", emailApi: "", loyaltyPoints: "", valueOfloyaltyPoints: 0,
    refererPoints: 0, logo: null, gstImg: null, aadharImg: null, panImg: null,
    reviewLink: ""
  });

  const [mode, setMode] = useState("");
  const [pages, setPages] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [whatsapp, setWhatsapp] = useState({
    utility: { provider: "meta" },
    promotion: { provider: "meta" },
  });

  // existing image URLs (from server)
  const [existingImages, setExistingImages] = useState({ logo: "", gstImg: "", panImg: "", aadharImg: "" });
  // new file names (for display)
  const [fileNames, setFileNames] = useState({ logo: "", gstImg: "", panImg: "", aadharImg: "" });

  const logoRef = useRef();
  const gstRef = useRef();
  const panRef = useRef();
  const aadharRef = useRef();

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const clearFile = (key, ref) => {
    set(key, null);
    setFileNames(p => ({ ...p, [key]: "" }));
    if (ref.current) ref.current.value = "";
  };

  const pickFile = (key, file) => {
    set(key, file || null);
    setFileNames(p => ({ ...p, [key]: file?.name || "" }));
  };

  // ── load store data ────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingData(true);
        const res = await api.get(`/store/details/${storeId}`);
        if (res.data.success) {
          const s = res.data.store;
          const o = res.data.owner;
          setForm({
            storeName: s.storeName || "",
            subStoreName: s.subStoreName || "",
            ownerName: s.ownerName || "",
            email: s.email || "",
            mobile: s.mobile || "",
            storeMobile: s.storeMobile || "",
            password: "",  // don't prefill password
            expiry: s.expiry ? s.expiry.split("T")[0] : "",
            address: s.address || "",
            commission: o?.commission ?? "",
            hasGst: s.hasGst || false,
            showAds: s.showAds || false,
            hasAI: s.hasAI || false,
            gstNumber: s.gstNumber || "",
            storeTiming: s.storeTiming || "",
            loyaltyPoints: s.loyaltyPoints || "",
            emailApi: s.emailApi || "",
            reviewLink: s.reviewLink || "",
            valueOfloyaltyPoints: s.valueOfloyaltyPoints ?? 0,
            refererPoints: s.refererPoints ?? 0,
            logo: null, gstImg: null, aadharImg: null, panImg: null,
          });
          setExistingImages({
            logo: s.logo || "",
            gstImg: s.gstImg || "",
            panImg: s.panImg || "",
            aadharImg: s.aadharImg || "",
          });
          setMode(s.varient || "");
          setPages(s.pages || []);
          setPermissions(getPermissionsFromPages(s.pages || []));
          if (s.whatsapp) {
            setWhatsapp({
              utility: { provider: s.whatsapp.utility?.provider || "meta" },
              promotion: { provider: s.whatsapp.promotion?.provider || "meta" },
            });
          }
        }
      } catch { toast.error("Failed to load store details"); }
      finally { setLoadingData(false); }
    };
    if (storeId) load();
  }, [storeId]);

  // ── sync pages when mode changes ──────────────────────────────────────────
  // Only auto-set pages when user CLICKS a variant — not on initial load
  const [modeManuallyChanged, setModeManuallyChanged] = useState(false);
  const changeMode = (m) => {
    setMode(m);
    setModeManuallyChanged(true);
  };

  useEffect(() => {
    if (!modeManuallyChanged) return;
    let newPages = [];
    if (mode === "PRO") newPages = PAGES_PRO;
    else if (mode === "PREMIUM") newPages = PAGES_PREMIUM;
    else if (mode === "CUSTOM") newPages = pages; // keep existing for CUSTOM
    if (mode !== "CUSTOM") {
      setPages(newPages);
      setPermissions(getPermissionsFromPages(newPages));
    }
  }, [mode, modeManuallyChanged]);

  const togglePage = (p) => {
    setPages(prev => {
      const next = prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p];
      setPermissions(getPermissionsFromPages(next));
      return next;
    });
  };

  const checkSize = (f) => !f || f.size <= 5 * 1024 * 1024;

  const validate = () => {
    const e = {};
    ["storeName", "ownerName", "email", "mobile", "expiry", "address", "storeTiming"].forEach(k => {
      if (!form[k]) e[k] = "Required";
    });
    if (!mode) e.pages = "Select a variant";
    if (mode === "CUSTOM" && pages.length === 0) e.pages = "Select at least one page";
    if (form.hasGst && !form.gstNumber) e.gstNumber = "Enter GST number";
    if (!checkSize(form.logo)) e.logo = "Must be < 5MB";
    if (!checkSize(form.gstImg)) e.gstImg = "Must be < 5MB";
    if (!checkSize(form.panImg)) e.panImg = "Must be < 5MB";
    if (!checkSize(form.aadharImg)) e.aadharImg = "Must be < 5MB";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) { toast.error("Please fix the errors below"); return; }
    try {
      setSubmitting(true);
      const fd = new FormData();
      // append text fields
      const textFields = ["storeName", "subStoreName", "ownerName", "email", "mobile", "storeMobile", "password", "expiry", "address", "commission", "hasGst", "showAds", "hasAI", "gstNumber", "storeTiming", "emailApi", "reviewLink", "loyaltyPoints", "valueOfloyaltyPoints", "refererPoints"];
      textFields.forEach(k => {
        if (form[k] !== null && form[k] !== "") fd.append(k, form[k]);
      });
      fd.append("pages", JSON.stringify(pages));
      fd.append("permissions", JSON.stringify(permissions));
      fd.append("varient", mode);
      fd.append("whatsapp", JSON.stringify(whatsapp));
      // only append files if new ones were selected
      if (form.logo) fd.append("logo", form.logo, form.logo.name);
      if (form.gstImg) fd.append("gstImg", form.gstImg, form.gstImg.name);
      if (form.panImg) fd.append("panImg", form.panImg, form.panImg.name);
      if (form.aadharImg) fd.append("aadharImg", form.aadharImg, form.aadharImg.name);

      const res = await api.put(`/store/update/${storeId}`, fd);
      if (res.data?.success) {
        toast.success(res.data.message || "Store updated successfully");
        navigate("/stores");
      } else toast.error(res.data?.message || "Something went wrong");
    } catch (e) {
      if (e.response) toast.error(e.response.data?.message || "Server error");
      else if (e.request) toast.error("Server not responding");
      else toast.error("Something went wrong");
    } finally { setSubmitting(false); }
  };


  // reusable inline icon-input wrapper
  const iconInputCls = (hasErr) =>
    `relative group ${hasErr ? "ring-1 ring-red-300 rounded-xl" : ""}`;

  // ── section header helper ─────────────────────────────────────────────────
  const sectionHeader = (Icon, title, accentIcon, badge, accentBadge) => (
    <div className={sHeaderCls}>
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${accentIcon}`}>
          <Icon size={13} />
        </div>
        <span className="text-sm font-bold text-gray-700">{title}</span>
      </div>
      {badge && (
        <span className={`text-[10px] font-black text-white px-2.5 py-0.5 rounded-full bg-gradient-to-r ${accentBadge}`}>
          {badge}
        </span>
      )}
    </div>
  );

  // ── toggle helper ─────────────────────────────────────────────────────────
  const toggle = (key, label, onChangeFn) => (
    <label className="flex items-center gap-3 cursor-pointer select-none" onClick={onChangeFn}>
      <div className={`w-11 h-6 rounded-full relative transition-all duration-200 ${form[key] ? "bg-orange-500" : "bg-gray-200"}`}>
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-200 ${form[key] ? "left-6" : "left-1"}`} />
      </div>
      <span className={`text-sm font-semibold transition-colors ${form[key] ? "text-gray-800" : "text-gray-400"}`}>{label}</span>
    </label>
  );

  // ── file pill helper ──────────────────────────────────────────────────────
  const filePill = (key, label, ref, required = false) => {
    const newName = fileNames[key];
    const existing = existingImages[key];
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className={lbl + " mb-0"}>{label}{required && <span className="text-orange-400 ml-0.5">*</span>}</span>
          {newName && (
            <button type="button" onClick={() => clearFile(key, ref)}
              className="text-[10px] font-bold text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors cursor-pointer">
              <FiX size={10} /> Remove
            </button>
          )}
        </div>

        {/* Existing image chip */}
        {existing && !newName && (
          <div className="flex items-center gap-2 mb-1.5">
            <img src={existing} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-100" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-gray-500 truncate">Current image uploaded</p>
              <p className="text-[10px] text-gray-400">Upload new to replace</p>
            </div>
            <a href={existing} target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-bold text-blue-500 hover:text-blue-700 transition">View</a>
          </div>
        )}

        <div
          onClick={() => ref.current?.click()}
          className={`flex items-center gap-3 bg-white border-2 border-dashed rounded-xl px-3.5 py-2.5 cursor-pointer transition-all group
            ${newName ? "border-orange-300 bg-orange-50/40" : "border-gray-200 hover:border-orange-300 hover:bg-orange-50/20"}
            ${errors[key] ? "border-red-300 bg-red-50/20" : ""}`}
        >
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors
            ${newName ? "bg-orange-100 text-orange-500" : "bg-gray-100 text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-400"}`}>
            {newName ? <FiCheckSquare size={13} /> : <FiUpload size={13} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold truncate ${newName ? "text-orange-600" : "text-gray-400"}`}>
              {newName || (existing ? "Click to replace…" : "Click to upload")}
            </p>
            {!newName && <p className="text-[10px] text-gray-300 mt-0.5">PNG, JPG up to 5MB</p>}
          </div>
          <input ref={ref} type="file" accept="image/*" className="hidden"
            onChange={e => pickFile(key, e.target.files[0])} />
        </div>
        {errors[key] && <p className={err}>{errors[key]}</p>}
      </div>
    );
  };

  if (loadingData) return (
    <div className="flex items-center justify-center min-h-screen bg-[#f7f8fa]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-400 font-semibold">Loading store details…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f7f8fa] p-4 md:p-2">
      <form onSubmit={handleSubmit} className="w-full space-y-4">


        {/* ── Row 1: Store Info + Owner ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Store Information */}
          <div className={sectionCls}>
            {sectionHeader(FiShoppingBag, "Store Information", "bg-orange-50 border-orange-100 text-orange-500", undefined, undefined)}
            <div className="p-5 space-y-3">

              <div>
                <label className={lbl}>Store Name *</label>
                <div className="relative group">
                  <FiShoppingBag size={13} className={iconCls} />
                  <input value={form.storeName} onChange={e => set("storeName", e.target.value)}
                    placeholder="e.g. Vision Care Optics" className={`${inp} pl-9`} />
                </div>
                {errors.storeName && <p className={err}>{errors.storeName}</p>}
              </div>

              {/* Sub store name show below of store name in invoice */}
              <div>
                <label className={lbl}>Store Sub Name</label>
                <div className="relative group">
                  <FiShoppingBag size={13} className={iconCls} />
                  <input value={form.subStoreName} onChange={e => set("subStoreName", e.target.value)}
                    placeholder="e.g. Vision Care Optics" className={`${inp} pl-9`} />
                </div>
                {errors.subStoreName && <p className={err}>{errors.subStoreName}</p>}
              </div>

              <div>
                <label className={lbl}>Address *</label>
                <div className="relative group">
                  <FiMapPin size={13} className={iconCls} />
                  <input value={form.address} onChange={e => set("address", e.target.value)}
                    placeholder="Full store address" className={`${inp} pl-9`} />
                </div>
                {errors.address && <p className={err}>{errors.address}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Store Timing *</label>
                  <div className="relative group">
                    <FiClock size={13} className={iconCls} />
                    <input value={form.storeTiming} onChange={e => set("storeTiming", e.target.value)}
                      placeholder="10 AM – 8 PM" className={`${inp} pl-9`} />
                  </div>
                  {errors.storeTiming && <p className={err}>{errors.storeTiming}</p>}
                </div>
                <div>
                  <label className={lbl}>Commission (%)</label>
                  <div className="relative group">
                    <FiPercent size={13} className={iconCls} />
                    <input type="number" min="0" value={form.commission} onChange={e => set("commission", e.target.value)}
                      placeholder="0" className={`${inp} pl-9`} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Expiry Date *</label>
                  <div className="relative group">
                    <FiCalendar size={13} className={iconCls} />
                    <input type="date" value={form.expiry} onChange={e => set("expiry", e.target.value)}
                      className={`${inp} pl-9`} />
                  </div>
                  {errors.expiry && <p className={err}>{errors.expiry}</p>}
                </div>
                {form.hasGst && (
                  <div>
                    <label className={lbl}>GST Number *</label>
                    <div className="relative group">
                      <FiFileText size={13} className={iconCls} />
                      <input value={form.gstNumber} onChange={e => set("gstNumber", e.target.value.toUpperCase())}
                        placeholder="22AAAAA0000A1Z5" className={`${inp} pl-9 text-xs`} />
                    </div>
                    {errors.gstNumber && <p className={err}>{errors.gstNumber}</p>}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={lbl}>EMAIL API</label>
                  <div className={iconInputCls(errors.gstNumber)}>
                    <FiFileText size={13} className={iconCls} />
                    <input value={form.emailApi} onChange={e => set("emailApi", e.target.value)}
                      placeholder="https://script.google.com/macros/s/AKfycbzY5..." className={`${inp} pl-9 text-xs`} />
                  </div>
                </div>
              </div>


              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={lbl}>Store Review Link</label>
                  <div className={iconInputCls(errors.reviewLink)}>
                    <FiFileText size={13} className={iconCls} />
                    <input value={form.reviewLink} onChange={e => set("reviewLink", e.target.value)}
                      placeholder="https://google.com/review/AKfycbzY5..." className={`${inp} pl-9 text-xs`} />
                  </div>
                </div>
              </div>

              <div className="flex gap-6 pt-1 border-t border-gray-50">
                {toggle("showAds", "Show Ads", () => set("showAds", !form.showAds))}
                {toggle("hasGst", "Has GST", () => { set("hasGst", !form.hasGst); if (form.hasGst) set("gstNumber", ""); })}
                {toggle("hasAI", "Has AI", () => set("hasAI", !form.hasAI))}
              </div>
            </div>
          </div>

          {/* Owner & Login */}
          <div className={sectionCls}>
            {sectionHeader(FiUser, "Owner & Login Details", "bg-indigo-50 border-indigo-100 text-indigo-500")}
            <div className="p-5 space-y-3">

              <div>
                <label className={lbl}>Owner Name *</label>
                <div className="relative group">
                  <FiUser size={13} className={iconCls} />
                  <input value={form.ownerName} onChange={e => set("ownerName", e.target.value)}
                    placeholder="Full name" className={`${inp} pl-9`} />
                </div>
                {errors.ownerName && <p className={err}>{errors.ownerName}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Email *</label>
                  <div className="relative group">
                    <FiMail size={13} className={iconCls} />
                    <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                      placeholder="owner@store.com" className={`${inp} pl-9`} />
                  </div>
                  {errors.email && <p className={err}>{errors.email}</p>}
                </div>
                <div>
                  <label className={lbl}>Mobile *</label>
                  <div className="relative group">
                    <FiPhone size={13} className={iconCls} />
                    <input value={form.mobile} onChange={e => set("mobile", e.target.value)}
                      placeholder="10-digit" className={`${inp} pl-9`} />
                  </div>
                  {errors.mobile && <p className={err}>{errors.mobile}</p>}
                </div>

                {/* Mobile Number show in Invoice & Msg */}
                <div>
                  <label className={lbl}>Show Mobile Number on Invoice</label>
                  <div className="relative group">
                    <FiPhone size={13} className={iconCls} />
                    <input value={form.storeMobile} onChange={e => set("storeMobile", e.target.value)}
                      placeholder="10-digit" className={`${inp} pl-9`} />
                  </div>
                  {errors.storeMobile && <p className={err}>{errors.storeMobile}</p>}
                </div>

              </div>

              <div>
                <label className={lbl}>New Password <span className="text-gray-300 normal-case font-normal">(leave blank to keep current)</span></label>
                <div className="relative group">
                  <FiLock size={13} className={iconCls} />
                  <input type="text" value={form.password} onChange={e => set("password", e.target.value)}
                    placeholder="Enter new password to change" className={`${inp} pl-9`} />
                </div>
              </div>

              {/* Loyalty */}
              <div className="pt-3 border-t border-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-md bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center">
                    <FiStar size={10} />
                  </div>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Loyalty & Referral</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "loyaltyPoints", icon: FiTag, label: "Rs / Point", ph: "100" },
                    { key: "valueOfloyaltyPoints", icon: FiCreditCard, label: "Point Value", ph: "1" },
                    { key: "refererPoints", icon: FiTrendingUp, label: "Refer Pts", ph: "10" },
                  ].map(({ key, icon: Ic, label, ph }) => (
                    <div key={key}>
                      <label className={lbl}>{label}</label>
                      <div className="relative group">
                        <Ic size={13} className={iconCls} />
                        <input type="number" min="0" value={form[key]}
                          onChange={e => set(key, e.target.value)}
                          placeholder={ph} className={`${inp} pl-9`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 2: Documents + Variant + WhatsApp ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

          {/* Logo & Documents */}
          <div className={sectionCls}>
            {sectionHeader(FiImage, "Logo & Documents", "bg-emerald-50 border-emerald-100 text-emerald-500")}
            <div className="p-5 space-y-3">
              {filePill("logo", "Store Logo", logoRef, false)}
              {filePill("gstImg", "GST Certificate", gstRef, false)}
              {filePill("panImg", "PAN Card", panRef, false)}
              {filePill("aadharImg", "Aadhar Card", aadharRef, false)}
              <p className="text-[10px] text-gray-400 font-semibold">
                Upload new files to replace existing ones. Leave blank to keep current.
              </p>
            </div>
          </div>

          {/* Pages & Variant */}
          <div className={sectionCls}>
            {sectionHeader(FiCheckSquare, "Pages & Variant", "bg-sky-50 border-sky-100 text-sky-500", mode || undefined, "from-sky-500 to-cyan-500")}
            <div className="p-5 space-y-4">

              <div className="flex gap-2">
                {[
                  { val: "PRO", icon: FiBattery, desc: "All features", count: ALL_PAGES.length, grad: ["#f97316", "#f59e0b"] },
                  { val: "PREMIUM", icon: FiAperture, desc: "Core features", count: PAGES_PREMIUM.length, grad: ["#6366f1", "#8b5cf6"] },
                  { val: "CUSTOM", icon: FiSettings, desc: "Hand-pick pages", count: null, grad: ["#0ea5e9", "#06b6d4"] },
                ].map(({ val, icon: Ic, desc, count, grad }) => (
                  <button key={val} type="button" onClick={() => changeMode(val)}
                    className={`flex-1 relative p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer overflow-hidden
                      ${mode === val ? "border-transparent shadow-lg scale-[1.02]" : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-md"}`}
                    style={mode === val ? { background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` } : {}}
                  >
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center mb-2.5 ${mode === val ? "bg-white/20" : "bg-gray-100"} transition-colors`}>
                      <Ic size={13} className={mode === val ? "text-white" : "text-gray-500"} />
                    </div>
                    <p className={`text-xs font-black leading-none ${mode === val ? "text-white" : "text-gray-800"}`}>{val}</p>
                    <p className={`text-[10px] mt-1 font-medium ${mode === val ? "text-white/70" : "text-gray-400"}`}>{desc}</p>
                    {count && <p className={`text-[10px] mt-1.5 font-bold ${mode === val ? "text-white/80" : "text-orange-500"}`}>{count} pages</p>}
                  </button>
                ))}
              </div>
              {errors.pages && <p className={err}>{errors.pages}</p>}

              {(mode === "PRO" || mode === "PREMIUM") && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Included Pages</p>
                    <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">{pages.length} pages</span>
                  </div>
                  <div className="p-2.5 max-h-32 overflow-y-auto flex flex-wrap gap-1.5">
                    {pages.map(p => (
                      <span key={p} className="text-[9px] font-bold bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-lg leading-none">{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {mode === "CUSTOM" && (
                <div className="space-y-3">
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Select Pages</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">{pages.length} selected</span>
                        {pages.length > 0 && (
                          <button type="button" onClick={() => { setPages([]); setPermissions([]); }}
                            className="text-[10px] font-bold text-gray-400 hover:text-red-400 transition-colors cursor-pointer">Clear</button>
                        )}
                      </div>
                    </div>
                    <div className="p-2.5 max-h-48 overflow-y-auto grid grid-cols-1 gap-1">
                      {ALL_PAGES.map(page => {
                        const perms = PAGE_PERMISSIONS[page] || [];
                        return (
                          <label key={page} onClick={() => togglePage(page)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all
                              ${pages.includes(page) ? "bg-sky-50 border-sky-200" : "bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50"}`}>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all
                              ${pages.includes(page) ? "bg-sky-500 border-sky-500" : "border-gray-300"}`}>
                              {pages.includes(page) && (
                                <svg width="8" height="6" viewBox="0 0 8 6"><path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={`text-[11px] font-semibold leading-tight block ${pages.includes(page) ? "text-sky-700" : "text-gray-500"}`}>{page}</span>
                              {perms.length > 0 && <span className="text-[9px] text-gray-400">→ {perms.join(", ")}</span>}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  {permissions.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl overflow-hidden">
                      <div className="px-3 py-2 border-b border-emerald-100 flex items-center justify-between">
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Auto Permissions</p>
                        <span className="text-[10px] font-black text-emerald-600 bg-white border border-emerald-200 px-2 py-0.5 rounded-full">{permissions.length} granted</span>
                      </div>
                      <div className="p-2.5 flex flex-wrap gap-1.5">
                        {permissions.map(p => (
                          <span key={p} className="text-[9px] font-bold bg-white border border-emerald-200 text-emerald-700 px-2 py-1 rounded-lg leading-none">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(mode === "PRO" || mode === "PREMIUM") && permissions.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-emerald-100 flex items-center justify-between">
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Auto Permissions</p>
                    <span className="text-[10px] font-black text-emerald-600 bg-white border border-emerald-200 px-2 py-0.5 rounded-full">{permissions.length} granted</span>
                  </div>
                  <div className="p-2.5 flex flex-wrap gap-1.5">
                    {permissions.map(p => (
                      <span key={p} className="text-[9px] font-bold bg-white border border-emerald-200 text-emerald-700 px-2 py-1 rounded-lg leading-none">{p}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp Config */}
          <div className={sectionCls}>
            {sectionHeader(FiMessageCircle, "WhatsApp Config", "bg-rose-50 border-rose-100 text-rose-500")}
            <div className="p-5 space-y-5">
              {[
                { key: "utility", label: "Utility Messages" },
                { key: "promotion", label: "Promotion Messages" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className={lbl}>{label} Provider</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["meta", "non-meta"].map(opt => (
                      <button key={opt} type="button"
                        onClick={() => setWhatsapp(p => ({ ...p, [key]: { provider: opt } }))}
                        className={`py-3 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer flex flex-col items-center gap-1
                          ${whatsapp[key].provider === opt
                            ? "bg-gradient-to-b from-rose-500 to-pink-500 border-transparent text-white shadow-md shadow-rose-200"
                            : "bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600"}`}>
                        <span className={`text-base ${whatsapp[key].provider === opt ? "" : "grayscale opacity-50"}`}>
                          {opt === "meta" ? "📘" : "🔗"}
                        </span>
                        {opt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Bottom Submit ── */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <button type="button" onClick={() => navigate("/stores")}
            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition cursor-pointer">
            <FiArrowLeft size={14} /> Back to Stores
          </button>
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 disabled:opacity-60 text-white text-sm font-bold px-8 py-2.5 rounded-xl transition-all shadow-md shadow-orange-200 cursor-pointer">
            <FiSave size={14} />
            {submitting ? "Saving Changes…" : "Save Changes"}
          </button>
        </div>

      </form>
    </div>
  );
}