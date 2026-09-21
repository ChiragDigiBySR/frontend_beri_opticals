import { useState } from "react";
import api from "../utils/api";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";

/* ─── Inline icons ──────────────────────────────────────────────────────── */
const Ico = {
  User: () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  Phone: () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.29 6.29l.94-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  Mail: () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  Lock: () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  Calendar: () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  Percent: () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>,
  Shield: () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  Layout: () => <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>,
  Save: () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>,
};

/* ─── Shared styles ─────────────────────────────────────────────────────── */
const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all placeholder-gray-300";
const labelCls = "text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5";

/* ─── Field wrapper ─────────────────────────────────────────────────────── */
const Field = ({ label, icon: Ic, children }) => (
  <div>
    <label className={labelCls}>
      {Ic && <span className="inline-flex items-center gap-1.5"><Ic />{label}</span>}
      {!Ic && label}
    </label>
    {children}
  </div>
);

/* ─── Section box ───────────────────────────────────────────────────────── */
const CheckSection = ({ icon: Ic, title, count, selected, children }) => (
  <div className="border border-gray-100 rounded-xl overflow-hidden">
    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-md bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center">
          <Ic />
        </span>
        <span className="text-xs font-bold text-gray-700">{title}</span>
      </div>
      <span className="text-[10px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">
        {selected}/{count}
      </span>
    </div>
    <div className="p-3">{children}</div>
  </div>
);

/* ─── Checkbox item ─────────────────────────────────────────────────────── */
const CheckItem = ({ label, checked, onChange }) => (
  <div
    role="checkbox"
    aria-checked={checked}
    tabIndex={0}
    onClick={onChange}
    onKeyDown={(e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onChange();
      }
    }}
    className={`flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all select-none outline-none focus-visible:ring-2 focus-visible:ring-orange-300
      ${checked ? "bg-orange-50 border border-orange-200" : "bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50"}`}
  >
    <div className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center border-2 shrink-0 transition-all
      ${checked ? "bg-orange-500 border-orange-500" : "border-gray-300 bg-white"}`}>
      {checked && (
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
          <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
    <span className={`text-xs leading-tight break-words min-w-0 font-medium ${checked ? "text-orange-700" : "text-gray-600"}`}>
      {label}
    </span>
  </div>
);

export default function UserForm({ refresh, users, storePages, storePermissions }) {
  const [mode, setMode] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({
    name: "", mobile: "", email: "", password: "", expiry: "",
    pages: [], permissions: [], commission: 0, address: "",
    role: "ADMIN", designation: "ADMIN",
  });
  const [selectedPages, setSelectedPages] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const permissions = useSelector((state) => state.auth.user.permissions);

  const roleDefaults = {
    ADMIN: {
      pages: [...storePages], // all pages
      permissions: [...storePermissions], // all permissions
    },
    STAFF: {
      pages: storePages.filter(p => !["USERS", "JOB CARDS EDIT", "MAIN REPORTS", "DAILY REPORTS", "TASKS REPORTS", "PROMOTION", "SETTINGS", "ADD TASK", "HELP"].includes(p)), // exclude these pages
      permissions: storePermissions.filter(p => !["EDIT JC", "DELETE JC", "DELETE SALES", "DELETE EXPENSES", "DELETE PRESCRIPTION", "EDIT VENDOR", "DELTE VENDOR", "DELETE VENDOR ORDER", "ADD USER", "UPDATE USER", "DELETE USER"].includes(p)), // exclude these permissions
    },
  };

  const handleResetForm = () => {
    setForm({ name: "", mobile: "", email: "", password: "", expiry: "", pages: [], permissions: [], commission: 0, address: "", role: "ADMIN", designation: "ADMIN" });
    setSelectedPages([]);
    setSelectedPermissions([]);
  };

  // const handleChange = (e) => {
  //   const { name, value } = e.target;
  //   setForm({ ...form, [name]: name === "commission" ? Number(value) : value });
  // };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Update form
    setForm(prev => ({
      ...prev,
      [name]: name === "commission" ? Number(value) : value,
    }));

    // Auto-select pages & permissions when role changes
    if (name === "role") {
      const defaults = roleDefaults[value] || { pages: [], permissions: [] };
      setSelectedPages(defaults.pages);
      setSelectedPermissions(defaults.permissions);
    }
  };

  const handlePageChange = (page) => setSelectedPages((prev) => prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page]);
  const handlePermissionChange = (perm) => setSelectedPermissions((prev) => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);

  const loadUser = (id) => {
    const user = users.find(u => u._id === id);
    setSelectedId(id);
    setForm({ ...user, expiry: user.expiry ? new Date(user.expiry).toISOString().split("T")[0] : "" });
    setSelectedPages(user.pages || []);
    setSelectedPermissions(user.permissions || []);
  };

  const handleSubmit = async () => {
    if (!mode) return toast.error("Please select action");
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.mobile.trim()) return toast.error("Mobile is required");
    if (!form.email.trim()) return toast.error("Email is required");
    if (!form.designation) return toast.error("Designation is required");
    if (!form.role) return toast.error("Role is required");
    if (!form.expiry) return toast.error("Expiry date is required");
    if (mode === "new" && !form.password) return toast.error("Password is required for new user");
    if (selectedPages.length === 0) return toast.error("Select at least one page access");
    if (selectedPermissions.length === 0) return toast.error("Select at least one permission");

    const payload = { ...form, expiry: new Date(form.expiry), commission: Number(form.commission), pages: selectedPages, permissions: selectedPermissions };

    try {
      if (mode === "new") {
        await api.post("/users/add-user", payload);
        toast.success("User created successfully");
      } else {
        await api.put(`/users/update-user/${selectedId}`, payload);
        toast.success("User updated successfully");
      }
      handleResetForm();
      setMode("");
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || "Something went wrong");
    }
  };

  return (
    <div className="space-y-4">

      {/* ── Action selector ── */}
      <Field label="Action">
        <select className={inputCls} value={mode} onChange={e => { setMode(e.target.value); handleResetForm(); }}>
          <option value="">Select Action</option>
          {permissions.includes("ADD USER") && <option value="new">New Employee</option>}
          {permissions.includes("UPDATE USER") && <option value="update">Update Employee</option>}
        </select>
      </Field>

      {mode === "update" && (
        <Field label="Select User">
          <select className={inputCls} onChange={e => loadUser(e.target.value)}>
            <option value="">Select User</option>
            {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </Field>
      )}

      {mode && (
        <>
          {/* ── Basic info ── */}
          <div className="space-y-3">
            <Field label="Full Name" icon={Ico.User}>
              <input name="name" value={form.name || ""} onChange={handleChange} placeholder="Employee name" className={inputCls} />
            </Field>
            <Field label="Mobile" icon={Ico.Phone}>
              <input name="mobile" value={form.mobile || ""} onChange={handleChange} placeholder="10-digit mobile" className={inputCls} />
            </Field>
            <Field label="Email" icon={Ico.Mail}>
              <input name="email" value={form.email || ""} onChange={handleChange} placeholder="Email address" className={inputCls} />
            </Field>
            {mode === "new" && (
              <Field label="Password" icon={Ico.Lock}>
                <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Set password" className={inputCls} />
              </Field>
            )}
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-gray-100" />

          {/* ── Role & meta ── */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Role">
                <select name="role" value={form.role} onChange={handleChange} className={inputCls}>
                  <option value="ADMIN">ADMIN</option>
                  <option value="STAFF">STAFF</option>
                </select>
              </Field>
              <Field label="Designation">
                <select name="designation" value={form.designation} onChange={handleChange} className={inputCls}>
                  <option value="">Select</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUB_ADMIN">SUB ADMIN</option>
                  <option value="STAFF">STAFF</option>
                  <option value="DOCTOR">DOCTOR</option>
                  <option value="RECEPTION">RECEPTION</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Expiry Date" icon={Ico.Calendar}>
                <input name="expiry" type="date" value={form.expiry || ""} onChange={handleChange} className={inputCls} />
              </Field>
              <Field label="Commission %" icon={Ico.Percent}>
                <input name="commission" type="number" value={form.commission || 0} onChange={handleChange} placeholder="0" className={inputCls} />
              </Field>
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-gray-100" />

          {/* ── Pages access ── */}
          <CheckSection
            icon={Ico.Layout}
            title="Pages Access"
            count={storePages.length}
            selected={selectedPages.length}
          >
            {storePages.length === 0 ? (
              <p className="text-xs text-gray-300 text-center py-3">No pages available</p>
            ) : (
              <div className="grid grid-cols-1 gap-1.5 max-h-52 overflow-y-auto pr-1">
                {storePages.map(page => (
                  <CheckItem
                    key={page}
                    label={page}
                    checked={selectedPages.includes(page)}
                    onChange={() => handlePageChange(page)}
                  />
                ))}
              </div>
            )}
          </CheckSection>

          {/* ── Permissions ── */}
          <CheckSection
            icon={Ico.Shield}
            title="Permissions"
            count={storePermissions.length}
            selected={selectedPermissions.length}
          >
            {storePermissions.length === 0 ? (
              <p className="text-xs text-gray-300 text-center py-3">No permissions available</p>
            ) : (
              <div className="grid grid-cols-1 gap-1.5 max-h-52 overflow-y-auto pr-1">
                {storePermissions.map(perm => (
                  <CheckItem
                    key={perm}
                    label={perm}
                    checked={selectedPermissions.includes(perm)}
                    onChange={() => handlePermissionChange(perm)}
                  />
                ))}
              </div>
            )}
          </CheckSection>

          {/* ── Submit ── */}
          <button
            onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-sm font-bold py-2.5 rounded-xl transition-all shadow-sm shadow-orange-200 cursor-pointer"
          >
            <Ico.Save />
            {mode === "new" ? "Create User" : "Update User"}
          </button>
        </>
      )}
    </div>
  );
}