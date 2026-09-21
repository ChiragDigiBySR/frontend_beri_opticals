import { useEffect, useState } from "react";
import { FiClock, FiDroplet } from "react-icons/fi";

const inputCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300";
const labelCls = "text-[10px] font-semibold text-gray-800 uppercase tracking-wider block mb-1";

const DROP_SUGGESTIONS = [
    "Tropicamide 0.8% + Phenylephrine 5%",
    "Tropicamide 1%",
    "Cyclopentolate 1%",
    "Atropine 1%",
    "Homatropine 2%",
];

const EYE_OPTIONS = [
    { value: "right", label: "Right (OD)" },
    { value: "left", label: "Left (OS)" },
    { value: "both", label: "Both (OU)" },
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

const formatTime = (ms) =>
    new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const elapsedMinutes = (fromMs, nowMs) => Math.floor((nowMs - fromMs) / 60000);

const DEFAULT_DATA = { dropName: "", eye: null, doses: [null, null, null] };

// data: { dropName, eye, doses: [ms|null, ms|null, ms|null] } — in-memory only (no persistence
// across refresh yet); once the backend is wired up this should save on each dose so the
// live tracking survives a reload and can show on a cross-patient dilation list page.
const DilationTimerSection = ({ data, onChange }) => {
    const merged = { ...DEFAULT_DATA, ...data };
    const [now, setNow] = useState(Date.now());

    // Live tick every 30s so elapsed-time displays stay current
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(id);
    }, []);

    const recordDose = (index) => {
        const doses = [...merged.doses];
        doses[index] = Date.now();
        onChange({ ...merged, doses });
    };

    const firstDoseAt = merged.doses[0];
    const lastDoseIndex = merged.doses.filter((d) => d !== null).length - 1;
    const lastDoseAt = lastDoseIndex >= 0 ? merged.doses[lastDoseIndex] : null;

    return (
        <div>
            {!firstDoseAt && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                    <div>
                        <label className={labelCls}>Drop Name</label>
                        <input
                            list="dilation-drop-suggestions"
                            value={merged.dropName}
                            onChange={(e) => onChange({ ...merged, dropName: e.target.value })}
                            placeholder="e.g. Tropicamide + Phenylephrine"
                            className={inputCls}
                        />
                        <datalist id="dilation-drop-suggestions">
                            {DROP_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
                        </datalist>
                    </div>
                    <div>
                        <label className={labelCls}>Eye</label>
                        <OptionToggle options={EYE_OPTIONS} value={merged.eye} onSelect={(v) => onChange({ ...merged, eye: v })} />
                    </div>
                </div>
            )}

            {!firstDoseAt ? (
                <button
                    type="button"
                    onClick={() => recordDose(0)}
                    disabled={!merged.dropName || !merged.eye}
                    className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <FiDroplet size={13} /> Start Dilation
                </button>
            ) : (
                <div>
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 mb-1">
                            <FiDroplet size={13} className="text-orange-500" />
                            {merged.dropName} · {EYE_OPTIONS.find((o) => o.value === merged.eye)?.label}
                        </div>
                        <div className="flex items-center gap-1.5 text-orange-600">
                            <FiClock size={14} />
                            <span className="text-lg font-bold">{elapsedMinutes(lastDoseAt, now)} minutes</span>
                            <span className="text-xs text-gray-400">since last instillation</span>
                        </div>
                    </div>

                    <div className="mb-5">
                        {merged.doses.map((dose, i) => (
                            <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-b-0 text-xs">
                                <span className="w-16 shrink-0 font-semibold text-gray-600">Dose {i + 1}</span>
                                {dose ? (
                                    <>
                                        <span className="text-gray-500">Instilled at {formatTime(dose)}</span>
                                        <span className="text-gray-300">·</span>
                                        <span className="text-gray-500">{elapsedMinutes(dose, now)} min ago</span>
                                    </>
                                ) : (
                                    <span className="text-gray-300">Not given yet</span>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        {merged.doses[1] === null && (
                            <button
                                type="button"
                                onClick={() => recordDose(1)}
                                className="px-4 py-2 rounded-xl text-[11px] font-semibold border border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100 transition"
                            >
                                Record 2nd Drop
                            </button>
                        )}
                        {merged.doses[1] !== null && merged.doses[2] === null && (
                            <button
                                type="button"
                                onClick={() => recordDose(2)}
                                className="px-4 py-2 rounded-xl text-[11px] font-semibold border border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100 transition"
                            >
                                Record 3rd Drop
                            </button>
                        )}
                        {merged.doses[2] !== null && (
                            <span className="px-4 py-2 rounded-xl text-[11px] font-semibold bg-gray-100 text-gray-500">
                                All 3 doses recorded
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DilationTimerSection;
