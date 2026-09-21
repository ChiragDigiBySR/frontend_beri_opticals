// import { useState, useRef, useEffect } from "react";
// import api from "../../utils/api";
// import { toast } from "react-toastify";
// import { useDispatch } from "react-redux";
// import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
// import { FiRefreshCw, FiZap, FiCheckCircle, FiAlertCircle, FiClock, FiSmartphone } from "react-icons/fi";

// const labelCls = "text-[10px] font-bold text-gray-600 uppercase tracking-widest";

// const WhatsAppLink = () => {
//     const dispatch = useDispatch();

//     const [status, setStatus] = useState("idle"); // idle | loading | qr_ready | relinking | connected | expired | error
//     const [qrUrl, setQrUrl] = useState(null);
//     const [token, setToken] = useState(null);
//     const [phone, setPhone] = useState(null);
//     const [errorMsg, setErrorMsg] = useState("");
//     const [countdown, setCountdown] = useState(60);
//     const [waType, setWaType] = useState("utility"); // utility | promotion

//     const pollingRef = useRef(null);
//     const timeoutRef = useRef(null);
//     const countdownRef = useRef(null);

//     // clear all timers
//     const clearAllTimers = () => {
//         clearInterval(pollingRef.current);
//         clearTimeout(timeoutRef.current);
//         clearInterval(countdownRef.current);
//         pollingRef.current = null;
//         timeoutRef.current = null;
//         countdownRef.current = null;
//     };

//     // cleanup on unmount
//     useEffect(() => () => clearAllTimers(), []);

//     // start countdown + polling after QR is shown
//     const startTimers = (tok, isRelink = false) => {
//         clearAllTimers();
//         setCountdown(60);

//         // tick countdown every second
//         countdownRef.current = setInterval(() => {
//             setCountdown((c) => (c <= 1 ? 0 : c - 1));
//         }, 1000);

//         // check connection station in every 10 seconds
//         pollingRef.current = setInterval(async () => {
//             try {
//                 if (isRelink) {
//                     const res = await api.get(`/whatsapp/relink?type=${waType}`);
//                     if (res.data.connected && res.data.already_connected) {
//                         clearAllTimers();
//                         setPhone(res.data.phone);
//                         setStatus("connected");
//                         setQrUrl(null);
//                         toast.success("WhatsApp account relinked successfully!");
//                     }
//                 } else {
//                     const res = await api.get(`/whatsapp/status?token=${tok}&type=${waType}`);
//                     if (res.data.connected) {
//                         clearAllTimers();
//                         setPhone(res.data.phone);
//                         setStatus("connected");
//                         setQrUrl(null);
//                         toast.success("WhatsApp device connected successfully!");
//                     }
//                 }
//             } catch (e) {
//                 console.log("Relink whatsapp error => ", e)
//             }
//         }, 10000);

//         // expire after 60 seconds
//         timeoutRef.current = setTimeout(() => {
//             clearAllTimers();
//             setStatus("expired");
//             setQrUrl(null);
//         }, 60000);
//     };

//     // Generate QR to link whatsapp - first time
//     const handleGenerateQR = async () => {
//         setStatus("loading");
//         setErrorMsg("");
//         setQrUrl(null);
//         dispatch(showLoader());
//         try {
//             const res = await api.get(`/whatsapp/qr?type=${waType}`);


//             if (res.data.message == "WhatsApp already connected") {
//                 setStatus("success");
//                 toast.info(res.data.message || "Already connected");
//             }
//             else if (res.data.success) {
//                 setQrUrl(res.data.qrimagelink);
//                 setToken(res.data.token);
//                 setStatus("qr_ready");
//                 startTimers(res.data.token, false);
//                 toast.info("QR code generated. Please scan within 60 seconds.");
//             } else {
//                 setStatus("error");
//                 setErrorMsg(res.data.message || "Could not generate QR code.");
//                 toast.error(res.data.message || "Could not generate QR code.");
//             }
//         } catch (err) {
//             setStatus("error");
//             setErrorMsg(err.response?.data?.message || "Something went wrong.");
//             toast.error(err.response?.data?.message || "Something went wrong.");
//         } finally {
//             dispatch(hideLoader());
//         }
//     };

//     const handleCheckStatus = async () => {
//         if (!token) return;
//         dispatch(showLoader());
//         try {
//             const res = await api.get(`/whatsapp/status?token=${token}&type=${waType}`);
//             if (res.data.connected) {
//                 clearAllTimers();
//                 setPhone(res.data.phone);
//                 setStatus("connected");
//                 setQrUrl(null);
//                 toast.success("WhatsApp device connected!");
//             } else {
//                 toast.warn("Not connected yet. Please scan the QR code.");
//             }
//         } catch (err) {
//             toast.error(err.response?.data?.message || "Could not check status.");
//         } finally {
//             dispatch(hideLoader());
//         }
//     };

//     const handleRelink = async () => {
//         setStatus("loading");
//         setErrorMsg("");
//         setQrUrl(null);
//         dispatch(showLoader());
//         try {
//             const res = await api.get(`/whatsapp/relink?type=${waType}`);
//             if (!res.data.success) {
//                 setStatus("error");
//                 setErrorMsg(res.data.message || "Could not relink account.");
//                 toast.error(res.data.message || "Could not relink account.");
//                 return;
//             }
//             if (res.data.connected && res.data.already_connected) {
//                 setPhone(res.data.phone);
//                 setStatus("connected");
//                 toast.success("WhatsApp account is already connected!");
//             } else if (res.data.qrimagelink) {
//                 setQrUrl(res.data.qrimagelink);
//                 setStatus("relinking");
//                 startTimers(null, true);
//                 toast.info("Please scan the QR to relink your account.");
//             } else {
//                 setStatus("error");
//                 setErrorMsg("Could not get relink QR code.");
//                 toast.error("Could not get relink QR code.");
//             }
//         } catch (err) {
//             setStatus("error");
//             setErrorMsg(err.response?.data?.message || "Something went wrong.");
//             toast.error(err.response?.data?.message || "Something went wrong.");
//         } finally {
//             dispatch(hideLoader());
//         }
//     };

//     const isLoading  = status === "loading";
//     const hasQR      = status === "qr_ready" || status === "relinking";
//     const isExpired  = status === "expired";
//     const isError    = status === "error";
//     const isConnected = status === "connected";

//     // countdown ring math
//     const radius = 18;
//     const circ   = 2 * Math.PI * radius;
//     const dash   = (countdown / 60) * circ;

//     return (
//         <div className="min-h-screen bg-gray-50 p-6">

//             {/* Page header */}
//             <div className="mb-6">
//                 <div className="flex items-center gap-2 mb-1">
//                     <div className="w-0.5 h-4 bg-orange-400 rounded-full" />
//                     <span className={labelCls}>WhatsApp Setup</span>
//                 </div>
//                 <p className="text-xs text-gray-400 ml-3.5">Link your WhatsApp account to send messages</p>
//             </div>

//             <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

//                 {/* ── Left: Config + Actions ─────────────────────── */}
//                 <div className="lg:col-span-1 flex flex-col gap-4">

//                     {/* Account type selector */}
//                     <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
//                         <div className="flex items-center gap-2 mb-4">
//                             <div className="w-0.5 h-4 bg-orange-400 rounded-full" />
//                             <span className={labelCls}>Account Type</span>
//                         </div>
//                         <div className="flex gap-2">
//                             <button
//                                 onClick={() => setWaType("utility")}
//                                 disabled={isLoading || hasQR}
//                                 className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition border ${waType === "utility" ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-500"} disabled:opacity-50 disabled:cursor-not-allowed`}
//                             >
//                                 Utility
//                             </button>
//                             <button
//                                 onClick={() => setWaType("promotion")}
//                                 disabled={isLoading || hasQR}
//                                 className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition border ${waType === "promotion" ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-500"} disabled:opacity-50 disabled:cursor-not-allowed`}
//                             >
//                                 Promotion
//                             </button>
//                         </div>
//                     </div>

//                     {/* Action buttons */}
//                     <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
//                         <div className="flex items-center gap-2 mb-4">
//                             <div className="w-0.5 h-4 bg-orange-400 rounded-full" />
//                             <span className={labelCls}>Actions</span>
//                         </div>
//                         <div className="flex flex-col gap-2.5">

//                             {/* Link new */}
//                             {!isConnected && (
//                                 <button
//                                     onClick={handleGenerateQR}
//                                     disabled={isLoading}
//                                     className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
//                                 >
//                                     {isLoading ? (
//                                         <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
//                                     ) : (
//                                         <><FiZap size={13} /> {isExpired || isError ? "Regenerate QR" : "Link New Account"}</>
//                                     )}
//                                 </button>
//                             )}

//                             {/* Check status — only when QR is visible */}
//                             {hasQR && (
//                                 <button
//                                     onClick={handleCheckStatus}
//                                     className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white hover:bg-orange-50 text-orange-500 text-xs font-semibold rounded-xl transition border border-orange-200"
//                                 >
//                                     <FiRefreshCw size={13} /> Check Status
//                                 </button>
//                             )}

//                             {/* Relink */}
//                             <button
//                                 onClick={handleRelink}
//                                 disabled={isLoading}
//                                 className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white hover:bg-gray-50 text-gray-500 text-xs font-semibold rounded-xl transition border border-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
//                             >
//                                 <FiRefreshCw size={13} /> Relink Account
//                             </button>
//                         </div>
//                     </div>

//                     {/* How to connect guide */}
//                     {(status === "idle" || isExpired) && (
//                         <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
//                             <div className="flex items-center gap-2 mb-4">
//                                 <div className="w-0.5 h-4 bg-orange-400 rounded-full" />
//                                 <span className={labelCls}>How to Connect</span>
//                             </div>
//                             <ol className="flex flex-col gap-2.5">
//                                 {["Open WhatsApp on your phone", "Tap ⋮ Menu → Linked Devices", "Tap Link a Device", "Scan the QR code"].map((step, i) => (
//                                     <li key={i} className="flex items-start gap-2.5">
//                                         <span className="flex-shrink-0 w-5 h-5 bg-orange-50 border border-orange-200 rounded-full flex items-center justify-center text-[10px] font-bold text-orange-500">{i + 1}</span>
//                                         <span className="text-xs text-gray-500 leading-5">{step}</span>
//                                     </li>
//                                 ))}
//                             </ol>
//                         </div>
//                     )}
//                 </div>

//                 {/* ── Right: QR / Status Display ────────────────── */}
//                 <div className="lg:col-span-2">
//                     <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full min-h-[320px] flex flex-col">

//                         <div className="flex items-center gap-2 mb-5">
//                             <div className="w-0.5 h-4 bg-orange-400 rounded-full" />
//                             <span className={labelCls}>
//                                 {status === "relinking" ? "Relink QR Code" : "QR Code"}
//                             </span>
//                             {/* live status pill */}
//                             <span className={`ml-auto text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
//                                 isConnected ? "bg-green-50 text-green-600 border-green-200" :
//                                 hasQR       ? "bg-orange-50 text-orange-500 border-orange-200" :
//                                 isError     ? "bg-red-50 text-red-500 border-red-200" :
//                                 isExpired   ? "bg-yellow-50 text-yellow-600 border-yellow-200" :
//                                 "bg-gray-50 text-gray-400 border-gray-200"
//                             }`}>
//                                 {isConnected ? "Connected" : hasQR ? "Scan Now" : isError ? "Error" : isExpired ? "Expired" : "Idle"}
//                             </span>
//                         </div>

//                         <div className="flex-1 flex items-center justify-center">

//                             {/* Idle */}
//                             {status === "idle" && (
//                                 <div className="text-center">
//                                     <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
//                                         <FiSmartphone size={32} className="text-gray-300" />
//                                     </div>
//                                     <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed">Generate a QR code to link your WhatsApp Business account.</p>
//                                 </div>
//                             )}

//                             {/* Loading spinner */}
//                             {isLoading && (
//                                 <div className="text-center">
//                                     <div className="w-12 h-12 border-2 border-orange-100 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
//                                     <p className="text-xs text-gray-400">Generating secure link…</p>
//                                 </div>
//                             )}

//                             {/* QR Code with countdown ring */}
//                             {hasQR && qrUrl && (
//                                 <div className="text-center">
//                                     {/* QR frame */}
//                                     <div className="inline-block p-3 bg-white border-2 border-orange-100 rounded-2xl shadow-sm relative mb-4">
//                                         {/* corner accents */}
//                                         <div className="absolute top-[-2px] left-[-2px] w-5 h-5 border-t-2 border-l-2 border-orange-400 rounded-tl-xl" />
//                                         <div className="absolute top-[-2px] right-[-2px] w-5 h-5 border-t-2 border-r-2 border-orange-400 rounded-tr-xl" />
//                                         <div className="absolute bottom-[-2px] left-[-2px] w-5 h-5 border-b-2 border-l-2 border-orange-400 rounded-bl-xl" />
//                                         <div className="absolute bottom-[-2px] right-[-2px] w-5 h-5 border-b-2 border-r-2 border-orange-400 rounded-br-xl" />
//                                         <img src={qrUrl} alt="WhatsApp QR Code" className="w-48 h-48 block rounded-lg" />
//                                     </div>

//                                     {/* countdown ring */}
//                                     <div className="flex items-center justify-center gap-3 mb-2">
//                                         <div className="relative w-10 h-10">
//                                             <svg width="40" height="40" className="absolute inset-0 -rotate-90">
//                                                 <circle cx="20" cy="20" r={radius} fill="none" stroke="#fff7ed" strokeWidth="3" />
//                                                 <circle cx="20" cy="20" r={radius} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round"
//                                                     strokeDasharray={`${dash} ${circ}`} style={{ transition: "stroke-dasharray 1s linear" }} />
//                                             </svg>
//                                             <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-orange-500">{countdown}s</span>
//                                         </div>
//                                         <p className="text-xs text-gray-400">QR expires in {countdown} seconds</p>
//                                     </div>
//                                     <p className="text-[11px] text-gray-400">Open WhatsApp → Linked Devices → Link a Device</p>
//                                 </div>
//                             )}

//                             {/* Connected */}
//                             {isConnected && (
//                                 <div className="text-center">
//                                     <div className="w-16 h-16 bg-green-50 border border-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
//                                         <FiCheckCircle size={30} className="text-green-500" />
//                                     </div>
//                                     <p className="text-sm font-semibold text-gray-700 mb-1">Device Connected!</p>
//                                     {phone && <p className="text-xs text-green-600 font-medium">+{phone}</p>}
//                                     <p className="text-[11px] text-gray-400 mt-2">Your WhatsApp {waType} account is active</p>
//                                 </div>
//                             )}

//                             {/* Expired */}
//                             {isExpired && (
//                                 <div className="text-center">
//                                     <div className="w-16 h-16 bg-yellow-50 border border-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
//                                         <FiClock size={28} className="text-yellow-500" />
//                                     </div>
//                                     <p className="text-sm font-semibold text-gray-600 mb-1">QR Code Expired</p>
//                                     <p className="text-xs text-gray-400">Please generate a new QR code to continue.</p>
//                                 </div>
//                             )}

//                             {/* Error */}
//                             {isError && (
//                                 <div className="text-center">
//                                     <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
//                                         <FiAlertCircle size={28} className="text-red-400" />
//                                     </div>
//                                     <p className="text-sm font-semibold text-gray-600 mb-1">Something went wrong</p>
//                                     <p className="text-xs text-red-400 max-w-[240px] leading-relaxed">{errorMsg}</p>
//                                 </div>
//                             )}

//                         </div>
//                     </div>
//                 </div>

//             </div>
//         </div>
//     );
// };

// export default WhatsAppLink;














import { useState, useRef, useEffect } from "react";
import api from "../../utils/api";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import { FiRefreshCw, FiZap, FiCheckCircle, FiAlertCircle, FiClock, FiSmartphone } from "react-icons/fi";
// import QRCode from "react-qr-code";
import QRCode from "qrcode";

const labelCls = "text-[10px] font-bold text-gray-600 uppercase tracking-widest";

const WhatsAppLink = () => {
    const dispatch = useDispatch();

    const [status, setStatus] = useState("idle"); // idle | loading | qr_ready | relinking | connected | expired | error
    const [qrUrl, setQrUrl] = useState(null);

    // In state:
    const [qrString, setQrString] = useState(null);
    const canvasRef = useRef(null);

    const [token, setToken] = useState(null);
    const [phone, setPhone] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    const [countdown, setCountdown] = useState(60);
    const [waType, setWaType] = useState("utility"); // utility | promotion

    const pollingRef = useRef(null);
    const timeoutRef = useRef(null);
    const countdownRef = useRef(null);


    // draw QR whenever qrString changes
    useEffect(() => {
        if (!qrString || !canvasRef.current) return;
        QRCode.toCanvas(canvasRef.current, qrString, { width: 192, margin: 1 }, (err) => {
            if (err) console.error("QR render error:", err);
        });
    }, [qrString]);

    // clear all timers
    const clearAllTimers = () => {
        clearInterval(pollingRef.current);
        clearTimeout(timeoutRef.current);
        clearInterval(countdownRef.current);
        pollingRef.current = null;
        timeoutRef.current = null;
        countdownRef.current = null;
    };

    // cleanup on unmount
    useEffect(() => () => clearAllTimers(), []);

    // start countdown + polling after QR is shown
    const startTimers = (tok, isRelink = false) => {
        clearAllTimers();
        setCountdown(60);

        // tick countdown every second
        countdownRef.current = setInterval(() => {
            setCountdown((c) => (c <= 1 ? 0 : c - 1));
        }, 1000);

        // check connection station in every 10 seconds
        pollingRef.current = setInterval(async () => {
            try {
                if (isRelink) {
                    const res = await api.get(`/whatsapp/relink?type=${waType}`);
                    if (res.data.connected && res.data.already_connected) {
                        clearAllTimers();
                        setPhone(res.data.phone);
                        setStatus("connected");
                        setQrUrl(null);
                        toast.success("WhatsApp account relinked successfully!");
                    }
                } else {
                    const res = await api.get(`/whatsapp/status?token=${tok}&type=${waType}`);
                    if (res.data.connected) {
                        clearAllTimers();
                        setPhone(res.data.phone);
                        setStatus("connected");
                        setQrUrl(null);
                        toast.success("WhatsApp device connected successfully!");
                    }
                }
            } catch (e) {
                console.log("Relink whatsapp error => ", e)
            }
        }, 10000);

        // expire after 60 seconds
        timeoutRef.current = setTimeout(() => {
            clearAllTimers();
            setStatus("expired");
            setQrUrl(null);
        }, 60000);
    };

    // Generate QR to link whatsapp - first time
    const handleGenerateQR = async () => {
        setStatus("loading");
        setErrorMsg("");
        setQrUrl(null);
        dispatch(showLoader());
        try {
            const res = await api.get(`/whatsapp/qr?type=${waType}`);
            console.log("res => ", res);
            if (res.data.success) {
                // setQrUrl(res.data.qrimagelink);
                setQrString(res.data.qrstring);
                setToken(res.data.token);
                setStatus("qr_ready");
                startTimers(res.data.token, false);
                toast.info("QR code generated. Please scan within 60 seconds.");
            } else {
                setStatus("error");
                setErrorMsg(res.data.message || "Could not generate QR code.");
                toast.error(res.data.message || "Could not generate QR code.");
            }
        } catch (err) {
            setStatus("error");
            setErrorMsg(err.response?.data?.message || "Something went wrong.");
            toast.error(err.response?.data?.message || "Something went wrong.");
        } finally {
            dispatch(hideLoader());
        }
    };

    const handleCheckStatus = async () => {
        if (!token) return;
        dispatch(showLoader());
        try {
            const res = await api.get(`/whatsapp/status?token=${token}&type=${waType}`);
            if (res.data.connected) {
                clearAllTimers();
                setPhone(res.data.phone);
                setStatus("connected");
                setQrUrl(null);
                toast.success("WhatsApp device connected!");
            } else {
                toast.warn("Not connected yet. Please scan the QR code.");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not check status.");
        } finally {
            dispatch(hideLoader());
        }
    };

    const handleRelink = async () => {
        setStatus("loading");
        setErrorMsg("");
        setQrUrl(null);
        dispatch(showLoader());
        try {
            const res = await api.get(`/whatsapp/relink?type=${waType}`);
            if (!res.data.success) {
                setStatus("error");
                setErrorMsg(res.data.message || "Could not relink account.");
                toast.error(res.data.message || "Could not relink account.");
                return;
            }
            if (res.data.connected && res.data.already_connected) {
                setPhone(res.data.phone);
                setStatus("connected");
                toast.success("WhatsApp account is already connected!");
            } else if (res.data.qrimagelink) {
                // setQrUrl(res.data.qrimagelink);
                setQrString(res.data.qrstring);
                setStatus("relinking");
                startTimers(null, true);
                toast.info("Please scan the QR to relink your account.");
            } else {
                setStatus("error");
                setErrorMsg("Could not get relink QR code.");
                toast.error("Could not get relink QR code.");
            }
        } catch (err) {
            setStatus("error");
            setErrorMsg(err.response?.data?.message || "Something went wrong.");
            toast.error(err.response?.data?.message || "Something went wrong.");
        } finally {
            dispatch(hideLoader());
        }
    };

    const isLoading = status === "loading";
    const hasQR = status === "qr_ready" || status === "relinking";
    const isExpired = status === "expired";
    const isError = status === "error";
    const isConnected = status === "connected";

    // countdown ring math
    const radius = 18;
    const circ = 2 * Math.PI * radius;
    const dash = (countdown / 60) * circ;

    return (
        <div className="min-h-screen bg-gray-50 p-6">

            {/* Page header */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-0.5 h-4 bg-orange-400 rounded-full" />
                    <span className={labelCls}>WhatsApp Setup</span>
                </div>
                <p className="text-xs text-gray-400 ml-3.5">Link your WhatsApp account to send messages</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* ── Left: Config + Actions ─────────────────────── */}
                <div className="lg:col-span-1 flex flex-col gap-4">

                    {/* Account type selector */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-0.5 h-4 bg-orange-400 rounded-full" />
                            <span className={labelCls}>Account Type</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setWaType("utility")}
                                disabled={isLoading || hasQR}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition border ${waType === "utility" ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-500"} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                Utility
                            </button>
                            <button
                                onClick={() => setWaType("promotion")}
                                disabled={isLoading || hasQR}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition border ${waType === "promotion" ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-orange-300 hover:text-orange-500"} disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                Promotion
                            </button>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-0.5 h-4 bg-orange-400 rounded-full" />
                            <span className={labelCls}>Actions</span>
                        </div>
                        <div className="flex flex-col gap-2.5">

                            {/* Link new */}
                            {!isConnected && (
                                <button
                                    onClick={handleGenerateQR}
                                    disabled={isLoading}
                                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
                                    ) : (
                                        <><FiZap size={13} /> {isExpired || isError ? "Regenerate QR" : "Link New Account"}</>
                                    )}
                                </button>
                            )}

                            {/* Check status — only when QR is visible */}
                            {hasQR && (
                                <button
                                    onClick={handleCheckStatus}
                                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white hover:bg-orange-50 text-orange-500 text-xs font-semibold rounded-xl transition border border-orange-200"
                                >
                                    <FiRefreshCw size={13} /> Check Status
                                </button>
                            )}

                            {/* Relink */}
                            <button
                                onClick={handleRelink}
                                disabled={isLoading}
                                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white hover:bg-gray-50 text-gray-500 text-xs font-semibold rounded-xl transition border border-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <FiRefreshCw size={13} /> Relink Account
                            </button>
                        </div>
                    </div>

                    {/* How to connect guide */}
                    {(status === "idle" || isExpired) && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-0.5 h-4 bg-orange-400 rounded-full" />
                                <span className={labelCls}>How to Connect</span>
                            </div>
                            <ol className="flex flex-col gap-2.5">
                                {["Open WhatsApp on your phone", "Tap ⋮ Menu → Linked Devices", "Tap Link a Device", "Scan the QR code"].map((step, i) => (
                                    <li key={i} className="flex items-start gap-2.5">
                                        <span className="flex-shrink-0 w-5 h-5 bg-orange-50 border border-orange-200 rounded-full flex items-center justify-center text-[10px] font-bold text-orange-500">{i + 1}</span>
                                        <span className="text-xs text-gray-500 leading-5">{step}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>

                {/* ── Right: QR / Status Display ────────────────── */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full min-h-[320px] flex flex-col">

                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-0.5 h-4 bg-orange-400 rounded-full" />
                            <span className={labelCls}>
                                {status === "relinking" ? "Relink QR Code" : "QR Code"}
                            </span>
                            {/* live status pill */}
                            <span className={`ml-auto text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${isConnected ? "bg-green-50 text-green-600 border-green-200" :
                                hasQR ? "bg-orange-50 text-orange-500 border-orange-200" :
                                    isError ? "bg-red-50 text-red-500 border-red-200" :
                                        isExpired ? "bg-yellow-50 text-yellow-600 border-yellow-200" :
                                            "bg-gray-50 text-gray-400 border-gray-200"
                                }`}>
                                {isConnected ? "Connected" : hasQR ? "Scan Now" : isError ? "Error" : isExpired ? "Expired" : "Idle"}
                            </span>
                        </div>

                        <div className="flex-1 flex items-center justify-center">

                            {/* Idle */}
                            {status === "idle" && (
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <FiSmartphone size={32} className="text-gray-300" />
                                    </div>
                                    <p className="text-xs text-gray-400 max-w-[220px] leading-relaxed">Generate a QR code to link your WhatsApp Business account.</p>
                                </div>
                            )}

                            {/* Loading spinner */}
                            {isLoading && (
                                <div className="text-center">
                                    <div className="w-12 h-12 border-2 border-orange-100 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
                                    <p className="text-xs text-gray-400">Generating secure link…</p>
                                </div>
                            )}

                            {/* QR Code with countdown ring */}
                            {/* {hasQR && qrUrl && ( */}
                            {hasQR && qrString && (
                                <div className="text-center">
                                    {/* QR frame */}
                                    <div className="inline-block p-3 bg-white border-2 border-orange-100 rounded-2xl shadow-sm relative mb-4">
                                        {/* corner accents */}
                                        <div className="absolute top-[-2px] left-[-2px] w-5 h-5 border-t-2 border-l-2 border-orange-400 rounded-tl-xl" />
                                        <div className="absolute top-[-2px] right-[-2px] w-5 h-5 border-t-2 border-r-2 border-orange-400 rounded-tr-xl" />
                                        <div className="absolute bottom-[-2px] left-[-2px] w-5 h-5 border-b-2 border-l-2 border-orange-400 rounded-bl-xl" />
                                        <div className="absolute bottom-[-2px] right-[-2px] w-5 h-5 border-b-2 border-r-2 border-orange-400 rounded-br-xl" />
                                        {/* <img src={qrUrl} alt="WhatsApp QR Code" className="w-48 h-48 block rounded-lg" /> */}
                                        <canvas ref={canvasRef} className="w-48 h-48 block rounded-lg" />
                                    </div>

                                    {/* countdown ring */}
                                    <div className="flex items-center justify-center gap-3 mb-2">
                                        <div className="relative w-10 h-10">
                                            <svg width="40" height="40" className="absolute inset-0 -rotate-90">
                                                <circle cx="20" cy="20" r={radius} fill="none" stroke="#fff7ed" strokeWidth="3" />
                                                <circle cx="20" cy="20" r={radius} fill="none" stroke="#f97316" strokeWidth="3" strokeLinecap="round"
                                                    strokeDasharray={`${dash} ${circ}`} style={{ transition: "stroke-dasharray 1s linear" }} />
                                            </svg>
                                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-orange-500">{countdown}s</span>
                                        </div>
                                        <p className="text-xs text-gray-400">QR expires in {countdown} seconds</p>
                                    </div>
                                    <p className="text-[11px] text-gray-400">Open WhatsApp → Linked Devices → Link a Device</p>
                                </div>
                            )}

                            {/* Connected */}
                            {isConnected && (
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-green-50 border border-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <FiCheckCircle size={30} className="text-green-500" />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-700 mb-1">Device Connected!</p>
                                    {phone && <p className="text-xs text-green-600 font-medium">+{phone}</p>}
                                    <p className="text-[11px] text-gray-400 mt-2">Your WhatsApp {waType} account is active</p>
                                </div>
                            )}

                            {/* Expired */}
                            {isExpired && (
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-yellow-50 border border-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <FiClock size={28} className="text-yellow-500" />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-600 mb-1">QR Code Expired</p>
                                    <p className="text-xs text-gray-400">Please generate a new QR code to continue.</p>
                                </div>
                            )}

                            {/* Error */}
                            {isError && (
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <FiAlertCircle size={28} className="text-red-400" />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-600 mb-1">Something went wrong</p>
                                    <p className="text-xs text-red-400 max-w-[240px] leading-relaxed">{errorMsg}</p>
                                </div>
                            )}

                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default WhatsAppLink;