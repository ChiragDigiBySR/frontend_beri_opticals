import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import {
    FiPlay, FiPause, FiMaximize2, FiMinimize2, FiRefreshCw,
    FiFileText, FiVideo, FiCalendar, FiUser, FiAlertCircle,
    FiSearch, FiX, FiExternalLink, FiVolume2, FiVolumeX,
} from "react-icons/fi";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;

const isExpired = (d) => d && new Date(d) < new Date();
const expiresSoon = (d) => {
    if (!d) return false;
    const diff = Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 30;
};

function ExpiryBadge({ date }) {
    if (!date) return null;
    if (isExpired(date))
        return <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full"><FiAlertCircle size={9} /> Expired</span>;
    if (expiresSoon(date))
        return <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full"><FiCalendar size={9} /> Expires {formatDate(date)}</span>;
    return <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded-full"><FiCalendar size={9} /> {formatDate(date)}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Video Player Card
// ─────────────────────────────────────────────────────────────────────────────
function VideoCard({ item, onExpand }) {
    const videoRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [hovered, setHovered] = useState(false);

    const togglePlay = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) { v.play(); setPlaying(true); }
        else { v.pause(); setPlaying(false); }
    };

    const handleTimeUpdate = () => {
        const v = videoRef.current;
        if (v && v.duration) setProgress((v.currentTime / v.duration) * 100);
    };

    const handleEnded = () => {
        const v = videoRef.current;
        if (v) { v.currentTime = 0; v.play(); }   // loop on end
    };

    const handleSeek = (e) => {
        const v = videoRef.current;
        if (!v) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        v.currentTime = ratio * v.duration;
    };

    const fmtTime = (s) => {
        const m = Math.floor(s / 60);
        return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    };

    return (
        <div
            className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Video area */}
            <div className="relative bg-gray-900 aspect-video cursor-pointer" onClick={togglePlay}>
                <video
                    ref={videoRef}
                    src={item.url}
                    className="w-full h-full object-contain"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={(e) => setDuration(e.target.duration)}
                    onEnded={handleEnded}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    muted={muted}
                    preload="metadata"
                />

                {/* Play overlay */}
                {!playing && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition">
                            <FiPlay size={22} className="text-white ml-1" />
                        </div>
                    </div>
                )}

                {/* Top-right controls */}
                <div className={`absolute top-2 right-2 flex items-center gap-1.5 transition-opacity ${hovered || playing ? "opacity-100" : "opacity-0"}`}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }}
                        className="w-7 h-7 rounded-lg bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
                    >
                        {muted ? <FiVolumeX size={12} /> : <FiVolume2 size={12} />}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onExpand(item); }}
                        className="w-7 h-7 rounded-lg bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition"
                        title="Expand"
                    >
                        <FiMaximize2 size={12} />
                    </button>
                </div>

                {/* Progress bar */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); handleSeek(e); }}
                >
                    <div className="h-full bg-orange-400 transition-all" style={{ width: `${progress}%` }} />
                </div>

                {/* Duration */}
                {duration > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                        {fmtTime((duration * progress) / 100)} / {fmtTime(duration)}
                    </div>
                )}
            </div>

            {/* Meta */}
            <MediaMeta item={item} icon={<FiVideo size={12} className="text-blue-500" />} accent="blue" />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF Card
// ─────────────────────────────────────────────────────────────────────────────
function PDFCard({ item }) {
    return (
        <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            {/* PDF preview area */}
            <div
                className="relative bg-gradient-to-br from-orange-50 to-amber-50 aspect-video flex flex-col items-center justify-center cursor-pointer border-b border-orange-100 hover:from-orange-100 hover:to-amber-100 transition"
                onClick={() => window.open(item.url, "_blank")}
            >
                <div className="w-16 h-16 rounded-2xl bg-white border border-orange-200 shadow-sm flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <FiFileText size={28} className="text-orange-500" />
                </div>
                <span className="text-xs font-semibold text-orange-600">Click to open PDF</span>
                <span className="text-[10px] text-gray-400 mt-1">Opens in new tab</span>

                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-orange-500/10">
                    <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-sm border border-orange-100">
                        <FiExternalLink size={13} className="text-orange-500" />
                        <span className="text-xs font-bold text-orange-600">Open PDF</span>
                    </div>
                </div>
            </div>

            <MediaMeta item={item} icon={<FiFileText size={12} className="text-orange-500" />} accent="orange" />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared meta footer for both cards
// ─────────────────────────────────────────────────────────────────────────────
function MediaMeta({ item, icon, accent }) {
    const accentCls = accent === "blue"
        ? "bg-blue-100 text-blue-600"
        : "bg-orange-100 text-orange-600";

    return (
        <div className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${accentCls}`}>
                        {icon} {item.type}
                    </span>
                    <p className="text-xs font-semibold text-gray-800 truncate">
                        {item.label || (item.type === "PDF" ? "PDF Document" : "Video")}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                <FiUser size={10} />
                <span className="font-semibold text-gray-600">{item.sellerId?.name || "—"}</span>
                <span>·</span>
                <span>{item.sellerId?.mobile || "—"}</span>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-1">
                <ExpiryBadge date={item.expiryDate} />
                <span className="text-[10px] text-gray-300">{formatDate(item.createdAt)}</span>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Expanded Video Modal
// ─────────────────────────────────────────────────────────────────────────────
function VideoModal({ item, onClose }) {
    const videoRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        // Auto-play when modal opens
        const v = videoRef.current;
        if (v) { v.play().catch(() => { }); }

        const handleKey = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [onClose]);

    const togglePlay = () => {
        const v = videoRef.current;
        if (!v) return;
        v.paused ? v.play() : v.pause();
    };

    const handleEnded = () => {
        const v = videoRef.current;
        if (v) { v.currentTime = 0; v.play(); }
    };

    const handleSeek = (e) => {
        const v = videoRef.current;
        if (!v) return;
        const rect = e.currentTarget.getBoundingClientRect();
        v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration;
    };

    const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

    return (
        <div
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-5xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute -top-10 right-0 text-white/70 hover:text-white flex items-center gap-1.5 text-xs transition"
                >
                    <FiX size={14} /> Close
                </button>

                {/* Video */}
                <div className="rounded-2xl overflow-hidden bg-black shadow-2xl" onClick={togglePlay}>
                    <video
                        ref={videoRef}
                        src={item.url}
                        className="w-full max-h-[75vh] object-contain cursor-pointer"
                        onTimeUpdate={(e) => {
                            if (e.target.duration) setProgress((e.target.currentTime / e.target.duration) * 100);
                        }}
                        onLoadedMetadata={(e) => setDuration(e.target.duration)}
                        onEnded={handleEnded}
                        onPlay={() => setPlaying(true)}
                        onPause={() => setPlaying(false)}
                        muted={muted}
                    />

                    {/* Pause overlay */}
                    {!playing && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                                <FiPlay size={32} className="text-white ml-1" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Controls bar */}
                <div className="mt-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-4">
                    <button onClick={togglePlay} className="text-white hover:text-orange-300 transition flex-shrink-0">
                        {playing ? <FiPause size={18} /> : <FiPlay size={18} />}
                    </button>

                    {/* Seek */}
                    <div
                        className="flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer relative"
                        onClick={handleSeek}
                    >
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${progress}%` }} />
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-orange-400 rounded-full shadow"
                            style={{ left: `calc(${progress}% - 6px)` }}
                        />
                    </div>

                    {duration > 0 && (
                        <span className="text-white/70 text-xs font-mono flex-shrink-0">
                            {fmtTime((duration * progress) / 100)} / {fmtTime(duration)}
                        </span>
                    )}

                    <button onClick={() => setMuted(m => !m)} className="text-white/70 hover:text-white transition flex-shrink-0">
                        {muted ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />}
                    </button>
                </div>

                {/* Info */}
                <div className="mt-3 flex items-center gap-3">
                    <p className="text-white font-semibold text-sm">{item.label || "Video"}</p>
                    <span className="text-white/40 text-xs">·</span>
                    <p className="text-white/60 text-xs">{item.sellerId?.name}</p>
                    {item.expiryDate && (
                        <>
                            <span className="text-white/40 text-xs">·</span>
                            <ExpiryBadge date={item.expiryDate} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function SellerMediaGallery() {
    const [media, setMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("ALL");          // ALL | PDF | VIDEO
    const [search, setSearch] = useState("");
    const [expandedVideo, setExpandedVideo] = useState(null);
    const dispatch = useDispatch();

    const fetchMedia = async () => {
        try {
            setLoading(true);
            dispatch(showLoader());

            const res = await axios.get(`${import.meta.env.VITE_API_URL_whats_new}/seller-media/all`);
            if (res.data.success) setMedia(res.data.media || []);

        } catch {
            toast.error("Failed to load media");
        } finally {
            setLoading(false);
            dispatch(hideLoader());
        }
    };

    useEffect(() => { fetchMedia(); }, []);

    // Filter + search
    const displayed = media.filter((m) => {
        const matchType = filter === "ALL" || m.type === filter;
        const q = search.toLowerCase();
        const matchSearch = !q
            || (m.label || "").toLowerCase().includes(q)
            || (m.sellerId?.name || "").toLowerCase().includes(q)
            || (m.sellerId?.mobile || "").toLowerCase().includes(q);
        return matchType && matchSearch;
    });

    const pdfCount = media.filter(m => m.type === "PDF").length;
    const videoCount = media.filter(m => m.type === "VIDEO").length;

    if (loading) return (
        <div className="flex items-center justify-center h-64 text-gray-400 gap-3">
            <div className="w-5 h-5 border-2 border-orange-300 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading media...</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-6">

            {/* ── Header bar ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">

                    {/* Stats + filter tabs */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {[
                            { val: "ALL", label: `All (${media.length})` },
                            { val: "PDF", label: `PDFs (${pdfCount})`, icon: <FiFileText size={11} /> },
                            { val: "VIDEO", label: `Videos (${videoCount})`, icon: <FiVideo size={11} /> },
                        ].map(({ val, label, icon }) => (
                            <button
                                key={val}
                                onClick={() => setFilter(val)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition
                                    ${filter === val
                                        ? val === "VIDEO" ? "bg-blue-500 text-white" : "bg-orange-500 text-white"
                                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                            >
                                {icon} {label}
                            </button>
                        ))}
                    </div>

                    {/* Search + refresh */}
                    <div className="flex items-center gap-3 sm:ml-auto flex-wrap">
                        <div className="relative w-full sm:w-auto">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={13} />
                            {search && (
                                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                                    <FiX size={12} />
                                </button>
                            )}
                            <input
                                type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Search by seller or label..."
                                className="pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition w-full sm:w-56 text-gray-700 placeholder:text-gray-300"
                            />
                        </div>
                        <button
                            onClick={fetchMedia}
                            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 text-xs font-semibold rounded-lg transition shadow-sm"
                        >
                            <FiRefreshCw size={13} /> Refresh
                        </button>
                    </div>

                </div>
            </div>

            {/* ── Grid ── */}
            {displayed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300 gap-3">
                    <FiFileText size={40} />
                    <p className="text-sm">No media found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {displayed.map((item) =>
                        item.type === "VIDEO"
                            ? <VideoCard key={item._id} item={item} onExpand={setExpandedVideo} />
                            : <PDFCard key={item._id} item={item} />
                    )}
                </div>
            )}

            {/* ── Expanded video modal ── */}
            {expandedVideo && (
                <VideoModal item={expandedVideo} onClose={() => setExpandedVideo(null)} />
            )}
        </div>
    );
}