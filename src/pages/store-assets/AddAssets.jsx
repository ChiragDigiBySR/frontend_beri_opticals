import { useState, useCallback, useRef, useEffect } from "react";
import api from "../../utils/api";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import {
  FiCamera, FiImage, FiPlus, FiSave,
  FiUser, FiX, FiChevronDown
} from "react-icons/fi";

const inputCls =
  "w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all placeholder-gray-300";
const labelCls =
  "text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5";

/* ───────── IMAGE NORMALIZATION ───────── */

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
        if (w > h) {
          h = Math.round((h / w) * MAX);
          w = MAX;
        } else {
          w = Math.round((w / h) * MAX);
          h = MAX;
        }
      }

      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);

      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => {
          const normalized = new File(
            [blob],
            `photo_${Date.now()}.jpg`,
            { type: "image/jpeg" }
          );
          resolve(normalized);
        },
        "image/jpeg",
        0.6
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });

/* ───────── COMPONENT ───────── */

export default function AddAsset() {
  const employees = useSelector((state) => state.employees.data);

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    item: "",
    issueDate: "",
    remark: "",
  });

  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [empSearch, setEmpSearch] = useState("");
  const [showEmpDrop, setShowEmpDrop] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);

  const empRef = useRef(null);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const filteredEmps =
    employees?.filter((e) => {
      const q = empSearch.toLowerCase();
      return !empSearch || e.name?.toLowerCase().includes(q) || e.mobile?.toLowerCase().includes(q);
    }) ?? [];

  const selectEmployee = (emp) => {
    setSelectedEmp(emp);
    setEmpSearch(emp.name || "");
    setFormData((p) => ({
      ...p,
      name: emp.name || "",
      mobile: emp.mobile || "",
      email: emp.email || "",
    }));
    setShowEmpDrop(false);
  };

  const clearEmployee = () => {
    setSelectedEmp(null);
    setEmpSearch("");
    setFormData((p) => ({ ...p, name: "", mobile: "", email: "" }));
  };

  useEffect(() => {
    const handler = (e) => {
      if (empRef.current && !empRef.current.contains(e.target)) setShowEmpDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    return () => images.forEach((img) => URL.revokeObjectURL(img.preview));
  }, [images]);

  /* ───── IMAGE HANDLING ───── */

  const addImages = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    const incoming = Array.from(files);

    if (images.length + incoming.length > 10) {
      toast.error("Maximum 10 images allowed");
      return;
    }

    setProcessing(true);

    try {
      const normalized = await Promise.all(incoming.map(normalizeToJpeg));

      setImages((prev) => [
        ...prev,
        ...normalized.map((file) => ({ file, preview: URL.createObjectURL(file) })),
      ]);
    } catch (err) {
      toast.error("Image processing failed");
    } finally {
      setProcessing(false);
    }
  }, [images]);

  const removeImage = (index) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const clearImages = () => {
    setImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.preview));
      return [];
    });
  };

  /* ───── SUBMIT ───── */

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Employee name required");
    if (!formData.mobile) return toast.error("Mobile required");
    if (!formData.item) return toast.error("Item required");

    try {
      setSubmitting(true);
      const data = new FormData();
      Object.keys(formData).forEach((key) => data.append(key, formData[key]));
      images.forEach((img) => data.append("images", img.file, img.file.name));

      const res = await api.post("/assets", data);

      if (res.data.success) {
        toast.success("Asset issued successfully");
        setFormData({ name: "", mobile: "", email: "", item: "", issueDate: "", remark: "" });
        clearEmployee();
        clearImages();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Error creating asset");
    } finally {
      setSubmitting(false);
    }
  };

  const isDisabled = submitting || processing;

  return (
    <div className="min-h-screen bg-[#f7f8fa] p-4 md:p-5">
      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-2 gap-4">
          {/* LEFT PANEL */}
          <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
            <p className="text-xs font-bold text-orange-400 flex gap-1 items-center">
              <FiUser size={12} /> Employee
            </p>
            <div ref={empRef} className="relative">
              <label className={labelCls}>Select Employee *</label>
              <div
                className="w-full bg-gray-50 border rounded-xl px-3 py-2.5 flex justify-between cursor-pointer"
                onClick={() => setShowEmpDrop((v) => !v)}
              >
                {selectedEmp ? <span>{selectedEmp.name}</span> : <span className="text-gray-400">Select employee…</span>}
                <FiChevronDown />
              </div>
              {showEmpDrop && (
                <div className="absolute w-full bg-white border rounded-xl mt-1 z-10 max-h-52 overflow-auto">
                  {filteredEmps.map((emp) => (
                    <button
                      key={emp._id}
                      type="button"
                      onMouseDown={() => selectEmployee(emp)}
                      className="block w-full text-left px-3 py-2 hover:bg-orange-50"
                    >
                      {emp.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>Item *</label>
              <input
                className={inputCls}
                value={formData.item}
                onChange={(e) => setFormData((p) => ({ ...p, item: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>Issue Date</label>
              <input
                type="date"
                className={inputCls}
                value={formData.issueDate}
                onChange={(e) => setFormData((p) => ({ ...p, issueDate: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>Remark</label>
              <textarea
                rows={3}
                className={inputCls}
                value={formData.remark}
                onChange={(e) => setFormData((p) => ({ ...p, remark: e.target.value }))}
              />
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => {
                addImages(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addImages(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="border-2 border-dashed border-orange-300 rounded-xl py-5 flex flex-col items-center text-orange-500"
              >
                <FiCamera size={20} />
                Take Photo
              </button>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl py-5 flex flex-col items-center text-gray-500"
              >
                <FiImage size={20} />
                From Gallery
              </button>
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, i) => (
                  <div key={img.preview} className="relative">
                    <img src={img.preview} className="rounded-lg object-cover aspect-square" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
                {images.length < 10 && (
                  <button
                    type="button"
                    onClick={() => galleryRef.current?.click()}
                    className="border-2 border-dashed rounded-lg flex items-center justify-center aspect-square text-orange-400"
                  >
                    <FiPlus size={20} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-5">
          <button
            disabled={isDisabled}
            className="bg-orange-500 text-white px-6 py-2 rounded-xl flex items-center gap-2"
          >
            <FiSave />
            {submitting ? "Saving..." : "Issue Asset"}
          </button>
        </div>
      </form>
    </div>
  );
}