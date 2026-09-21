import { useState } from "react";
import { FiTarget, FiCopy, FiClipboard } from "react-icons/fi";

const inputCls = "w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300 text-center";
const thCls = "text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-2 px-2 text-center";
const tdCls = "py-1.5 px-2";

const DEFAULT_COLUMNS = [
    { id: "sph", label: "SPH" },
    { id: "cyl", label: "CYL" },
    { id: "axis", label: "AXIS" },
];

// Each entry: { id, label, alwaysInternal?, hasSharedAdd?, columns? } — hasSharedAdd renders
// one ADD field below the OD/OS table (not a per-eye column), matching the spec. `columns`
// overrides the default SPH/CYL/AXIS set — used by Auto Keratometry (KH/KV + BC).
const REFRACTION_TABLES = [
    { id: "autoRefractometry", label: "A. Auto Refractometry" },
    {
        id: "autoKeratometry",
        label: "B. Auto Keratometry",
        columns: [
            { id: "sph", label: "KH" },
            { id: "cyl", label: "KV" },
            { id: "axis", label: "AXIS" },
            { id: "bc", label: "BC" },
        ],
    },
    { id: "dryRetinoscopy", label: "C. Dry Retinoscopy", alwaysInternal: true },
    { id: "wetRetinoscopy", label: "D. Wet Retinoscopy", alwaysInternal: true },
    { id: "drySubjectiveRefraction", label: "E. Dry Subjective Refraction", alwaysInternal: true },
    { id: "wetRefraction", label: "F. Wet Refraction", alwaysInternal: true },
    { id: "finalPrescription", label: "G. Final Prescription", hasSharedAdd: true,
        columns: [
            { id: "sph", label: "SPH" },
            { id: "cyl", label: "CYL" },
            { id: "axis", label: "AXIS" },
            { id: "vision", label: "VISION" },
        ],
    },
];

const RxTable = ({ eyes, columns, onChange }) => (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full min-w-[360px]">
            <thead>
                <tr className="bg-gray-50">
                    <th className={thCls}></th>
                    {columns.map((col) => <th key={col.id} className={thCls}>{col.label}</th>)}
                </tr>
            </thead>
            <tbody>
                {["od", "os"].map((eye) => (
                    <tr key={eye}>
                        <td className={`${tdCls} text-xs font-semibold text-gray-600`}>{eye.toUpperCase()}</td>
                        {columns.map((col) => (
                            <td key={col.id} className={tdCls}>
                                <input
                                    value={eyes[eye]?.[col.id] || ""}
                                    onChange={(e) => onChange(eye, col.id, e.target.value)}
                                    className={inputCls}
                                />
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
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
            {checked ? "Print" : "Internal only"}
        </span>
    </label>
);

const IconButton = ({ icon: Icon, label, onClick, disabled }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={label}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition
            ${disabled
                ? "opacity-40 cursor-not-allowed border-gray-200 text-gray-300 bg-gray-50"
                : "border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100"}`}
    >
        <Icon size={11} /> {label}
    </button>
);

// data: { [tableId]: { od: {sph,cyl,axis[,bc]}, os: {...}, add?: string, print? } }
const RefractionSection = ({ data, onChange }) => {
    // Session-only clipboard for copying one table's OD/OS/ADD values into another —
    // not saved with the report, just a convenience while filling the form.
    const [clipboard, setClipboard] = useState(null);

    const getTable = (t) => {
        const emptyEye = Object.fromEntries((t.columns || DEFAULT_COLUMNS).map((col) => [col.id, ""]));
        return {
            od: { ...emptyEye, ...data[t.id]?.od },
            os: { ...emptyEye, ...data[t.id]?.os },
            add: data[t.id]?.add || "",
            print: data[t.id]?.print !== undefined ? data[t.id].print : false,
        };
    };

    const setEyeField = (t, eye, field, value) => {
        const table = getTable(t);
        onChange({
            ...data,
            [t.id]: { ...table, [eye]: { ...table[eye], [field]: value } },
        });
    };

    const setAdd = (t, value) => {
        const table = getTable(t);
        onChange({ ...data, [t.id]: { ...table, add: value } });
    };

    const setPrint = (t, checked) => {
        const table = getTable(t);
        onChange({ ...data, [t.id]: { ...table, print: checked } });
    };

    const copyTable = (t) => {
        const table = getTable(t);
        setClipboard({ sourceLabel: t.label, od: table.od, os: table.os, add: table.add });
    };

    // Pastes matching columns only (e.g. Auto Keratometry's BC won't overwrite a
    // table that has no BC column) — anything the target table doesn't have is skipped.
    const pasteInto = (t) => {
        if (!clipboard) return;
        const table = getTable(t);
        const columns = (t.columns || DEFAULT_COLUMNS).map((c) => c.id);
        const pickColumns = (eyeValues) =>
            Object.fromEntries(columns.map((id) => [id, clipboard[eyeValues][id] !== undefined ? clipboard[eyeValues][id] : table[eyeValues][id]]));

        onChange({
            ...data,
            [t.id]: {
                ...table,
                od: pickColumns("od"),
                os: pickColumns("os"),
                add: t.hasSharedAdd ? clipboard.add : table.add,
            },
        });
    };

    return (
        <div className="space-y-8">
            {REFRACTION_TABLES.map((t) => {
                const table = getTable(t);
                return (
                    <div key={t.id}>
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                            <span className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                <FiTarget size={13} className="text-gray-400" />
                                {t.label}
                            </span>
                            <div className="flex items-center gap-2">
                                <IconButton icon={FiCopy} label="Copy" onClick={() => copyTable(t)} />
                                <IconButton
                                    icon={FiClipboard}
                                    label={clipboard ? `Paste (${clipboard.sourceLabel})` : "Paste"}
                                    onClick={() => pasteInto(t)}
                                    disabled={!clipboard}
                                />
                                {t.alwaysInternal ? (
                                    <span className="text-[9px] font-semibold text-gray-300 uppercase tracking-wide">Internal only</span>
                                ) : (
                                    <PrintToggle checked={table.print} onChange={(v) => setPrint(t, v)} />
                                )}
                            </div>
                        </div>
                        <RxTable
                            eyes={table}
                            columns={t.columns || DEFAULT_COLUMNS}
                            onChange={(eye, field, value) => setEyeField(t, eye, field, value)}
                        />
                        {t.hasSharedAdd && (
                            <div className="flex items-center gap-3 mt-3">
                                <label className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider">ADD</label>
                                <input
                                    value={table.add}
                                    onChange={(e) => setAdd(t, e.target.value)}
                                    className={`${inputCls} max-w-[100px]`}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default RefractionSection;