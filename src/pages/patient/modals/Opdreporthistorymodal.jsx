import { useEffect, useState } from "react";
import { FiFileText, FiEye } from "react-icons/fi";
import api from "../../../utils/api";
import { toast } from "react-toastify";
import { Modal, ModalHeader, ModalFooter } from "../Patientlist";
// NOTE: adjust this path to wherever Opdreportview.jsx actually lives relative to
// this file — same guess as before, I don't have your folder structure.
import OPDReportView from "../../opd/OPDReportView";

// patient: { patNumber, name, ... } — the patient whose OPD history to show
// onClose: closes the whole history flow (list + any drilled-into report)
//
// Fetches its own data — GET /opd/by-patient/:patNumber for the list (summary fields
// only), then GET /opd/get-single/:id for the full report when "View" is clicked,
// since the history list endpoint doesn't return full section data.
const OpdReportHistoryModal = ({ patient, onClose }) => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewingReport, setViewingReport] = useState(null);
    const [loadingReportId, setLoadingReportId] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const fetchHistory = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/opd/by-patient/${patient.patNumber}`);
                if (cancelled) return;
                if (res.data.success) setReports(res.data.reports || []);
                else toast.warning(res.data.message || "Failed to load OPD history");
            } catch (err) {
                if (!cancelled) toast.error(err.response?.data?.message || "Failed to load OPD history");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchHistory();
        return () => { cancelled = true; };
    }, [patient.patNumber]);

    const viewReport = async (summary) => {
        setLoadingReportId(summary._id);
        try {
            const res = await api.get(`/opd/get-single/${summary._id}`);
            if (res.data.success) setViewingReport(res.data.report);
            else toast.error(res.data.message || "OPD report not found");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to load OPD report");
        } finally {
            setLoadingReportId(null);
        }
    };

    return (
        <>
            <Modal onClose={onClose} maxWidth="max-w-2xl">
                <ModalHeader
                    title="OPD Report History"
                    subtitle={`${patient.name} · ${patient.patNumber}`}
                    onClose={onClose}
                    icon={<FiFileText size={15} className="text-green-500" />}
                />
                <div className="px-6 py-5">
                    {loading ? (
                        <div className="flex items-center justify-center gap-2 py-10 text-gray-400 text-sm">
                            <div className="w-4 h-4 border-2 border-orange-300 border-t-transparent rounded-full animate-spin" />
                            Loading history...
                        </div>
                    ) : reports.length === 0 ? (
                        <p className="text-center py-10 text-sm text-gray-400">No OPD reports for this patient yet.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-100">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">OPD #</th>
                                        <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                        <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wide">View</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reports.map((r) => (
                                        <tr key={r._id} className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/60 transition">
                                            <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                                                {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "-"}
                                            </td>
                                            <td className="px-4 py-2.5 font-semibold text-gray-700 whitespace-nowrap">{r.opdNumber}</td>
                                            <td className="px-4 py-2.5">
                                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide
                                                    ${r.status === "completed" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                                                    {r.status || "draft"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                                <button
                                                    onClick={() => viewReport(r)}
                                                    disabled={loadingReportId === r._id}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-orange-200 text-orange-600 bg-orange-50 hover:bg-orange-100 transition disabled:opacity-50"
                                                >
                                                    {loadingReportId === r._id
                                                        ? <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                                                        : <FiEye size={12} />}
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <ModalFooter>
                    <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                        Close
                    </button>
                </ModalFooter>
            </Modal>

            {viewingReport && (
                <Modal onClose={() => setViewingReport(null)} maxWidth="max-w-4xl">
                    <ModalHeader
                        title="OPD Report"
                        subtitle={viewingReport.patient?.name ? `${viewingReport.patient.name} · ${viewingReport.opdNumber}` : viewingReport.opdNumber}
                        onClose={() => setViewingReport(null)}
                        icon={<FiFileText size={15} className="text-orange-500" />}
                    />
                    <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
                        <OPDReportView report={viewingReport} embedded />
                    </div>
                </Modal>
            )}
        </>
    );
};

export default OpdReportHistoryModal;