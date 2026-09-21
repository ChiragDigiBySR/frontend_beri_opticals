import { useState } from "react";
import { FiCheckCircle } from "react-icons/fi";
import { Modal, ModalHeader, ModalFooter } from "../OPDList";
import api from "../../../utils/api";
import { toast } from "react-toastify";

export default function StatusUpdateModal({ report, onClose, onUpdated }) {
    const [loading, setLoading] = useState(false);

    const missingPatientDetails =
        !report?.patient?.name || !report?.patient?.mobile;

    const handleConfirm = async () => {
        if (missingPatientDetails) return;

        try {
            setLoading(true);

            const res = await api.put(`/opd/${report.opdNumber}`, {
                status: "completed",
            });

            if (res.data.success) {
                toast.success("Report marked as completed");

                onUpdated?.(res.data.report);
                onClose();
            } else {
                toast.error(
                    res.data.message || "Failed to update status"
                );
            }
        } catch (err) {
            toast.error(
                err.response?.data?.message ||
                    "Failed to update status"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal onClose={onClose} maxWidth="max-w-md">
            <ModalHeader
                title="Mark Report as Completed"
                subtitle={
                    report.patient?.name
                        ? `${report.patient.name} · ${report.opdNumber}`
                        : report.opdNumber
                }
                onClose={onClose}
                icon={
                    <FiCheckCircle
                        size={15}
                        className="text-green-500"
                    />
                }
            />

            <div className="px-6 py-5 sm:px-8 text-sm text-gray-600">
                {missingPatientDetails ? (
                    <p className="text-red-500">
                        Patient name and mobile number are required
                        before this report can be marked completed.
                    </p>
                ) : (
                    <p>
                        This will mark OPD report{" "}
                        <span className="font-semibold">
                            {report.opdNumber}
                        </span>{" "}
                        as{" "}
                        <span className="font-semibold text-green-600">
                            completed
                        </span>
                        . The patient will receive a WhatsApp
                        notification.
                        Continue?
                    </p>
                )}
            </div>

            <ModalFooter>
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                >
                    Cancel
                </button>

                <button
                    onClick={handleConfirm}
                    disabled={loading || missingPatientDetails}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl transition"
                >
                    <FiCheckCircle size={13} />

                    {loading
                        ? "Updating..."
                        : "Mark Completed"}
                </button>
            </ModalFooter>
        </Modal>
    );
}