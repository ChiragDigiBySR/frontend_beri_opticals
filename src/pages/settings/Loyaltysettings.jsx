import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import api from "../../utils/api";
import { useDispatch } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import {
    FiStar, FiUsers, FiToggleLeft, FiToggleRight, FiSave,
    FiInfo, FiDollarSign, FiClock, FiBell, FiSliders,
    FiCheck, FiAlertTriangle, FiRefreshCw, FiLayers,
} from "react-icons/fi";

// ─── Default loyalty state (mirrors the schema) ───────────────────────────────
const DEFAULT_LOYALTY = {
    isEnabled: false,
    mode: "loyalty_only",
    earning: {
        spendAmount: 100,
        pointsEarned: 1,
        calculateOn: "gross",
    },
    useTiers: false,
    tiers: [
        { limitUpto: 0, currencyValue: 100, pointsPerUnit: 1, isActive: false },
        { limitUpto: 0, currencyValue: 100, pointsPerUnit: 1, isActive: false },
        { limitUpto: 0, currencyValue: 100, pointsPerUnit: 1, isActive: false },
        { limitUpto: 0, currencyValue: 100, pointsPerUnit: 1, isActive: false },
        { limitUpto: 0, currencyValue: 100, pointsPerUnit: 1, isActive: false },
    ],
    redemption: {
        pointValue: 10,
        currencyValue: 1,
        maxRedeemPercent: 100,
        allowPartial: true,
    },
    expiry: {
        isEnabled: false,
        days: 365,
    },
    membership: {
        allowCreation: true,
        sendWhatsappOnCreate: true,
        sendWhatsappOnAdd: true,
        sendWhatsappOnEarn: false,
        sendWhatsappOnRedeem: false,
    },
    notifications: {
        onEarn: false,
        onRedeem: false,
    },
};

// ─── Reusable primitives ──────────────────────────────────────────────────────

// Toggle switch
function Toggle({ checked, onChange, disabled = false }) {
    return (
        <button
            type="button"
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
            className={`relative w-10 h-5.5 rounded-full transition-all duration-200 flex-shrink-0 focus:outline-none
                ${checked ? "bg-emerald-500" : "bg-stone-200"}
                ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
            style={{ height: "22px", width: "40px" }}
        >
            <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200
                    ${checked ? "left-5" : "left-0.5"}`}
            />
        </button>
    );
}

// Labeled field row
function FieldRow({ label, hint, children, tight = false }) {
    return (
        <div className={`flex items-start justify-between gap-4 ${tight ? "py-2" : "py-3"} border-b border-stone-50 last:border-0`}>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-stone-700">{label}</p>
                {hint && <p className="text-[10px] text-stone-400 mt-0.5 leading-relaxed">{hint}</p>}
            </div>
            <div className="flex-shrink-0">{children}</div>
        </div>
    );
}

// Number input
function NumInput({ value, onChange, min = 0, max, width = "w-20", suffix }) {
    return (
        <div className="flex items-center gap-1.5">
            <input
                type="number"
                value={value}
                min={min}
                max={max}
                onChange={e => onChange(Number(e.target.value))}
                className={`${width} px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-lg outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-50 transition text-right`}
            />
            {suffix && <span className="text-[10px] text-stone-400 font-medium">{suffix}</span>}
        </div>
    );
}

// Select dropdown
function Select({ value, onChange, options }) {
    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-lg outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-50 transition cursor-pointer"
        >
            {options.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
            ))}
        </select>
    );
}

// Card sub-section
function SubCard({ title, icon: Icon, accent, children, dimmed = false }) {
    const color = accent === "emerald" ? "emerald" : accent === "amber" ? "amber" : accent === "blue" ? "blue" : "stone";
    const headerBg = {
        emerald: "bg-emerald-50/70 border-emerald-100",
        amber: "bg-amber-50/70 border-amber-100",
        blue: "bg-blue-50/70 border-blue-100",
        stone: "bg-stone-50/60 border-stone-100",
    }[color];
    const iconBg = {
        emerald: "bg-emerald-100 text-emerald-600",
        amber: "bg-amber-100 text-amber-600",
        blue: "bg-blue-100 text-blue-600",
        stone: "bg-stone-100 text-stone-500",
    }[color];

    return (
        <div className={`bg-white rounded-2xl border border-stone-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.07)] overflow-hidden transition-opacity ${dimmed ? "opacity-40 pointer-events-none" : ""}`}>
            <div className={`flex items-center gap-2.5 px-5 py-3.5 border-b ${headerBg}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>
                    <Icon size={13} />
                </div>
                <p className="text-[11px] font-bold text-stone-700 tracking-wide">{title}</p>
            </div>
            <div className="px-5 py-1">{children}</div>
        </div>
    );
}

// ─── Tier table row ───────────────────────────────────────────────────────────
function TierRow({ tier, index, onChange }) {
    const update = (key, val) => onChange(index, { ...tier, [key]: val });

    return (
        <tr className={`${tier.isActive ? "bg-white" : "bg-stone-50/50"}`}>
            {/* Active checkbox */}
            <td className="px-3 py-2.5 text-center">
                <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition mx-auto
                        ${tier.isActive ? "bg-orange-500 border-orange-500" : "border-stone-300 bg-white hover:border-orange-300"}`}
                    onClick={() => update("isActive", !tier.isActive)}
                >
                    {tier.isActive && (
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </div>
            </td>
            {/* Limit upto */}
            <td className="px-3 py-2.5">
                <input
                    type="number"
                    value={tier.limitUpto}
                    disabled={!tier.isActive}
                    min={0}
                    onChange={e => update("limitUpto", Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-lg outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-50 transition disabled:bg-stone-50 disabled:text-stone-300 text-right"
                    placeholder="e.g. 100000"
                />
            </td>
            {/* Currency value (spend denominator) */}
            <td className="px-3 py-2.5">
                <input
                    type="number"
                    value={tier.currencyValue}
                    disabled={!tier.isActive}
                    min={1}
                    onChange={e => update("currencyValue", Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-lg outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-50 transition disabled:bg-stone-50 disabled:text-stone-300 text-right"
                    placeholder="e.g. 100"
                />
            </td>
            {/* Points per unit */}
            <td className="px-3 py-2.5">
                <input
                    type="number"
                    value={tier.pointsPerUnit}
                    disabled={!tier.isActive}
                    min={0}
                    onChange={e => update("pointsPerUnit", Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-lg outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-50 transition disabled:bg-stone-50 disabled:text-stone-300 text-right"
                    placeholder="e.g. 10"
                />
            </td>
            {/* Preview label */}
            <td className="px-3 py-2.5 text-[10px] text-stone-400 whitespace-nowrap">
                {tier.isActive && tier.currencyValue > 0
                    ? <span className="font-semibold text-emerald-600">
                        Spend ₹{tier.limitUpto.toLocaleString("en-IN")} → earn {tier.pointsPerUnit} pts / ₹{tier.currencyValue}
                      </span>
                    : <span className="italic">—</span>
                }
            </td>
        </tr>
    );
}

// ─── Master enable banner ─────────────────────────────────────────────────────
function MasterToggleBanner({ enabled, onChange }) {
    return (
        <div className={`rounded-2xl border-2 p-5 flex items-center justify-between gap-4 transition-all duration-200
            ${enabled
                ? "bg-emerald-50 border-emerald-200"
                : "bg-stone-50 border-stone-200 border-dashed"
            }`}>
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition
                    ${enabled ? "bg-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.3)]" : "bg-stone-200"}`}>
                    <FiStar size={17} className={enabled ? "text-white" : "text-stone-400"} />
                </div>
                <div>
                    <p className="text-sm font-bold text-stone-800">
                        Loyalty & Membership System
                    </p>
                    <p className="text-[10px] text-stone-500 mt-0.5">
                        {enabled
                            ? "Active — customers earn & redeem points on every transaction."
                            : "Disabled — no points are earned or redeemed until you enable this."}
                    </p>
                </div>
            </div>
            <Toggle checked={enabled} onChange={onChange} />
        </div>
    );
}

// ─── Points preview pill ──────────────────────────────────────────────────────
function EarningPreview({ earning }) {
    const { spendAmount, pointsEarned } = earning;
    if (!spendAmount || !pointsEarned) return null;
    return (
        <div className="mt-3 inline-flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
            <FiInfo size={11} className="text-orange-400 flex-shrink-0" />
            <p className="text-[10px] text-orange-700 font-semibold">
                Every ₹{spendAmount} spent → <span className="text-orange-500">{pointsEarned} point{pointsEarned !== 1 ? "s" : ""}</span>
            </p>
        </div>
    );
}

function RedemptionPreview({ redemption }) {
    const { pointValue, currencyValue } = redemption;
    if (!pointValue || currencyValue == null) return null;
    return (
        <div className="mt-3 inline-flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            <FiInfo size={11} className="text-amber-500 flex-shrink-0" />
            <p className="text-[10px] text-amber-700 font-semibold">
                {pointValue} points = ₹{currencyValue} discount
            </p>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export default function LoyaltySettings() {
    const dispatch = useDispatch();
    const [fetching, setFetching] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loyalty, setLoyalty] = useState(DEFAULT_LOYALTY);

    // ── Fetch ────────────────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                dispatch(showLoader());
                const res = await api.get("/settings/loyalty");
                if (res.data.success && res.data.data) {
                    // Deep merge with defaults to handle missing fields from old DB docs
                    setLoyalty(prev => ({
                        ...prev,
                        ...res.data.data,
                        earning:      { ...prev.earning,      ...(res.data.data.earning      || {}) },
                        redemption:   { ...prev.redemption,   ...(res.data.data.redemption   || {}) },
                        expiry:       { ...prev.expiry,       ...(res.data.data.expiry       || {}) },
                        membership:   { ...prev.membership,   ...(res.data.data.membership   || {}) },
                        notifications:{ ...prev.notifications,...(res.data.data.notifications|| {}) },
                        tiers: res.data.data.tiers?.length
                            ? res.data.data.tiers
                            : DEFAULT_LOYALTY.tiers,
                    }));
                }
            } catch (err) {
                toast.error(err?.response?.data?.message || "Failed to load loyalty settings.");
            } finally {
                setFetching(false);
                dispatch(hideLoader());
            }
        })();
    }, []);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const set = (path, value) => {
        setLoyalty(prev => {
            const parts = path.split(".");
            if (parts.length === 1) return { ...prev, [path]: value };
            if (parts.length === 2) return {
                ...prev,
                [parts[0]]: { ...prev[parts[0]], [parts[1]]: value },
            };
            return prev;
        });
    };

    const updateTier = (index, updated) => {
        setLoyalty(prev => {
            const tiers = [...prev.tiers];
            tiers[index] = updated;
            return { ...prev, tiers };
        });
    };

    // ── Save ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        const confirm = await Swal.fire({
            title: "Save loyalty settings?",
            html: `<p style="font-size:13px;color:#57534e">These rules will apply to all new transactions immediately after saving.</p>`,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#f97316",
            cancelButtonColor: "#9ca3af",
            confirmButtonText: "Yes, save",
            cancelButtonText: "Cancel",
        });
        if (!confirm.isConfirmed) return;

        setSaving(true);
        dispatch(showLoader());
        try {
            const res = await api.put("/settings/loyalty", loyalty);
            if (res.data.success) {
                toast.success("Loyalty settings saved successfully.");
            } else {
                toast.error(res.data.message);
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to save loyalty settings.");
        } finally {
            setSaving(false);
            dispatch(hideLoader());
        }
    };

    // ── Master toggle (with special Swal for disabling) ───────────────────────
    const handleMasterToggle = async (val) => {
        if (!val) {
            const confirm = await Swal.fire({
                title: "Disable loyalty system?",
                html: `<p style="font-size:13px;color:#57534e">No points will be earned or redeemed until you re-enable it. Existing points are <b>not</b> deleted.</p>`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#dc2626",
                cancelButtonColor: "#9ca3af",
                confirmButtonText: "Yes, disable",
                cancelButtonText: "Cancel",
            });
            if (!confirm.isConfirmed) return;
        }
        set("isEnabled", val);
    };

    // ── Membership toggle (with Swal for disabling) ───────────────────────────
    const handleMembershipToggle = async (val) => {
        if (!val) {
            const confirm = await Swal.fire({
                title: "Block new memberships?",
                html: `<p style="font-size:13px;color:#57534e">Existing memberships will continue. Only new membership creation will be blocked.</p>`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#dc2626",
                cancelButtonColor: "#9ca3af",
                confirmButtonText: "Yes, block",
                cancelButtonText: "Cancel",
            });
            if (!confirm.isConfirmed) return;
        }
        set("membership.allowCreation", val);
    };

    // ── Tier mode toggle ──────────────────────────────────────────────────────
    const handleTierToggle = async (val) => {
        if (val) {
            const confirm = await Swal.fire({
                title: "Enable tiered earning?",
                html: `<p style="font-size:13px;color:#57534e">Tiered rules will override the flat rate for matching transaction amounts. Fill in the tier table below.</p>`,
                icon: "info",
                showCancelButton: true,
                confirmButtonColor: "#f97316",
                cancelButtonColor: "#9ca3af",
                confirmButtonText: "Enable tiers",
                cancelButtonText: "Cancel",
            });
            if (!confirm.isConfirmed) return;
        }
        set("useTiers", val);
    };

    if (fetching) return null;

    const loyaltyOff = !loyalty.isEnabled;
    const showMembership = loyalty.mode === "membership_only" || loyalty.mode === "both";
    const showLoyaltyOnly = loyalty.mode === "loyalty_only" || loyalty.mode === "both";

    return (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.08)] overflow-hidden">

            {/* ── Header strip ── */}
            <div className="flex items-center gap-3 px-6 py-4 border-b bg-gradient-to-r from-emerald-50/80 to-stone-50/60 border-stone-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <FiStar size={15} className="text-emerald-600" />
                </div>
                <div>
                    <p className="text-[11px] font-bold text-stone-700 tracking-wide">Loyalty & Membership Settings</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                        Configure how customers earn, redeem, and share points.
                    </p>
                </div>
            </div>

            <div className="p-6 space-y-5">

                {/* ══ 1. MASTER TOGGLE ══════════════════════════════════════════ */}
                <MasterToggleBanner
                    enabled={loyalty.isEnabled}
                    onChange={handleMasterToggle}
                />

                {/* ══ 2. MODE SELECTOR ══════════════════════════════════════════ */}
                <SubCard title="System Mode" icon={FiSliders} accent="stone" dimmed={loyaltyOff}>
                    <FieldRow
                        label="What to enable"
                        hint="Choose whether to run loyalty points only, family memberships only, or both together."
                    >
                        <Select
                            value={loyalty.mode}
                            onChange={v => set("mode", v)}
                            options={[
                                { value: "loyalty_only",    label: "Loyalty Points Only" },
                                { value: "membership_only", label: "Membership / Family Wallet Only" },
                                { value: "both",            label: "Both — Loyalty + Membership" },
                            ]}
                        />
                    </FieldRow>
                </SubCard>

                {/* ══ 3. EARNING RULES ══════════════════════════════════════════ */}
                <SubCard title="Point Earning Rule" icon={FiDollarSign} accent="emerald" dimmed={loyaltyOff}>
                    <FieldRow
                        label="Flat rate — every ₹ spent"
                        hint="How much a customer needs to spend to earn 1 point. Used when tiers are off."
                    >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
                            <span>₹</span>
                            <NumInput
                                value={loyalty.earning.spendAmount}
                                onChange={v => set("earning.spendAmount", v)}
                                min={1}
                                width="w-20"
                            />
                            <span className="text-stone-400">=</span>
                            <NumInput
                                value={loyalty.earning.pointsEarned}
                                onChange={v => set("earning.pointsEarned", v)}
                                min={0}
                                width="w-16"
                            />
                            <span>pt{loyalty.earning.pointsEarned !== 1 ? "s" : ""}</span>
                        </div>
                    </FieldRow>

                    <FieldRow label="Calculate points on" hint="Gross = before discounts. Net = after discounts applied.">
                        <Select
                            value={loyalty.earning.calculateOn}
                            onChange={v => set("earning.calculateOn", v)}
                            options={[
                                { value: "gross", label: "Gross Value (before discount)" },
                                { value: "net",   label: "Net Value (after discount)" },
                            ]}
                        />
                    </FieldRow>

                    {/* Earning preview */}
                    <div className="pt-1 pb-3">
                        <EarningPreview earning={loyalty.earning} />
                    </div>

                    {/* ── Tier section (future-ready) ── */}
                    <FieldRow
                        label="Enable tiered earning"
                        hint="Different earning rates based on transaction amount. Overrides flat rate when active."
                    >
                        <div className="flex items-center gap-2">
                            {loyalty.useTiers && (
                                <span className="text-[10px] font-bold text-orange-500 bg-orange-50 border border-orange-100 rounded-full px-2 py-0.5">
                                    ACTIVE
                                </span>
                            )}
                            <Toggle checked={loyalty.useTiers} onChange={handleTierToggle} />
                        </div>
                    </FieldRow>

                    {loyalty.useTiers && (
                        <div className="mt-2 mb-3">
                            <p className="text-[10px] text-stone-400 mb-2 flex items-center gap-1">
                                <FiInfo size={10} /> Use integer values only. Tick the checkbox to activate a row.
                            </p>
                            <div className="overflow-x-auto rounded-xl border border-stone-100">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-stone-50 border-b border-stone-100">
                                            <th className="px-3 py-2.5 text-center text-[10px] font-bold text-stone-500 uppercase tracking-wider w-10">
                                                Active
                                            </th>
                                            <th className="px-3 py-2.5 text-left text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                                                Spend Limit Upto (₹)
                                            </th>
                                            <th className="px-3 py-2.5 text-left text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                                                Per ₹ Units
                                            </th>
                                            <th className="px-3 py-2.5 text-left text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                                                Points Earned
                                            </th>
                                            <th className="px-3 py-2.5 text-left text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                                                Preview
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-50">
                                        {loyalty.tiers.map((tier, i) => (
                                            <TierRow key={i} tier={tier} index={i} onChange={updateTier} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-[9px] text-stone-400 mt-1.5 flex items-center gap-1">
                                <FiAlertTriangle size={9} className="text-amber-400" />
                                Do not use decimal values (use 10, not 10.5). Fill at least one row.
                            </p>
                        </div>
                    )}
                </SubCard>

                {/* ══ 4. REDEMPTION ═════════════════════════════════════════════ */}
                <SubCard title="Points Redemption" icon={FiLayers} accent="amber" dimmed={loyaltyOff}>
                    <FieldRow
                        label="Redemption conversion"
                        hint="How many points equal ₹1 discount."
                    >
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">
                            <NumInput
                                value={loyalty.redemption.pointValue}
                                onChange={v => set("redemption.pointValue", v)}
                                min={1}
                                width="w-16"
                                suffix="pts"
                            />
                            <span className="text-stone-400">=</span>
                            <span>₹</span>
                            <NumInput
                                value={loyalty.redemption.currencyValue}
                                onChange={v => set("redemption.currencyValue", v)}
                                min={0}
                                width="w-16"
                            />
                        </div>
                    </FieldRow>

                    <FieldRow
                        label="Max redemption per bill"
                        hint="Cap how much of a bill can be paid via points. 100% = full bill allowed."
                    >
                        <NumInput
                            value={loyalty.redemption.maxRedeemPercent}
                            onChange={v => set("redemption.maxRedeemPercent", Math.min(100, Math.max(0, v)))}
                            min={0}
                            max={100}
                            width="w-16"
                            suffix="% of bill"
                        />
                    </FieldRow>

                    <FieldRow
                        label="Allow partial redemption"
                        hint="Customer can redeem any amount below their balance, not just exact multiples."
                    >
                        <Toggle
                            checked={loyalty.redemption.allowPartial}
                            onChange={v => set("redemption.allowPartial", v)}
                        />
                    </FieldRow>

                    <div className="pt-1 pb-3">
                        <RedemptionPreview redemption={loyalty.redemption} />
                    </div>
                </SubCard>

                {/* ══ 5. EXPIRY ═════════════════════════════════════════════════ */}
                <SubCard title="Points Expiry" icon={FiClock} accent="stone" dimmed={loyaltyOff}>
                    <FieldRow
                        label="Enable expiry"
                        hint="Points expire if a customer has no transaction for the set number of days (rolling — resets on every new purchase)."
                    >
                        <Toggle
                            checked={loyalty.expiry.isEnabled}
                            onChange={v => set("expiry.isEnabled", v)}
                        />
                    </FieldRow>

                    {loyalty.expiry.isEnabled && (
                        <FieldRow
                            label="Days of inactivity before expiry"
                            hint="Clock resets on every new transaction. e.g. 365 = points expire after 1 year of no purchases."
                        >
                            <NumInput
                                value={loyalty.expiry.days}
                                onChange={v => set("expiry.days", v)}
                                min={1}
                                width="w-20"
                                suffix="days"
                            />
                        </FieldRow>
                    )}

                    {loyalty.expiry.isEnabled && (
                        <div className="pb-3">
                            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 mt-1">
                                <FiRefreshCw size={11} className="text-blue-500 flex-shrink-0" />
                                <p className="text-[10px] text-blue-700 font-semibold">
                                    Rolling expiry — resets to {loyalty.expiry.days} days on every new transaction.
                                </p>
                            </div>
                        </div>
                    )}
                </SubCard>

                {/* ══ 6. MEMBERSHIP SETTINGS ════════════════════════════════════ */}
                {showMembership && (
                    <SubCard title="Membership (Family Wallet)" icon={FiUsers} accent="blue" dimmed={loyaltyOff}>
                        <FieldRow
                            label="Allow new membership creation"
                            hint="Toggle off to block stores from creating new memberships. Existing ones continue unaffected."
                        >
                            <Toggle
                                checked={loyalty.membership.allowCreation}
                                onChange={handleMembershipToggle}
                            />
                        </FieldRow>

                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pt-3 pb-1">
                            WhatsApp Notifications (Membership)
                        </p>

                        <FieldRow label="Send card when membership is created" tight>
                            <Toggle
                                checked={loyalty.membership.sendWhatsappOnCreate}
                                onChange={v => set("membership.sendWhatsappOnCreate", v)}
                            />
                        </FieldRow>
                        <FieldRow label="Send card when a new member is added" tight>
                            <Toggle
                                checked={loyalty.membership.sendWhatsappOnAdd}
                                onChange={v => set("membership.sendWhatsappOnAdd", v)}
                            />
                        </FieldRow>
                        <FieldRow label="Notify head when membership earns points" tight>
                            <Toggle
                                checked={loyalty.membership.sendWhatsappOnEarn}
                                onChange={v => set("membership.sendWhatsappOnEarn", v)}
                            />
                        </FieldRow>
                        {/* <FieldRow label="Notify head when points are redeemed" tight>
                            <Toggle
                                checked={loyalty.membership.sendWhatsappOnRedeem}
                                onChange={v => set("membership.sendWhatsappOnRedeem", v)}
                            />
                        </FieldRow> */}
                    </SubCard>
                )}

                {/* ══ 7. INDIVIDUAL NOTIFICATIONS ═══════════════════════════════ */}
                {showLoyaltyOnly && (
                    <SubCard title="WhatsApp Notifications (Individual)" icon={FiBell} accent="stone" dimmed={loyaltyOff}>
                        <FieldRow label="Notify customer when they earn points" tight>
                            <Toggle
                                checked={loyalty.notifications.onEarn}
                                onChange={v => set("notifications.onEarn", v)}
                            />
                        </FieldRow>
                        <FieldRow label="Notify customer when they redeem points" tight>
                            <Toggle
                                checked={loyalty.notifications.onRedeem}
                                onChange={v => set("notifications.onRedeem", v)}
                            />
                        </FieldRow>
                    </SubCard>
                )}

                {/* ══ SAVE FOOTER ═══════════════════════════════════════════════ */}
                <div className="flex items-center justify-between pt-1 pb-1">
                    <p className="text-[10px] text-stone-400 flex items-center gap-1.5">
                        <FiCheck size={10} className="text-emerald-400" />
                        Rules apply to all new transactions after saving.
                    </p>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-[11px] font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(249,115,22,0.4)] disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        {saving
                            ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                            : <><FiSave size={13} /> Save Loyalty Settings</>
                        }
                    </button>
                </div>

            </div>
        </div>
    );
}