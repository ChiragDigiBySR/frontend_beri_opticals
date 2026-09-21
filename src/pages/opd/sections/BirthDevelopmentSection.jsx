import { FiUsers } from "react-icons/fi";

const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300";
const labelCls = "text-[10px] font-semibold text-gray-800 uppercase tracking-wider block mb-2";

const MODE_OPTIONS = [
    { value: "no", label: "No" },
    { value: "yes", label: "Yes" },
    { value: "normal", label: "Normal" },
];

const ModeSelector = ({ value, onSelect }) => (
    <div className="inline-flex rounded-xl border border-gray-200 p-1 bg-gray-50">
        {MODE_OPTIONS.map((opt) => (
            <button
                key={opt.value}
                type="button"
                onClick={() => onSelect(opt.value)}
                className={`px-4 py-1.5 rounded-lg text-[11px] font-semibold transition
                    ${value === opt.value ? "bg-orange-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
                {opt.label}
            </button>
        ))}
    </div>
);

const PrintToggle = ({ checked, onChange }) => (
    <label className="flex items-center gap-1.5 shrink-0 cursor-pointer select-none ml-auto">
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-orange-500"
        />
        <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
            {checked ? "Print" : "Internal only"}
        </span>
    </label>
);

const OptionToggle = ({ options, value, onSelect }) => (
    <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
            <button
                key={opt.value}
                type="button"
                onClick={() => onSelect(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition
                    ${value === opt.value
                        ? "bg-orange-50 text-orange-600 border-orange-300"
                        : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"}`}
            >
                {opt.label}
            </button>
        ))}
    </div>
);

const FieldRow = ({ label, print, onPrintChange, children }) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 border-b border-gray-100 last:border-b-0">
        <div className="sm:w-44 shrink-0 text-xs font-semibold text-gray-700">{label}</div>
        <div className="flex-1 flex items-center gap-3 flex-wrap">{children}</div>
        <PrintToggle checked={print} onChange={onPrintChange} />
    </div>
);

const emptyField = (value = "") => ({ value, print: false });

const DEFAULT_DATA = {
    mode: null,
    birthWeight: emptyField(),
    termStatus: emptyField(),
    modeOfDelivery: emptyField(),
    firstCry: emptyField(),
    pregnancyComplications: emptyField(),
    birthComplications: emptyField(),
    nicuAdmission: emptyField(),
    vaccinationStatus: emptyField(),
    developmentalMilestones: emptyField(),
    notes: emptyField(),
};

// data shape: { mode: "no"|"yes"|"normal", <field>: { value, print } }
const BirthDevelopmentSection = ({ data, onChange }) => {
    const merged = { ...DEFAULT_DATA, ...data };

    const setMode = (mode) => {
        if (mode === "normal") {
            // Spec: Normal mode auto-fills these three; other fields stay editable
            onChange({
                ...merged,
                mode,
                birthWeight: { ...merged.birthWeight, value: "Normal" },
                birthComplications: { ...merged.birthComplications, value: "Normal" },
                nicuAdmission: { ...merged.nicuAdmission, value: "No admission" },
            });
        } else {
            onChange({ ...merged, mode });
        }
    };

    const setField = (key, patch) => onChange({ ...merged, [key]: { ...merged[key], ...patch } });

    return (
        <div>
            <div className="mb-5 pb-5 border-b border-gray-100">
                <span className={labelCls}>
                    <FiUsers size={13} className="inline mr-1.5 -mt-0.5 text-gray-400" />
                    Birth & development history
                </span>
                <ModeSelector value={merged.mode} onSelect={setMode} />
            </div>

            {merged.mode === "no" && (
                <p className="text-xs text-gray-400 py-6 text-center">
                    Section skipped — no birth/development history recorded.
                </p>
            )}

            {(merged.mode === "yes" || merged.mode === "normal") && (
                <div>
                    <FieldRow label="Birth weight" print={merged.birthWeight.print} onPrintChange={(v) => setField("birthWeight", { print: v })}>
                        <input
                            value={merged.birthWeight.value}
                            onChange={(e) => setField("birthWeight", { value: e.target.value })}
                            placeholder="e.g. 3.2 kg"
                            className={`${inputCls} max-w-[160px]`}
                        />
                    </FieldRow>

                    <FieldRow label="Full term / Preterm" print={merged.termStatus.print} onPrintChange={(v) => setField("termStatus", { print: v })}>
                        <OptionToggle
                            options={[{ value: "fullTerm", label: "Full term" }, { value: "preterm", label: "Preterm" }]}
                            value={merged.termStatus.value}
                            onSelect={(v) => setField("termStatus", { value: v })}
                        />
                    </FieldRow>

                    <FieldRow label="Mode of delivery" print={merged.modeOfDelivery.print} onPrintChange={(v) => setField("modeOfDelivery", { print: v })}>
                        <OptionToggle
                            options={[{ value: "normalDelivery", label: "Normal delivery" }, { value: "caesarean", label: "Caesarean section" }]}
                            value={merged.modeOfDelivery.value}
                            onSelect={(v) => setField("modeOfDelivery", { value: v })}
                        />
                    </FieldRow>

                    <FieldRow label="First cry" print={merged.firstCry.print} onPrintChange={(v) => setField("firstCry", { print: v })}>
                        <OptionToggle
                            options={[{ value: "present", label: "Present" }, { value: "absent", label: "Absent" }]}
                            value={merged.firstCry.value}
                            onSelect={(v) => setField("firstCry", { value: v })}
                        />
                    </FieldRow>

                    <FieldRow label="Pregnancy complications" print={merged.pregnancyComplications.print} onPrintChange={(v) => setField("pregnancyComplications", { print: v })}>
                        <input
                            value={merged.pregnancyComplications.value}
                            onChange={(e) => setField("pregnancyComplications", { value: e.target.value })}
                            placeholder="None / describe"
                            className={inputCls}
                        />
                    </FieldRow>

                    <FieldRow label="Birth complications" print={merged.birthComplications.print} onPrintChange={(v) => setField("birthComplications", { print: v })}>
                        <input
                            value={merged.birthComplications.value}
                            onChange={(e) => setField("birthComplications", { value: e.target.value })}
                            placeholder="None / describe"
                            className={inputCls}
                        />
                    </FieldRow>

                    <FieldRow label="NICU admission" print={merged.nicuAdmission.print} onPrintChange={(v) => setField("nicuAdmission", { print: v })}>
                        <input
                            value={merged.nicuAdmission.value}
                            onChange={(e) => setField("nicuAdmission", { value: e.target.value })}
                            placeholder="No admission / describe"
                            className={inputCls}
                        />
                    </FieldRow>

                    <FieldRow label="Vaccination status" print={merged.vaccinationStatus.print} onPrintChange={(v) => setField("vaccinationStatus", { print: v })}>
                        <OptionToggle
                            options={[{ value: "Up To Date", label: "Up to date" }, { value: "delayed", label: "Delayed" }]}
                            value={merged.vaccinationStatus.value}
                            onSelect={(v) => setField("vaccinationStatus", { value: v })}
                        />
                    </FieldRow>

                    <FieldRow label="Developmental milestones" print={merged.developmentalMilestones.print} onPrintChange={(v) => setField("developmentalMilestones", { print: v })}>
                        <OptionToggle
                            options={[{ value: "ageAppropriate", label: "Age appropriate" }, { value: "delayed", label: "Delayed" }]}
                            value={merged.developmentalMilestones.value}
                            onSelect={(v) => setField("developmentalMilestones", { value: v })}
                        />
                    </FieldRow>

                    <FieldRow label="Notes" print={merged.notes.print} onPrintChange={(v) => setField("notes", { print: v })}>
                        <input
                            value={merged.notes.value}
                            onChange={(e) => setField("notes", { value: e.target.value })}
                            placeholder="Additional notes"
                            className={inputCls}
                        />
                    </FieldRow>
                </div>
            )}
        </div>
    );
};

export default BirthDevelopmentSection;
