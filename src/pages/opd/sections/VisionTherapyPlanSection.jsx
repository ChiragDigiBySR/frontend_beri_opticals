import { FiTrendingUp } from "react-icons/fi";

const textareaCls = "w-full px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition placeholder:text-gray-300 min-h-[120px] resize-y";
const labelCls = "text-[10px] font-semibold text-gray-800 uppercase tracking-wider block mb-1";

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

const DEFAULT_DATA = { plan: "", print: false };

// data: { plan: string, print: bool }
const VisionTherapyPlanSection = ({ data, onChange }) => {
    const merged = { ...DEFAULT_DATA, ...data };

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <label className={`${labelCls} mb-0`}>
                    <FiTrendingUp size={13} className="inline mr-1.5 -mt-0.5 text-gray-400" />
                    Vision Therapy Plan
                </label>
                <PrintToggle checked={merged.print} onChange={(v) => onChange({ ...merged, print: v })} />
            </div>
            <textarea
                value={merged.plan}
                onChange={(e) => onChange({ ...merged, plan: e.target.value })}
                placeholder="Outline the recommended therapy plan — exercises, frequency, duration, review schedule..."
                className={textareaCls}
            />
        </div>
    );
};

export default VisionTherapyPlanSection;
