import { useState } from "react";
import api from "../../utils/api";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import { FiUser, FiMapPin, FiPhone, FiMail, FiCalendar, FiDroplet, FiUsers, FiFileText, FiSave } from "react-icons/fi";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";


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

const GENDER_OPTIONS = ["MALE", "FEMALE", "OTHER"];
const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const AddPatient = () => {
    const [form, setForm] = useState({
        name: "", address: "", countryCode: "+91", mobile: "", email: "",
        dob: "", gender: "", bloodGroup: "", guardianName: "", notes: "",
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const validate = () => {
        const err = {};
        if (!form.name.trim()) err.name = "Name is required";
        if (!form.mobile.trim()) err.mobile = "Mobile is required";
        if (form.mobile && !/^[6-9]\d{9}$/.test(form.mobile)) err.mobile = "Enter a valid 10-digit mobile number";
        if (form.email && !/\S+@\S+\.\S+/.test(form.email)) err.email = "Invalid email address";

        setErrors(err);
        return Object.keys(err).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        try {
            setLoading(true);
            dispatch(showLoader());
            const res = await api.post("/patients", form);
            if (res.data.success) {
                toast.success(res.data.message);
                setForm({
                    name: "", address: "", countryCode: "+91", mobile: "", email: "",
                    dob: "", gender: "", bloodGroup: "", guardianName: "", notes: "",
                });
                setErrors({});
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
            dispatch(hideLoader());
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

                        {/* Section label */}
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-0.5 h-4 bg-orange-400 rounded-full" />
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Patient Details</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-5">

                            {/* Name */}
                            <Field label="Mr./Mrs./Miss *" icon={FiUser} error={errors.name}>
                                <input
                                    name="name" value={form.name} onChange={handleChange}
                                    placeholder="Full name"
                                    className={`${inputCls} ${errors.name ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                />
                            </Field>


                            {/* Country Code + Mobile — same row, fixed + flex-1 */}
                            <div className="flex gap-3 items-end md:col-span-2">

                                {/* Country Code — fixed narrow width */}
                                <div style={{ width: "110px", flexShrink: 0 }}>
                                    <label className={labelCls}>
                                        <span className="flex items-center gap-1.5">
                                            <FiPhone size={14} className="text-gray-800" />
                                            Country Code
                                        </span>
                                    </label>
                                    <PhoneInput
                                        country={"in"}
                                        value={form.countryCode}
                                        onChange={(value, country) => {
                                            setForm((prev) => ({
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

                                {/* Mobile — takes remaining width */}
                                <div className="flex-1">
                                    <Field label="Mobile *" icon={FiPhone} error={errors.mobile}>
                                        <input
                                            name="mobile" value={form.mobile} onChange={handleChange}
                                            placeholder="10-digit mobile"
                                            maxLength={10}
                                            className={`${inputCls} ${errors.mobile ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                        />
                                    </Field>
                                </div>

                            </div>


                            {/* Email */}
                            <Field label="Email" icon={FiMail} error={errors.email}>
                                <input
                                    name="email" value={form.email} onChange={handleChange}
                                    placeholder="email@example.com"
                                    type="email"
                                    className={`${inputCls} ${errors.email ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                />
                            </Field>

                            {/* Address */}
                            <Field label="Address" icon={FiMapPin}>
                                <input
                                    name="address" value={form.address} onChange={handleChange}
                                    placeholder="Street, city..."
                                    className={inputCls}
                                />
                            </Field>

                            {/* DOB */}
                            <Field label="Date of Birth" icon={FiCalendar}>
                                <input
                                    type="date" name="dob" value={form.dob} onChange={handleChange}
                                    className={inputCls}
                                />
                            </Field>

                            {/* Gender */}
                            <Field label="Gender" icon={FiUser}>
                                <select name="gender" value={form.gender} onChange={handleChange} className={inputCls}>
                                    <option value="">Select</option>
                                    {GENDER_OPTIONS.map((g) => (
                                        <option key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</option>
                                    ))}
                                </select>
                            </Field>

                            {/* Blood Group */}
                            <Field label="Blood Group" icon={FiDroplet}>
                                <select name="bloodGroup" value={form.bloodGroup} onChange={handleChange} className={inputCls}>
                                    <option value="">Select</option>
                                    {BLOOD_GROUP_OPTIONS.map((bg) => (
                                        <option key={bg} value={bg}>{bg}</option>
                                    ))}
                                </select>
                            </Field>

                            {/* Guardian Name */}
                            <Field label="Guardian Name" icon={FiUsers}>
                                <input
                                    name="guardianName" value={form.guardianName} onChange={handleChange}
                                    placeholder="Parent / guardian (optional)"
                                    className={inputCls}
                                />
                            </Field>

                            {/* Notes */}
                            <div className="sm:col-span-2 md:col-span-3">
                                <Field label="Notes" icon={FiFileText}>
                                    <textarea
                                        name="notes" value={form.notes} onChange={handleChange}
                                        placeholder="Medical notes, allergies, etc. (optional)"
                                        rows={2}
                                        className={`${inputCls} resize-none`}
                                    />
                                </Field>
                            </div>

                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end mt-4 px-3">

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading
                                ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                                : <><FiSave size={13} /> Save Patient</>
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPatient;