import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import api from "../../utils/api";
import { useDispatch, useSelector } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import {
    FiTag, FiDollarSign, FiCheckSquare,
    FiPlus, FiX, FiSave, FiLock, FiTrendingUp, FiShoppingBag, FiPackage, FiHash, FiEye
} from "react-icons/fi";


// Loyalty & Membership settings page
import LoyaltySettings from "./LoyaltySettings";

// OPD report custom "Add Another" options
import OpdFieldsSettings from "./Opdfieldssettings";

// ─── Static status list ───────────────────────────────────────────────────────
const ALL_STATUSES = [
    "Lens Ordered",
    "Lens Received",
    "Lens Checked for Fitting",
    "Fitting Process",
    "Fitting Issue",
    "Fitting Done",
    "Fitting Checked",
    "Fitting QC Failed",
    "Ready To Deliver",
    "Delivered",
    "Holiday Closed",
    "Urgent Talk",
    "Delay Delivery",
    "Payment Delay",
    "Part Payment",
];

// ─── Section card wrapper ─────────────────────────────────────────────────────
const Section = ({ icon: Icon, title, description, children, accent = false }) => (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.08)] overflow-hidden">
        {/* Card header strip */}
        <div className={`flex items-center gap-3 px-6 py-4 border-b ${accent ? "border-orange-100 bg-orange-50/60" : "border-stone-100 bg-stone-50/60"}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? "bg-orange-100" : "bg-stone-100"}`}>
                <Icon size={15} className={accent ? "text-orange-500" : "text-stone-500"} />
            </div>
            <div>
                <p className="text-[11px] font-bold text-stone-700 tracking-wide">{title}</p>
                {description && <p className="text-[10px] text-stone-400 mt-0.5">{description}</p>}
            </div>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

// ─── Tag Input ────────────────────────────────────────────────────────────────
function TagInput({ values, onChange, placeholder }) {
    const [input, setInput] = useState("");
    const [focused, setFocused] = useState(false);

    const add = () => {
        const v = input.trim().toUpperCase();
        if (v && !values.includes(v)) { onChange([...values, v]); setInput(""); }
    };

    const remove = (i) => onChange(values.filter((_, idx) => idx !== i));

    return (
        <div>
            {/* Tags area */}
            <div className={`min-h-[44px] flex flex-wrap gap-1.5 p-2.5 rounded-xl border transition-all duration-200 mb-3
                ${focused ? "border-orange-300 ring-2 ring-orange-50 bg-white" : "border-stone-200 bg-stone-50/50"}`}>
                {values.length === 0 && !focused && (
                    <span className="text-[11px] text-stone-300 italic self-center px-1">Nothing added yet…</span>
                )}
                {values.map((v, i) => (
                    <span key={i}
                        className="inline-flex items-center gap-1.5 bg-white border border-orange-200 text-orange-700 text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.06)] group"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                        {v}
                        <button type="button" onClick={() => remove(i)}
                            className="text-orange-300 hover:text-orange-600 transition ml-0.5">
                            <FiX size={10} />
                        </button>
                    </span>
                ))}

            </div>

            {/* Input row */}
            <div className="flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={placeholder}
                    className="flex-1 px-3 py-2 text-[12px] border border-stone-200 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-50 bg-white text-stone-700 transition placeholder:text-stone-300"
                />
                <button type="button" onClick={add}
                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-[11px] font-bold rounded-xl transition-all shadow-[0_2px_8px_rgba(249,115,22,0.35)]">
                    <FiPlus size={12} /> Add
                </button>
            </div>
        </div>
    );
}

// ─── Status Checkboxes ────────────────────────────────────────────────────────
function StatusGrid({ selected, onChange }) {
    const toggle = (s) =>
        selected.includes(s) ? onChange(selected.filter((x) => x !== s)) : onChange([...selected, s]);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
            {ALL_STATUSES.map((s, i) => {
                const checked = selected.includes(s);
                return (
                    <label key={i}
                        className={`relative flex items-center gap-3 px-3.5 py-3 rounded-xl border cursor-pointer transition-all duration-150 select-none group
                            ${checked
                                ? "bg-orange-50 border-orange-200 shadow-[0_1px_6px_rgba(249,115,22,0.12)]"
                                : "bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                            }`}
                    >
                        {/* Custom checkbox */}
                        <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150
                            ${checked ? "bg-orange-500 border-orange-500 shadow-[0_2px_6px_rgba(249,115,22,0.4)]" : "border-stone-300 bg-white"}`}>
                            {checked && (
                                <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                    <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </div>
                        <input type="checkbox" className="hidden" checked={checked} onChange={() => toggle(s)} />
                        <span className={`text-[11px] font-medium leading-tight transition-colors uppercase tracking-wide ${checked ? "text-orange-800" : "text-stone-500 group-hover:text-stone-700"}`}>
                            {s}
                        </span>
                        {checked && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-orange-400" />}
                    </label>
                );
            })}
        </div>
    );
}

// ─── Access Denied ────────────────────────────────────────────────────────────
function AccessDenied() {
    return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl border border-stone-100 shadow-lg p-12 flex flex-col items-center gap-4 max-w-sm w-full text-center">
                <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
                    <FiLock size={22} className="text-red-400" />
                </div>
                <div>
                    <h2 className="text-sm font-bold text-stone-700">Access Denied</h2>
                    <p className="text-[11px] text-stone-400 mt-1.5 leading-relaxed">
                        You don't have permission to view this page.<br />Contact your administrator.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── Save Button ──────────────────────────────────────────────────────────────
const SaveBtn = ({ loading, onClick }) => (
    <button type="button" onClick={onClick} disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-[11px] font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(249,115,22,0.4)] disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none">
        {loading
            ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
            : <><FiSave size={13} /> Save Settings</>
        }
    </button>
);

// GST Fields
function GstInput({ values, onChange }) {
    const [input, setInput] = useState("");

    const add = () => {
        const val = Number(input);

        if (!input.trim()) return;
        if (isNaN(val)) return toast.error("Enter a valid GST");
        if (val < 0) return toast.error("GST cannot be negative");
        if (values.includes(val)) return toast.error("GST already exists");

        onChange([...values, val].sort((a, b) => a - b));
        setInput("");
    };

    const remove = (index) => {
        onChange(values.filter((_, i) => i !== index));
    };

    return (
        <div>
            <div className="min-h-[44px] flex flex-wrap gap-2 p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 mb-3">
                {values.map((v, i) => (
                    <span
                        key={i}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-orange-200 rounded-lg text-[11px] font-semibold text-orange-700"
                    >
                        {v}%
                        <button type="button" onClick={() => remove(i)}>
                            <FiX size={10} />
                        </button>
                    </span>
                ))}
            </div>

            <div className="flex gap-2">
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
                    placeholder="e.g. 18"
                    className="flex-1 px-3 py-2 text-[12px] border border-stone-200 rounded-xl"
                />

                <button
                    type="button"
                    onClick={add}
                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-[11px] font-bold rounded-xl transition-all shadow-[0_2px_8px_rgba(249,115,22,0.35)]"
                >
                    <FiPlus size={12} /> Add
                </button>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Settings() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [storeMeta, setStoreMeta] = useState({ storeName: "", storeNumber: "" });
    const [form, setForm] = useState({
        allCategories: [],
        brands: [],
        paymentFor: [],
        gst: [],
        salesPaymentFor: [],
        status: [],
        billNumberPrefix: "",
        features: {
            allowNegativeInventory: false,
            showDeliveredButtonInJC: false,
        },
        opdOptions: {
            history: [],
            ocularHistory: [],
            systemicHistory: [],
            diagnosis: [],
            advice: [],
        },
    });

    if (user?.role !== "ADMIN") return <AccessDenied />;

    useEffect(() => {
        (async () => {
            try {
                dispatch(showLoader());
                const res = await api.get("/settings");
                const d = res.data.data;
                setStoreMeta({ storeName: d.storeName, storeNumber: d.storeNumber });
                setForm({
                    allCategories: d.allCategories || [],
                    brands: d.brands || [],
                    paymentFor: d.paymentFor || [],
                    gst: d.gst || [],
                    salesPaymentFor: d.salesPaymentFor || [],
                    status: d.status?.length ? d.status : ALL_STATUSES,
                    billNumberPrefix: d.billNumberPrefix || "",
                    features: {
                        allowNegativeInventory: d.features?.allowNegativeInventory ?? false,
                        showDeliveredButtonInJC: d.features?.showDeliveredButtonInJC ?? false,
                    },
                    opdOptions: {
                        history: d.opdOptions?.history || [],
                        ocularHistory: d.opdOptions?.ocularHistory || [],
                        systemicHistory: d.opdOptions?.systemicHistory || [],
                        diagnosis: d.opdOptions?.diagnosis || [],
                        advice: d.opdOptions?.advice || [],
                    },
                });
            } catch (err) {
                toast.error(err.response?.data?.message || "Failed to load settings");
            } finally {
                setFetching(false);
                dispatch(hideLoader());
            }
        })();
    }, []);

    const update = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

    const handleSave = async () => {
        try {
            setLoading(true);
            dispatch(showLoader());

            if (form.billNumberPrefix && !form.billNumberPrefix.endsWith("/")) {
                form.billNumberPrefix = form.billNumberPrefix + "/";
            }

            const res = await api.put("/settings", form);
            toast.success(res.data.message || "Settings updated successfully");
            window.location.reload();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update settings");
        } finally {
            setLoading(false);
            dispatch(hideLoader());
        }
    };

    if (fetching) return null;

    return (
        <div className="min-h-screen bg-[#fafaf8]">
            <div className="space-y-5">


                {/* ── Product Categories ── */}
                <Section icon={FiTag} title="Product Categories" description="Used across inventory, billing & reports" accent>
                    <TagInput
                        values={form.allCategories}
                        onChange={update("allCategories")}
                        placeholder="Type a category and press Enter…"
                    />
                </Section>

                {/* ── Brands ── */}
                <Section icon={FiPackage} title="Brands" description="Product brands available across inventory">
                    <TagInput
                        values={form.brands}
                        onChange={update("brands")}
                        placeholder="Type a brand and press Enter…"
                    />
                </Section>

                {/* GST */}
                <Section
                    icon={FiDollarSign}
                    title="GST Rates"
                    description="Applicable GST percentages"
                >
                    <GstInput
                        values={form.gst}
                        onChange={update("gst")}
                    />
                </Section>


                {/* Feature seaction */}
                <Section
                    icon={FiCheckSquare}
                    title="Application Features"
                    description="Enable or disable optional features for your store"
                    accent
                >
                    <div className="space-y-4">

                        {/* Negative Inventory */}
                        <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-gradient-to-r from-white to-stone-50 p-5 hover:border-orange-200 hover:shadow-sm transition">
                            <div className="flex gap-4">
                                <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center">
                                    <FiPackage className="text-orange-500" size={18} />
                                </div>

                                <div>
                                    <h3 className="text-[13px] font-semibold text-stone-700">
                                        Allow Negative Inventory
                                    </h3>
                                    <p className="mt-1 text-[11px] text-stone-500 leading-relaxed">
                                        Products can be sold even when available stock is below zero.
                                    </p>
                                </div>
                            </div>

                            <label className="relative inline-flex cursor-pointer items-center">
                                <input
                                    type="checkbox"
                                    className="peer sr-only"
                                    checked={form.features.allowNegativeInventory}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            features: {
                                                ...prev.features,
                                                allowNegativeInventory: e.target.checked,
                                            },
                                        }))
                                    }
                                />

                                <div className="h-6 w-11 rounded-full bg-stone-300 transition peer-checked:bg-orange-500 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
                            </label>
                        </div>

                        {/* Delivered Button */}
                        <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-gradient-to-r from-white to-stone-50 p-5 hover:border-orange-200 hover:shadow-sm transition">
                            <div className="flex gap-4">
                                <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center">
                                    <FiCheckSquare className="text-green-600" size={18} />
                                </div>

                                <div>
                                    <h3 className="text-[13px] font-semibold text-stone-700">
                                        Show Delivered Button
                                    </h3>
                                    <p className="mt-1 text-[11px] text-stone-500 leading-relaxed">
                                        Display the Delivered action directly on the Job Card screen.
                                    </p>
                                </div>
                            </div>

                            <label className="relative inline-flex cursor-pointer items-center">
                                <input
                                    type="checkbox"
                                    className="peer sr-only"
                                    checked={form.features.showDeliveredButtonInJC}
                                    onChange={(e) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            features: {
                                                ...prev.features,
                                                showDeliveredButtonInJC: e.target.checked,
                                            },
                                        }))
                                    }
                                />

                                <div className="h-6 w-11 rounded-full bg-stone-300 transition peer-checked:bg-orange-500 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
                            </label>
                        </div>

                    </div>
                </Section>

                {/* ── Payment Types ── */}
                <Section icon={FiDollarSign} title="Payment Types" description="Modes accepted at your store">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <FiShoppingBag size={10} className="text-orange-400" /> Expense Modes
                            </p>
                            <TagInput
                                values={form.paymentFor}
                                onChange={update("paymentFor")}
                                placeholder="e.g. Cash, UPI, Bank Transfer…"
                            />
                        </div>
                        <div className="md:border-l md:border-stone-100 md:pl-6">
                            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <FiTrendingUp size={10} className="text-orange-400" /> Sales Modes
                            </p>
                            <TagInput
                                values={form.salesPaymentFor}
                                onChange={update("salesPaymentFor")}
                                placeholder="e.g. Card, EMI, BNPL…"
                            />
                        </div>
                    </div>
                </Section>

                {/* ── Order Statuses ── */}
                <Section icon={FiCheckSquare} title="Order Statuses" description="Control order statuses" accent>
                    {/* Sub-header with counters */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="h-5 flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-full px-3">
                                <span className="text-[10px] font-bold text-orange-600">{form.status.length}</span>
                                <span className="text-[10px] text-orange-400">/ {ALL_STATUSES.length} active</span>
                            </div>
                            {/* Mini progress bar */}
                            <div className="w-24 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-300"
                                    style={{ width: `${(form.status.length / ALL_STATUSES.length) * 100}%` }}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={() => update("status")(ALL_STATUSES)}
                                className="text-[10px] font-semibold text-orange-500 hover:text-orange-700 transition underline underline-offset-2">
                                Select All
                            </button>
                            <button type="button" onClick={() => update("status")([])}
                                className="text-[10px] font-semibold text-stone-400 hover:text-stone-600 transition underline underline-offset-2">
                                Clear
                            </button>
                        </div>
                    </div>

                    <StatusGrid selected={form.status} onChange={update("status")} />
                </Section>


                {/* ── Bill Number ── */}
                <Section icon={FiHash} title="Auto Bill Number" description="Prefix for generated invoices">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">Prefix</label>
                            <input
                                type="text"
                                value={form.billNumberPrefix}
                                onChange={(e) => setForm((f) => ({ ...f, billNumberPrefix: e.target.value.toUpperCase() }))}
                                placeholder="e.g. ORD-, BILL-"
                                className="w-full px-3 py-2 text-[12px] border border-stone-200 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-50 bg-white text-stone-700 transition placeholder:text-stone-300"
                            />
                            <p className="text-[10px] text-stone-400 mt-1.5">Appended before every bill number (e.g. <span className="font-semibold text-stone-500">{form.billNumberPrefix || "ORD-"}1001</span>)</p>
                        </div>
                    </div>
                </Section>

                {/* ── OPD Report Options ── */}
                <Section
                    icon={FiEye}
                    title="OPD Report Options"
                    description="Custom options available in the OPD report form"
                    accent
                >
                    <OpdFieldsSettings
                        value={form.opdOptions}
                        onChange={update("opdOptions")}
                    />
                </Section>

                {/* ── Save Settings ── */}
                <div className="flex items-center justify-between px-5 pb-10">
                    <p className="text-[10px] text-stone-400">Changes apply immediately after saving.</p>
                    <SaveBtn loading={loading} onClick={handleSave} />
                </div>



                {/* -- Loyalty Or Membership settings*/}
                <LoyaltySettings />
            </div>
        </div>
    );
}