import { useState } from "react";
import { FiPlus, FiX, FiClipboard, FiEye, FiActivity, FiCheckSquare, FiFileText } from "react-icons/fi";

// The five OPD report sections that support clinic-added "Add Another" options.
// Keys must match the `opdOptions` sub-document in Settings.model.js and the
// OPD_OPTION_SECTIONS whitelist in settingsController.js.
const OPD_SECTIONS = [
    {
        key: "history",
        label: "History",
        icon: FiClipboard,
        description: "Chief complaint suggestions",
        placeholder: "e.g. Difficulty with night driving…",
    },
    {
        key: "ocularHistory",
        label: "Ocular History",
        icon: FiEye,
        description: "Additional ocular history items",
        placeholder: "e.g. Previous LASIK…",
    },
    {
        key: "systemicHistory",
        label: "Systemic History",
        icon: FiActivity,
        description: "Additional systemic conditions",
        placeholder: "e.g. Asthma…",
    },
    {
        key: "diagnosis",
        label: "Diagnosis",
        icon: FiCheckSquare,
        description: "Additional diagnoses",
        placeholder: "e.g. Keratoconus…",
    },
    {
        key: "advice",
        label: "Advice",
        icon: FiFileText,
        description: "Additional advice templates",
        placeholder: "e.g. Use lubricating drops twice daily…",
    },
];

// Tag input for one OPD section. Unlike the Settings page's generic TagInput this
// does NOT uppercase entries — these render verbatim in the patient-facing report,
// so "Use lubricating drops twice daily" must keep its original casing.
function OptionTagInput({ values, onChange, placeholder }) {
    const [input, setInput] = useState("");
    const [focused, setFocused] = useState(false);

    const add = () => {
        const v = input.trim();
        if (!v) return;
        // case-insensitive duplicate check, but store what the user actually typed
        if (values.some((x) => x.toLowerCase() === v.toLowerCase())) { setInput(""); return; }
        onChange([...values, v]);
        setInput("");
    };

    const remove = (i) => onChange(values.filter((_, idx) => idx !== i));

    return (
        <div>
            <div className={`min-h-[44px] flex flex-wrap gap-1.5 p-2.5 rounded-xl border transition-all duration-200 mb-3
                ${focused ? "border-orange-300 ring-2 ring-orange-50 bg-white" : "border-stone-200 bg-stone-50/50"}`}>
                {values.length === 0 && !focused && (
                    <span className="text-[11px] text-stone-300 italic self-center px-1">
                        Nothing added yet — built-in options still apply
                    </span>
                )}
                {values.map((v, i) => (
                    <span key={i}
                        className="inline-flex items-center gap-1.5 bg-white border border-orange-200 text-orange-700 text-[11px] font-semibold px-2.5 py-1 rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                        {v}
                        <button type="button" onClick={() => remove(i)}
                            title="Remove option"
                            className="text-orange-300 hover:text-orange-600 transition ml-0.5">
                            <FiX size={10} />
                        </button>
                    </span>
                ))}
            </div>

            <div className="flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={placeholder}
                    className="flex-1 px-3 py-2 text-[12px] border border-stone-200 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-50 bg-white text-stone-700 transition placeholder:text-stone-300"
                />
                <button type="button" onClick={add}
                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-[11px] font-bold rounded-xl transition-all shadow-[0_2px_8px_rgba(249,115,22,0.35)]">
                    <FiPlus size={12} /> Add
                </button>
            </div>
        </div>
    );
}

// value:    the whole opdOptions object — { history: [], ocularHistory: [], ... }
// onChange: receives the updated opdOptions object
//
// Saving is handled by the parent Settings page's existing "Save Settings" button
// (PUT /settings), so add AND remove both persist through the same path. The separate
// POST /settings/opd-options endpoint stays as-is for the inline "Add Another" button
// inside the OPD report form itself.
export default function OpdFieldsSettings({ value = {}, onChange }) {
    const setSection = (key) => (values) => onChange({ ...value, [key]: values });

    const totalAdded = OPD_SECTIONS.reduce((sum, s) => sum + (value[s.key]?.length || 0), 0);

    return (
        <div>
            <div className="flex items-center gap-2 mb-5">
                <div className="h-5 flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-full px-3">
                    <span className="text-[10px] font-bold text-orange-600">{totalAdded}</span>
                    <span className="text-[10px] text-orange-400">custom option{totalAdded === 1 ? "" : "s"}</span>
                </div>
                <p className="text-[10px] text-stone-400">
                    These appear alongside the built-in options in the OPD report form.
                </p>
            </div>

            <div className="space-y-6">
                {OPD_SECTIONS.map((section, i) => {
                    const Icon = section.icon;
                    return (
                        <div key={section.key} className={i > 0 ? "pt-6 border-t border-stone-100" : ""}>
                            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                <Icon size={11} className="text-orange-400" /> {section.label}
                            </p>
                            <p className="text-[10px] text-stone-400 mb-3">{section.description}</p>
                            <OptionTagInput
                                values={value[section.key] || []}
                                onChange={setSection(section.key)}
                                placeholder={section.placeholder}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}