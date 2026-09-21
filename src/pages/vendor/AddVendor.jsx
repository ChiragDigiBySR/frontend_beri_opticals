import { useState } from "react";
import { toast } from "react-toastify";
import api from "../../utils/api";
import { useDispatch } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import { FiUser, FiMapPin, FiPhone, FiMail, FiBriefcase, FiFileText, FiCreditCard, FiSave, FiRefreshCw } from "react-icons/fi";

const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300";
const labelCls = "text-[10px] font-semibold text-gray-800 uppercase tracking-wider block mb-1";

const Field = ({ label, icon: Icon, error, children }) => (
    <div>
        <label className={labelCls}>
            <span className="flex items-center gap-1.5">
                {Icon && <Icon size={14} className="text-gray-800" />}
                {label}
            </span>
        </label>
        {children}
        {error && <p className="text-[10px] text-red-500 mt-1 font-medium">{error}</p>}
    </div>
);

const EMPTY = { name: "", firm: "", mobile: "", email: "", address: "", gstNumber: "", paymentTerms: "", notes: "" };

export default function AddVendor() {
    const [formData, setFormData] = useState(EMPTY);
    const [errors, setErrors]     = useState({});
    const [loading, setLoading]   = useState(false);
    const dispatch = useDispatch();

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setErrors(prev => ({ ...prev, [e.target.name]: "" }));
    };

    const validate = () => {
        const { name, firm, mobile, email } = formData;
        const err = {};
        if (!name)   err.name   = "Name is required";
        if (!firm)   err.firm   = "Firm name is required";
        if (!mobile) err.mobile = "Mobile number is required";
        if (!email)  err.email  = "Email is required";
        if (email  && !/\S+@\S+\.\S+/.test(email))   err.email  = "Invalid email address";
        if (mobile && !/^[6-9]\d{9}$/.test(mobile))  err.mobile = "Enter a valid 10-digit mobile number";
        setErrors(err);
        return Object.keys(err).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        try {
            setLoading(true);
            dispatch(showLoader());
            const res = await api.post("/vendor", formData);
            toast.success(res.data.message);
            setFormData(EMPTY);
            setErrors({});
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
            dispatch(hideLoader());
        }
    };

    const handleReset = () => { setFormData(EMPTY); setErrors({}); };

    return (
        <div className="min-h-screen bg-gray-50">
            <div>
                <form onSubmit={handleSubmit} noValidate>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

                        {/* Section label */}
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-0.5 h-4 bg-orange-400 rounded-full" />
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Vendor Details</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">

                            <Field label="Name *" icon={FiUser} error={errors.name}>
                                <input
                                    name="name" value={formData.name} onChange={handleChange}
                                    placeholder="Contact person"
                                    className={`${inputCls} ${errors.name ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                />
                            </Field>

                            <Field label="Firm *" icon={FiBriefcase} error={errors.firm}>
                                <input
                                    name="firm" value={formData.firm} onChange={handleChange}
                                    placeholder="Firm / company name"
                                    className={`${inputCls} ${errors.firm ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                />
                            </Field>

                            <Field label="Mobile *" icon={FiPhone} error={errors.mobile}>
                                <input
                                    name="mobile" value={formData.mobile} onChange={handleChange}
                                    placeholder="10-digit mobile"
                                    maxLength={10}
                                    className={`${inputCls} ${errors.mobile ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                />
                            </Field>

                            <Field label="Email *" icon={FiMail} error={errors.email}>
                                <input
                                    type="email" name="email" value={formData.email} onChange={handleChange}
                                    placeholder="email@example.com"
                                    className={`${inputCls} ${errors.email ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                />
                            </Field>

                            <Field label="GST Number" icon={FiCreditCard}>
                                <input
                                    name="gstNumber" value={formData.gstNumber} onChange={handleChange}
                                    placeholder="22AAAAA0000A1Z5"
                                    className={inputCls}
                                />
                            </Field>

                            <Field label="Payment Terms" icon={FiFileText}>
                                <input
                                    name="paymentTerms" value={formData.paymentTerms} onChange={handleChange}
                                    placeholder="e.g. Net 30"
                                    className={inputCls}
                                />
                            </Field>

                            <Field label="Address" icon={FiMapPin}>
                                <input
                                    name="address" value={formData.address} onChange={handleChange}
                                    placeholder="Street, city..."
                                    className={inputCls}
                                />
                            </Field>

                            <Field label="Notes" icon={FiFileText}>
                                <input
                                    name="notes" value={formData.notes} onChange={handleChange}
                                    placeholder="Optional notes..."
                                    className={inputCls}
                                />
                            </Field>

                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2 mt-4 px-3">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                        >
                            <FiRefreshCw size={12} /> Reset
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading
                                ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                                : <><FiSave size={13} /> Save Vendor</>
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}