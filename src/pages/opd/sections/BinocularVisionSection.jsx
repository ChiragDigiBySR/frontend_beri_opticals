import { FiZap } from "react-icons/fi";

const inputCls = "w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300";
const selectCls = "w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 bg-gray-50 text-gray-700 transition";

const TESTS = [
    { id: "stereopsis", label: "Stereopsis" },
    { id: "wfdt", label: "WFDT" },
    { id: "eom", label: "EOM" },
    { id: "saccades", label: "Saccades" },
    { id: "pursuits", label: "Pursuits" },
    { id: "coverTest", label: "Cover Test" },
    { id: "nearHorizontalPhoria", label: "Near Horizontal Phoria" },
    { id: "distanceHorizontalPhoria", label: "Distance Horizontal Phoria" },
    { id: "nearVerticalPhoria", label: "Near Vertical Phoria" },
    { id: "acToARatio", label: "AC:A Ratio" },
    { id: "distanceVerticalPhoria", label: "Distance Vertical Phoria" },
    { id: "npcAccommodative", label: "NPC Accommodative" },
    { id: "npcNonAccommodative", label: "NPC Non-accommodative" },
    { id: "nra", label: "NRA" },
    { id: "pra", label: "PRA" },
    { id: "npa", label: "NPA" },
    { id: "amplitudeOfAccommodation", label: "Amplitude of Accommodation" },
    { id: "hofstetterValue", label: "Hofstetter Value" },
    { id: "accommodativeFacility", label: "Accommodative Facility" },
    { id: "vergenceFacility", label: "Vergence Facility" },
    { id: "nfvDistance", label: "NFV Distance" },
    { id: "nfvNear", label: "NFV Near" },
    { id: "pfvDistance", label: "PFV Distance" },
    { id: "pfvNear", label: "PFV Near" },
];

const REPORT_OPTIONS = [
    "Normal", "Good", "Mild", "Moderate", "Poor",
    "Reduced", "Improved", "Suppression Present", "Suppression Absent",
];

const PrintToggle = ({ checked, onChange }) => (
    <label className="flex items-center gap-1 cursor-pointer select-none" title={checked ? "Print report" : "Hide values"}>
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-orange-500"
        />
    </label>
);

const emptyTest = () => ({ report: "", notes: "", values: "", print: false });

const DEFAULT_DATA = {
    tests: Object.fromEntries(TESTS.map((t) => [t.id, emptyTest()])),
    notes: { value: "", print: false },
};

// data: { tests: { [testId]: { report, notes, values, print } }, notes: { value, print } }
// Printed report shows only: test name, Result (report), and Notes — per test, only
// when that test's print toggle is on. "values" is an internal input aid and is
// never printed and never shown as its own heading in the report (see §5.1).
const BinocularVisionSection = ({ data, onChange }) => {
    const tests = { ...DEFAULT_DATA.tests, ...data.tests };
    const notes = { ...DEFAULT_DATA.notes, ...data.notes };

    // ---------------------------------------------
    // CHECK IF EVERYTHING IS SELECTED
    // ---------------------------------------------

    const allSelected =
        TESTS.every(
            (t) => tests[t.id]?.print === true
        ) &&
        notes.print === true;

    // ---------------------------------------------
    // SELECT / UNSELECT ALL
    // ---------------------------------------------

    const handleSelectAll = (checked) => {

        const updatedTests = {};

        TESTS.forEach((t) => {

            updatedTests[t.id] = {
                ...tests[t.id],
                print: checked,
            };

        });


        onChange({
            ...data,

            tests: updatedTests,

            notes: {
                ...notes,
                print: checked,
            },
        });

    };

    const setTestField = (id, field, value) =>
        onChange({ ...data, tests: { ...tests, [id]: { ...tests[id], [field]: value } } });

    // Selecting a preset value fills Notes for convenience — the clinician can
    // still edit Notes freely afterwards. The preset choice itself is never printed.
    const setTestValues = (id, preset) =>
        onChange({
            ...data,
            tests: { ...tests, [id]: { ...tests[id], values: preset, notes: preset || tests[id]?.notes || "" } },
        });

    const setNotesField = (field, value) =>
        onChange({ ...data, notes: { ...notes, [field]: value } });

    return (
        <div>
            <div className="flex items-center gap-1.5 mb-4">
                <FiZap size={13} className="text-gray-400" />
                <span className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider">Binocular Vision Findings</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full min-w-[680px]">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-2 px-3 text-left">Test</th>
                            <th className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-2 px-3 text-left w-40">Result</th>
                            <th className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-2 px-3 text-left">Notes</th>
                            <th className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-2 px-3 text-left w-44">
                                Values <span className="normal-case font-medium text-gray-300">(internal, not printed)</span>
                            </th>

                            {/* PRINT HEADER */}
                            <th className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-2 px-3 text-center w-20">

                                <div className="flex flex-col items-center gap-1">

                                    <span className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={(e) =>
                                                handleSelectAll(
                                                    e.target.checked
                                                )
                                            }
                                            className="w-3.5 h-3.5 rounded accent-orange-500"
                                        /> Print
                                    </span>



                                </div>

                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {TESTS.map((t) => {
                            const row = tests[t.id] || emptyTest();
                            return (
                                <tr key={t.id} className="border-t border-gray-100">
                                    <td className="py-2 px-3 text-xs font-semibold text-gray-600 whitespace-nowrap">{t.label}</td>
                                    <td className="py-2 px-3">
                                        <select
                                            value={row.report}
                                            onChange={(e) => setTestField(t.id, "report", e.target.value)}
                                            className={selectCls}
                                        >
                                            <option value="">—</option>
                                            {REPORT_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </td>
                                    <td className="py-2 px-3">
                                        <input
                                            value={row.notes}
                                            onChange={(e) => setTestField(t.id, "notes", e.target.value)}
                                            className={inputCls}
                                        />
                                    </td>
                                    <td className="py-2 px-3">
                                        <input
                                            type="text"
                                            value={row.values}
                                            onChange={(e) => setTestField(t.id, "values", e.target.value)}
                                            className={inputCls}
                                            placeholder="Enter value"
                                        />
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                        <PrintToggle checked={row.print} onChange={(v) => setTestField(t.id, "print", v)} />
                                    </td>
                                </tr>
                            );
                        })}
                        <tr className="border-t border-gray-100">
                            <td className="py-2 px-3 text-xs font-semibold text-gray-600">Notes</td>
                            <td className="py-2 px-3 text-gray-300 text-xs">—</td>
                            <td className="py-2 px-3">
                                <input
                                    value={notes.value}
                                    onChange={(e) => setNotesField("value", e.target.value)}
                                    className={inputCls}
                                />
                            </td>
                            <td className="py-2 px-3 text-gray-300 text-xs">—</td>
                            <td className="py-2 px-3 text-center">
                                <PrintToggle checked={notes.print} onChange={(v) => setNotesField("print", v)} />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BinocularVisionSection;
