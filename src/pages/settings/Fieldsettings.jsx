import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import api from "../../utils/api";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import { setPageFields } from "../../features/pagesFields/pageFieldSlice";

// ─── Page metadata ────────────────────────────────────────────────────────────
const PAGE_META = {
    jcPage: {
        label: "Job Card Page",
        description: "Fields shown when creating or editing a job card",
        fields: {
            email:            "Email",
            address:          "Address",
            dob:              "Date of Birth",
            anniversary:      "Anniversary",
            bill_no:          "Bill Number",
            delivery_date:          "Delivery Date",
            testedBy:         "Tested By",
            employee:         "Employee",
            refferredBy:      "Referred By",
            add_discount:     "Additional Discount",
            loyalty_discount: "Loyalty Discount",
            auto_bill_no: "Auto Bill Number",
        },
    },
    customerPage: {
        label: "Customer Page",
        description: "Fields shown on the customer profile form",
        fields: {
            address:     "Address",
            dob:         "Date of Birth",
            anniversary: "Anniversary",
        },
    },
    prescriptionPage: {
        label: "Prescription Page",
        description: "Fields shown on the prescription form",
        fields: {
            email:   "Email",
            address: "Address",
        },
    },
};

// ─── Toggle Switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1
                ${checked ? "bg-blue-500" : "bg-stone-200"}`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200
                    ${checked ? "translate-x-4" : "translate-x-0"}`}
            />
        </button>
    );
}

// ─── Field Row ────────────────────────────────────────────────────────────────
function FieldRow({ label, visible, required, onVisibleChange, onRequiredChange, isLast }) {
    return (
        <div className={`flex items-center justify-between py-3 ${!isLast ? "border-b border-stone-100" : ""}`}>
            <div className="flex items-center gap-2.5">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${visible ? "bg-blue-400" : "bg-stone-300"}`} />
                <span className={`text-sm transition-colors ${visible ? "text-stone-700" : "text-stone-400"}`}>
                    {label}
                </span>
            </div>
            <div className="flex items-center gap-4">
                {/* Visible toggle */}
                <div className="flex items-center gap-2">
                    <span className={`text-xs w-10 text-right transition-colors ${visible ? "text-blue-500" : "text-stone-400"}`}>
                        {visible ? "Visible" : "Hidden"}
                    </span>
                    <Toggle checked={visible} onChange={onVisibleChange} />
                </div>

                {/* Required toggle — only show if field is visible */}
                {visible && (
                    <div className="flex items-center gap-2">
                        <span className={`text-xs w-14 text-right transition-colors ${required ? "text-orange-500" : "text-stone-400"}`}>
                            {required ? "Required" : "Optional"}
                        </span>
                        <Toggle checked={required} onChange={onRequiredChange} />
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Page Card ────────────────────────────────────────────────────────────────
function PageCard({ pageKey, pages, onChange }) {
    const meta = PAGE_META[pageKey];
    const pageData = pages[pageKey] || {};
    const fieldKeys = Object.keys(meta.fields);

    const visibleCount = fieldKeys.filter((f) => pageData[f]?.visible).length;
    const totalCount = fieldKeys.length;
    const allVisible = visibleCount === totalCount;

    const toggleAll = () => {
        const newVal = !allVisible;
        const updated = {};
        fieldKeys.forEach((f) => {
            updated[f] = {
                ...pageData[f],
                visible: newVal,
                // if hiding, also turn off required
                required: newVal ? (pageData[f]?.required ?? false) : false,
            };
        });
        onChange(pageKey, updated);
    };

    const toggleField = (field, key, val) => {
        const current = pageData[field] || {};
        onChange(pageKey, {
            ...pageData,
            [field]: {
                ...current,
                [key]: val,
                // if hiding, also turn off required
                ...(key === "visible" && !val ? { required: false } : {}),
            },
        });
    };

    return (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-stone-50 border-b border-stone-100">
                <div>
                    <h3 className="text-sm font-semibold text-stone-700">{meta.label}</h3>
                    <p className="text-xs text-stone-400 mt-0.5">{meta.description}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-stone-500">
                        <span className="font-semibold text-blue-500">{visibleCount}</span>/{totalCount}
                    </span>
                    <button
                        type="button"
                        onClick={toggleAll}
                        className="text-xs font-medium text-stone-400 hover:text-blue-500 transition-colors underline underline-offset-2"
                    >
                        {allVisible ? "Hide all" : "Show all"}
                    </button>
                </div>
            </div>

            {/* Fields */}
            <div className="px-5">
                {fieldKeys.map((fieldKey, i) => (
                    <FieldRow
                        key={fieldKey}
                        label={meta.fields[fieldKey]}
                        visible={pageData[fieldKey]?.visible ?? true}
                        required={pageData[fieldKey]?.required ?? false}
                        onVisibleChange={(val) => toggleField(fieldKey, "visible", val)}
                        onRequiredChange={(val) => toggleField(fieldKey, "required", val)}
                        isLast={i === fieldKeys.length - 1}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Access Denied ────────────────────────────────────────────────────────────
function AccessDenied() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                </div>
                <p className="text-sm font-semibold text-stone-700">Access Denied</p>
                <p className="text-xs text-stone-400 mt-1">You don't have permission to view this page.</p>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FieldSettingsPage() {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { data: cachedData, fetched } = useSelector((state) => state.pageField);

    const [pages, setPages] = useState({});
    const [fetching, setFetching] = useState(!fetched);
    const [saving, setSaving] = useState(false);

    if (user?.role !== "ADMIN") return <AccessDenied />;

    useEffect(() => {
        if (fetched && cachedData?.pages) {
            setPages(cachedData.pages);
            return;
        }

        (async () => {
            try {
                dispatch(showLoader());
                const res = await api.get("settings/page/fields");
                const data = res.data.data;
                setPages(data.pages || {});
                dispatch(setPageFields(data));
            } catch (err) {
                toast.error(err.response?.data?.message || "Failed to load field settings");
            } finally {
                setFetching(false);
                dispatch(hideLoader());
            }
        })();
    }, []);

    const handleChange = (pageKey, updatedFields) => {
        setPages((prev) => ({ ...prev, [pageKey]: updatedFields }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            dispatch(showLoader());
            const res = await api.patch("settings/page/fields/update", { pages });
            dispatch(setPageFields({ pages }));
            toast.success(res.data.message || "Field settings saved");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to save settings");
        } finally {
            setSaving(false);
            dispatch(hideLoader());
        }
    };

    const totalVisible = Object.entries(PAGE_META).reduce((acc, [pageKey, meta]) => {
        return acc + Object.keys(meta.fields).filter((f) => pages[pageKey]?.[f]?.visible).length;
    }, 0);
    const totalFields = Object.values(PAGE_META).reduce(
        (acc, meta) => acc + Object.keys(meta.fields).length, 0
    );

    if (fetching) return null;

    return (
        <div className="w-full px-4 py-6 space-y-4">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-base font-bold text-stone-800">Field Visibility</h1>
                    <p className="text-xs text-stone-400 mt-0.5">
                        {totalVisible} of {totalFields} fields visible across all pages
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 active:scale-[0.98] text-white text-xs font-semibold rounded-lg transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {saving ? (
                        <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving…
                        </>
                    ) : (
                        <>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                <polyline points="17 21 17 13 7 13 7 21" />
                                <polyline points="7 3 7 8 15 8" />
                            </svg>
                            Save
                        </>
                    )}
                </button>
            </div>

            {/* ── Top row: jcPage full width ── */}
            <PageCard pageKey="jcPage" pages={pages} onChange={handleChange} />

            {/* ── Bottom row: customerPage + prescriptionPage side by side ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <PageCard pageKey="customerPage" pages={pages} onChange={handleChange} />
                <PageCard pageKey="prescriptionPage" pages={pages} onChange={handleChange} />
            </div>

            <p className="text-xs text-stone-400 text-center pb-4">
                Changes apply immediately after saving.
            </p>
        </div>
    );
}