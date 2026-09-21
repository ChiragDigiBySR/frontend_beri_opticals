import { useRef, useState } from "react";
import { FiUpload, FiDownload, FiEye, FiTrash2, FiFileText, FiPaperclip } from "react-icons/fi";
import api from "../../utils/api"; // adjust to match Patientlist.jsx's import path
import { toast } from "react-toastify";
import { Modal, ModalHeader, ModalFooter } from "./Patientlist"; // adjust path/filename if different

// ─────────────────────────────────────────────────────────────────────────────
// Prior Prescriptions modal (standalone, opened from Action column - Patient List)
// ─────────────────────────────────────────────────────────────────────────────
export default function PatientDocumentsModal({ patient, onClose, onChange }) {
    const [uploading, setUploading] = useState(false);
    const [deleteDoc, setDeleteDoc] = useState(null);
    const fileInputRef = useRef(null);

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== "application/pdf") {
            toast.warning("Only PDF files are allowed.");
            e.target.value = "";
            return;
        }
        try {
            setUploading(true);
            const formData = new FormData();
            formData.append("file", file);
            const res = await api.post(`/patients/${patient.patNumber}/documents`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            if (res.data.success) { toast.success("Document uploaded successfully"); onChange(res.data.documents); }
            else toast.error(res.data.message);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to upload document.");
        } finally { setUploading(false); e.target.value = ""; }
    };

    const handleDeleteConfirmed = async () => {
        try {
            const res = await api.delete(`/patients/${patient.patNumber}/documents/${deleteDoc._id}`);
            if (res.data.success) { toast.success("Document deleted successfully"); onChange(res.data.documents); }
            else toast.error(res.data.message);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to delete document.");
        } finally { setDeleteDoc(null); }
    };

    return (
        <Modal onClose={onClose} maxWidth="max-w-lg">
            <ModalHeader
                title="Prior Prescriptions"
                subtitle={`${patient?.patNumber} · ${patient?.name}`}
                onClose={onClose}
                icon={<FiPaperclip size={15} className="text-orange-500" />}
            />
            <div className="px-6 py-5 space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">PDF files only</p>
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                        className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition disabled:opacity-60">
                        {uploading
                            ? <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                            : <FiUpload size={12} />}
                        {uploading ? "Uploading..." : "Upload PDF"}
                    </button>
                    <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
                </div>

                {(!patient?.documents || patient.documents.length === 0) ? (
                    <p className="text-xs text-gray-400 text-center py-6">No prior prescriptions uploaded yet.</p>
                ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {patient.documents.slice().reverse().map((doc) => (
                            <div key={doc._id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                                        <FiFileText size={14} className="text-red-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-gray-700 truncate max-w-[220px]">{doc.originalName}</p>
                                        <p className="text-[10px] text-gray-400">{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString("en-GB") : "-"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition" title="Preview"><FiEye size={13} /></a>
                                    <a href={doc.fileUrl} download={doc.originalName} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition" title="Download"><FiDownload size={13} /></a>
                                    <button onClick={() => setDeleteDoc(doc)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 transition" title="Delete"><FiTrash2 size={13} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <ModalFooter>
                <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">Close</button>
            </ModalFooter>

            {deleteDoc && <DeleteDocumentConfirm doc={deleteDoc} onCancel={() => setDeleteDoc(null)} onConfirm={handleDeleteConfirmed} />}
        </Modal>
    );
}

function DeleteDocumentConfirm({ doc, onCancel, onConfirm }) {
    const [text, setText] = useState("");
    return (
        <Modal onClose={onCancel} maxWidth="max-w-sm">
            <ModalHeader title="Delete Document" subtitle={doc.originalName} onClose={onCancel} />
            <div className="px-6 py-5">
                <p className="text-xs text-gray-500 mb-3">
                    This can't be undone. Type <span className="font-bold text-red-500">DELETE</span> to confirm.
                </p>
                <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type DELETE"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100" />
            </div>
            <ModalFooter>
                <button onClick={onCancel} className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
                <button onClick={onConfirm} disabled={text !== "DELETE"}
                    className="px-4 py-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed">
                    Delete
                </button>
            </ModalFooter>
        </Modal>
    );
}