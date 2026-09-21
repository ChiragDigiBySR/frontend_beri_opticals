import { useState } from "react";
import { FiCheckSquare, FiPlus } from "react-icons/fi";

const inputCls = "flex-1 min-w-[140px] px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300";

const DEFAULT_DIAGNOSES = [
    "Myopia", "Hyperopia", "Astigmatism", "Amblyopia",
    "Convergence Insufficiency", "Convergence Excess",
    "Accommodative Insufficiency", "Accommodative Excess",
    "Fusional Vergence Dysfunction", "Oculomotor Dysfunction",
    "Suppression", "Strabismus", "Intermittent Exotropia",
    "Esophoria", "Exophoria", "Vertical Phoria",
    "Computer Vision Syndrome", "Dry Eye Disease",
].map((label) => ({ id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label }));

const slugify = (label) => label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

const DEFAULT_DATA = { selected: {}, customDiagnoses: [] };

// data: { selected: { [diagnosisId]: { checked, detail } }, customDiagnoses: [{id,label}] }
// customOptions: clinic-added diagnoses persisted to Settings (shows up for every report,
// unlike customDiagnoses below which is only this report's local additions before save)
const DiagnosisSection = ({ data, onChange, customOptions = [], onAddOption }) => {
    const merged = { ...DEFAULT_DATA, ...data };
    const [newDiagnosis, setNewDiagnosis] = useState("");

    const settingsDiagnoses = customOptions.map((label) => ({ id: slugify(label), label }));
    const allDiagnoses = [...DEFAULT_DIAGNOSES, ...settingsDiagnoses, ...merged.customDiagnoses]
        .filter((dx, i, arr) => arr.findIndex((d) => d.id === dx.id) === i);

    const toggle = (id, checked) =>
        onChange({
            ...merged,
            selected: { ...merged.selected, [id]: { ...merged.selected[id], checked, detail: merged.selected[id]?.detail || "" } },
        });

    const setDetail = (id, detail) =>
        onChange({ ...merged, selected: { ...merged.selected, [id]: { ...merged.selected[id], detail } } });

    const addCustom = () => {
        const label = newDiagnosis.trim();
        if (!label) return;
        const id = slugify(label);
        if (allDiagnoses.some((d) => d.id === id)) { setNewDiagnosis(""); return; }
        onChange({
            ...merged,
            customDiagnoses: [...merged.customDiagnoses, { id, label }],
            selected: { ...merged.selected, [id]: { checked: true, detail: "" } },
        });
        onAddOption?.(label);
        setNewDiagnosis("");
    };

    return (
        <div>
            <div className="flex items-center gap-1.5 mb-4">
                <FiCheckSquare size={13} className="text-gray-400" />
                <span className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider">Diagnosis (select all that apply)</span>
            </div>

            <div className="mb-5">
                {allDiagnoses.map((dx) => {
                    const entry = merged.selected[dx.id] || {};
                    return (
                        <div key={dx.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-2.5 border-b border-gray-100 last:border-b-0">
                            <label className="flex items-center gap-2 sm:w-64 shrink-0 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={!!entry.checked}
                                    onChange={(e) => toggle(dx.id, e.target.checked)}
                                    className="w-4 h-4 rounded accent-orange-500"
                                />
                                <span className="text-xs font-semibold text-gray-700">{dx.label}</span>
                            </label>
                            {entry.checked && (
                                <input
                                    value={entry.detail || ""}
                                    onChange={(e) => setDetail(dx.id, e.target.value)}
                                    placeholder="Laterality, severity, notes..."
                                    className={inputCls}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center gap-2">
                <input
                    value={newDiagnosis}
                    onChange={(e) => setNewDiagnosis(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
                    placeholder="Add another diagnosis..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300"
                />
                <button
                    type="button"
                    onClick={addCustom}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold border border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100 transition"
                >
                    <FiPlus size={13} /> Add
                </button>
            </div>
        </div>
    );
};

export default DiagnosisSection;
