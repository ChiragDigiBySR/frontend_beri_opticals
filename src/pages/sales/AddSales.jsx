import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../utils/api";
import { useDispatch, useSelector } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import { FiShoppingBag, FiCreditCard, FiSave, FiRefreshCw } from "react-icons/fi";

const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300";
const readonlyCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-100 text-gray-700 font-semibold cursor-not-allowed outline-none";
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

const EMPTY = {
    item: "", otherItem: "", amount: "", qty: "", discount: "",
    subtotal: 0, gst: "0", gstAmt: 0, gstType: "excluded",
    totalAmount: 0, paymentMode: "CASH",
};

export default function AddSaleItem() {
    const settings = useSelector((state) => state?.settings?.data);
    const dispatch = useDispatch();

    const [formData, setFormData] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: "" }));
    };

    /* Auto-calculations */
    useEffect(() => {
        const amount = Number(formData.amount) || 0;
        const qty = Number(formData.qty) || 0;
        const discount = Number(formData.discount) || 0;
        const gst = Number(formData.gst) || 0;

        const subtotal = amount * qty - discount;
        let gstAmt = 0, total = subtotal;

        if (gst > 0) {
            if (formData.gstType === "included") {
                gstAmt = (subtotal * gst) / (100 + gst);
                total = subtotal;
            } else {
                gstAmt = (subtotal * gst) / 100;
                total = subtotal + gstAmt;
            }
        }

        setFormData(prev => ({
            ...prev,
            subtotal: subtotal.toFixed(2),
            gstAmt: gstAmt.toFixed(2),
            totalAmount: total.toFixed(2),
        }));
    }, [formData.amount, formData.qty, formData.discount, formData.gst, formData.gstType]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = {};
        if (!formData.item) newErrors.item = "Item name is required";
        if (!formData.amount) newErrors.amount = "Amount is required";
        if (!formData.qty) newErrors.qty = "Quantity is required";

        if (formData.item == "OTHER") {
            console.log("OTHER")
            if (!formData.otherItem) newErrors.otherItem = "Other Category required";
        }

        if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

        try {
            setLoading(true);
            dispatch(showLoader());
            const res = await api.post("/sale", formData);
            if (res.data.success) {
                toast.success(res.data.message || "Sale added successfully");
                setFormData(EMPTY);
                setErrors({});
            }
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
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Sale Details</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5">

                            {/* Item */}
                            <Field label="Item *" icon={FiShoppingBag} error={errors.item}>
                                <select
                                    name="item" value={formData.item} onChange={handleChange}
                                    className={`${inputCls} ${errors.item ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                >
                                    <option value="">Select item</option>
                                    {settings?.salesPaymentFor?.map((exp, i) => (
                                        <option key={i} value={exp}>{exp}</option>
                                    ))}
                                </select>
                            </Field>


                            {/* OTHER Item */}
                            {
                                formData.item == "OTHER" &&

                                <Field label="Other Category *" error={errors.otherItem}>
                                    <input
                                        type="text"
                                        name="otherItem"
                                        value={formData.otherItem}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        className={`${inputCls} ${errors.otherItem
                                            ? "border-red-300 focus:border-red-300 focus:ring-red-100"
                                            : ""
                                            }`}
                                    />
                                </Field>
                            }


                            {/* Amount */}
                            <Field label="Amount *" error={errors.amount}>
                                <input
                                    name="amount" value={formData.amount} onChange={handleChange}
                                    placeholder="0.00"
                                    className={`${inputCls} ${errors.amount ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                />
                            </Field>

                            {/* Quantity */}
                            <Field label="Quantity *" error={errors.qty}>
                                <input
                                    name="qty" value={formData.qty} onChange={handleChange}
                                    placeholder="1"
                                    className={`${inputCls} ${errors.qty ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                />
                            </Field>

                            {/* Discount */}
                            <Field label="Discount">
                                <input
                                    name="discount" value={formData.discount} onChange={handleChange}
                                    placeholder="0.00"
                                    className={inputCls}
                                />
                            </Field>

                            {/* Subtotal (readonly) */}
                            <Field label="Subtotal">
                                <input value={formData.subtotal} readOnly className={readonlyCls} />
                            </Field>

                            {/* GST % */}
                            <Field label="GST %">
                                <select name="gst" value={formData.gst} onChange={handleChange} className={inputCls}>

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

                            {/* GST Type */}
                            <Field label="GST Type">
                                <select name="gstType" value={formData.gstType} onChange={handleChange} className={inputCls}>
                                    <option value="excluded">Excluded</option>
                                    <option value="included">Included</option>
                                </select>
                            </Field>

                            {/* GST Amount (readonly) */}
                            <Field label="GST Amount">
                                <input value={formData.gstAmt} readOnly className={readonlyCls} />
                            </Field>

                            {/* Total Amount (readonly) */}
                            <Field label="Total Amount">
                                <input value={formData.totalAmount} readOnly className={`${readonlyCls} text-emerald-600`} />
                            </Field>

                            {/* Payment Mode */}
                            <Field label="Payment Mode" icon={FiCreditCard}>
                                <select name="paymentMode" value={formData.paymentMode} onChange={handleChange} className={inputCls}>
                                    <option value="CASH">CASH</option>
                                    <option value="UPI">UPI</option>
                                    <option value="CARD">CARD</option>
                                    <option value="NONE">NONE</option>
                                </select>
                            </Field>

                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-2 mt-4 px-3">
                        <button
                            type="button" onClick={handleReset}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                        >
                            <FiRefreshCw size={12} /> Reset
                        </button>
                        <button
                            type="submit" disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading
                                ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                                : <><FiSave size={13} /> Save Sale</>
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}