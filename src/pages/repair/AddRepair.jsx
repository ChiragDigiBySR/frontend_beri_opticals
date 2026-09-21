import { useState, useRef, useEffect, useCallback } from "react";
import api from "../../utils/api";
import { toast } from "react-toastify";
import { FiUser, FiPhone, FiMail, FiTool, FiDollarSign, FiAlertCircle, FiCalendar, FiMessageSquare, FiCamera, FiImage, FiPlus, FiTrash2, FiSave } from "react-icons/fi";

const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all placeholder-gray-300";
const labelCls = "text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5";

/* ───── IMAGE NORMALIZATION ───── */
const normalizeToJpeg = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX = 1024;
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round((h / w) * MAX); w = MAX; }
        else { w = Math.round((w / h) * MAX); h = MAX; }
      }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          resolve(new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.6
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });

export default function AddRepair() {
  const today = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({ name: "", mobile: "", email: "", item: "", issue: "", deliveryDate: "", price: "", remark: "" });
  const [images, setImages] = useState([]); // {file, preview}
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  useEffect(() => { return () => images.forEach(img => URL.revokeObjectURL(img.preview)); }, [images]);

  const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };

  const addImages = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    const incoming = Array.from(files);
    if (incoming.length + images.length > 10) {
      toast.error("Maximum 10 images allowed"); return;
    }
    setProcessing(true);
    try {
      const normalized = await Promise.all(incoming.map(normalizeToJpeg));
      setImages(prev => [
        ...prev,
        ...normalized.map(file => ({ file, preview: URL.createObjectURL(file) }))
      ]);
    } catch (err) {
      toast.error("Image processing failed");
    } finally { setProcessing(false); }
  }, [images]);

  const removeImage = useCallback((index) => {
    setImages(prev => { URL.revokeObjectURL(prev[index].preview); return prev.filter((_, i) => i !== index); });
  }, []);

  const clearAll = useCallback(() => { setImages(prev => { prev.forEach(img => URL.revokeObjectURL(img.preview)); return []; }); }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!formData.name) return toast.error("Customer name required");
    if (!formData.mobile) return toast.error("Mobile required");
    if (!formData.item) return toast.error("Item required");

    try {
      setLoading(true);
      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      images.forEach(img => data.append("images", img.file, img.file.name || "camera.jpg"));
      const res = await api.post("/repair/", data);
      if (res.data.success) {
        toast.success("Repair created successfully");
        setFormData({ name: "", mobile: "", email: "", item: "", issue: "", deliveryDate: "", price: "", remark: "" });
        clearAll();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error creating repair");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa] p-4 md:p-5">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* LEFT PANEL — Repair Details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50">
              <span className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center shrink-0"><FiTool size={13} /></span>
              <span className="text-sm font-bold text-gray-800">Repair Details</span>
            </div>
            <div className="p-5 space-y-4">
              {/* Customer */}
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest flex items-center gap-1.5"><FiUser size={11} /> Customer</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><label className={labelCls}>Name *</label><input name="name" value={formData.name} onChange={handleChange} className={inputCls} /></div>
                <div><label className={labelCls}>Mobile *</label><input name="mobile" value={formData.mobile} onChange={handleChange} maxLength={10} className={inputCls} /></div>
                <div><label className={labelCls}>Email</label><input name="email" value={formData.email} onChange={handleChange} className={inputCls} /></div>
              </div>
              <div className="border-t border-gray-50" />
              {/* Item */}
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest flex items-center gap-1.5"><FiTool size={11} /> Item</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className={labelCls}>Item Name *</label><input name="item" value={formData.item} onChange={handleChange} className={inputCls} /></div>
                <div><label className={labelCls}>Estimated Price</label><input type="number" name="price" value={formData.price} onChange={handleChange} className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Issue Description</label><textarea name="issue" rows={3} value={formData.issue} onChange={handleChange} className={`${inputCls} resize-none`} /></div>
              <div className="border-t border-gray-50" />
              {/* Delivery */}
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest flex items-center gap-1.5"><FiCalendar size={11} /> Delivery</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><input type="date" name="deliveryDate" min={today} value={formData.deliveryDate} onChange={handleChange} className={inputCls} /></div>
              <div><label className={labelCls}>Remark</label><textarea name="remark" rows={3} value={formData.remark} onChange={handleChange} className={`${inputCls} resize-none`} /></div>
            </div>
          </div>

          {/* RIGHT PANEL — Photos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <div className="flex items-center gap-2.5"><span className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center shrink-0"><FiCamera size={13} /></span><span className="text-sm font-bold text-gray-800">Photos</span></div>
              <span className="text-[10px] font-bold bg-orange-500 text-white px-2.5 py-0.5 rounded-full">{images.length}/10</span>
            </div>
            <div className="p-5">
              {/* Hidden Inputs */}
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { addImages(e.target.files); e.target.value = ""; }} />
              <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { addImages(e.target.files); e.target.value = ""; }} />

              {/* Upload Buttons */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <button type="button" onClick={() => cameraRef.current?.click()} disabled={images.length >= 10} className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-orange-200 bg-orange-50 rounded-xl py-5 text-orange-500 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed">Take Photo</button>
                <button type="button" onClick={() => galleryRef.current?.click()} disabled={images.length >= 10} className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 bg-gray-50 rounded-xl py-5 text-gray-500 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed">From Gallery</button>
              </div>

              {/* Thumbnails */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {images.map((img, i) => (
                    <div key={img.preview} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50">
                      <img src={img.preview} alt={`photo-${i + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                        <button type="button" onClick={() => removeImage(i)} className="opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 active:scale-90 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg"><FiTrash2 size={12} /></button>
                      </div>
                      <span className="absolute top-1 left-1 text-[9px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded-md">{i + 1}</span>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>

        </div>

        <div className="flex justify-end mt-4 pb-4">
          <button type="submit" disabled={loading || processing} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold px-8 py-2.5 rounded-xl transition-all shadow-sm shadow-orange-200">
            <FiSave size={14} />
            {loading ? "Saving…" : "Create Repair"}
          </button>
        </div>

      </form>
    </div>
  );
}