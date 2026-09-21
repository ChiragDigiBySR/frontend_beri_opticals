import { useState, useEffect, useRef } from "react";
import { FiUser, FiPhone, FiMail, FiCalendar, FiUsers, FiHeart, FiLoader } from "react-icons/fi";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import api from "../../../utils/api";

const inputCls = "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-50 hover:border-gray-300 bg-white text-gray-700 transition-all placeholder:text-gray-300 shadow-sm";
const readOnlyCls = "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-400 shadow-sm cursor-not-allowed";
const labelCls = "text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5";

const Field = ({ label, icon: Icon, error, children }) => (
    <div>
        <label className={labelCls}>
            <span className="flex items-center gap-1.5">
                {Icon && <Icon size={13} className="text-orange-400" />}
                {label}
            </span>
        </label>
        {children}
        {error && <p className="text-[10px] text-red-500 mt-1 font-medium">{error}</p>}
    </div>
);

// ─── debounce helper (same pattern as AddPrescription.jsx) ───────────────────
function useDebounce(value, delay = 350) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(t);
    }, [value, delay]);
    return debounced;
}

// ─── Suggestion Dropdown (same pattern as AddPrescription.jsx) ───────────────
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
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
            </div>
            {suggestions.map((patient) => (
                <button
                    key={patient._id || patient.patNumber}
                    type="button"
                    onClick={() => onSelect(patient)}
                    className="w-full text-left px-4 py-3 hover:bg-orange-50 transition border-b border-gray-50 last:border-0 flex items-center gap-3"
                >
                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center shrink-0">
                        {patient.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{patient.name}</p>
                        <p className="text-xs text-gray-400">{patient.mobile}</p>
                    </div>
                    <span className="text-[10px] text-orange-400 font-medium shrink-0">Fill →</span>
                </button>
            ))}
        </div>
    );
}

const GENDER_SUGGESTIONS = ["MALE", "FEMALE", "OTHER"];

const RELATION_SUGGESTIONS = [
    "Self", "Son of (S/O)", "Daughter of (D/O)", "Wife of (W/O)",
    "Husband of (H/O)", "Father of", "Mother of", "Guardian of", "Care of (C/O)",
];

// Standard nearest-birthday age calc from a yyyy-mm-dd date input value
const calculateAge = (dobStr) => {
    if (!dobStr) return "";
    const dob = new Date(dobStr);
    if (Number.isNaN(dob.getTime())) return "";
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
    return age >= 0 ? age : "";
};

const DEFAULT_DATA = {
    name: "", countryCode: "+91", mobile: "", email: "",
    dob: "", gender: "", relationType: "", relationName: "",
};

// data: { name, countryCode, mobile, email, dob, gender, relationType, relationName }
// errors: { name?, mobile? } — inline validation messages from OPDReport's submit check
// Age is derived from dob on every render — not stored as its own field.
const PatientSection = ({ data, onChange, errors = {} }) => {
    const merged = { ...DEFAULT_DATA, ...data };
    const set = (key, value) => onChange({ ...merged, [key]: value });
    const age = calculateAge(merged.dob);

    // ─── Autocomplete state (same pattern as AddPrescription.jsx) ────────────
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeField, setActiveField] = useState(null);
    const [searching, setSearching] = useState(false);
    const suggestionRef = useRef(null);

    const debouncedName = useDebounce(merged.name, 350);
    const debouncedMobile = useDebounce(merged.mobile, 350);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (suggestionRef.current && !suggestionRef.current.contains(e.target))
                setShowSuggestions(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    useEffect(() => {
        if (activeField === "name" && debouncedName.trim().length >= 3)
            fetchSuggestions(debouncedName.trim());
    }, [debouncedName]);

    useEffect(() => {
        if (activeField === "mobile" && debouncedMobile.trim().length >= 3)
            fetchSuggestions(debouncedMobile.trim());
    }, [debouncedMobile]);

    const fetchSuggestions = async (q) => {
        try {
            setSearching(true);
            const res = await api.get("/patients/suggest", { params: { q } });
            if (res.data.success) {
                setSuggestions(res.data.patients || []);
                setShowSuggestions(true);
            }
        } catch (err) {
            console.error("Patient suggest error:", err);
        } finally {
            setSearching(false);
        }
    };

    // Fill form fields from a selected patient record
    const handleSelectPatient = (patient) => {
        onChange({
            ...merged,
            name: patient.name || "",
            countryCode: patient.countryCode || merged.countryCode,
            mobile: patient.mobile || "",
            email: patient.email || "",
            dob: patient.dob ? new Date(patient.dob).toISOString().split("T")[0] : merged.dob,
            gender: patient.gender || merged.gender,
            relationName: patient.guardianName || merged.relationName,
        });
        setSuggestions([]);
        setShowSuggestions(false);
        setActiveField(null);
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-7 mb-5">
            <div className="flex items-center gap-2 mb-5">
                <div className="w-0.5 h-4 bg-orange-400 rounded-full" />
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Patient Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <Field label="Patient Name *" icon={FiUser} error={errors.name}>
                    <div className="relative" ref={activeField === "name" ? suggestionRef : null}>
                        {searching && activeField === "name" && (
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none">
                                <FiLoader size={13} className="animate-spin" />
                            </span>
                        )}
                        <input
                            value={merged.name}
                            autoComplete="off"
                            onFocus={() => {
                                setActiveField("name");
                                if (merged.name.trim().length >= 3 && suggestions.length > 0) setShowSuggestions(true);
                            }}
                            onChange={(e) => { setActiveField("name"); set("name", e.target.value); }}
                            placeholder="Full name"
                            className={`${inputCls} ${errors.name ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                        />
                        {showSuggestions && activeField === "name" && suggestions.length > 0 && (
                            <SuggestionDropdown
                                suggestions={suggestions}
                                onSelect={handleSelectPatient}
                                onClose={() => setShowSuggestions(false)}
                            />
                        )}
                    </div>
                </Field>

                <div className="flex gap-3 items-end lg:col-span-2">
                    <div style={{ width: "110px", flexShrink: 0 }}>
                        <label className={labelCls}>
                            <span className="flex items-center gap-1.5">
                                <FiPhone size={13} className="text-orange-400" />
                                Code
                            </span>
                        </label>
                        <PhoneInput
                            country={"in"}
                            value={merged.countryCode}
                            onChange={(value, country) => set("countryCode", `+${country.dialCode}`)}
                            disableSearchIcon
                            inputStyle={{
                                width: "100%", height: "40px", fontSize: "13px", paddingLeft: "52px",
                                border: "1px solid #e5e7eb", borderRadius: "0.75rem",
                                backgroundColor: "#fff", color: "#374151", outline: "none", pointerEvents: "none",
                            }}
                            buttonStyle={{ border: "1px solid #e5e7eb", borderRight: "none", borderRadius: "0.75rem 0 0 0.75rem", backgroundColor: "#fff" }}
                            dropdownStyle={{ fontSize: "13px" }}
                        />
                    </div>
                    <div className="flex-1">
                        <Field label="Mobile *" icon={FiPhone} error={errors.mobile}>
                            <div className="relative" ref={activeField === "mobile" ? suggestionRef : null}>
                                {searching && activeField === "mobile" && (
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-orange-400 pointer-events-none">
                                        <FiLoader size={13} className="animate-spin" />
                                    </span>
                                )}
                                <input
                                    value={merged.mobile}
                                    autoComplete="off"
                                    onFocus={() => {
                                        setActiveField("mobile");
                                        if (merged.mobile.trim().length >= 3 && suggestions.length > 0) setShowSuggestions(true);
                                    }}
                                    onChange={(e) => { setActiveField("mobile"); set("mobile", e.target.value); }}
                                    placeholder="10-digit mobile"
                                    maxLength={10}
                                    className={`${inputCls} ${errors.mobile ? "border-red-300 focus:border-red-300 focus:ring-red-100" : ""}`}
                                />
                                {showSuggestions && activeField === "mobile" && suggestions.length > 0 && (
                                    <SuggestionDropdown
                                        suggestions={suggestions}
                                        onSelect={handleSelectPatient}
                                        onClose={() => setShowSuggestions(false)}
                                    />
                                )}
                            </div>
                        </Field>
                    </div>
                </div>

                <Field label="Email" icon={FiMail}>
                    <input
                        type="email"
                        value={merged.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="email@example.com"
                        className={inputCls}
                    />
                </Field>

                <Field label="Date of Birth" icon={FiCalendar}>
                    <input
                        type="date"
                        value={merged.dob}
                        onChange={(e) => set("dob", e.target.value)}
                        className={inputCls}
                    />
                </Field>

                <Field label="Age" icon={FiCalendar}>
                    <input
                        value={age === "" ? "" : `${age} yrs`}
                        readOnly
                        placeholder="Auto-calculated"
                        className={readOnlyCls}
                    />
                </Field>

                <Field label="Gender" icon={FiUsers}>
                    <input
                        list="patient-gender-suggestions"
                        value={merged.gender}
                        onChange={(e) => set("gender", e.target.value)}
                        placeholder="Select or type"
                        className={inputCls}
                    />
                    <datalist id="patient-gender-suggestions">
                        {GENDER_SUGGESTIONS.map((g) => <option key={g} value={g} />)}
                    </datalist>
                </Field>

                <Field label="Relation" icon={FiHeart}>
                    <input
                        list="patient-relation-suggestions"
                        value={merged.relationType}
                        onChange={(e) => set("relationType", e.target.value)}
                        placeholder="e.g. Son of"
                        className={inputCls}
                    />
                    <datalist id="patient-relation-suggestions">
                        {RELATION_SUGGESTIONS.map((r) => <option key={r} value={r} />)}
                    </datalist>
                </Field>

                <Field label="Relation Name" icon={FiUser}>
                    <input
                        value={merged.relationName}
                        onChange={(e) => set("relationName", e.target.value)}
                        placeholder="Name of relative/guardian"
                        disabled={!merged.relationType || merged.relationType === "Self"}
                        className={`${inputCls} disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed`}
                    />
                </Field>
            </div>
        </div>
    );
};

export default PatientSection;