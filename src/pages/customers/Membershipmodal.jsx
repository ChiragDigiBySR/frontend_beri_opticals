import { useEffect, useRef, useState } from "react";
import {
    FiX, FiUsers, FiSearch, FiStar, FiUser, FiTrash2,
    FiPlusCircle, FiCheckCircle, FiShield, FiPhone,
} from "react-icons/fi";
import api from "../../utils/api";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import Swal from "sweetalert2";

// ─── Reuse the same shared primitives as CustomerList ────────────────────────
const Modal = ({ onClose, children, maxWidth = "max-w-lg" }) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={onClose}
    >
        <div
            className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} animate-fadeIn`}
            onClick={e => e.stopPropagation()}
        >
            {children}
        </div>
        <style>{`
            @keyframes fadeIn { from{opacity:0;transform:scale(.97) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)} }
            .animate-fadeIn { animation:fadeIn .18s ease both }
        `}</style>
    </div>
);

const ModalHeader = ({ title, subtitle, onClose, icon }) => (
    <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
            {icon && (
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                    {icon}
                </div>
            )}
            <div>
                <h2 className="text-sm font-bold text-gray-800">{title}</h2>
                {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
        </div>
        <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:bg-gray-100 transition"
        >
            <FiX size={15} />
        </button>
    </div>
);

const ModalFooter = ({ children }) => (
    <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/60 rounded-b-2xl">
        {children}
    </div>
);

// ─── Small badge for membership role ─────────────────────────────────────────
function RoleBadge({ role }) {
    return role === "head" ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">
            <FiShield size={9} /> Head
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-500">
            <FiUser size={9} /> Member
        </span>
    );
}

// ─── Customer search / picker with debounce ───────────────────────────────────
function CustomerPicker({ storeCustomers, alreadyPicked, onPick, placeholder = "Search customer…" }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = e => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleChange = e => {
        const q = e.target.value;
        setQuery(q);
        if (!q.trim()) { setResults([]); setOpen(false); return; }
        const lq = q.toLowerCase();
        const filtered = storeCustomers.filter(
            c =>
                !alreadyPicked.includes(c.custNumber) &&
                (c.name?.toLowerCase().includes(lq) ||
                    c.mobile?.includes(q) ||
                    c.custNumber?.toLowerCase().includes(lq))
        );
        setResults(filtered.slice(0, 8));
        setOpen(true);
    };

    const select = c => {
        onPick(c);
        setQuery("");
        setResults([]);
        setOpen(false);
    };

    return (
        <div ref={ref} className="relative">
            <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                <input
                    type="text"
                    value={query}
                    onChange={handleChange}
                    onFocus={() => results.length > 0 && setOpen(true)}
                    placeholder={placeholder}
                    className="w-full pl-8 pr-3 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition placeholder-gray-400"
                />
            </div>
            {open && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                    <ul className="max-h-48 overflow-y-auto">
                        {results.map(c => (
                            <li key={c.custNumber}>
                                <button
                                    onMouseDown={() => select(c)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50 transition text-left"
                                >
                                    <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                                        <FiUser size={11} className="text-emerald-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                                        <p className="text-xs text-gray-400 truncate">
                                            {c.custNumber} · {c.mobile}
                                            {(c.loyalty_points > 0) && (
                                                <span className="ml-1 text-amber-500 font-semibold">
                                                    ★ {c.loyalty_points}pts
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {open && results.length === 0 && query.trim() && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 text-xs text-gray-400">
                    No matching customers found.
                </div>
            )}
        </div>
    );
}

// ─── Member row in create form ────────────────────────────────────────────────
function MemberChip({ customer, onRemove }) {
    return (
        <div className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                    <FiUser size={11} className="text-blue-500" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{customer.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">
                        {customer.custNumber} · <FiPhone size={9} className="inline" /> {customer.mobile}
                        {(customer.loyalty_points > 0) && (
                            <span className="ml-1 text-amber-500 font-semibold">· ★ {customer.loyalty_points}pts</span>
                        )}
                    </p>
                </div>
            </div>
            <button
                onClick={() => onRemove(customer.custNumber)}
                className="p-1 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-50 transition flex-shrink-0"
            >
                <FiX size={13} />
            </button>
        </div>
    );
}

// ─── Existing membership view ─────────────────────────────────────────────────
function MembershipView({ membership, onAddMember, allCustomers, onMemberRemoved, loading }) {
    const [removing, setRemoving] = useState(null);

    const handleRemove = async (custNumber) => {


        const result = await Swal.fire({
            title: "Remove Member?",
            text: "This customer will be removed from the membership.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#9ca3af",
            confirmButtonText: "Yes, Remove",
            cancelButtonText: "Cancel",
            reverseButtons: true,
        });

        if (!result.isConfirmed) return;


        setRemoving(custNumber);
        try {
            const res = await api.delete(
                `/memberships/${membership.membershipId}/members/${custNumber}`
            );
            if (res.data.success) {
                toast.success("Member removed.");
                onMemberRemoved(custNumber);
            } else {
                toast.error(res.data.message);
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to remove member.");
        } finally {
            setRemoving(null);
        }
    };

    const allPicked = [
        membership.headCustNumber,
        ...membership.members.map(m => m.custNumber),
    ];

    return (
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Membership ID card */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white relative overflow-hidden">
                <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
                <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/10" />
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Membership ID</p>
                <p className="text-2xl font-black tracking-wider">{membership.membershipId}</p>
                <div className="mt-3 flex items-center gap-2">
                    <FiStar size={13} className="opacity-70" />
                    <span className="text-sm font-bold">{membership.membershipPoints ?? 0}</span>
                    <span className="text-xs opacity-70">Membership Points</span>
                </div>
                <p className="text-[10px] opacity-60 mt-1">
                    Created {new Date(membership.createdAt).toLocaleDateString("en-IN")}
                </p>
            </div>

            {/* Head member */}
            <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Head Member</p>
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <FiShield size={15} className="text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800">{membership.headName}</p>
                        <p className="text-xs text-gray-500">{membership.headCustNumber} · {membership.headMobile}</p>
                    </div>
                    <RoleBadge role="head" />
                </div>
            </div>

            {/* Other members */}
            <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Members ({membership.members?.length ?? 0})
                </p>
                {membership.members?.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No additional members yet.</p>
                ) : (
                    <div className="space-y-2">
                        {membership.members.map(m => (
                            <div
                                key={m.custNumber}
                                className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                                        <FiUser size={13} className="text-blue-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{m.name}</p>
                                        <p className="text-xs text-gray-400 truncate">
                                            {m.custNumber} · {m.mobile}
                                            {m.pointsContributed > 0 && (
                                                <span className="ml-1 text-amber-500">· ★ {m.pointsContributed} contributed</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemove(m.custNumber)}
                                    disabled={removing === m.custNumber}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-50 transition disabled:opacity-40 flex-shrink-0"
                                    title="Remove member"
                                >
                                    {removing === m.custNumber
                                        ? <div className="w-3.5 h-3.5 border-2 border-red-300 border-t-transparent rounded-full animate-spin" />
                                        : <FiTrash2 size={13} />}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add new member */}
            <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Add New Member</p>
                <CustomerPicker
                    storeCustomers={allCustomers}
                    alreadyPicked={allPicked}
                    onPick={onAddMember}
                    placeholder="Search customer to add…"
                />
                <p className="text-[10px] text-gray-400 mt-1.5">
                    Their loyalty points will move to the membership pool on add.
                </p>
            </div>
        </div>
    );
}

// ─── Create membership form ───────────────────────────────────────────────────
function CreateMembershipForm({ triggerCustomer, allCustomers, onCreated }) {
    const [head, setHead] = useState(triggerCustomer || null);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();

    const alreadyPicked = [
        head?.custNumber,
        ...members.map(m => m.custNumber),
    ].filter(Boolean);

    // Total points that will move to pool on create
    const poolPreview =
        (head?.loyalty_points || 0) + members.reduce((sum, m) => sum + (m.loyalty_points || 0), 0);

    const handleCreate = async () => {

        if (!head) return toast.warning("Please select a head member.");

        const result = await Swal.fire({
            title: "Create Membership?",
            html: `
            <div style="font-size:13px;color:#6b7280">
                <p style="margin-bottom:8px">
                    <strong>${poolPreview} points</strong> will move to the membership pool.
                </p>
                <p>Individual loyalty balances will reset to 0.</p>
            </div>
        `,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#10b981",
            cancelButtonColor: "#9ca3af",
            confirmButtonText: "Create Membership",
            cancelButtonText: "Cancel",
            reverseButtons: true,
        });

        if (!result.isConfirmed) return;

        setLoading(true);
        dispatch(showLoader());
        try {
            const res = await api.post("/memberships", {
                headCustNumber: head.custNumber,
                memberCustNumbers: members.map(m => m.custNumber),
            });
            if (res.data.success) {
                toast.success("Membership created! WhatsApp sent to head.");
                onCreated(res.data.membership);
            } else {
                toast.error(res.data.message);
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to create membership.");
        } finally {
            setLoading(false);
            dispatch(hideLoader());
        }
    };

    return (
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Info banner */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-xs text-emerald-700 leading-relaxed">
                <p className="font-bold mb-0.5">How it works</p>
                All existing loyalty points of selected customers move into the membership pool.
                Future points earned by any member go to the pool too.
                A WhatsApp card is sent to the head member on creation and when members are added.
            </div>

            {/* Head member picker */}
            <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">
                    Head Member <span className="text-red-400">*</span>
                </p>
                {head ? (
                    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <FiShield size={13} className="text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">{head.name}</p>
                            <p className="text-xs text-gray-500">
                                {head.custNumber} · {head.mobile}
                                {(head.loyalty_points > 0) && (
                                    <span className="ml-1 text-amber-500 font-semibold">· ★ {head.loyalty_points}pts</span>
                                )}
                            </p>
                        </div>
                        <button
                            onClick={() => setHead(null)}
                            className="p-1 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-50 transition"
                        >
                            <FiX size={13} />
                        </button>
                    </div>
                ) : (
                    <CustomerPicker
                        storeCustomers={allCustomers}
                        alreadyPicked={alreadyPicked}
                        onPick={setHead}
                        placeholder="Search head member…"
                    />
                )}
            </div>

            {/* Additional members */}
            <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">
                    Additional Members <span className="text-gray-400 font-normal">(optional)</span>
                </p>
                <CustomerPicker
                    storeCustomers={allCustomers}
                    alreadyPicked={alreadyPicked}
                    onPick={c => setMembers(prev => [...prev, c])}
                    placeholder="Search members to add…"
                />
                {members.length > 0 && (
                    <div className="mt-3 space-y-2">
                        {members.map(m => (
                            <MemberChip
                                key={m.custNumber}
                                customer={m}
                                onRemove={cn => setMembers(prev => prev.filter(x => x.custNumber !== cn))}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Points preview */}
            {(head || members.length > 0) && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-center gap-3">
                    <FiStar size={16} className="text-amber-500 flex-shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-amber-700">
                            {poolPreview} pts will move to the membership pool
                        </p>
                        <p className="text-[10px] text-amber-600 mt-0.5">
                            Individual loyalty balances will reset to 0.
                        </p>
                    </div>
                </div>
            )}

            {/* Create button */}
            <button
                onClick={handleCreate}
                disabled={loading || !head}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    <FiCheckCircle size={15} />
                )}
                {loading ? "Creating…" : "Create Membership"}
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export: MembershipModal
// Props:
//   customer    — the customer row that was clicked (used to pre-detect membership)
//   allCustomers — the full allData array from CustomerList (for search picker)
//   onClose     — close handler
// ─────────────────────────────────────────────────────────────────────────────
export default function MembershipModal({ customer, allCustomers, onClose }) {
    const [membership, setMembership] = useState(null);
    const [loading, setLoading] = useState(true);
    const [addingMember, setAddingMember] = useState(false);
    const dispatch = useDispatch();

    // ── Fetch existing membership for this customer ──────────────────────────
    useEffect(() => {
        (async () => {
            setLoading(true);
            dispatch(showLoader());
            try {
                const res = await api.get(`/memberships/customer/${customer.custNumber}`);
                if (res.data.success) setMembership(res.data.membership);
            } catch (err) {
                console.error("Fetch membership error:", err);
            } finally {
                setLoading(false);
                dispatch(hideLoader());
            }
        })();
    }, [customer.custNumber]);

    // ── Handle adding a new member inline ────────────────────────────────────
    const handleAddMember = async (newCustomer) => {


        const result = await Swal.fire({
            title: "Add Member?",
            html: `
            <div style="font-size:13px;color:#6b7280">
                Add <strong>${newCustomer.name}</strong> to this membership?
            </div>
        `,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#10b981",
            cancelButtonColor: "#9ca3af",
            confirmButtonText: "Add Member",
            cancelButtonText: "Cancel",
            reverseButtons: true,
        });

        if (!result.isConfirmed) return;


        setAddingMember(true);
        try {
            const res = await api.post(`/memberships/${membership.membershipId}/add-member`, {
                custNumber: newCustomer.custNumber,
            });
            if (res.data.success) {
                toast.success(`${newCustomer.name} added! WhatsApp sent to head.`);
                setMembership(res.data.membership);
            } else {
                toast.error(res.data.message);
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to add member.");
        } finally {
            setAddingMember(false);
        }
    };

    // ── Handle member removal (optimistic UI) ─────────────────────────────────
    const handleMemberRemoved = (custNumber) => {
        setMembership(prev => ({
            ...prev,
            members: prev.members.filter(m => m.custNumber !== custNumber),
        }));
    };

    return (
        <Modal onClose={onClose} maxWidth="max-w-xl">
            <ModalHeader
                title="Membership"
                subtitle={`${customer.name} · ${customer.custNumber}`}
                onClose={onClose}
                icon={<FiUsers size={15} className="text-emerald-600" />}
            />

            {loading ? (
                <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                    <div className="w-5 h-5 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Checking membership…</span>
                </div>
            ) : membership ? (
                <MembershipView
                    membership={membership}
                    allCustomers={allCustomers}
                    onAddMember={handleAddMember}
                    onMemberRemoved={handleMemberRemoved}
                    loading={addingMember}
                />
            ) : (
                <CreateMembershipForm
                    triggerCustomer={customer}
                    allCustomers={allCustomers}
                    onCreated={newMembership => setMembership(newMembership)}
                />
            )}

            <ModalFooter>
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                >
                    Close
                </button>
            </ModalFooter>
        </Modal>
    );
}