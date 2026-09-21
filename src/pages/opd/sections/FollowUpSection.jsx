import { FiCalendar, FiClock } from "react-icons/fi";

const inputCls =
    "px-3 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 hover:border-gray-400 bg-gray-50 text-gray-700 transition";

const labelCls =
    "text-[10px] font-semibold text-gray-800 uppercase tracking-wider block mb-2";

const PERIODS = [
    { value: "1", label: "After 1 Month" },
    { value: "3", label: "After 3 Months" },
    { value: "6", label: "After 6 Months" },
    { value: "CUSTOM", label: "Custom Date" },
];

const getDateAfterMonths = (months) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    date.setMonth(date.getMonth() + Number(months));

    return date.toISOString().slice(0, 10);
};

const FollowUpSection = ({ data = {}, onChange }) => {
    const merged = {
        period: "",
        nextDate: null,
        ...data,
    };

    const handlePeriodChange = (period) => {
        if (period === "") {
            onChange({
                period: "",
                nextDate: null,
            });
            return;
        }

        if (period === "CUSTOM") {
            onChange({
                ...merged,
                period: "CUSTOM",
                nextDate: null,
            });
            return;
        }

        // Automatically calculate next follow-up date
        const nextDate = getDateAfterMonths(period);

        onChange({
            period,
            nextDate,
        });
    };

    const handleCustomDateChange = (e) => {
        onChange({
            ...merged,
            period: "CUSTOM",
            nextDate: e.target.value || null,
        });
    };

    // Date input requires YYYY-MM-DD
    const formattedDate = merged.nextDate
        ? new Date(merged.nextDate).toISOString().slice(0, 10)
        : "";

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-1.5 mb-5">
                <FiCalendar size={13} className="text-gray-400" />
                <span className="text-[10px] font-semibold text-gray-800 uppercase tracking-wider">
                    Follow-up
                </span>
            </div>

            {/* Follow-up Period */}
            <div className="mb-6">
                <label className={labelCls}>
                    Next Follow-up
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {PERIODS.map((option) => {
                        const selected = merged.period === option.value;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                    handlePeriodChange(option.value)
                                }
                                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold transition
                                    ${
                                        selected
                                            ? "bg-orange-50 border-orange-400 text-orange-600"
                                            : "bg-gray-50 border-gray-200 text-gray-600 hover:border-orange-300 hover:bg-orange-50"
                                    }`}
                            >
                                <FiClock size={14} />
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Next Date */}
            <div className="max-w-xs">
                <label className={labelCls}>
                    Follow-up Date
                </label>

                <input
                    type="date"
                    value={formattedDate}
                    onChange={handleCustomDateChange}
                    disabled={merged.period !== "CUSTOM"}
                    className={`${inputCls} w-full ${
                        merged.period !== "CUSTOM"
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : ""
                    }`}
                />

                {merged.period !== "CUSTOM" && merged.nextDate && (
                    <p className="text-[10px] text-gray-400 mt-1.5">
                        Automatically calculated from today's date.
                    </p>
                )}
            </div>

            {/* Selected summary */}
            {merged.period && merged.nextDate && (
                <div className="mt-6 p-3 rounded-xl bg-orange-50 border border-orange-100">
                    <div className="flex items-center gap-2">
                        <FiCalendar
                            size={14}
                            className="text-orange-500"
                        />

                        <div>
                            <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-wide">
                                Next Follow-up
                            </p>

                            <p className="text-sm font-semibold text-gray-700 mt-0.5">
                                {new Date(merged.nextDate).toLocaleDateString(
                                    "en-IN",
                                    {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                    }
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FollowUpSection;