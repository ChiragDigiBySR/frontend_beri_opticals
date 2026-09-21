import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../utils/api";
import { useDispatch, useSelector } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import { FiCalendar, FiCreditCard, FiFileText, FiSave, FiRefreshCw, } from "react-icons/fi";

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

export default function AddExpense() {
    const settings = useSelector((state) => state?.settings?.data);
    const dispatch = useDispatch();

    const employees = useSelector((state) => state.employees.data);

    const [formData, setFormData] = useState({
        category: "DAILY EXP",
        otherCategory: "",
        amount: "",
        gst: "0",
        gstType: "excluded",
        gstAmt: 0,
        totalAmount: 0,
        paymentMode: "CASH",
        expenseDate: new Date().toISOString().slice(0, 10),
        notes: "",
        expenseBy: "",        // ✅ employee id
        expenseByName: "",
    });

    const [errors, setErrors] = useState({});

    const handleEmployeeChange = (e) => {
        const selectedId = e.target.value;

        const emp = employees.find((e) => e._id === selectedId);

        setFormData((prev) => ({
            ...prev,
            expenseBy: selectedId,
            expenseByName: emp?.name || "",
        }));

        setErrors((prev) => ({ ...prev, expenseBy: "" }));
    };

    /* HANDLE CHANGE */
    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    /* CALCULATIONS */
    useEffect(() => {
        const amount = Number(formData.amount) || 0;
        const gst = Number(formData.gst) || 0;

        let gstAmt = 0;
        let total = amount;

        if (gst > 0) {
            if (formData.gstType === "included") {
                gstAmt = (amount * gst) / (100 + gst);
                total = amount;
            } else {
                gstAmt = (amount * gst) / 100;
                total = amount + gstAmt;
            }
        }

        setFormData((prev) => ({
            ...prev,
            gstAmt: gstAmt.toFixed(2),
            totalAmount: total.toFixed(2),
        }));
    }, [formData.amount, formData.gst, formData.gstType]);

    /* SUBMIT */
    const handleSubmit = async (e) => {
        e.preventDefault();

        const newErrors = {};

        if (!formData.expenseDate) formData.expenseDate = new Date().toISOString().slice(0, 10);
        if (!formData.expenseBy) newErrors.expenseBy = "Employee required";
        if (!formData.category) newErrors.category = "Category required";
        if (!formData.amount) newErrors.amount = "Amount required";

        if (formData.category == "OTHER") {
            if (!formData.otherCategory) newErrors.otherCategory = "Other Category required";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        try {
            dispatch(showLoader());

            const res = await api.post("/expense", formData);

            if (res.data.success) {
                toast.success("Expense added successfully");
                handleReset();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Something went wrong");
        } finally {
            dispatch(hideLoader());
        }
    };

    /* RESET */
    const handleReset = () => {
        setFormData({
            category: "DAILY EXP",
            otherCategory: "",
            amount: "",
            gst: "0",
            gstType: "excluded",
            gstAmt: 0,
            totalAmount: 0,
            paymentMode: "CASH",
            expenseDate: new Date().toISOString().slice(0, 10),
            notes: "",
            expenseBy: "",
            expenseByName: "",
        });
        setErrors({});
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <form onSubmit={handleSubmit} noValidate>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    {/* Section Label */}
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-0.5 h-4 bg-orange-400 rounded-full" />
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                            Expense Details
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5">
                        {/* Date */}
                        <Field label="Date" icon={FiCalendar}>
                            <input
                                type="date"
                                name="expenseDate"
                                value={formData.expenseDate}
                                onChange={handleChange}
                                className={inputCls}
                            />
                        </Field>

                        <Field label="Expense By *" error={errors.expenseBy}>
                            <select
                                name="expenseBy"
                                value={formData.expenseBy}
                                onChange={handleEmployeeChange}
                                className={`${inputCls} ${errors.expenseBy
                                    ? "border-red-300 focus:border-red-300 focus:ring-red-100"
                                    : ""
                                    }`}
                            >
                                <option value="">Select Employee</option>
                                {employees?.map((emp) => (
                                    <option key={emp._id} value={emp._id}>
                                        {emp.name}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        {/* Category */}
                        <Field label="Category *" error={errors.category}>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className={`${inputCls} ${errors.category
                                    ? "border-red-300 focus:border-red-300 focus:ring-red-100"
                                    : ""
                                    }`}
                            >
                                {settings?.paymentFor?.map((exp, i) => (
                                    <option key={i} value={exp}>
                                        {exp}
                                    </option>
                                ))}
                            </select>
                        </Field>


                        {/* OTHER Category */}
                        {
                            formData.category == "OTHER" &&

                            <Field label="Other Category *" error={errors.otherCategory}>
                                <input
                                    type="text"
                                    name="otherCategory"
                                    value={formData.otherCategory}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    className={`${inputCls} ${errors.otherCategory
                                        ? "border-red-300 focus:border-red-300 focus:ring-red-100"
                                        : ""
                                        }`}
                                />
                            </Field>
                        }

                        {/* Amount */}
                        <Field label="Amount *" error={errors.amount}>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                placeholder="0.00"
                                className={`${inputCls} ${errors.amount
                                    ? "border-red-300 focus:border-red-300 focus:ring-red-100"
                                    : ""
                                    }`}
                            />
                        </Field>

                        {/* GST */}
                        <Field label="GST %">
                            <select
                                name="gst"
                                value={formData.gst}
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


                                {/* <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option> */}
                            </select>
                        </Field>

                        {/* GST Type */}
                        <Field label="GST Type">
                            <select
                                name="gstType"
                                value={formData.gstType}
                                onChange={handleChange}
                                className={inputCls}
                            >
                                <option value="included">Included</option>
                                <option value="excluded">Excluded</option>
                            </select>
                        </Field>

                        {/* GST Amount */}
                        <Field label="GST Amount">
                            <input value={formData.gstAmt} readOnly className={readonlyCls} />
                        </Field>

                        {/* Total */}
                        <Field label="Total Amount">
                            <input
                                value={formData.totalAmount}
                                readOnly
                                className={`${readonlyCls} text-emerald-600`}
                            />
                        </Field>

                        {/* Payment Mode */}
                        <Field label="Payment Mode" icon={FiCreditCard}>
                            <select
                                name="paymentMode"
                                value={formData.paymentMode}
                                onChange={handleChange}
                                className={inputCls}
                            >
                                <option value="CASH">CASH</option>
                                <option value="UPI">UPI</option>
                                <option value="CARD">CARD</option>
                            </select>
                        </Field>

                        {/* Notes */}
                        <Field label="Notes" icon={FiFileText}>
                            <textarea
                                name="notes"
                                rows={2}
                                value={formData.notes}
                                onChange={handleChange}
                                className={inputCls}
                            />
                        </Field>
                    </div>
                </div>

                {/* Footer Buttons */}
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
                        className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                    >
                        <FiSave size={13} /> Save Expense
                    </button>
                </div>
            </form>
        </div>
    );
}