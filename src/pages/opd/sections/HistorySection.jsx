import { useState } from "react";
import { FiClipboard, FiClock, FiPlus } from "react-icons/fi";

const inputCls = "w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-50 hover:border-gray-300 bg-white text-gray-700 transition-all placeholder:text-gray-300 shadow-sm";
const labelCls = "text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5";

const Field = ({ label, icon: Icon, children }) => (
    <div>
        <label className={labelCls}>
            <span className="flex items-center gap-1.5">
                {Icon && <Icon size={13} className="text-orange-400" />}
                {label}
            </span>
        </label>
        {children}
    </div>
);

// Common ophthalmic chief complaints — extend freely, doctor can still type anything
const CHIEF_COMPLAINT_SUGGESTIONS = [
    "Blurred distance vision", "Blurred near vision", "Headache", "Eye strain",
    "Redness", "Watering", "Itching", "Foreign body sensation",
    "Double vision (Diplopia)", "Difficulty reading", "Difficulty with screen time",
    "Sensitivity to light (Photophobia)", "Eye pain", "Squint / deviation of eye",
    "Difficulty seeing at night",
];

const DURATION_SUGGESTIONS = [
    "1 day", "3 days", "1 week", "2 weeks", "1 month", "3 months",
    "6 months", "1 year", "2 years", "Since childhood", "Since birth",
];

// data: { chiefComplaint, duration }
// customOptions: clinic-added chief complaint suggestions (persisted via onAddOption to Settings)
const HistorySection = ({ data, onChange, customOptions = [], onAddOption }) => {
    const set = (key, value) => onChange({ ...data, [key]: value });
    const [addingComplaint, setAddingComplaint] = useState(false);
    const [newComplaint, setNewComplaint] = useState("");

    const allComplaintSuggestions = [...CHIEF_COMPLAINT_SUGGESTIONS, ...customOptions];

    const saveNewComplaint = () => {
        const label = newComplaint.trim();
        if (!label) { setAddingComplaint(false); return; }
        onAddOption?.(label);
        set("chiefComplaint", label);
        setNewComplaint("");
        setAddingComplaint(false);
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Chief Complaint" icon={FiClipboard}>
                <div className="flex items-center gap-2">
                    <input
                        list="chief-complaint-suggestions"
                        value={data.chiefComplaint || ""}
                        onChange={(e) => set("chiefComplaint", e.target.value)}
                        placeholder="e.g. Blurred distance vision"
                        className={inputCls}
                    />
                    <button
                        type="button"
                        onClick={() => setAddingComplaint((v) => !v)}
                        title="Add another chief complaint option"
                        className="shrink-0 flex items-center gap-1 px-2.5 py-2.5 rounded-xl text-[11px] font-semibold border border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100 transition"
                    >
                        <FiPlus size={13} />
                    </button>
                </div>
                <datalist id="chief-complaint-suggestions">
                    {allComplaintSuggestions.map((s) => <option key={s} value={s} />)}
                </datalist>
                {addingComplaint && (
                    <div className="flex items-center gap-2 mt-2">
                        <input
                            autoFocus
                            value={newComplaint}
                            onChange={(e) => setNewComplaint(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveNewComplaint(); } }}
                            placeholder="New chief complaint option..."
                            className={inputCls}
                        />
                        <button
                            type="button"
                            onClick={saveNewComplaint}
                            className="shrink-0 px-3 py-2.5 rounded-xl text-[11px] font-semibold border border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100 transition"
                        >
                            Add
                        </button>
                    </div>
                )}
            </Field>

            <Field label="Duration" icon={FiClock}>
                <input
                    list="duration-suggestions"
                    value={data.duration || ""}
                    onChange={(e) => set("duration", e.target.value)}
                    placeholder="e.g. 2 weeks"
                    className={inputCls}
                />
                <datalist id="duration-suggestions">
                    {DURATION_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
                </datalist>
            </Field>
        </div>
    );
};

export default HistorySection;
