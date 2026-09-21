import { FiAlertCircle } from "react-icons/fi";

const inputCls = "flex-1 min-w-[160px] px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300";

const AnswerToggle = ({ value, current, onSelect, noLabel }) => {
    const isSelected = current === value;
    const selectedCls = value === "yes"
        ? "bg-orange-50 text-orange-600 border-orange-300"
        : "bg-gray-100 text-gray-500 border-gray-300";
    return (
        <button
            type="button"
            onClick={() => onSelect(value)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition whitespace-nowrap
                ${isSelected ? selectedCls : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"}`}
        >
            {value === "yes" ? "Yes" : (noLabel || "No")}
        </button>
    );
};

const DEFAULT_DATA = { answer: "", detail: "" };

// data: { answer: "yes"|"no", detail: string }
const AllergySection = ({ data, onChange }) => {
    const merged = { ...DEFAULT_DATA, ...data };

    const set = (field, value) => onChange({ ...merged, [field]: value });

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3">
                <div className="sm:w-48 shrink-0 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                    <FiAlertCircle size={13} className="text-gray-400" />
                    Allergy
                </div>
                <div className="flex gap-2 shrink-0">
                    <AnswerToggle value="yes" current={merged.answer} onSelect={(v) => set("answer", v)} />
                    <AnswerToggle value="no" current={merged.answer} onSelect={(v) => set("answer", v)} noLabel="Not aware of any" />
                </div>
                {merged.answer === "yes" && (
                    <input
                        value={merged.detail || ""}
                        onChange={(e) => set("detail", e.target.value)}
                        placeholder="Details (allergen, reaction, etc.)"
                        className={inputCls}
                    />
                )}
            </div>
        </div>
    );
};

export default AllergySection;
