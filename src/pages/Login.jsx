import { useEffect, useState } from "react";
import api from "../utils/api";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setUser, setStore } from "../features/auth/authSlice";
import { FiEye, FiEyeOff, FiAlertCircle } from "react-icons/fi";

const LOGO_IMG   = "https://digibysr.com/wp-content/uploads/2025/10/DigiOptics-By-DigiBySR-Logo-Option-2-scaled.png";
const LOGO_IMG_2 = "https://digibysr.com/wp-content/uploads/2025/01/DigiOptics.png";
const MASCOT_GIF = "https://digibysr.com/wp-content/uploads/2025/08/DigiOptics-Character_low.gif";
const BUBBLE_IMG = "https://digibysr.com/wp-content/uploads/2025/10/f49bca6c000c4089ef68b87827683c9b3a11ac68.png";

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return "Good Morning!\nHope you have a wonderful day!";
  if (h >= 12 && h < 17) return "Good Afternoon!\nKeep up the great work!";
  if (h >= 17 && h < 21) return "Good Evening!\nHope you had a wonderful day!";
  return "Working Late?\nWe are here with you!";
}

export default function Login() {
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const greeting                        = getGreeting();

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && user) navigate(user.role === "SUPER_ADMIN" ? "/stores/create" : "/");
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError("");
    if (!email || !password) { setError("Email and password are required"); return; }
    try {
      setLoading(true);
      const res = await api.post("/auth/login", { email, password });
      if (res.data.success) {
        localStorage.setItem("token", res.data.token);
        dispatch(setUser(res.data.user));
        dispatch(setStore(res.data.store));
        navigate(res.data.user.role === "SUPER_ADMIN" ? "/stores/create" : "/");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }

        body { font-family: 'Nunito', sans-serif; }

        /* page background: very soft warm white with faint dot grid */
        .login-page {
          min-height: 100dvh;
          background-color: #fafaf8;
          background-image: radial-gradient(circle, #e8e4dc 1px, transparent 1px);
          background-size: 28px 28px;
        }

        /* subtle orange glow blobs for atmosphere */
        .login-page::before {
          content: '';
          position: fixed;
          top: -160px; right: -160px;
          width: 480px; height: 480px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(251,146,60,0.14) 0%, transparent 65%);
          pointer-events: none;
          z-index: 0;
        }
        .login-page::after {
          content: '';
          position: fixed;
          bottom: -120px; left: -120px;
          width: 380px; height: 380px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(251,146,60,0.10) 0%, transparent 65%);
          pointer-events: none;
          z-index: 0;
        }

        /* card entrance */
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(22px) scale(0.98); }
          to   { opacity:1; transform:translateY(0)    scale(1); }
        }
        .card-enter { animation: fadeUp 0.55s cubic-bezier(0.16,1,0.3,1) both; }

        /* mascot float */
        @keyframes mFloat {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-11px); }
        }
        .mascot-float { animation: mFloat 3.5s ease-in-out infinite; }

        /* bubble pop */
        @keyframes bPop {
          from { opacity:0; transform:scale(0.55) translateY(16px); }
          to   { opacity:1; transform:scale(1)    translateY(0); }
        }
        .bubble-pop { animation: bPop 0.65s cubic-bezier(0.34,1.56,0.64,1) 0.45s both; }

        /* input focus ring */
        .login-input:focus {
          outline: none;
          background: #fff !important;
          box-shadow: 0 0 0 2.5px #f97316, 0 0 0 6px rgba(249,115,22,0.12) !important;
        }
        .login-input::placeholder { color: #b5b0a8; }

        /* shake */
        @keyframes shake {
          0%,100%{transform:translateX(0);}
          20%{transform:translateX(-5px);}
          40%{transform:translateX(5px);}
          60%{transform:translateX(-3px);}
          80%{transform:translateX(3px);}
        }
        .err-shake { animation: shake 0.35s ease; }

        /* spinner */
        @keyframes spin { to { transform: rotate(360deg); } }
        .btn-spin {
          width:15px; height:15px;
          border:2.5px solid rgba(255,255,255,0.3);
          border-top-color:#fff;
          border-radius:50%;
          animation: spin 0.65s linear infinite;
          flex-shrink:0;
        }

        /* stagger the form fields in */
        .field-1 { animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) 0.15s both; }
        .field-2 { animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) 0.22s both; }
        .field-3 { animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) 0.29s both; }
      `}</style>

      {/* ── fixed top-right logo ── */}
      <div className="fixed top-5 right-7 z-50">
        <img src={LOGO_IMG_2} alt="DigiOptics" className="h-8 w-auto object-contain" />
      </div>

      {/* ── page shell ── */}
      <div className="login-page relative flex flex-col items-center justify-center min-h-screen px-4 py-12">

        <div className="card-enter relative z-10 w-full max-w-[860px] flex flex-col items-center">

          {/* ══ MAIN CARD ══ */}
          <div className="w-full bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl shadow-orange-100/60 border border-white/80 flex items-stretch overflow-visible" style={{ minHeight: 360 }}>

            {/* ── LEFT: mascot panel ── */}
            <div className="hidden sm:flex flex-1 flex-col items-center justify-end px-8 py-0 relative overflow-visible"
              style={{ background: "linear-gradient(160deg, #fff8f2 0%, #fff3e8 60%, #ffecd8 100%)", borderRadius: "24px 0 0 24px" }}>

              {/* decorative ring */}
              <div className="absolute top-6 left-6 w-24 h-24 rounded-full border-2 border-orange-100/60" />
              <div className="absolute top-10 left-10 w-12 h-12 rounded-full border border-orange-100/40" />
              <div className="absolute bottom-8 right-4 w-16 h-16 rounded-full border border-orange-100/50" />

              {/* speech bubble */}
              <div className="bubble-pop relative mb-[-8px] z-10">
                <img src={BUBBLE_IMG} alt="" className="w-[270px] drop-shadow-md" />
                <div className="absolute inset-0 flex items-center justify-center pb-6 px-4 pointer-events-none text-center">
                  <p className="text-[12px] font-black text-gray-800 leading-[1.5] whitespace-pre-line">{greeting}</p>
                </div>
              </div>

              {/* mascot */}
              <div className="mascot-float relative z-10">
                <img src={MASCOT_GIF} alt="DigiOptics mascot" className="w-[220px] drop-shadow-xl" />
              </div>
            </div>

            {/* vertical separator */}
            <div className="hidden sm:block w-px flex-shrink-0 my-8"
              style={{ background: "linear-gradient(to bottom, transparent, #e8e4dc 30%, #e8e4dc 70%, transparent)" }} />

            {/* ── RIGHT: form panel ── */}
            <div className="flex-1 flex flex-col items-center justify-center px-10 py-10 min-w-0">

              {/* mobile greeting strip */}
              <div className="sm:hidden flex items-center gap-3 w-full bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 mb-5">
                <img src={MASCOT_GIF} alt="" className="w-11 h-11 object-contain flex-shrink-0" />
                <p className="text-[12px] font-black text-gray-800 leading-snug whitespace-pre-line">{greeting}</p>
              </div>

              {/* main logo — larger, more breathing room */}
              <div className="mb-6">
                <img src={LOGO_IMG} alt="DigiOptics" className="h-20 w-auto object-contain" />
              </div>

              {/* separator */}
              <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-6" />

              {/* error */}
              {error && (
                <div className="err-shake flex items-start gap-2 w-full bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 mb-4 text-[12.5px] font-bold text-red-600">
                  <FiAlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* form */}
              <div className="flex flex-col gap-3 w-full">

                <div className="field-1">
                  <input
                    type="email"
                    placeholder="Username"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit(e)}
                    autoComplete="email"
                    className="login-input w-full bg-gray-100 rounded-full px-5 py-3 text-[13.5px] font-semibold text-gray-800 border-2 border-transparent transition-all"
                  />
                </div>

                <div className="field-2 relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit(e)}
                    autoComplete="current-password"
                    className="login-input w-full bg-gray-100 rounded-full px-5 py-3 pr-12 text-[13.5px] font-semibold text-gray-800 border-2 border-transparent transition-all"
                  />
                  <button
                    type="button" tabIndex={-1}
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors cursor-pointer p-1"
                  >
                    {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>

                <div className="field-3">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-[15px] rounded-full py-3 transition-all shadow-lg shadow-orange-200 hover:shadow-orange-300 hover:-translate-y-0.5 cursor-pointer"
                    style={{ letterSpacing: "0.3px" }}
                  >
                    {loading ? <><div className="btn-spin" /> Logging in...</> : "Login"}
                  </button>
                </div>

              </div>

              {/* footer: logo image only */}
              <div className="mt-6">
                <a href="https://digibysr.com" target="_blank" rel="noopener noreferrer">
                  <img
                    src={LOGO_IMG}
                    alt="DigiOptics by DigiBySR"
                    className="h-5 w-auto object-contain opacity-40 hover:opacity-70 transition-opacity"
                  />
                </a>
              </div>

            </div>
          </div>

          {/* tagline below card */}
          <p className="mt-6 text-center text-[15px] font-700 text-gray-400 tracking-tight">
            India's First{" "}
            <span className="text-orange-500 font-extrabold">AI-Integrated</span>{" "}
            Optical Store Software
          </p>

        </div>
      </div>
    </>
  );
}