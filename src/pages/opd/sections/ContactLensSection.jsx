import { FiCircle } from "react-icons/fi";

const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300";
const labelCls = "text-[10px] font-semibold text-gray-800 uppercase tracking-wider block mb-1";

const LENS_TYPES = [
    { value: "soft", label: "Soft Contact Lens" },
    { value: "rgp", label: "RGP Contact Lens" },
    { value: "multifocal", label: "Multifocal Contact Lens" },
    { value: "orthoK", label: "Orthokeratology Lens" },
    { value: "scleral", label: "Scleral Lens" },
    { value: "hybrid", label: "Hybrid Lens" },
];

const DETAIL_FIELDS = [
    { id: "brand", label: "Brand" },
    { id: "baseCurve", label: "Base Curve" },
    { id: "diameter", label: "Diameter" },
    { id: "power", label: "Power" },
    { id: "wearingSchedule", label: "Wearing Schedule" },
    { id: "solutionUsed", label: "Solution Used" },
];

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

const PrintToggle = ({ checked, onChange }) => (
    <label className="flex items-center gap-1.5 shrink-0 cursor-pointer select-none">
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-orange-500"
        />
        <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
            {checked ? "Print in report" : "Internal only"}
        </span>
    </label>
);

const DEFAULT_DATA = { usesContactLens: null, lensType: null, notes: "", print: false };

// data: { usesContactLens: "yes"|"no", lensType, brand, baseCurve, diameter, power,
//         wearingSchedule, solutionUsed, notes, print }
const ContactLensSection = ({ data, onChange }) => {
    const merged = { ...DEFAULT_DATA, ...data };
    const set = (key, value) => onChange({ ...merged, [key]: value });

    return (
        <div>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5 pb-5 border-b border-gray-100">
                <span className={`${labelCls} mb-0`}>
                    <FiCircle size={13} className="inline mr-1.5 -mt-0.5 text-gray-400" />
                    Uses Contact Lens
                </span>
                <OptionToggle
                    options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
                    value={merged.usesContactLens}
                    onSelect={(v) => set("usesContactLens", v)}
                />
            </div>

            {merged.usesContactLens === "yes" && (
                <div>
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
                        <label className={`${labelCls} mb-0`}>Lens Type</label>
                        <PrintToggle checked={merged.print} onChange={(v) => set("print", v)} />
                    </div>
                    <div className="mb-5">
                        <OptionToggle options={LENS_TYPES} value={merged.lensType} onSelect={(v) => set("lensType", v)} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {DETAIL_FIELDS.map((f) => (
                            <div key={f.id}>
                                <label className={labelCls}>{f.label}</label>
                                <input
                                    value={merged[f.id] || ""}
                                    onChange={(e) => set(f.id, e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                        ))}
                        <div className="sm:col-span-2">
                            <label className={labelCls}>Notes</label>
                            <input
                                value={merged.notes}
                                onChange={(e) => set("notes", e.target.value)}
                                className={inputCls}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContactLensSection;
