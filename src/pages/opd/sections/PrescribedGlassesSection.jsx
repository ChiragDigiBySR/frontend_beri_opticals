import { FiSliders, FiCopy } from "react-icons/fi";

const inputCls = "w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300 text-center";
const thCls = "text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-2 px-2 text-center";
const tdCls = "py-1.5 px-2";

const emptyRx = { sph: "", cyl: "", axis: "" };

const DEFAULT_DATA = { od: emptyRx, os: emptyRx, add: "" };

// finalRefraction prop: the Refraction section's "finalPrescription" table ({ od, os, add })
// so the Copy button can pull straight from Final Subjective Refraction.
const PrescribedGlassesSection = ({ data, onChange, finalRefraction }) => {
    const merged = {
        od: { ...emptyRx, ...data.od },
        os: { ...emptyRx, ...data.os },
        add: data.add || "",
    };

    const setEyeField = (eye, field, value) =>
        onChange({ ...merged, [eye]: { ...merged[eye], [field]: value } });

    const setAdd = (value) => onChange({ ...merged, add: value });

    const copyFromFinalRefraction = () => {
        if (!finalRefraction) return;
        onChange({
            od: { ...emptyRx, ...finalRefraction.od },
            os: { ...emptyRx, ...finalRefraction.os },
            add: finalRefraction.add || "",
        });
    };

    return (
        <div>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <span className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FiSliders size={13} className="text-gray-400" />
                    Prescribed Glasses
                </span>
                <button
                    type="button"
                    onClick={copyFromFinalRefraction}
                    disabled={!finalRefraction}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <FiCopy size={12} /> Copy from Final Refraction
                </button>
            </div>

            <p className="text-[11px] text-gray-400 mb-4">
                The prescription dispensed to the patient may differ from the final subjective refraction — record what's actually being made up here.
            </p>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full min-w-[360px]">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className={thCls}></th>
                            <th className={thCls}>SPH</th>
                            <th className={thCls}>CYL</th>
                            <th className={thCls}>AXIS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {["od", "os"].map((eye) => (
                            <tr key={eye}>
                                <td className={`${tdCls} text-xs font-semibold text-gray-600`}>{eye.toUpperCase()}</td>
                                {["sph", "cyl", "axis"].map((field) => (
                                    <td key={field} className={tdCls}>
                                        <input
                                            value={merged[eye][field] || ""}
                                            onChange={(e) => setEyeField(eye, field, e.target.value)}
                                            className={inputCls}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center gap-3 mt-3">
                <label className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider">ADD</label>
                <input
                    value={merged.add}
                    onChange={(e) => setAdd(e.target.value)}
                    className={`${inputCls} max-w-[100px]`}
                />
            </div>
        </div>
    );
};

export default PrescribedGlassesSection;
