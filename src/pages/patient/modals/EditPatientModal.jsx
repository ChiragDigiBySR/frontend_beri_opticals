import { useEffect, useState } from "react";
import {
    FiX, FiUser, FiPhone, FiMail, FiMapPin, FiCalendar, FiDroplet, FiUsers, FiFileText
} from "react-icons/fi";
import { BLOOD_GROUP_OPTIONS, GENDER_OPTIONS, Modal, ModalFooter } from "../Patientlist";
import PhoneInput from "react-phone-input-2";
import { toast } from "react-toastify";
import api from "../../../utils/api";


const labelCls = "block text-xs font-medium text-gray-600 mb-1.5";
const iconInputCls = "w-full pl-9 pr-3 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 hover:border-orange-300 transition placeholder-gray-400";


// ─────────────────────────────────────────────────────────────────────────────
// Edit Patient Modal
// ─────────────────────────────────────────────────────────────────────────────
export default function EditPatientModal({ patient, onClose, onSuccess }) {
    const [form, setForm] = useState({
        name: "", countryCode: "+91", mobile: "", email: "", address: "",
        dob: "", gender: "", bloodGroup: "", guardianName: "", notes: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (patient) {
            setForm({
                name: patient.name || "",
                countryCode: patient.countryCode || "+91",
                mobile: patient.mobile || "",
                email: patient.email || "",
                address: patient.address || "",
                dob: patient.dob ? patient.dob.slice(0, 10) : "",
                gender: patient.gender || "",
                bloodGroup: patient.bloodGroup || "",
                guardianName: patient.guardianName || "",
                notes: patient.notes || "",
            });
        }
    }, [patient]);

    const update = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async () => {
        setError("");
        if (!form.name.trim()) return setError("Name is required.");
        if (!form.mobile.trim()) return setError("Mobile is required.");

        try {
            setLoading(true);
            const response = await api.put(`/patients/${patient.patNumber}`, form);
            if (response.data.success) {
                toast.success(response.data.message || "Patient updated successfully");
                onSuccess?.();
                onClose();
            } else {
                toast.error(response.data.message);
            }
        } catch (err) { setError(err?.response?.data?.message || "Failed to update patient."); }
        finally { setLoading(false); }
    };

    const otherFields = [
        { field: "email", label: "Email", type: "email", placeholder: "Email address", icon: <FiMail size={13} /> },
        { field: "address", label: "Address", type: "text", placeholder: "Address", icon: <FiMapPin size={13} /> },
        { field: "dob", label: "Date of Birth", type: "date", icon: <FiCalendar size={13} /> },
        { field: "guardianName", label: "Guardian Name", type: "text", placeholder: "Parent / guardian", icon: <FiUsers size={13} /> },
    ];

    return (
        <Modal onClose={onClose} maxWidth="max-w-xl">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center"><FiUser size={15} className="text-orange-500" /></div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-800">Edit Patient</h2>
                        <p className="text-xs text-gray-400">Update patient information</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition"><FiX size={15} /></button>
            </div>
            <div className="px-6 py-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Name */}
                    <div>
                        <label className={labelCls}>Name <span className="text-red-400">*</span></label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><FiUser size={13} /></span>
                            <input
                                type="text"
                                placeholder="Full name"
                                value={form.name}
                                onChange={update("name")}
                                className={iconInputCls}
                            />
                        </div>
                    </div>

                    {/* Country Code + Mobile side by side, spanning full row */}
                    <div className="md:col-span-2 grid grid-cols-3 gap-3">
                        {/* Country Code — 1/3 */}
                        <div>
                            <label className={labelCls}>Country Code</label>
                            <PhoneInput
                                country={"in"}
                                value={form.countryCode}
                                onChange={(value, country) => {
                                    setForm(prev => ({ ...prev, countryCode: `+${country.dialCode}` }));
                                }}
                                disableCountryCode={false}
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
                        {/* Mobile — 2/3 */}
                        <div className="col-span-2">
                            <label className={labelCls}>Mobile <span className="text-red-400">*</span></label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><FiPhone size={13} /></span>
                                <input
                                    type="tel"
                                    placeholder="10-digit mobile"
                                    value={form.mobile}
                                    onChange={update("mobile")}
                                    maxLength={10}
                                    className={iconInputCls}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Rest of fields */}
                    {otherFields.map(({ field, label, type, placeholder, icon }) => (
                        <div key={field}>
                            <label className={labelCls}>{label}</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
                                <input
                                    type={type}
                                    placeholder={placeholder}
                                    value={form[field]}
                                    onChange={update(field)}
                                    className={iconInputCls + (type === "date" ? " cursor-pointer" : "")}
                                />
                            </div>
                        </div>
                    ))}

                    {/* Gender */}
                    <div>
                        <label className={labelCls}>Gender</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><FiUser size={13} /></span>
                            <select value={form.gender} onChange={update("gender")} className={iconInputCls}>
                                <option value="">Select</option>
                                {GENDER_OPTIONS.map((g) => (
                                    <option key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Blood Group */}
                    <div>
                        <label className={labelCls}>Blood Group</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><FiDroplet size={13} /></span>
                            <select value={form.bloodGroup} onChange={update("bloodGroup")} className={iconInputCls}>
                                <option value="">Select</option>
                                {BLOOD_GROUP_OPTIONS.map((bg) => (
                                    <option key={bg} value={bg}>{bg}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="md:col-span-2">
                        <label className={labelCls}>Notes</label>
                        <div className="relative">
                            <span className="absolute left-3 top-3.5 text-gray-400"><FiFileText size={13} /></span>
                            <textarea
                                placeholder="Medical notes, allergies, etc."
                                value={form.notes}
                                onChange={update("notes")}
                                rows={2}
                                className={iconInputCls + " resize-none"}
                            />
                        </div>
                    </div>
                </div>

                {error && <p className="mt-4 text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            </div>
            <ModalFooter>
                <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
                <button onClick={handleSubmit} disabled={loading}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed">
                    {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {loading ? "Saving..." : "Save Changes"}
                </button>
            </ModalFooter>
        </Modal>
    );
}