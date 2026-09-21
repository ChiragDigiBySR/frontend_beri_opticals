import { useState } from "react";
import { FiActivity, FiPlus } from "react-icons/fi";

const inputCls = "flex-1 min-w-[140px] px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300";

const slugify = (label) => label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

const SYSTEMIC_HISTORY_ITEMS = [
    { id: "diabetes", label: "Diabetes" },
    { id: "hypertension", label: "Hypertension" },
    { id: "thyroidDisorder", label: "Thyroid disorder" },
    { id: "cholesterol", label: "Cholesterol" },
    { id: "rheumatoidArthritis", label: "Rheumatoid Arthritis" },
    { id: "neurologicalDisorder", label: "Neurological disorder" },
    { id: "medications", label: "Medications" },
    { id: "allergies", label: "Allergies", noLabel: "Not aware of" },
    { id: "developmentalDisorders", label: "Developmental disorders" },
];

const DURATION_SUGGESTIONS = [
    "Newly diagnosed", "6 months", "1 year", "2 years", "5 years",
    "10 years", "Since childhood", "Not specified",
];

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

// data: { markAllNo: bool, items: { [itemId]: { answer: "yes"|"no", detail: string, duration: string } } }
// customOptions: clinic-added item labels (persisted via onAddOption to Settings)
const SystemicHistorySection = ({ data, onChange, customOptions = [], onAddOption }) => {
    const items = data.items || {};
    const [addingItem, setAddingItem] = useState(false);
    const [newItem, setNewItem] = useState("");

    const customItems = customOptions.map((label) => ({ id: slugify(label), label }));
    const allItems = [...SYSTEMIC_HISTORY_ITEMS, ...customItems];

    const handleItemChange = (id, field, value) => {
        const nextItems = { ...items, [id]: { ...items[id], [field]: value } };
        // Editing an item to anything other than "no" breaks the "all no" state
        const markAllNo = field === "answer" && value !== "no" ? false : data.markAllNo;
        onChange({ ...data, items: nextItems, markAllNo, selectAll: false });
    };

    const handleMarkAllNo = (checked) => {
        if (checked) {
            const nextItems = {};
            allItems.forEach((it) => { nextItems[it.id] = { answer: "no", detail: "", duration: "" }; });
            onChange({ ...data, items: nextItems, markAllNo: true, selectAll: false });
        } else {
            onChange({ ...data, markAllNo: false });
        }
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            const nextItems = {};
            allItems.forEach((it) => { nextItems[it.id] = { answer: "yes", detail: items[it.id]?.detail || "", duration: items[it.id]?.duration || "" }; });
            onChange({ ...data, items: nextItems, markAllNo: false, selectAll: true });
        } else {
            onChange({ ...data, selectAll: false });
        }
    };

    const saveNewItem = () => {
        const label = newItem.trim();
        if (!label) { setAddingItem(false); return; }
        onAddOption?.(label);
        setNewItem("");
        setAddingItem(false);
    };

    return (
        <div>
            <div className="flex items-center gap-5 mb-4 pb-4 border-b border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <input
                        type="checkbox"
                        checked={!!data.selectAll}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="w-4 h-4 rounded accent-orange-500"
                    />
                    <span className="text-xs font-semibold text-gray-600">Select all</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                    <input
                        type="checkbox"
                        checked={!!data.markAllNo}
                        onChange={(e) => handleMarkAllNo(e.target.checked)}
                        className="w-4 h-4 rounded accent-orange-500"
                    />
                    <span className="text-xs font-semibold text-gray-600">Mark all as No</span>
                </label>
            </div>

            <datalist id="systemic-duration-suggestions">
                {DURATION_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
            </datalist>

            <div>
                {allItems.map((it) => {
                    const item = items[it.id] || {};
                    return (
                        <div key={it.id} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 border-b border-gray-100 last:border-b-0">
                            <div className="sm:w-44 shrink-0 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                                <FiActivity size={13} className="text-gray-400" />
                                {it.label}
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <AnswerToggle value="yes" current={item.answer} onSelect={(v) => handleItemChange(it.id, "answer", v)} />
                                <AnswerToggle value="no" current={item.answer} onSelect={(v) => handleItemChange(it.id, "answer", v)} noLabel={it.noLabel} />
                            </div>
                            {item.answer === "yes" && (
                                <>
                                    <input
                                        value={item.detail || ""}
                                        onChange={(e) => handleItemChange(it.id, "detail", e.target.value)}
                                        placeholder="Details"
                                        className={inputCls}
                                    />
                                    <input
                                        list="systemic-duration-suggestions"
                                        value={item.duration || ""}
                                        onChange={(e) => handleItemChange(it.id, "duration", e.target.value)}
                                        placeholder="Duration"
                                        className={`${inputCls} sm:max-w-[140px]`}
                                    />
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
                {addingItem ? (
                    <div className="flex items-center gap-2">
                        <input
                            autoFocus
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveNewItem(); } }}
                            placeholder="New systemic history item..."
                            className={inputCls}
                        />
                        <button
                            type="button"
                            onClick={saveNewItem}
                            className="shrink-0 px-3 py-2 rounded-xl text-[11px] font-semibold border border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100 transition"
                        >
                            Add
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setAddingItem(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold border border-orange-300 text-orange-600 bg-orange-50 hover:bg-orange-100 transition"
                    >
                        <FiPlus size={13} /> Add Another
                    </button>
                )}
            </div>
        </div>
    );
};

export default SystemicHistorySection;
