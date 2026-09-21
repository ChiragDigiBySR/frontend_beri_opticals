import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import api from "../../utils/api";
import Prescription from "../../components/Prescription";
import { useDispatch, useSelector } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

import {
    FiUser, FiPhone, FiMail, FiUserCheck, FiCreditCard, FiFileText, FiSave, FiRefreshCw,
    FiLoader, FiMapPin, FiCalendar
} from "react-icons/fi";

// ─── debounce helper ──────────────────────────────────────────────────────────
function useDebounce(value, delay = 350) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

const inputCls =
    "w-full px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300";

const readonlyCls =
    "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-100 text-gray-700 font-semibold cursor-not-allowed outline-none";

const labelCls =
    "text-[10px] font-semibold text-gray-800 uppercase tracking-wider block mb-1";

const Field = ({ label, icon: Icon, error, children }) => (
    <div>
        <label className={labelCls}>
            <span className="flex items-center gap-1.5">
                {Icon && <Icon size={14} className="text-gray-800" />}
                {label}
            </span>
        </label>
        {children}
        {error && (
            <p className="text-[10px] text-red-500 mt-1 font-medium">{error}</p>
        )}
    </div>
);

// ─── Suggestion Dropdown ──────────────────────────────────────────────────────
function SuggestionDropdown({ suggestions, onSelect, onClose }) {
    return (
        <div
            className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
            style={{ animation: "fadeDown 0.15s ease" }}
        >
            <style>{`@keyframes fadeDown { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }`}</style>
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {suggestions.length} result{suggestions.length !== 1 ? "s" : ""} found
                </span>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
            </div>
            {suggestions.map((customer) => (
                <button
                    key={customer._id}
                    type="button"
                    onClick={() => onSelect(customer)}
                    className="w-full text-left px-4 py-3 hover:bg-orange-50 transition border-b border-gray-50 last:border-0 flex items-center gap-3"
                >
                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center shrink-0">
                        {customer.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{customer.name}</p>
                        <p className="text-xs text-gray-400">{customer.mobile}</p>
                    </div>
                    <span className="text-[10px] text-orange-400 font-medium shrink-0">Fill →</span>
                </button>
            ))}
        </div>
    );
}

export default function AddPrescription() {

    const dispatch = useDispatch();
    const employees = useSelector((state) => state.employees.data);
    const pageField = useSelector((state) => state.pageField.data);
    const settings = useSelector((state) => state.settings.data);

    const [formData, setFormData] = useState({
        name: "",
        countryCode: "+91",
        mobile: "",
        email: "",
        testedBy: "SELF",
        testedByName: "",
        amount: 0,
        discount: 0,
        gstPercent: "0",
        gstType: "Included",
        gstAmount: 0,
        totalAmount: 0,
        transactionType: "CASH",
        invoiceType: "NONE",
        address: "",
        remark: "",
        relation_name: "",
        createdAt: new Date().toISOString().split("T")[0],
        nextVisitPeriod: "",
        nextVisitDate: ""
    });

    // ─── Autocomplete state ───────────────────────────────────────────────────
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeField, setActiveField] = useState(null);
    const [searching, setSearching] = useState(false);
    const suggestionRef = useRef(null);

    const debouncedName = useDebounce(formData.name, 350);
    const debouncedMobile = useDebounce(formData.mobile, 350);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (suggestionRef.current && !suggestionRef.current.contains(e.target))
                setShowSuggestions(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Trigger search when debounced name changes
    useEffect(() => {
        if (activeField === "name" && debouncedName.trim().length >= 3)
            fetchSuggestions(debouncedName.trim());
    }, [debouncedName]);

    // Trigger search when debounced mobile changes
    useEffect(() => {
        if (activeField === "mobile" && debouncedMobile.trim().length >= 3)
            fetchSuggestions(debouncedMobile.trim());
    }, [debouncedMobile]);

    const fetchSuggestions = async (q) => {
        try {
            setSearching(true);
            const res = await api.get("/jc/search", { params: { q } });
            if (res.data.success) {
                setSuggestions(res.data.data || []);
                setShowSuggestions(true);
            }
        } catch (err) {
            console.error("Customer search error:", err);
        } finally {
            setSearching(false);
        }
    };

    // Fill form fields from selected suggestion
    const handleSelectCustomer = (customer) => {
        setFormData((prev) => ({
            ...prev,
            name: customer.name || "",
            mobile: customer.mobile || "",
            email: customer.email || "",
        }));
        setSuggestions([]);
        setShowSuggestions(false);
        setActiveField(null);
    };

    // ─────────────────────────────────────────────────────────────────────────

    const emptyEye = {
        sph: "", cyl: "", axis: "", vis: "",
        nv_sph: "", nv_cyl: "", nv_axis: "", nv_vis: "", add: "", pd: ""
    };

    const [prescription, setPrescription] = useState({
        eyewear: {
            rightEye: { ...emptyEye },
            leftEye: { ...emptyEye }
        },
        transpose: {
            rightEye: { ...emptyEye },
            leftEye: { ...emptyEye }
        },
        contactLens: {
            rightEye: { ...emptyEye },
            leftEye: { ...emptyEye }
        }
    });

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => {
            const updated = { ...prev, [name]: value };

            if (name === "testedBy") {
                updated.testedByName = "";
            }

            if (name === "nextVisitPeriod") {
                if (value) {
                    const d = new Date();
                    d.setMonth(d.getMonth() + Number(value));
                    updated.nextVisitDate = d.toISOString().split("T")[0];
                } else {
                    updated.nextVisitDate = "";
                }
            }

            if (["amount", "discount", "gstPercent", "gstType"].includes(name)) {
                const calc = calculateAmounts(updated);
                updated.gstAmount = calc.gstAmount;
                updated.totalAmount = calc.totalAmount;
            }

            return updated;
        });

        setErrors((prev) => ({ ...prev, [name]: "" }));

        // Close suggestions if user clears the field
        if ((name === "name" || name === "mobile") && value.trim().length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const calculateAmounts = (data) => {
        const amount = Number(data.amount) || 0;
        const discount = Number(data.discount) || 0;
        const gstPercent = Number(data.gstPercent) || 0;

        const discountedAmount = Math.max(amount - discount, 0);

        let gstAmount = 0;
        let totalAmount = 0;

        if (gstPercent > 0) {
            if (data.gstType === "Included") {
                gstAmount = (discountedAmount * gstPercent) / (100 + gstPercent);
                totalAmount = discountedAmount;
            } else {
                gstAmount = (discountedAmount * gstPercent) / 100;
                totalAmount = discountedAmount + gstAmount;
            }
        } else {
            totalAmount = discountedAmount;
        }

        return {
            gstAmount: gstAmount.toFixed(2),
            totalAmount: totalAmount.toFixed(2),
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        let newErrors = {};

        if (!formData.name) newErrors.name = "Name is required";
        if (!formData.mobile) newErrors.mobile = "Mobile is required";

        // dynamic required from field settings
        if (pageField?.prescriptionPage?.email?.required && !formData.email) newErrors.email = "Email is required";
        if (pageField?.prescriptionPage?.address?.required && !formData.address.trim()) newErrors.address = "Address is required";

        if (formData.mobile && !/^[6-9]\d{9}$/.test(formData.mobile)) {
            newErrors.mobile = "Enter valid 10-digit mobile number";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error(Object.values(newErrors)[0]);
            return;
        }

        try {

            dispatch(showLoader());

            const isDownload = formData.invoiceType?.toLowerCase().startsWith("download");

            const res = await api.post(
                "/prescriptions",
                { ...formData, prescription },
                isDownload ? { responseType: "blob" } : {}
            );

            if (isDownload) {
                const blob = new Blob([res.data], { type: "application/pdf" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `Prescription_${Date.now()}.pdf`;
                link.click();
                URL.revokeObjectURL(link.href);
            }

            if (res.status === 200 || res.status === 201) {
                toast.success("Prescription added successfully");
                handleReset();
            }

        } catch (error) {
            toast.error("Something went wrong");
        }
        finally {
            dispatch(hideLoader());
        }

    };

    const handleReset = () => {
        setFormData({
            name: "",
            mobile: "",
            email: "",
            testedBy: "SELF",
            testedByName: "",
            amount: 0,
            discount: 0,
            gstPercent: "0",
            gstType: "Included",
            gstAmount: 0,
            totalAmount: 0,
            transactionType: "CASH",
            invoiceType: "NONE",
            address: "",
            remark: "",
            nextVisitPeriod: "",
            nextVisitDate: ""
        });

        setPrescription({
            eyewear: {
                rightEye: { ...emptyEye },
                leftEye: { ...emptyEye }
            },
            transpose: {
                rightEye: { ...emptyEye },
                leftEye: { ...emptyEye }
            },
            contactLens: {
                rightEye: { ...emptyEye },
                leftEye: { ...emptyEye }
            }
        });

        setSuggestions([]);
        setShowSuggestions(false);
        setErrors({});
    };

    return (

        <div className="min-h-screen bg-gray-50 mb-24">

            <form onSubmit={handleSubmit}>

                {/* CARD */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-0.5 h-4 bg-orange-400 rounded-full" />
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                            Customer Details
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5">

                        <Field label="Date" icon={FiCalendar}>
                            <input
                                type="date"
                                name="createdAt"
                                value={formData.createdAt}
                                onChange={handleChange}
                                className={inputCls}
                            />
                        </Field>

                        {/* ── Name with autocomplete ── */}
                        <Field label="Name *" icon={FiUser} error={errors.name}>
                            <div
                                className="relative"
                                ref={activeField === "name" ? suggestionRef : null}
                            >
                                {/* Spinner overlay inside input */}
                                {searching && activeField === "name" && (
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none">
                                        <FiLoader size={13} className="animate-spin" />
                                    </span>
                                )}
                                <input
                                    name="name"
                                    value={formData.name}
                                    autoComplete="off"
                                    onFocus={() => {
                                        setActiveField("name");
                                        if (formData.name.trim().length >= 3 && suggestions.length > 0)
                                            setShowSuggestions(true);
                                    }}
                                    onChange={(e) => {
                                        setActiveField("name");
                                        handleChange(e);
                                    }}
                                    className={inputCls}
                                    placeholder="Customer name"
                                />
                                {showSuggestions && activeField === "name" && suggestions.length > 0 && (
                                    <SuggestionDropdown
                                        suggestions={suggestions}
                                        onSelect={handleSelectCustomer}
                                        onClose={() => setShowSuggestions(false)}
                                    />
                                )}
                            </div>
                        </Field>

                        {/* Country Code — fixed narrow width */}
                        <div>
                            <label className={labelCls}>
                                <span className="flex items-center gap-1.5">
                                    <FiPhone size={14} className="text-gray-800" />
                                    Country Code
                                </span>
                            </label>
                            <PhoneInput
                                country={"in"}
                                value={formData.countryCode}
                                onChange={(value, country) => {
                                    setFormData((prev) => ({
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

                        {/* ── Mobile with autocomplete ── */}
                        <Field label="Mobile *" icon={FiPhone} error={errors.mobile}>
                            <div
                                className="relative"
                                ref={activeField === "mobile" ? suggestionRef : null}
                            >
                                {searching && activeField === "mobile" && (
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none">
                                        <FiLoader size={13} className="animate-spin" />
                                    </span>
                                )}
                                <input
                                    name="mobile"
                                    value={formData.mobile}
                                    autoComplete="off"
                                    onFocus={() => {
                                        setActiveField("mobile");
                                        if (formData.mobile.trim().length >= 3 && suggestions.length > 0)
                                            setShowSuggestions(true);
                                    }}
                                    onChange={(e) => {
                                        setActiveField("mobile");
                                        handleChange(e);
                                    }}
                                    className={inputCls}
                                    placeholder="10-digit mobile"
                                />
                                {showSuggestions && activeField === "mobile" && suggestions.length > 0 && (
                                    <SuggestionDropdown
                                        suggestions={suggestions}
                                        onSelect={handleSelectCustomer}
                                        onClose={() => setShowSuggestions(false)}
                                    />
                                )}
                            </div>
                        </Field>

                        {pageField && pageField?.prescriptionPage?.email?.visible && (
                            <Field label={`Email${pageField?.customerPage?.email?.required ? " *" : ""}`}
                                icon={FiMail}
                                error={errors.email}
                            >
                                <input
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={`${inputCls} ${errors.email ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                />
                            </Field>
                        )}

                        {pageField && pageField?.prescriptionPage?.address?.visible && (
                            <Field label={`Address${pageField?.customerPage?.address?.required ? " *" : ""}`}
                                icon={FiMapPin}
                                error={errors.address}
                            >
                                <input
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className={`${inputCls} ${errors.email ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                />
                            </Field>
                        )}

                        <Field label="Tested By" icon={FiUserCheck}>
                            <select
                                name="testedBy"
                                value={formData.testedBy}
                                onChange={handleChange}
                                className={inputCls}
                            >
                                <option value="SELF">SELF</option>
                                <option value="OUTSIDE">OUTSIDE</option>
                                <option value="NONE">NONE</option>
                            </select>
                        </Field>

                        <Field label="Tested By Name">
                            {formData.testedBy === "SELF" && (
                                <select
                                    name="testedByName"
                                    value={formData.testedByName}
                                    onChange={handleChange}
                                    className={inputCls}
                                >
                                    <option value="">Select Employee</option>
                                    {employees.map((emp) => (
                                        <option key={emp._id} value={emp.name}>
                                            {emp.name}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {formData.testedBy === "OUTSIDE" && (
                                <input
                                    name="testedByName"
                                    value={formData.testedByName}
                                    onChange={handleChange}
                                    className={inputCls}
                                />
                            )}

                            {formData.testedBy === "NONE" && (
                                <input disabled className={readonlyCls} value="Not Applicable" />
                            )}

                        </Field>

                        <Field label="Relation Name" icon={FiFileText}>
                            <input
                                name="relation_name"
                                value={formData.relation_name}
                                onChange={handleChange}
                                className={inputCls}
                                placeholder="S/O, W/O"
                            />
                        </Field>

                        <Field label="Remark" icon={FiFileText}>
                            <input
                                name="remark"
                                value={formData.remark}
                                onChange={handleChange}
                                className={inputCls}
                            />
                        </Field>

                        <Field label="Next Visit" icon={FiCalendar}>
                            <select
                                name="nextVisitPeriod"
                                value={formData.nextVisitPeriod}
                                onChange={handleChange}
                                className={inputCls}
                            >
                                <option value="">Select</option>
                                <option value="1">1 Month</option>
                                <option value="3">3 Months</option>
                                <option value="6">6 Months</option>
                            </select>
                        </Field>

                        <Field label="Next Visit Date" icon={FiCalendar}>
                            <input
                                type="date"
                                name="nextVisitDate"
                                value={formData.nextVisitDate}
                                onChange={handleChange}
                                className={inputCls}
                            />
                        </Field>

                    </div>

                </div>

                {/* PRESCRIPTION COMPONENT */}
                <Prescription prescription={prescription} setPrescription={setPrescription} />

                {/* BILLING */}

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-4">

                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-0.5 h-4 bg-orange-400 rounded-full" />
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                            Billing
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5">

                        <Field label="Prescription Rs">
                            <input
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                className={inputCls}
                            />
                        </Field>

                        <Field label="Discount">
                            <input
                                name="discount"
                                value={formData.discount}
                                onChange={handleChange}
                                className={inputCls}
                            />
                        </Field>

                        <Field label="GST %">
                            <select
                                name="gstPercent"
                                value={formData.gstPercent}
                                onChange={handleChange}
                                className={inputCls}
                            >

                                {/* GST Values From settings */}
                                {
                                    settings?.gst?.map((val, index) => {
                                        return (
                                            <option key={index} value={val}>{val}%</option>
                                        )
                                    })
                                }

                            </select>
                        </Field>

                        <Field label="GST Type">
                            <select
                                name="gstType"
                                value={formData.gstType}
                                onChange={handleChange}
                                className={inputCls}
                            >
                                <option>Included</option>
                                <option>Excluded</option>
                            </select>
                        </Field>

                        <Field label="GST Amount">
                            <input value={formData.gstAmount} readOnly className={readonlyCls} />
                        </Field>

                        <Field label="Total">
                            <input value={formData.totalAmount} readOnly className={readonlyCls} />
                        </Field>

                        <Field label="Transaction Type" icon={FiCreditCard}>
                            <select
                                name="transactionType"
                                value={formData.transactionType}
                                onChange={handleChange}
                                className={inputCls}
                            >
                                <option value="CASH">CASH</option>
                                <option value="UPI">UPI</option>
                                <option value="CARD">CARD</option>
                                <option value="NONE">NONE</option>
                            </select>
                        </Field>

                        <Field label="Invoice Type" icon={FiFileText}>
                            <select
                                name="invoiceType"
                                value={formData.invoiceType}
                                onChange={handleChange}
                                className={inputCls}
                            >
                                <option value="NONE">NONE</option>
                                <option value="Download with GST">Download with GST</option>
                                <option value="Download without GST">Download without GST</option>
                                <option value="Send with GST">Send with GST</option>
                                <option value="Send without GST">Send without GST</option>
                                <option value="Send without Bill">Send without Bill</option>
                            </select>
                        </Field>

                    </div>

                </div>

                {/* BUTTONS */}

                <div className="flex justify-end gap-2 mt-4">

                    <button
                        type="button"
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                    >
                        <FiRefreshCw size={12} />
                        Reset
                    </button>

                    <button
                        type="submit"
                        className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                    >
                        <FiSave size={13} />
                        Save Prescription
                    </button>

                </div>

            </form>

        </div>
    );
}