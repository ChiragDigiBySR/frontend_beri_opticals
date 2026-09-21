import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../../utils/api";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";


const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTH_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

const TASK_TYPES = [
    { value: "daily", label: "Daily", icon: "🔁", desc: "Repeats every day" },
    { value: "one time", label: "One Time", icon: "✅", desc: "Single occurrence" },
    { value: "weekly", label: "Weekly", icon: "📅", desc: "Repeats each week" },
    { value: "monthly", label: "Monthly", icon: "🗓️", desc: "Repeats each month" },
];

const InputWrapper = ({ label, required, children }) => (
    <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            {label} {required && <span className="text-orange-400">*</span>}
        </label>
        {children}
    </div>
);

const selectClass = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all appearance-none cursor-pointer";

export default function AddTaskPage() {

    const [formData, setFormData] = useState({
        taskType: "",
        scheduleDate: "",
        assignedTo: "",
        weekDay: "",
        monthDay: "",
        task: "",
    });

    const [toast, setToast] = useState(null);
    const [submitBtn, setSubmitBtn] = useState(false);

    const employees = useSelector((state) => state.employees.data);     // store employees

    console.log("Emp ---> ", employees)

    const dispatch = useDispatch();

    const showToast = (type, message) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3500);
    };

    //  handle input change
    const handleChange = (field, value) => {
        setFormData((prev) => {
            const updated = { ...prev, [field]: value };
            if (field === "taskType") { updated.weekDay = ""; updated.monthDay = ""; }
            return updated;
        });
    };

    // form validation
    const validate = () => {
        if (!formData.taskType) return "Please select a task type.";
        if (!formData.scheduleDate) return "Please select a schedule date.";
        if (!formData.assignedTo) return "Please assign the task to a user.";
        if (formData.taskType === "weekly" && !formData.weekDay) return "Please select a week day.";
        if (formData.taskType === "monthly" && !formData.monthDay) return "Please select a month day.";
        if (!formData.task.trim()) return "Please enter a task description.";
        return null;
    };


    // handle form submit
    const handleSubmit = async () => {
        const error = validate();
        if (error) return showToast("error", error);

        const payload = {
            taskType: formData.taskType,
            scheduleDate: formData.scheduleDate,
            assignedTo: formData.assignedTo,
            task: formData.task,
            ...(formData.taskType === "weekly" && { weekDay: formData.weekDay }),
            ...(formData.taskType === "monthly" && { monthDay: formData.monthDay }),
        };

        try {
            dispatch(showLoader());
            setSubmitBtn(true);
            await api.post("/tasks", payload);
            showToast("success", "Task created successfully!");
            setFormData({ taskType: "", scheduleDate: "", assignedTo: "", weekDay: "", monthDay: "", task: "" });
        } catch (err) {
            showToast("error", err?.response?.data?.message || "Something went wrong.");
        } finally {
            dispatch(hideLoader());
            setSubmitBtn(false);
        }
    };

    const selectedType = TASK_TYPES.find((t) => t.value === formData.taskType);

    return (
        <div className="min-h-screen" style={{ background: "#f4f6fb", fontFamily: "'Segoe UI', sans-serif" }}>


            {/* ── Toast ── */}
            {toast && (
                <div
                    className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 rounded-2xl shadow-xl text-white text-sm font-medium
            ${toast.type === "success" ? "bg-emerald-500" : "bg-red-500"}`}
                    style={{ minWidth: 260, animation: "slideIn 0.3s ease" }}
                >
                    <span className="text-lg">{toast.type === "success" ? "✓" : "✕"}</span>
                    {toast.message}
                </div>
            )}


            {/* ── Content ── */}
            <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-5">


                {/* ── Card 1: Task Type Pills ── */}
                <div className="card bg-white rounded-2xl shadow-sm p-6">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                        Task Type <span className="text-orange-400">*</span>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {TASK_TYPES.map((type) => (
                            <button
                                key={type.value}
                                onClick={() => handleChange("taskType", type.value)}
                                className={`type-card rounded-xl p-4 text-left cursor-pointer bg-gray-50 ${formData.taskType === type.value ? "selected" : ""}`}
                            >
                                <div className="text-2xl mb-2">{type.icon}</div>
                                <div className="text-sm font-bold text-gray-700">{type.label}</div>
                                <div className="text-xs text-gray-400 mt-0.5">{type.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Card 2: Schedule & Assignment ── */}
                <div className="card bg-white rounded-2xl shadow-sm p-6">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-5">Schedule & Assignment</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">

                        <InputWrapper label="Schedule Date" required>
                            <input
                                type="date"
                                value={formData.scheduleDate}
                                onChange={(e) => handleChange("scheduleDate", e.target.value)}
                                className={selectClass}
                            />
                        </InputWrapper>

                        <InputWrapper label="Assigned To" required>
                            <select
                                value={formData.assignedTo}
                                onChange={(e) => handleChange("assignedTo", e.target.value)}
                                className={selectClass}
                            >
                                <option value="">Select User</option>

                                {employees.map((emp, i) => (
                                    <option key={emp._id} value={emp._id}>{emp.name}</option>
                                ))}
                            </select>
                        </InputWrapper>

                        {formData.taskType === "weekly" && (
                            <InputWrapper label="Week Day" required>
                                <select
                                    value={formData.weekDay}
                                    onChange={(e) => handleChange("weekDay", e.target.value)}
                                    className={selectClass}
                                >
                                    <option value="">Select Day</option>
                                    {WEEK_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </InputWrapper>
                        )}

                        {formData.taskType === "monthly" && (
                            <InputWrapper label="Month Day" required>
                                <select
                                    value={formData.monthDay}
                                    onChange={(e) => handleChange("monthDay", e.target.value)}
                                    className={selectClass}
                                >
                                    <option value="">Select Date</option>
                                    {MONTH_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </InputWrapper>
                        )}

                    </div>
                </div>

                {/* ── Card 3: Task Description ── */}
                <div className="card bg-white rounded-2xl shadow-sm p-6">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-5">Task Description</p>

                    {/* Active type badge */}
                    {selectedType && (
                        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-600 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                            <span>{selectedType.icon}</span>
                            <span>{selectedType.label} Task</span>
                        </div>
                    )}

                    <textarea
                        rows={4}
                        value={formData.task}
                        onChange={(e) => handleChange("task", e.target.value)}
                        placeholder="Describe the task in detail…"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all resize-none"
                    />

                    <div className="flex items-center justify-between mt-4">
                        <p className="text-xs text-gray-400">{formData.task.length} characters</p>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setFormData({ taskType: "", scheduleDate: "", assignedTo: "", weekDay: "", monthDay: "", task: "" })}
                                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition"
                            >
                                Clear
                            </button>

                            <button
                                onClick={handleSubmit}
                                disabled={submitBtn}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                                style={{ background: "linear-gradient(135deg, #F26522, #e05510)" }}
                            >
                                {submitBtn ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                                            <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                        Submitting…
                                    </>
                                ) : (
                                    <>
                                        Create Task
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}