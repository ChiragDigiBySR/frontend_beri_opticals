import { FiEye } from "react-icons/fi";

const inputCls = "w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300 text-center";
const sectionLabelCls = "text-[10px] font-semibold text-gray-800 uppercase tracking-wider block mb-3";
const thCls = "text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-2 px-2 text-center";
const tdCls = "py-1.5 px-2";

const LENS_TYPES = [
    { value: "singleVision", label: "Single Vision" },
    { value: "bifocal", label: "Bifocal" },
    { value: "progressive", label: "Progressive" },
    { value: "occupational", label: "Occupational" },
];

const SATISFACTION_OPTIONS = [
    { value: "comfortable", label: "Comfortable" },
    { value: "mildSymptoms", label: "Mild Symptoms" },
    { value: "moderateSymptoms", label: "Moderate Symptoms" },
    { value: "poorComfort", label: "Poor Comfort" },
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

// Distance / Near acuity — 3 columns: OD, OS, OU
const AcuityRow = ({ label, value, onChange }) => (
    <tr>
        <td className={`${tdCls} text-xs font-semibold text-gray-600 whitespace-nowrap`}>{label}</td>
        {["od", "os", "ou"].map((eye) => (
            <td key={eye} className={tdCls}>
                <input
                    value={value[eye] || ""}
                    onChange={(e) => onChange(eye, e.target.value)}
                    placeholder={label == "Near" ? "N6" : "6/6"}
                    className={inputCls}
                />
            </td>
        ))}
    </tr>
);

const emptyAcuity = { od: "", os: "", ou: "" };
const emptyRx = { sph: "", cyl: "", axis: "", vision: "" };

const DEFAULT_DATA = {
    unaided: {
        distance: emptyAcuity,
        near: emptyAcuity,
        pinhole: emptyAcuity,
        colorVision: emptyAcuity,
        contrastSensitivity: emptyAcuity,
        contrastSensitivityNote: "",
    },
    presentGlasses: {
        wearsGlasses: null,
        od: emptyRx,
        os: emptyRx,
        add: "",
        lensType: null,
        ageOfGlasses: "",
        patientSatisfaction: null,
    },
};

const VisionSection = ({ data, onChange }) => {
    const merged = {
        unaided: { ...DEFAULT_DATA.unaided, ...data.unaided },
        presentGlasses: { ...DEFAULT_DATA.presentGlasses, ...data.presentGlasses },
    };

    const setUnaided = (row, eye, value) =>
        onChange({
            ...merged,
            unaided: { ...merged.unaided, [row]: { ...merged.unaided[row], [eye]: value } },
        });

    const setGlasses = (patch) =>
        onChange({ ...merged, presentGlasses: { ...merged.presentGlasses, ...patch } });

    const setGlassesEye = (eye, field, value) =>
        setGlasses({ [eye]: { ...merged.presentGlasses[eye], [field]: value } });

    const pg = merged.presentGlasses;

    return (
        <div>
            {/* A. Unaided Visual Acuity */}
            <div className="mb-8">
                <span className={sectionLabelCls}>
                    <FiEye size={13} className="inline mr-1.5 -mt-0.5 text-gray-400" />
                    A. Unaided Visual Acuity (Without Glasses)
                </span>
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full min-w-[320px]">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className={thCls}></th>
                                <th className={thCls}>OD</th>
                                <th className={thCls}>OS</th>
                                <th className={thCls}>OU</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AcuityRow label="Distance" value={merged.unaided.distance} onChange={(eye, v) => setUnaided("distance", eye, v)} />
                            <AcuityRow label="Near" value={merged.unaided.near} onChange={(eye, v) => setUnaided("near", eye, v)} />
                            <AcuityRow label="Vision with Pinhole" value={merged.unaided.pinhole} onChange={(eye, v) => setUnaided("pinhole", eye, v)} />
                            <AcuityRow label="Color Vision" value={merged.unaided.colorVision} onChange={(eye, v) => setUnaided("colorVision", eye, v)} />
                            <AcuityRow label="Contrast Sensitivity" value={merged.unaided.contrastSensitivity} onChange={(eye, v) => setUnaided("contrastSensitivity", eye, v)} />
                        </tbody>
                    </table>
                </div>
                <div className="mt-3">
                    <label className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider block mb-1.5">Contrast Sensitivity Note</label>
                    <input
                        value={merged.unaided.contrastSensitivityNote || ""}
                        onChange={(e) => onChange({ ...merged, unaided: { ...merged.unaided, contrastSensitivityNote: e.target.value } })}
                        placeholder="Chart used, testing conditions, etc."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300"
                    />
                </div>
            </div>

            {/* B. Present Glasses Prescription */}
            <div>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                    <span className={`${sectionLabelCls} mb-0`}>
                        <FiEye size={13} className="inline mr-1.5 -mt-0.5 text-gray-400" />
                        B. Present Glasses Prescription (PGP)
                    </span>
                    <OptionToggle
                        options={[{ value: "yes", label: "Wears glasses" }, { value: "no", label: "No glasses" }]}
                        value={pg.wearsGlasses}
                        onSelect={(v) => setGlasses({ wearsGlasses: v })}
                    />
                </div>

                {pg.wearsGlasses === "yes" && (
                    <div className="space-y-4">
                        <div className="overflow-x-auto rounded-xl border border-gray-100">
                            <table className="w-full min-w-[420px]">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className={thCls}></th>
                                        <th className={thCls}>SPH</th>
                                        <th className={thCls}>CYL</th>
                                        <th className={thCls}>AXIS</th>
                                        <th className={thCls}>VISION</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {["od", "os"].map((eye) => (
                                        <tr key={eye}>
                                            <td className={`${tdCls} text-xs font-semibold text-gray-600`}>{eye.toUpperCase()}</td>
                                            {["sph", "cyl", "axis", "vision"].map((field) => (
                                                <td key={field} className={tdCls}>
                                                    <input
                                                        value={pg[eye][field] || ""}
                                                        onChange={(e) => setGlassesEye(eye, field, e.target.value)}
                                                        className={inputCls}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center gap-3">
                            <label className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider">ADD</label>
                            <input
                                value={pg.add}
                                onChange={(e) => setGlasses({ add: e.target.value })}
                                className={`${inputCls} max-w-[100px]`}
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider block mb-2">Lens Type</label>
                            <OptionToggle options={LENS_TYPES} value={pg.lensType} onSelect={(v) => setGlasses({ lensType: v })} />
                        </div>

                        <div className="flex items-center gap-3">
                            <label className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider whitespace-nowrap">Age of Glasses</label>
                            <input
                                value={pg.ageOfGlasses}
                                onChange={(e) => setGlasses({ ageOfGlasses: e.target.value })}
                                placeholder="e.g. 1 year"
                                className={`${inputCls} max-w-[140px]`}
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider block mb-2">Patient Satisfaction</label>
                            <OptionToggle options={SATISFACTION_OPTIONS} value={pg.patientSatisfaction} onSelect={(v) => setGlasses({ patientSatisfaction: v })} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VisionSection;
