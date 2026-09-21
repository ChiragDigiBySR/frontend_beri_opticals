import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { toast } from "react-toastify";
import {
    FiMessageCircle, FiArrowLeft, FiSave, FiKey,
    FiPhone, FiHash, FiLink, FiCheckCircle,
} from "react-icons/fi";

const inp = "w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all placeholder-gray-300";
const lbl = "text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5";
const iconCls = "absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-orange-400 transition-colors pointer-events-none";

const TYPE_OPTIONS = ["utility", "promotion"];
const PROVIDER_OPTIONS = ["meta", "non_meta"];

const TYPE_INFO = {
    utility: { label: "Utility", desc: "OTP, order updates, alerts", color: "blue", emoji: "🔔" },
    promotion: { label: "Promotion", desc: "Offers, campaigns, newsletters", color: "rose", emoji: "📣" },
};

const PROVIDER_INFO = {
    meta: { label: "Meta (Official)", desc: "WhatsApp Business API", emoji: "📘" },
    non_meta: { label: "Non - Meta", desc: "Custom non-meta provider", emoji: "🔗" },
};

export default function WhatsappSettings() {
    const { storeId } = useParams();
    const navigate = useNavigate();

    const [type, setType] = useState("utility");
    const [provider, setProvider] = useState("meta");
    const [submitting, setSubmitting] = useState(false);
    const [connected, setConnected] = useState(false);

    const [metaForm, setMetaForm] = useState({
        accessToken: "",
        phoneNumberId: "",
    });

    const [digiForm, setDigiForm] = useState({
        apiKey: "",
        unique: "",
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (provider === "meta") {
            if (!metaForm.accessToken) return toast.error("Access Token is required");
            if (!metaForm.phoneNumberId) return toast.error("Phone Number ID is required");
        }
        if (provider === "non_meta") {
            if (!digiForm.apiKey) return toast.error("API Key is required");
            if (!digiForm.unique) return toast.error("Unique ID is required");
        }

        try {
            setSubmitting(true);
            let response;
            if (provider === "meta") {
                response = await api.post(`/store/${storeId}/whatsapp/meta`, { type, ...metaForm });
            } else {
                response = await api.post(`/store/${storeId}/whatsapp/non_meta`, { type, ...digiForm });
            }
            if(response.data.success){
                setConnected(true);
                toast.success("WhatsApp connected successfully");
                navigate("/stores")
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Connection failed");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f7f8fa] p-2 md:p-2">
            <form onSubmit={handleSubmit} className="w-full mx-auto space-y-4">

                <div className="flex flex-col md:flex-row gap-2">
                    {/* ── Message Type ── */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50 bg-gradient-to-r from-gray-50/80 to-white">
                            <div className="w-7 h-7 rounded-lg border bg-blue-50 border-blue-100 text-blue-500 flex items-center justify-center shrink-0">
                                <FiMessageCircle size={13} />
                            </div>
                            <span className="text-sm font-bold text-gray-700">Message Type</span>
                        </div>
                        <div className="p-5">
                            <div className="grid grid-cols-2 gap-3">
                                {TYPE_OPTIONS.map(t => {
                                    const info = TYPE_INFO[t];
                                    const active = type === t;
                                    const gradients = {
                                        blue: ["#3b82f6", "#6366f1"],
                                        rose: ["#f43f5e", "#ec4899"],
                                    };
                                    const g = gradients[info.color];
                                    return (
                                        <button key={t} type="button" onClick={() => setType(t)}
                                            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer
                      ${active ? "border-transparent shadow-lg" : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-md"}`}
                                            style={active ? { background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` } : {}}
                                        >
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 text-base
                      ${active ? "bg-white/20" : "bg-gray-100"}`}>
                                                {info.emoji}
                                            </div>
                                            <p className={`text-sm font-black leading-none ${active ? "text-white" : "text-gray-800"}`}>
                                                {info.label}
                                            </p>
                                            <p className={`text-[10px] mt-1 font-medium ${active ? "text-white/70" : "text-gray-400"}`}>
                                                {info.desc}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ── Provider ── */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50 bg-gradient-to-r from-gray-50/80 to-white">
                            <div className="w-7 h-7 rounded-lg border bg-orange-50 border-orange-100 text-orange-500 flex items-center justify-center shrink-0">
                                <FiLink size={13} />
                            </div>
                            <span className="text-sm font-bold text-gray-700">Provider</span>
                        </div>
                        <div className="p-5">
                            <div className="grid grid-cols-2 gap-3">
                                {PROVIDER_OPTIONS.map(p => {
                                    const info = PROVIDER_INFO[p];
                                    const active = provider === p;
                                    return (
                                        <button key={p} type="button" onClick={() => setProvider(p)}
                                            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer
                      ${active
                                                    ? "border-orange-400 bg-orange-50 shadow-sm"
                                                    : "border-gray-100 bg-white hover:border-gray-200"}`}
                                        >
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 text-base
                      ${active ? "bg-orange-100" : "bg-gray-100"}`}>
                                                {info?.emoji}
                                            </div>
                                            <p className={`text-sm font-black leading-none ${active ? "text-orange-700" : "text-gray-800"}`}>
                                                {info?.label}
                                            </p>
                                            <p className={`text-[10px] mt-1 font-medium ${active ? "text-orange-500" : "text-gray-400"}`}>
                                                {info?.desc}
                                            </p>
                                            {active && (
                                                <div className="mt-2.5 flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                                    <span className="text-[10px] font-black text-orange-600">Selected</span>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Credentials ── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 bg-gradient-to-r from-gray-50/80 to-white">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg border bg-emerald-50 border-emerald-100 text-emerald-500 flex items-center justify-center shrink-0">
                                <FiKey size={13} />
                            </div>
                            <span className="text-sm font-bold text-gray-700">
                                {provider === "meta" ? "Meta API Credentials" : "Non - Meta API Credentials"}
                            </span>
                        </div>
                        <span className="text-[10px] font-black text-white px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500">
                            {provider.toUpperCase()}
                        </span>
                    </div>

                    <div className="p-5 space-y-4">

                        {/* META fields */}
                        {provider === "meta" && (
                            <>
                                <div>
                                    <label className={lbl}>Access Token *</label>
                                    <div className="relative group">
                                        <FiKey size={13} className={iconCls} />
                                        <input
                                            type="password"
                                            value={metaForm.accessToken}
                                            onChange={e => setMetaForm({ ...metaForm, accessToken: e.target.value })}
                                            placeholder="EAAxxxxxxxxxxxxxxxx…"
                                            className={`${inp} pl-9 font-mono text-xs`}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium mt-1">
                                        Found in Meta Business Suite → WhatsApp → API Setup
                                    </p>
                                </div>
                                <div>
                                    <label className={lbl}>Phone Number ID *</label>
                                    <div className="relative group">
                                        <FiPhone size={13} className={iconCls} />
                                        <input
                                            value={metaForm.phoneNumberId}
                                            onChange={e => setMetaForm({ ...metaForm, phoneNumberId: e.target.value })}
                                            placeholder="1234567890123456"
                                            className={`${inp} pl-9 font-mono text-xs`}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium mt-1">
                                        Numeric ID of your registered WhatsApp phone number
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Non-meta fields */}
                        {provider === "non_meta" && (
                            <>
                                <div>
                                    <label className={lbl}>API Key *</label>
                                    <div className="relative group">
                                        <FiKey size={13} className={iconCls} />
                                        <input
                                            type="password"
                                            value={digiForm.apiKey}
                                            onChange={e => setDigiForm({ ...digiForm, apiKey: e.target.value })}
                                            placeholder="Your Non - meta API key"
                                            className={`${inp} pl-9 font-mono text-xs`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={lbl}>Unique ID *</label>
                                    <div className="relative group">
                                        <FiHash size={13} className={iconCls} />
                                        <input
                                            value={digiForm.unique}
                                            onChange={e => setDigiForm({ ...digiForm, unique: e.target.value })}
                                            placeholder="Unique identifier"
                                            className={`${inp} pl-9`}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Info strip */}
                        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-3">
                            <span className="text-base shrink-0 mt-0.5">⚠️</span>
                            <p className="text-xs font-semibold text-amber-700 leading-relaxed">
                                Credentials are stored securely. Submitting new credentials will replace existing ones for the selected <strong>{TYPE_INFO[type].label}</strong> message type.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Success state ── */}
                {connected && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                            <FiCheckCircle size={18} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-emerald-800">Connected successfully!</p>
                            <p className="text-xs text-emerald-600 font-medium mt-0.5">
                                {PROVIDER_INFO[provider].label} is now active for <strong>{TYPE_INFO[type].label}</strong> messages.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Bottom Submit ── */}
                <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
                    <button type="button" onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition cursor-pointer">
                        <FiArrowLeft size={14} /> Go Back
                    </button>
                    <button type="submit" disabled={submitting}
                        className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-95 disabled:opacity-60 text-white text-sm font-bold px-8 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-200 cursor-pointer">
                        <FiSave size={14} />
                        {submitting ? "Connecting…" : "Connect WhatsApp"}
                    </button>
                </div>

            </form>
        </div>
    );
}