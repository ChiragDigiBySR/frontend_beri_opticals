import { useEffect, useRef, useState } from "react";
import api from "../../utils/api";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import {
    FiUser, FiMapPin, FiPhone, FiMail, FiCalendar, FiClock,
    FiSave, FiUserCheck, FiUserPlus, FiFileText, FiX,
} from "react-icons/fi";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300";
const labelCls = "text-[10px] font-semibold text-gray-800 uppercase tracking-wider block mb-1";

const Field = ({ label, icon: Icon, error, children }) => (
    <div className="relative">
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

const SUGGEST_FIELDS = ["name", "mobile", "address"];

// Clinic hours + slot length for the booking calendar. Adjust to match store hours.
const SLOT_START_HOUR = 9;   // 9 AM
const SLOT_END_HOUR = 20;    // last slot starts at 7:45 PM (20:00 exclusive)
const SLOT_MINUTES = 15;

const generateDaySlots = () => {
    const slots = [];
    for (let h = SLOT_START_HOUR; h < SLOT_END_HOUR; h++) {
        for (let m = 0; m < 60; m += SLOT_MINUTES) {
            slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
        }
    }
    return slots;
};

const DAY_SLOTS = generateDaySlots();

const formatSlotLabel = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const AddAppointment = () => {
    const [form, setForm] = useState({
        name: "", countryCode: "+91", mobile: "", email: "", address: "", dob: "", gender: "",
        appointmentType: "Walk-in", date: "", scheduledAt: "", assignedDoctor: "", reason: "",
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    // booked-slot calendar
    const [bookedSlots, setBookedSlots] = useState([]); // ["HH:mm", ...] for the chosen doctor+date
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [selectedSlotTime, setSelectedSlotTime] = useState(""); // "HH:mm" in local/store time, for highlighting

    // patient autocomplete
    const [suggestions, setSuggestions] = useState([]);
    const [suggestField, setSuggestField] = useState(null); // which field opened the dropdown
    const [suggestLoading, setSuggestLoading] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null); // existing patient chosen from suggestions
    const debounceRef = useRef(null);
    const slotsDebounceRef = useRef(null);

    // show only doctors in dropdown
    const employees = useSelector((state) => state.employees.data);

    const dispatch = useDispatch();


    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: value,
            // changing doctor or type invalidates whichever slot was already picked
            ...(name === "assignedDoctor" || name === "appointmentType" ? { scheduledAt: "" } : {}),
        }));
        if (name === "assignedDoctor" || name === "appointmentType") setSelectedSlotTime("");

        // any edit to the linked patient's identifying fields breaks the "existing patient" lock
        if (SUGGEST_FIELDS.includes(name)) {
            setSelectedPatient(null);
            triggerSuggest(name, value);
        }
    };

    const handleDateChange = (e) => {
        const date = e.target.value;
        if (date && date < todayStr()) {
            setErrors(prev => ({ ...prev, date: "Cannot select a past date" }));
            return; // controlled input reverts to the last valid value
        }
        setErrors(prev => ({ ...prev, date: undefined }));
        setForm(prev => ({ ...prev, date, scheduledAt: "" })); // date change invalidates the picked slot
        setSelectedSlotTime("");
    };

    // hhmm is in local/store time; we build a real Date from it (parsed in the browser's
    // local timezone) and send its ISO/UTC form, so the backend's "now" comparison is
    // always comparing the same absolute instant instead of two different timezones.
    const handleSlotClick = (hhmm) => {
        const absolute = new Date(`${form.date}T${hhmm}:00`);
        setForm(prev => ({ ...prev, scheduledAt: absolute.toISOString() }));
        setSelectedSlotTime(hhmm);
        if (errors.scheduledAt) setErrors(prev => ({ ...prev, scheduledAt: undefined }));
    };

    // Load this doctor's booked times for the chosen date, so taken slots can be greyed out.
    // Debounced: a native date input can fire onChange repeatedly while the user is
    // still typing/scrubbing a value, so we wait for things to settle before calling the API.
    useEffect(() => {
        clearTimeout(slotsDebounceRef.current);

        if (form.appointmentType !== "Scheduled" || !form.date || !form.assignedDoctor) {
            setBookedSlots([]);
            return;
        }

        let cancelled = false;
        slotsDebounceRef.current = setTimeout(async () => {
            try {
                setSlotsLoading(true);
                const res = await api.get("/appointments/slots", {
                    params: { date: form.date, doctorId: form.assignedDoctor },
                });
                if (!cancelled && res.data.success) {
                    const times = res.data.bookedSlots.map(s => {
                        const d = new Date(s.time);
                        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                    });
                    setBookedSlots(times);
                }
            } catch (err) {
                console.error("Failed to load booked slots:", err);
            } finally {
                if (!cancelled) setSlotsLoading(false);
            }
        }, 400);

        return () => {
            cancelled = true;
            clearTimeout(slotsDebounceRef.current);
        };
    }, [form.date, form.assignedDoctor, form.appointmentType]);

    const triggerSuggest = (field, value) => {
        clearTimeout(debounceRef.current);
        if (value.trim().length < 3) {
            setSuggestions([]);
            setSuggestField(null);
            return;
        }
        setSuggestField(field);
        debounceRef.current = setTimeout(async () => {
            try {
                setSuggestLoading(true);
                const res = await api.get("/patients/suggest", { params: { q: value.trim() } });
                if (res.data.success) setSuggestions(res.data.patients || []);
            } catch (err) { console.error("Suggest error:", err); }
            finally { setSuggestLoading(false); }
        }, 300);
    };

    const pickSuggestion = (p) => {
        setForm(prev => ({
            ...prev,
            name: p.name || "",
            countryCode: p.countryCode || "+91",
            mobile: p.mobile || "",
            email: p.email || "",
            address: p.address || "",
            dob: p.dob ? p.dob.slice(0, 10) : "",
            gender: p.gender || "",
        }));
        setSelectedPatient(p);
        setSuggestions([]);
        setSuggestField(null);
    };

    const clearSelectedPatient = () => {
        setSelectedPatient(null);
        setForm(prev => ({ ...prev, name: "", mobile: "", email: "", address: "", dob: "", gender: "" }));
    };

    const validate = () => {
        const err = {};
        if (!form.name.trim()) err.name = "Name is required";
        if (!form.mobile.trim()) err.mobile = "Mobile is required";
        if (form.mobile && !/^[6-9]\d{9}$/.test(form.mobile)) err.mobile = "Enter a valid 10-digit mobile number";
        if (form.email && !/\S+@\S+\.\S+/.test(form.email)) err.email = "Invalid email address";
        if (form.appointmentType === "Scheduled" && !form.date) err.date = "Date is required for a scheduled appointment";
        if (form.appointmentType === "Scheduled" && form.date && !form.scheduledAt) err.scheduledAt = "Please pick a time slot";

        setErrors(err);
        return Object.keys(err).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        try {
            setLoading(true);
            dispatch(showLoader());

            const payload = {
                patientId: selectedPatient?._id || undefined,
                name: form.name, countryCode: form.countryCode, mobile: form.mobile,
                email: form.email, address: form.address, dob: form.dob, gender: form.gender,
                appointmentType: form.appointmentType,
                scheduledAt: form.appointmentType === "Scheduled" ? form.scheduledAt : undefined,
                assignedDoctor: form.assignedDoctor || undefined,
                assignedDoctorName: employees.find(d => d._id === form.assignedDoctor)?.name,
                reason: form.reason,
            };

            const res = await api.post("/appointments", payload);
            if (res.data.success) {
                toast.success(res.data.message);
                setForm({
                    name: "", countryCode: "+91", mobile: "", email: "", address: "", dob: "", gender: "",
                    appointmentType: "Walk-in", date: "", scheduledAt: "", assignedDoctor: "", reason: "",
                });
                setSelectedPatient(null);
                setSelectedSlotTime("");
                setErrors({});
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Something went wrong");
            // Someone else may have just taken this slot — refresh the grid so it shows as booked.
            if (err.response?.status === 409 && form.date && form.assignedDoctor) {
                try {
                    const res = await api.get("/appointments/slots", {
                        params: { date: form.date, doctorId: form.assignedDoctor },
                    });
                    if (res.data.success) {
                        const times = res.data.bookedSlots.map(s => {
                            const d = new Date(s.time);
                            return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                        });
                        setBookedSlots(times);
                    }
                } catch { /* non-critical refresh */ }
                setForm(prev => ({ ...prev, scheduledAt: "" }));
                setSelectedSlotTime("");
            }
        } finally {
            setLoading(false);
            dispatch(hideLoader());
        }
    };

    const SuggestDropdown = ({ field }) => {
        if (suggestField !== field) return null;
        if (!suggestLoading && suggestions.length === 0) return null;
        return (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                {suggestLoading && (
                    <div className="px-3 py-2.5 text-xs text-gray-400">Searching...</div>
                )}
                {!suggestLoading && suggestions.map(p => (
                    <button
                        type="button"
                        key={p._id}
                        onClick={() => pickSuggestion(p)}
                        className="w-full text-left px-3 py-2 hover:bg-orange-50 transition border-b border-gray-50 last:border-0"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-800">{p.name}</span>
                            <span className="text-[10px] text-orange-500 font-semibold">{p.patNumber}</span>
                        </div>
                        <div className="text-xs text-gray-400">{p.countryCode} {p.mobile}{p.address ? ` · ${p.address}` : ""}</div>
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div>
                <form onSubmit={handleSubmit} noValidate>

                    {/* Patient block */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <div className="w-0.5 h-4 bg-orange-400 rounded-full" />
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Patient Details</span>
                            </div>
                            {selectedPatient ? (
                                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                                    <FiUserCheck size={12} /> Existing patient · {selectedPatient.patNumber}
                                    <button type="button" onClick={clearSelectedPatient} className="ml-1 hover:text-green-800"><FiX size={12} /></button>
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-500 bg-orange-50 px-2.5 py-1 rounded-full">
                                    <FiUserPlus size={12} /> New patient will be created
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-5">

                            {/* Name */}
                            <Field label="Mr./Mrs./Miss *" icon={FiUser} error={errors.name}>
                                <input
                                    name="name" value={form.name} onChange={handleChange}
                                    autoComplete="off"
                                    placeholder="Start typing name..."
                                    className={`${inputCls} ${errors.name ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                />
                                <SuggestDropdown field="name" />
                            </Field>

                            {/* Country Code + Mobile */}
                            <div className="flex gap-3 items-end md:col-span-2">
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
                                            setForm((prev) => ({ ...prev, countryCode: `+${country.dialCode}` }));
                                        }}
                                        disableCountryCode={false}
                                        disableSearchIcon
                                        inputStyle={{
                                            width: "100%", height: "38px", fontSize: "13px", paddingLeft: "52px",
                                            border: "1px solid #d1d5db", borderRadius: "0.75rem",
                                            backgroundColor: "#f9fafb", color: "#374151", outline: "none", pointerEvents: "none",
                                        }}
                                        buttonStyle={{
                                            border: "1px solid #d1d5db", borderRight: "none",
                                            borderRadius: "0.75rem 0 0 0.75rem", backgroundColor: "#f9fafb",
                                        }}
                                        dropdownStyle={{ fontSize: "13px" }}
                                    />
                                </div>

                                <div className="flex-1 relative">
                                    <Field label="Mobile *" icon={FiPhone} error={errors.mobile}>
                                        <input
                                            name="mobile" value={form.mobile} onChange={handleChange}
                                            autoComplete="off"
                                            placeholder="Start typing mobile..."
                                            maxLength={10}
                                            className={`${inputCls} ${errors.mobile ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                        />
                                        <SuggestDropdown field="mobile" />
                                    </Field>
                                </div>
                            </div>

                            {/* Email */}
                            <Field label="Email" icon={FiMail} error={errors.email}>
                                <input
                                    name="email" value={form.email} onChange={handleChange}
                                    placeholder="email@example.com" type="email"
                                    className={`${inputCls} ${errors.email ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                />
                            </Field>

                            {/* Address */}
                            <Field label="Address" icon={FiMapPin}>
                                <input
                                    name="address" value={form.address} onChange={handleChange}
                                    autoComplete="off"
                                    placeholder="Start typing address..."
                                    className={inputCls}
                                />
                                <SuggestDropdown field="address" />
                            </Field>

                            {/* DOB */}
                            <Field label="Date of Birth" icon={FiCalendar}>
                                <input
                                    type="date" name="dob" value={form.dob} onChange={handleChange}
                                    className={inputCls}
                                />
                            </Field>

                        </div>
                    </div>

                    {/* Appointment block */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-0.5 h-4 bg-orange-400 rounded-full" />
                            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Appointment Details</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-5">

                            {/* Appointment type */}
                            <Field label="Appointment Type *" icon={FiClock}>
                                <select name="appointmentType" value={form.appointmentType} onChange={handleChange} className={inputCls}>
                                    <option value="Walk-in">Walk-in</option>
                                    <option value="Scheduled">Scheduled</option>
                                </select>
                            </Field>

                            {/* Scheduled date */}
                            {form.appointmentType === "Scheduled" && (
                                <Field label="Date *" icon={FiCalendar} error={errors.date}>
                                    <input
                                        type="date" name="date" value={form.date} min={todayStr()} onChange={handleDateChange}
                                        className={`${inputCls} ${errors.date ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                    />
                                </Field>
                            )}

                            {/* Doctor */}
                            <Field label="Assign Doctor" icon={FiUser}>
                                <select name="assignedDoctor" value={form.assignedDoctor} onChange={handleChange} className={inputCls}>
                                    <option value="">Select doctor</option>
                                    {employees.filter(emp => emp.designation?.toUpperCase() == "DOCTOR").map(d => (
                                        <option key={d._id} value={d._id}>{d.name}</option>
                                    ))}
                                </select>
                            </Field>

                            {/* Reason */}
                            <div className="sm:col-span-2 md:col-span-3">
                                <Field label="Reason for Visit" icon={FiFileText}>
                                    <textarea
                                        name="reason" value={form.reason} onChange={handleChange}
                                        placeholder="e.g. Eye check-up, follow-up, dry eyes..."
                                        rows={2}
                                        className={`${inputCls} resize-none`}
                                    />
                                </Field>
                            </div>

                        </div>

                        {/* Time slot calendar */}
                        {form.appointmentType === "Scheduled" && form.date && (
                            <div className="mt-5">
                                <label className={labelCls}>
                                    <span className="flex items-center gap-1.5">
                                        <FiClock size={14} className="text-gray-800" />
                                        Available Time Slots *
                                    </span>
                                </label>

                                {!form.assignedDoctor && (
                                    <p className="text-xs text-gray-400 italic">
                                        Select a doctor above to see their booked slots for this date.
                                    </p>
                                )}

                                {form.assignedDoctor && slotsLoading && (
                                    <p className="text-xs text-gray-400">Loading availability...</p>
                                )}

                                {form.assignedDoctor && !slotsLoading && (
                                    <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-1">
                                        {DAY_SLOTS.map((hhmm) => {
                                            const isBooked = bookedSlots.includes(hhmm);
                                            const isSelected = selectedSlotTime === hhmm;
                                            const isPast = new Date(`${form.date}T${hhmm}:00`) < new Date();
                                            const disabled = isBooked || isPast;

                                            return (
                                                <button
                                                    type="button"
                                                    key={hhmm}
                                                    disabled={disabled}
                                                    onClick={() => handleSlotClick(hhmm)}
                                                    title={isBooked ? "Already booked" : isPast ? "This time has passed" : ""}
                                                    className={[
                                                        "px-3 py-1.5 rounded-lg text-xs font-semibold border transition",
                                                        isSelected
                                                            ? "bg-orange-500 border-orange-500 text-white"
                                                            : disabled
                                                                ? "bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed line-through"
                                                                : "bg-white border-gray-200 text-gray-600 hover:border-orange-300 hover:bg-orange-50",
                                                    ].join(" ")}
                                                >
                                                    {formatSlotLabel(hhmm)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                                {errors.scheduledAt && <p className="text-[10px] text-red-500 mt-1 font-medium">{errors.scheduledAt}</p>}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end mt-4 px-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading
                                ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Booking...</>
                                : <><FiSave size={13} /> Book Appointment</>
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddAppointment;