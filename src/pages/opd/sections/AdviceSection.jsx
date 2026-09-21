import { useState } from "react";
import { FiFileText, FiPlus } from "react-icons/fi";

const inputCls = "px-2 py-1 text-sm border border-gray-300 rounded-lg outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300";
const textareaCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300 min-h-[100px] resize-y";
const labelCls = "text-[10px] font-semibold text-gray-800 uppercase tracking-wider block mb-2";
const addInputCls = "flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300";

const slugify = (label) => label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

const ADVICE_TEMPLATES = [
    { id: "wearSpectaclesFullTime", label: "Wear spectacles full time" },
    { id: "wearSpectaclesNearWork", label: "Wear spectacles for near work" },
    { id: "visionTherapyAdvised", label: "Vision therapy advised" },
    { id: "contactLensTrialAdvised", label: "Contact lens trial advised" },
    { id: "scleralLensTrialAdvised", label: "Scleral lens trial advised" },
    { id: "orthoKConsultationAdvised", label: "Orthokeratology consultation advised" },
    { id: "maintainVisualHygiene", label: "Maintain visual hygiene" },
    { id: "follow202020Rule", label: "Follow 20-20-20 rule" },
    { id: "reduceScreenTime", label: "Reduce excessive screen time" },
    { id: "increaseOutdoorActivities", label: "Increase outdoor activities" },
    // { id: "followUp", label: "Follow-up after ___ days", hasDays: true },
    { id: "cycloplegicRefractionAdvised", label: "Cycloplegic refraction advised" },
    { id: "dilatedFundusExamAdvised", label: "Dilated fundus examination advised" },
];

// const DEFAULT_DATA = { selected: {}, followUpDays: "", freeText: "", customTemplates: [] };
const DEFAULT_DATA = { selected: {}, freeText: "", customTemplates: [] };

// data: { selected: { [templateId]: bool }, followUpDays: string, freeText: string, customTemplates: [{id,label}] }
// customOptions: clinic-added advice templates persisted to Settings
const AdviceSection = ({ data, onChange, customOptions = [], onAddOption }) => {
    const merged = { ...DEFAULT_DATA, ...data };
    const [newTemplate, setNewTemplate] = useState("");

    const settingsTemplates = customOptions.map((label) => ({ id: slugify(label), label }));
    const allTemplates = [...ADVICE_TEMPLATES, ...settingsTemplates, ...merged.customTemplates]
        .filter((tpl, i, arr) => arr.findIndex((t) => t.id === tpl.id) === i);

    const toggle = (id, checked) =>
        onChange({ ...merged, selected: { ...merged.selected, [id]: checked } });

    const addCustom = () => {
        const label = newTemplate.trim();
        if (!label) return;
        const id = slugify(label);
        if (allTemplates.some((t) => t.id === id)) { setNewTemplate(""); return; }
        onChange({
            ...merged,
            customTemplates: [...merged.customTemplates, { id, label }],
            selected: { ...merged.selected, [id]: true },
        });
        onAddOption?.(label);
        setNewTemplate("");
    };

    return (
        <div>
            <div className="flex items-center gap-1.5 mb-4">
                <FiFileText size={13} className="text-gray-400" />
                <span className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider">Advice Templates</span>
            </div>

            <div className="mb-4">
                {allTemplates.map((tpl) => (
                    <div key={tpl.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-b-0">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={!!merged.selected[tpl.id]}
                                onChange={(e) => toggle(tpl.id, e.target.checked)}
                                className="w-4 h-4 rounded accent-orange-500"
                            />
                            <span className="text-xs font-semibold text-gray-700">
                                {tpl.hasDays ? "Follow-up after" : tpl.label}
                            </span>
                        </label>
                        {/* {tpl.hasDays && merged.selected[tpl.id] && (
                            <>
                                <input
                                    type="number"
                                    min="0"
                                    value={merged.followUpDays}
                                    onChange={(e) => onChange({ ...merged, followUpDays: e.target.value })}
                                    placeholder="7"
                                    className={`${inputCls} w-16 text-center`}
                                />
                                <span className="text-xs font-semibold text-gray-500">days</span>
                            </>
                        )} */}
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2 mb-6">
                <input
                    value={newTemplate}
                    onChange={(e) => setNewTemplate(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
                    placeholder="Add another advice template..."
                    className={addInputCls}
                />
                <button
                    type="button"
                    onClick={addCustom}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold border border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100 transition"
                >
                    <FiPlus size={13} /> Add
                </button>
            </div>

            <div>
                <label className={labelCls}>Additional Advice</label>
                <textarea
                    value={merged.freeText}
                    onChange={(e) => onChange({ ...merged, freeText: e.target.value })}
                    placeholder="Any other advice for the patient..."
                    className={textareaCls}
                />
            </div>
        </div>
    );
};

export default AdviceSection;
