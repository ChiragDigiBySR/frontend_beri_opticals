import { useMemo, useState } from "react";
import { FiX, FiCheck } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import api from "../../../utils/api";
import { toast } from "react-toastify";

const hasText = (v) => typeof v === "string" && v.trim().length > 0;

// Only the two patient-facing prescription records are offered — the intermediate
// refraction tables (retinoscopy, subjective, etc.) are working notes, never meant
// to go out to a patient.
const PRESCRIPTION_OPTIONS = [
    {
        id: "finalPrescription",
        label: "Final Prescription",
        description: "From the Refraction section",
        getRx: (report) => report.refraction?.finalPrescription,
    },
    {
        id: "prescribedGlasses",
        label: "Prescribed Glasses",
        description: "Glasses dispensed to the patient",
        getRx: (report) => report.prescribedGlasses,
    },
];

const rxHasData = (rx) => {
    if (!rx) return false;
    const fields = [rx.od?.sph, rx.od?.cyl, rx.od?.axis, rx.od?.vision, rx.os?.sph, rx.os?.cyl, rx.os?.axis, rx.os?.vision, rx.add];
    return fields.some(hasText);
};

const RxRow = ({ label, eye }) => {
    if (!eye) return null;
    const parts = [
        hasText(eye.sph) && `SPH ${eye.sph}`,
        hasText(eye.cyl) && `CYL ${eye.cyl}`,
        hasText(eye.axis) && `AXIS ${eye.axis}`,
        hasText(eye.vision) && `VISION ${eye.vision}`,
    ].filter(Boolean);
    if (parts.length === 0) return null;
    return (
        <div className="flex gap-2 text-xs py-1">
            <span className="font-semibold text-gray-500 w-8 shrink-0">{label}</span>
            <span className="text-gray-700">{parts.join(" · ")}</span>
        </div>
    );
};

const SendPrescriptionModal = ({ report, onClose }) => {
    const availableOptions = useMemo(
        () => PRESCRIPTION_OPTIONS.filter((opt) => rxHasData(opt.getRx(report))),
        [report]
    );

    const [selectedId, setSelectedId] = useState(
        availableOptions.find((o) => o.id === "finalPrescription")?.id || availableOptions[0]?.id || null
    );
    const [sending, setSending] = useState(false);

    const selectedOption = availableOptions.find((o) => o.id === selectedId);
    const selectedRx = selectedOption?.getRx(report);
    const patient = report.patient || {};
    const hasMobile = hasText(patient.mobile);

    const handleSend = async () => {
        if (!selectedId) return;
        if (!hasMobile) { toast.warning("Patient has no mobile number on file."); return; }

        try {
            setSending(true);
            const res = await api.post(`/opd/${report.opdNumber}/send-prescription`, {
                type: selectedId,
            });
            if (res.data.success) {
                toast.success(`${selectedOption.label} sent on WhatsApp`);
                onClose();
            } else {
                toast.warning(res.data.message || "Failed to send");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to send prescription");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
                            <FaWhatsapp size={16} className="text-green-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-800">Send Prescription</h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {patient.name || report.opdNumber} · {hasMobile ? `${patient.countryCode || ""} ${patient.mobile}` : "No mobile on file"}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition">
                        <FiX size={15} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5">
                    {availableOptions.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">
                            No Final Prescription or Prescribed Glasses recorded yet for this patient.
                        </p>
                    ) : (
                        <>
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Which prescription?</p>
                            <div className="space-y-2 mb-5">
                                {availableOptions.map((opt) => {
                                    const isSelected = selectedId === opt.id;
                                    const rx = opt.getRx(report);
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setSelectedId(opt.id)}
                                            className={`w-full text-left px-4 py-3 rounded-xl border transition
                                                ${isSelected ? "border-orange-300 bg-orange-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs font-bold text-gray-800">{opt.label}</span>
                                                <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0
                                                    ${isSelected ? "bg-orange-500 border-orange-500" : "border-gray-300"}`}>
                                                    {isSelected && <FiCheck size={10} className="text-white" />}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 mb-1.5">{opt.description}</p>
                                            <RxRow label="OD" eye={rx?.od} />
                                            <RxRow label="OS" eye={rx?.os} />
                                            {hasText(rx?.add) && (
                                                <div className="flex gap-2 text-xs py-1">
                                                    <span className="font-semibold text-gray-500 w-8 shrink-0">ADD</span>
                                                    <span className="text-gray-700">{rx.add}</span>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {!hasMobile && (
                        <p className="text-[11px] text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                            This patient has no mobile number on file — add one before sending.
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                        Cancel
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!selectedId || !hasMobile || sending}
                        className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sending
                            ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <FaWhatsapp size={13} />}
                        {sending ? "Sending..." : "Send on WhatsApp"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SendPrescriptionModal;