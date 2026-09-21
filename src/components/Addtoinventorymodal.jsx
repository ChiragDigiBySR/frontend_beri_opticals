import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import {
    FiX, FiPackage, FiCheck, FiAlertCircle, FiImage,
    FiChevronDown, FiLoader, FiEye, FiTrash2, FiPlus,
    FiTag, FiDollarSign, FiHash, FiBox, FiLayers
} from "react-icons/fi";
import { toast } from "react-toastify";
import api from "../utils/api";

// ─── Shared style tokens ──────────────────────────────────────────────────────
const inp = "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 hover:border-gray-300 bg-white text-gray-700 transition placeholder:text-gray-300";
const inpErr = "w-full px-3 py-2 text-sm border border-red-300 rounded-xl outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 bg-red-50 text-gray-700 transition placeholder:text-gray-300";
const sel = inp + " cursor-pointer";
const lbl = "block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1";
const requiredLbl = "block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1";

const HSN_GST_MAP = [
    { keywords: ["FRAME"], hsnSac: "9003", gst: 5 },
    { keywords: ["SUNGLASS"], hsnSac: "9004", gst: 18 },
    { keywords: ["CONTACT"], hsnSac: "9001", gst: 12 },
    { keywords: ["LENS", "GLASS"], hsnSac: "9001", gst: 5 },
];

function resolveHsnGst(category = "") {
    const upper = (category || "").toUpperCase();
    for (const rule of HSN_GST_MAP) {
        if (rule.keywords.some((k) => upper.includes(k))) return rule;
    }
    return null;
}

function normalizeToJpeg(file) {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX = 1024;
            let w = img.naturalWidth, h = img.naturalHeight;
            if (w > MAX || h > MAX) {
                if (w > h) { h = Math.round((h / w) * MAX); w = MAX; }
                else { w = Math.round((w / h) * MAX); h = MAX; }
            }
            canvas.width = w; canvas.height = h;
            canvas.getContext("2d").drawImage(img, 0, 0, w, h);
            URL.revokeObjectURL(url);
            canvas.toBlob(
                (blob) => resolve(new File([blob], `product_${Date.now()}.jpg`, { type: "image/jpeg" })),
                "image/jpeg", 0.7
            );
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
    });
}

const isLensCat = (cat = "") => /lens|glass|contact/i.test(cat);
const isEyeglassCat = (cat = "") => cat.toUpperCase() === "EYEGLASS";
const isSunglass = (cat = "") => /sunglass/i.test(cat);

function Field({ label, required, error, children }) {
    return (
        <div>
            <label className={required ? requiredLbl : lbl}>
                {label}{required && <span className="text-orange-400 ml-0.5">*</span>}
            </label>
            {children}
            {error && (
                <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-1">
                    <FiAlertCircle size={9} /> {error}
                </p>
            )}
        </div>
    );
}

// ─── Section header ───────────────────────────────────────────────────────────
function Section({ icon: Icon, title, subtitle, color = "orange", children }) {
    const colors = {
        orange: "bg-orange-50 border-orange-100 text-orange-600",
        blue: "bg-blue-50 border-blue-100 text-blue-600",
        violet: "bg-violet-50 border-violet-100 text-violet-600",
        teal: "bg-teal-50 border-teal-100 text-teal-600",
    };
    return (
        <div className="mb-6">
            <div className={`flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100`}>
                <div className={`w-7 h-7 rounded-lg ${colors[color]} flex items-center justify-center border`}>
                    <Icon size={13} />
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-700">{title}</p>
                    {subtitle && <p className="text-[10px] text-gray-400">{subtitle}</p>}
                </div>
            </div>
            {children}
        </div>
    );
}

// ─── Image uploader widget ────────────────────────────────────────────────────
function ImageUploader({ file, previewUrl, onChange, onRemove }) {
    const ref = useRef(null);
    const preview = file ? URL.createObjectURL(file) : previewUrl;

    return (
        <div>
            {preview ? (
                <div className="relative w-full h-24 rounded-xl overflow-hidden border border-gray-200 group">
                    <img src={preview} alt="product" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button type="button"
                            onClick={() => window.open(preview, "_blank")}
                            className="p-1.5 bg-white/80 rounded-full text-gray-700 hover:bg-white transition">
                            <FiEye size={12} />
                        </button>
                        <button type="button"
                            onClick={onRemove}
                            className="p-1.5 bg-white/80 rounded-full text-red-500 hover:bg-white transition">
                            <FiTrash2 size={12} />
                        </button>
                    </div>
                </div>
            ) : (
                <button type="button" onClick={() => ref.current?.click()}
                    className="w-full h-24 border-2 border-dashed border-gray-200 hover:border-orange-300 rounded-xl flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-orange-400 transition group bg-gray-50 hover:bg-orange-50/30">
                    <FiImage size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-medium">Click to upload</span>
                </button>
            )}
            <input ref={ref} type="file" accept="image/*" className="hidden"
                onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const normalized = await normalizeToJpeg(f);
                    onChange(normalized);
                    e.target.value = "";
                }} />
        </div>
    );
}




// ─── Main component ───────────────────────────────────────────────────────────
export default function AddToInventoryModal({ onClose, onProductAdded, prefill = {}, suffix: defaultSuffix = "DO" }) {
    const settings = useSelector((state) => state.settings.data);
    const [vendors, setVendors] = useState([]);
    const [saving, setSaving] = useState(false);
    const [suffix, setSuffix] = useState(defaultSuffix);
    const [touched, setTouched] = useState({});
    const [imageFile, setImageFile] = useState(null);

    const emptyForm = {
        productCode: "",
        productName: prefill.productName || "",
        category: prefill.category || "",
        brand: "",
        color: "",
        size: "",
        type: "",
        shape: "",
        material: "",
        dimensions: "",
        price: "",
        gst: "0",
        hsnSac: "",
        mrp: "",
        qty: "1",
        vendorNumber: "",
        vendorName: "",
        // lens fields
        sph: "", cyl: "", index: "", axis: "", addition: "", coating: "", expiry: "",
        // eyeglass fields
        model_no: "", temple_material: "", frame_style: "", collection: "",
        product_warranty: "", gender: "", product_type: "", prescription_type: "",
        // sunglass fields
        frame_color: "", lens_color: "", lens_material: "", frame_type: "", frame_shape: "",
    };

    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});

    // Auto-fill HSN/GST when category changes
    useEffect(() => {
        if (!form.category) return;
        const resolved = resolveHsnGst(form.category);
        if (resolved) {
            setForm(prev => ({
                ...prev,
                hsnSac: resolved.hsnSac,
                gst: String(resolved.gst),
            }));
        }
    }, [form.category]);

    useEffect(() => {
        api.get("/vendor")
            .then(res => { if (res.data.success) setVendors(res.data.vendors || []); })
            .catch(() => { });
    }, []);

    const set = (key, val) => {
        setForm(prev => ({ ...prev, [key]: val }));
        setErrors(prev => ({ ...prev, [key]: undefined }));
    };

    const touch = (key) => setTouched(prev => ({ ...prev, [key]: true }));

    const validate = () => {
        const e = {};
        if (!form.productName.trim()) e.productName = "Required";
        if (!form.category) e.category = "Required";
        if (!form.brand.trim()) e.brand = "Required";
        if (!form.price || Number(form.price) <= 0) e.price = "Must be > 0";
        if (!form.mrp || Number(form.mrp) <= 0) e.mrp = "Must be > 0";
        if (!form.qty || Number(form.qty) <= 0) e.qty = "Must be > 0";
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            setTouched(Object.fromEntries(Object.keys(errs).map(k => [k, true])));
            toast.error("Please fix the highlighted fields");
            return;
        }

        try {
            setSaving(true);
            const formData = new FormData();
            const payload = [{
                ...form,
                price: Number(form.price),
                mrp: Number(form.mrp),
                qty: Number(form.qty),
                gst: Number(form.gst) || 0,
            }];
            formData.append("products", JSON.stringify(payload));
            formData.append("suffix", suffix);
            if (imageFile) formData.append("productImage_0", imageFile);

            const res = await api.post("/product", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (res.data.success) {
                const created = res.data.products?.[0];
                toast.success(`"${created?.productName}" added to inventory ✓`);
                onProductAdded?.(created);
                onClose();
            } else {
                toast.error(res.data.message || "Failed to add product");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    const isLens = isLensCat(form.category);
    const isEyeglass = isEyeglassCat(form.category);
    const isSun = isSunglass(form.category);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
                style={{ animation: "fadeIn 0.15s ease" }}
            />

            {/* Panel */}
            <div
                className="relative bg-white w-full max-w-xl h-full flex flex-col shadow-2xl overflow-hidden"
                style={{ animation: "slideInRight 0.22s cubic-bezier(.16,1,.3,1)" }}
            >
                <style>{`
                    @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
                    @keyframes slideInRight { from { transform:translateX(100%) } to { transform:translateX(0) } }
                `}</style>

                {/* ── Header ── */}
                <div className="flex-shrink-0 bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                                    <FiPackage size={14} className="text-white" />
                                </div>
                                <h2 className="text-base font-bold text-white">Add to Inventory</h2>
                            </div>
                            <p className="text-xs text-orange-100 ml-9">
                                Product will be saved and auto-selected in the job card
                            </p>
                        </div>
                        <button type="button" onClick={onClose}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition mt-0.5">
                            <FiX size={16} />
                        </button>
                    </div>

                    {/* Suffix chip */}
                    <div className="mt-4 flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                        <FiHash size={12} className="text-orange-200 flex-shrink-0" />
                        <span className="text-[10px] text-orange-100 font-medium uppercase tracking-wider flex-shrink-0">Code suffix</span>
                        <input
                            type="text"
                            value={suffix}
                            onChange={(e) => setSuffix(e.target.value.toUpperCase())}
                            className="flex-1 bg-transparent text-sm font-mono font-bold text-white placeholder:text-orange-200/60 outline-none border-b border-white/30 focus:border-white transition pb-0.5"
                            placeholder="DO"
                        />
                    </div>
                </div>

                {/* ── Form body ── */}
                <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto">
                    <div className="p-6 space-y-8">

                        {/* ── Core Details ── */}
                        <Section icon={FiPackage} title="Core Details" subtitle="Required to create the product" color="orange">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="Product Code" error={touched.productCode && errors.productCode}>
                                    <input type="text"
                                        value={form.productCode}
                                        onChange={(e) => set("productCode", e.target.value)}
                                        onBlur={() => touch("productCode")}
                                        placeholder="e.g. 101A"
                                        className={touched.productCode && errors.productCode ? inpErr : inp} />
                                </Field>
                                <Field label="Product Name" required error={touched.productName && errors.productName}>
                                    <input type="text"
                                        value={form.productName}
                                        onChange={(e) => set("productName", e.target.value.toUpperCase())}
                                        onBlur={() => touch("productName")}
                                        placeholder="e.g. TITAN EYEPLUS RIMLESS"
                                        className={touched.productName && errors.productName ? inpErr : inp} />
                                </Field>


                                <Field label="Category" required error={touched.category && errors.category}>
                                    <div className="relative">
                                        <select
                                            value={form.category}
                                            onChange={(e) => set("category", e.target.value)}
                                            onBlur={() => touch("category")}
                                            className={`${touched.category && errors.category ? inpErr : sel} appearance-none pr-8`}>
                                            <option value="">Select category</option>
                                            {settings?.allCategories?.map((cat, i) => (
                                                <option key={i} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <FiChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </Field>

                                <Field label="Brand" required error={touched.brand && errors.brand}>
                                    <input type="text"
                                        value={form.brand}
                                        onChange={(e) => set("brand", e.target.value.toUpperCase())}
                                        onBlur={() => touch("brand")}
                                        placeholder="e.g. TITAN"
                                        className={touched.brand && errors.brand ? inpErr : inp} />
                                </Field>

                                <Field label="Color">
                                    <input type="text" value={form.color}
                                        onChange={(e) => set("color", e.target.value.toUpperCase())}
                                        placeholder="e.g. MATTE BLACK" className={inp} />
                                </Field>

                                <Field label="Size">
                                    <input type="text" value={form.size}
                                        onChange={(e) => set("size", e.target.value.toUpperCase())}
                                        placeholder="e.g. MEDIUM" className={inp} />
                                </Field>

                                <Field label="Type">
                                    <input type="text" value={form.type}
                                        onChange={(e) => set("type", e.target.value.toUpperCase())}
                                        placeholder="e.g. FULL RIM" className={inp} />
                                </Field>

                                <Field label="Shape">
                                    <input type="text" value={form.shape}
                                        onChange={(e) => set("shape", e.target.value.toUpperCase())}
                                        placeholder="e.g. ROUND" className={inp} />
                                </Field>

                                <Field label="Material">
                                    <input type="text" value={form.material}
                                        onChange={(e) => set("material", e.target.value.toUpperCase())}
                                        placeholder="e.g. ACETATE" className={inp} />
                                </Field>
                            </div>
                        </Section>

                        {/* ── Pricing ── */}
                        <Section icon={FiDollarSign} title="Pricing & Tax" subtitle="Purchase price, MRP, GST" color="violet">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <Field label="Purchase Price (₹)" required error={touched.price && errors.price}>
                                    <input type="number" min="0" step="0.01"
                                        value={form.price}
                                        onChange={(e) => set("price", e.target.value)}
                                        onBlur={() => touch("price")}
                                        placeholder="0.00"
                                        className={touched.price && errors.price ? inpErr : inp} />
                                </Field>

                                <Field label="MRP (₹)" required error={touched.mrp && errors.mrp}>
                                    <input type="number" min="0" step="0.01"
                                        value={form.mrp}
                                        onChange={(e) => set("mrp", e.target.value)}
                                        onBlur={() => touch("mrp")}
                                        placeholder="0.00"
                                        className={touched.mrp && errors.mrp ? inpErr : inp} />
                                </Field>

                                <Field label="Qty" required error={touched.qty && errors.qty}>
                                    <input type="number" min="1"
                                        value={form.qty}
                                        onChange={(e) => set("qty", e.target.value)}
                                        onBlur={() => touch("qty")}
                                        placeholder="1"
                                        className={touched.qty && errors.qty ? inpErr : inp} />
                                </Field>

                                <Field label="GST %">
                                    <div className="relative">
                                        <select value={form.gst}
                                            onChange={(e) => set("gst", e.target.value)}
                                            className={`${sel} appearance-none pr-8`}>
                                            {settings?.gst?.length
                                                ? settings.gst.map((g, i) => <option key={i} value={g}>{g}%</option>)
                                                : [0, 5, 12, 18, 28].map(g => <option key={g} value={g}>{g}%</option>)
                                            }
                                        </select>
                                        <FiChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </Field>

                                <Field label="HSN/SAC">
                                    <input type="text" value={form.hsnSac}
                                        onChange={(e) => set("hsnSac", e.target.value)}
                                        placeholder="e.g. 9003" className={inp} />
                                </Field>

                                <Field label="Vendor">
                                    <div className="relative">
                                        <select
                                            value={form.vendorNumber}
                                            onChange={(e) => {
                                                const num = e.target.value;
                                                const name = e.target.options[e.target.selectedIndex].text;
                                                set("vendorNumber", num);
                                                set("vendorName", num ? name : "");
                                            }}
                                            className={`${sel} appearance-none pr-8`}>
                                            <option value="">None</option>
                                            {vendors.map((v) => (
                                                <option key={v.vendorNumber} value={v.vendorNumber}>{v.name}</option>
                                            ))}
                                        </select>
                                        <FiChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </Field>
                            </div>
                        </Section>

                        {/* ── Lens fields ── */}
                        {isLens && (
                            <Section icon={FiLayers} title="Lens Specifications" subtitle="Optical parameters for this lens" color="blue">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {[
                                        { key: "sph", label: "SPH", placeholder: "+1.00" },
                                        { key: "cyl", label: "CYL", placeholder: "-0.50" },
                                        { key: "index", label: "Index", placeholder: "1.56" },
                                        { key: "axis", label: "Axis", placeholder: "90" },
                                        { key: "addition", label: "Addition", placeholder: "+1.00" },
                                        { key: "coating", label: "Coating", placeholder: "AR COATING" },
                                    ].map(({ key, label, placeholder }) => (
                                        <Field key={key} label={label}>
                                            <input type="text" value={form[key]}
                                                onChange={(e) => set(key, e.target.value.toUpperCase())}
                                                placeholder={placeholder} className={inp} />
                                        </Field>
                                    ))}
                                    <Field label="Expiry">
                                        <input type="date" value={form.expiry}
                                            onChange={(e) => set("expiry", e.target.value)}
                                            className={inp} />
                                    </Field>
                                </div>
                            </Section>
                        )}

                        {/* ── Eyeglass fields ── */}
                        {isEyeglass && (
                            <Section icon={FiBox} title="Frame Details" subtitle="Eyeglass-specific attributes" color="teal">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {[
                                        { key: "model_no", label: "Model No." },
                                        { key: "temple_material", label: "Temple Material" },
                                        { key: "frame_style", label: "Frame Style" },
                                        { key: "collection", label: "Collection" },
                                        { key: "product_warranty", label: "Warranty" },
                                        { key: "gender", label: "Gender" },
                                        { key: "product_type", label: "Product Type" },
                                        { key: "prescription_type", label: "Prescription Type" },
                                    ].map(({ key, label }) => (
                                        <Field key={key} label={label}>
                                            <input type="text" value={form[key]}
                                                onChange={(e) => set(key, e.target.value.toUpperCase())}
                                                placeholder={label} className={inp} />
                                        </Field>
                                    ))}
                                </div>
                            </Section>
                        )}

                        {/* ── Sunglass fields ── */}
                        {isSun && (
                            <Section icon={FiBox} title="Sunglass Details" subtitle="Sunglass-specific attributes" color="teal">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {[
                                        { key: "frame_color", label: "Frame Color" },
                                        { key: "lens_color", label: "Lens Color" },
                                        { key: "lens_material", label: "Lens Material" },
                                        { key: "temple_material", label: "Temple Material" },
                                        { key: "frame_type", label: "Frame Type" },
                                        { key: "frame_shape", label: "Frame Shape" },
                                        { key: "frame_style", label: "Frame Style" },
                                        { key: "collection", label: "Collection" },
                                        { key: "product_warranty", label: "Warranty" },
                                        { key: "gender", label: "Gender" },
                                        { key: "prescription_type", label: "Prescription Type" },
                                        { key: "product_type", label: "Product Type" },
                                    ].map(({ key, label }) => (
                                        <Field key={key} label={label}>
                                            <input type="text" value={form[key]}
                                                onChange={(e) => set(key, e.target.value.toUpperCase())}
                                                placeholder={label} className={inp} />
                                        </Field>
                                    ))}
                                </div>
                            </Section>
                        )}

                        {/* ── Image ── */}
                        <Section icon={FiTag} title="Product Image" subtitle="Optional — shown on job cards" color="orange">
                            <ImageUploader
                                file={imageFile}
                                previewUrl={null}
                                onChange={setImageFile}
                                onRemove={() => setImageFile(null)}
                            />
                        </Section>

                    </div>
                </form>

                {/* ── Footer ── */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between gap-3">
                    <button type="button" onClick={onClose}
                        className="px-4 py-2.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                        Cancel
                    </button>

                    <div className="flex items-center gap-2">
                        {/* Validation summary pill */}
                        {Object.keys(validate()).length > 0 && Object.keys(touched).length > 0 && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-100 rounded-xl">
                                <FiAlertCircle size={11} className="text-red-400" />
                                <span className="text-[10px] text-red-500 font-medium">
                                    {Object.keys(validate()).length} field{Object.keys(validate()).length > 1 ? "s" : ""} missing
                                </span>
                            </div>
                        )}

                        <button type="button"
                            onClick={handleSubmit}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-semibold rounded-xl transition shadow-md shadow-orange-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
                            {saving
                                ? <><FiLoader size={13} className="animate-spin" /> Saving…</>
                                : <><FiCheck size={13} /> Save & Select</>
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}



