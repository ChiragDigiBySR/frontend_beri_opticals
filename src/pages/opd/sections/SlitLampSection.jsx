import { FiLayers } from "react-icons/fi";

const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300";

const textareaCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300 min-h-[90px] resize-y";

const FINDINGS = [
    { id: "lidsLashes", label: "Lids & Lashes", normal: "Normal" },
    { id: "conjunctiva", label: "Conjunctiva", normal: "Clear and quiet" },
    { id: "cornea", label: "Cornea", normal: "Clear, no opacities" },
    { id: "anteriorChamber", label: "Anterior Chamber", normal: "Deep and quiet" },
    { id: "iris", label: "Iris", normal: "Normal colour and pattern, pupils round and reactive" },
    { id: "lens", label: "Lens", normal: "Clear Crystalline Central" },
    { id: "vitreous", label: "Vitreous", normal: "Clear" },
    { id: "pupil", label: "Pupil", normal: "Round and reactive to light" },
    { id: "tearFilm", label: "Tear Film", normal: "Adequate" },
];


// The fixed report line used when Fundus is marked Normal — no dilation was done, so
// this is what actually goes on the report rather than a doctor-typed remark.
const FUNDUS_NORMAL_REPORT_TEXT = "Patient seen Undilated";

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

const emptyEye = () => Object.fromEntries(FINDINGS.map((f) => [f.id, ""]));
const normalEye = () => Object.fromEntries(FINDINGS.map((f) => [f.id, f.normal]));

const DEFAULT_DATA = { od: emptyEye(), os: emptyEye(), print: false, fundus: { status: null, remarks: "" }, };

// data: { od: { [findingId]: string }, os: { [findingId]: string }, print }
const SlitLampSection = ({ data, onChange }) => {
    const merged = {
        od: { ...emptyEye(), ...data.od },
        os: { ...emptyEye(), ...data.os },
        print: data.print !== undefined ? data.print : false,
        fundus: { ...DEFAULT_DATA.fundus, ...data.fundus },
    };

    const setField = (eye, id, value) =>
        onChange({ ...merged, [eye]: { ...merged[eye], [id]: value } });

    const fillNormal = (eye) => onChange({ ...merged, [eye]: normalEye() });
    const fillBothNormal = () => onChange({ ...merged, od: normalEye(), os: normalEye() });

    const setFundus = (patch) => onChange({ ...merged, fundus: { ...merged.fundus, ...patch } });

    return (
        <div>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                <div className="flex gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => fillNormal("od")}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100 transition"
                    >
                        Normal OD
                    </button>
                    <button
                        type="button"
                        onClick={() => fillNormal("os")}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100 transition"
                    >
                        Normal OS
                    </button>
                    <button
                        type="button"
                        onClick={fillBothNormal}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-orange-500 text-white hover:bg-orange-600 transition"
                    >
                        Both Eyes Normal
                    </button>
                </div>
                <PrintToggle checked={merged.print} onChange={(v) => onChange({ ...merged, print: v })} />
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full min-w-[520px]">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-2 px-3 text-left">Finding</th>
                            <th className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-2 px-3 text-left">OD</th>
                            <th className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-2 px-3 text-left">OS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {FINDINGS.map((f) => (
                            <tr key={f.id} className="border-t border-gray-100">
                                <td className="py-2 px-3 text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                                    <FiLayers size={12} className="text-gray-300" />
                                    {f.label}
                                </td>
                                <td className="py-2 px-3">
                                    <input
                                        value={merged.od[f.id]}
                                        onChange={(e) => setField("od", f.id, e.target.value)}
                                        className={inputCls}
                                    />
                                </td>
                                <td className="py-2 px-3">
                                    <input
                                        value={merged.os[f.id]}
                                        onChange={(e) => setField("os", f.id, e.target.value)}
                                        className={inputCls}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>



            <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                    <span className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FiLayers size={13} className="text-gray-400" />
                        Fundus
                    </span>
                    <OptionToggle
                        options={[{ value: "normal", label: "Normal" }, { value: "notNormal", label: "Not Normal" }]}
                        value={merged.fundus.status}
                        onSelect={(v) => {
                            // setFundus({ status: v })
                            setFundus({
                                status: v,
                                remarks:
                                    v === "normal"
                                        ? FUNDUS_NORMAL_REPORT_TEXT
                                        : "",
                            });
                        }}
                    />
                </div>

                {merged.fundus.status === "normal" && (
                    <p className="text-xs text-gray-500 italic px-1">
                        Report: "{FUNDUS_NORMAL_REPORT_TEXT}"
                    </p>
                )}

                {merged.fundus.status === "notNormal" && (
                    <textarea
                        value={merged.fundus.remarks}
                        onChange={(e) => setFundus({ remarks: e.target.value })}
                        placeholder="Remarks on fundus findings..."
                        className={textareaCls}
                    />
                )}
            </div>


        </div>
    );
};

export default SlitLampSection;
