// import { useState, useCallback } from "react";
// import { toast } from "react-toastify";

// // ─── Pure helpers ─────────────────────────────────────────────────────────────

// const POWER_MIN = -30;
// const POWER_MAX = 30;

// const normalizeQuarterPower = (value) => {
//   let num = parseFloat(value);
//   if (isNaN(num)) return "";
//   num = Math.round(num / 0.25) * 0.25;
//   return num;
// };

// const formatPower = (value) => {
//   const num = parseFloat(value);
//   if (isNaN(num)) return "";
//   const fixed = Math.abs(num).toFixed(2);
//   if (num > 0) return `+${fixed}`;
//   if (num < 0) return `-${fixed}`;
//   return "0.00";
// };

// // NV SPH/CYL/AXIS are derived from D.V + ADD whenever ADD has a valid
// // non-negative value; cleared otherwise.
// //
// // nv_vis rules:
// //   - NEVER auto-filled from D.V VIS
// //   - Cleared ONLY when ADD field itself is edited (resetVis = true)
// //   - Preserved on all other D.V edits (sph/cyl/axis/vis)
// //   - Never touched when the user is editing an NV field directly
// const computeNV = (eye, { resetVis = false } = {}) => {
//   const sph = parseFloat(eye.sph);
//   const add = parseFloat(eye.add);
//   const hasAdd = eye.add !== "" && !isNaN(add) && add >= 0;

//   // Key fix: always read nv_vis from the eye object passed in.
//   // resetVis is only true when ADD itself was just edited.
//   const nv_vis = resetVis ? "" : (eye.nv_vis ?? "");

//   if (!hasAdd) {
//     return { ...eye, nv_sph: "", nv_cyl: "", nv_axis: "", nv_vis };
//   }

//   return {
//     ...eye,
//     nv_sph: !isNaN(sph) ? formatPower(sph + add) : "",
//     nv_cyl: eye.cyl,
//     nv_axis: eye.axis,
//     nv_vis, // always preserves user-typed value
//   };
// };

// const computeTranspose = (eye) => {
//   const sph = parseFloat(eye.sph);
//   const cyl = parseFloat(eye.cyl);
//   const axis = parseInt(eye.axis);
//   const add = parseFloat(eye.add);

//   if (isNaN(sph) || isNaN(cyl)) return null;

//   const newSph = sph + cyl;
//   const newCyl = -cyl;
//   const newAxis = !isNaN(axis)
//     ? axis + 90 > 180
//       ? axis + 90 - 180
//       : axis + 90
//     : "";

//   const hasAdd = eye.add !== "" && !isNaN(add) && add >= 0;

//   return {
//     sph: formatPower(newSph),
//     cyl: formatPower(newCyl),
//     axis: newAxis,
//     vis: eye.vis || "",
//     add: eye.add || "",
//     pd: eye.pd || "",
//     nv_sph: hasAdd ? formatPower(newSph + add) : "",
//     nv_cyl: hasAdd ? formatPower(newCyl) : "",
//     nv_axis: hasAdd ? newAxis : "",
//     nv_vis: hasAdd ? eye.nv_vis || "" : "",
//   };
// };

// // Single pure updater — applies change then recomputes NV + Transpose atomically.
// const recompute = (prev, section, eye, field, value) => {
//   const updated = {
//     ...prev,
//     [section]: {
//       ...prev[section],
//       // Important: spread existing eye data first so nv_vis and all other
//       // fields are present before we apply the single field change.
//       [eye]: { ...prev[section][eye], [field]: value },
//     },
//   };

//   if (section === "eyewear") {
//     const isNVField = field.startsWith("nv_");

//     if (!isNVField) {
//       // nv_vis is reset ONLY when ADD was the edited field AND the value
//       // actually changed from what was previously stored.
//       // Tabbing through ADD without changing it must NOT clear nv_vis.
//       const prevAdd = prev[section]?.[eye]?.add ?? "";
//       const resetVis = field === "add" && value !== prevAdd;
//       const nvEye = computeNV(updated.eyewear[eye], { resetVis });
//       updated.eyewear = { ...updated.eyewear, [eye]: nvEye };
//     }
//     // If isNVField: user is typing directly into NV — don't touch it at all.

//     const transposed = computeTranspose(updated.eyewear[eye]);
//     if (transposed) {
//       updated.transpose = { ...updated.transpose, [eye]: transposed };
//     }
//   }

//   return updated;
// };

// const generatePowerSuggestions = (value, field) => {
//   const base = parseInt(value);
//   if (isNaN(base)) return [];
//   const variants = [];
//   for (let i = 0; i <= 0.75; i += 0.25) {
//     const plus = base + i;
//     if (field === "add") {
//       variants.push(formatPower(plus));
//     } else {
//       variants.push(formatPower(plus));
//       variants.push(formatPower(-(base + i)));
//     }
//   }
//   return variants;
// };

// const POWER_FIELDS = ["sph", "cyl", "nv_sph", "nv_cyl", "add"];

// const inputClass =
//   "w-full px-2 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 hover:border-orange-300 transition-all text-center placeholder-gray-300";

// // ─── EyeForm ──────────────────────────────────────────────────────────────────

// function EyeForm({
//   section,
//   eye,
//   label,
//   copyLabel,
//   copyTarget,
//   eyeData,
//   onFieldChange,
//   onFieldBlur,
//   onFocus,
//   onCopy,
//   activeField,
//   suggestions,
//   onSuggestionPick,
// }) {
//   const renderSuggestions = (f) => {
//     if (
//       activeField?.section === section &&
//       activeField?.eye === eye &&
//       activeField?.field === f &&
//       suggestions.length > 0
//     ) {
//       return (
//         <div className="absolute bg-white border rounded shadow mt-1 z-20 w-full max-h-40 overflow-y-auto">
//           {suggestions.map((item, idx) => (
//             <div
//               key={idx}
//               className="px-3 py-1 hover:bg-orange-100 cursor-pointer text-sm"
//               onMouseDown={(e) => {
//                 e.preventDefault();
//                 onSuggestionPick(section, eye, f, item);
//               }}
//             >
//               {item}
//             </div>
//           ))}
//         </div>
//       );
//     }
//     return null;
//   };

//   const plainInput = (f) => (
//     <input
//       className={inputClass}
//       value={eyeData[f] ?? ""}
//       onChange={(e) => onFieldChange(section, eye, f, e.target.value)}
//       onFocus={() => onFocus(section, eye, f)}
//       onBlur={(e) => onFieldBlur(section, eye, f, e.target.value)}
//     />
//   );

//   const suggestInput = (f) => (
//     <div className="relative">
//       <input
//         className={inputClass}
//         value={eyeData[f] ?? ""}
//         onChange={(e) => onFieldChange(section, eye, f, e.target.value)}
//         onFocus={() => onFocus(section, eye, f)}
//         onBlur={(e) => onFieldBlur(section, eye, f, e.target.value)}
//       />
//       {renderSuggestions(f)}
//     </div>
//   );

//   return (
//     <div className="border border-gray-300 rounded-lg p-4">
//       {/* Header */}
//       <div className="flex justify-between items-center mb-3">
//         <h3 className="font-semibold">{label}</h3>
//         <button
//           type="button"
//           onClick={() => onCopy(section, eye, copyTarget)}
//           className={`text-xs px-3 py-1 rounded cursor-pointer ${
//             eye === "rightEye"
//               ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
//               : "bg-green-100 text-green-600 hover:bg-green-200"
//           }`}
//         >
//           {copyLabel}
//         </button>
//       </div>

//       {/* Column headers */}
//       <div className="grid grid-cols-[50px_repeat(4,1fr)] gap-2 items-center text-center text-xs font-medium text-gray-500 mb-1">
//         <span />
//         <span>SPH</span>
//         <span>CYL</span>
//         <span>AXIS</span>
//         <span>VIS</span>
//       </div>

//       {/* D.V row */}
//       <div className="grid grid-cols-[50px_repeat(4,1fr)] gap-2 items-center text-center">
//         <label className="text-sm text-gray-500">D.V</label>
//         {suggestInput("sph")}
//         {suggestInput("cyl")}
//         {plainInput("axis")}
//         {plainInput("vis")}
//       </div>

//       {/* N.V row */}
//       <div className="grid grid-cols-[50px_repeat(4,1fr)] gap-2 mt-2 items-center text-center">
//         <label className="text-sm text-gray-500">N.V</label>
//         {suggestInput("nv_sph")}
//         {suggestInput("nv_cyl")}
//         {plainInput("nv_axis")}
//         {plainInput("nv_vis")}
//       </div>

//       {/* ADD / PD row */}
//       <div className="grid grid-cols-[50px_1fr_50px_1fr] gap-2 mt-2 items-center text-center">
//         <label className="text-sm text-gray-500">ADD</label>
//         {suggestInput("add")}
//         <label className="text-sm text-gray-500">PD</label>
//         {plainInput("pd")}
//       </div>
//     </div>
//   );
// }

// // ─── Main component ───────────────────────────────────────────────────────────

// export default function PrescriptionSection({ prescription, setPrescription }) {
//   const [type, setType] = useState("eyewear");
//   const [suggestions, setSuggestions] = useState([]);
//   const [activeField, setActiveField] = useState(null);

//   const handleChange = useCallback(
//     (section, eye, field, value) => {
//       setPrescription((prev) => recompute(prev, section, eye, field, value));

//       if (POWER_FIELDS.includes(field)) {
//         const clean = value.replace(/[+-]/g, "");
//         if (clean && !clean.includes(".")) {
//           setSuggestions(generatePowerSuggestions(clean, field));
//           setActiveField({ section, eye, field });
//         } else {
//           setSuggestions([]);
//           setActiveField(null);
//         }
//       }
//     },
//     [setPrescription],
//   );

//   const handleFocus = useCallback((section, eye, field) => {
//     setActiveField({ section, eye, field });
//     // Don't clear suggestions here — let handleChange manage them.
//   }, []);

//   const handleBlur = useCallback(
//     (section, eye, field, value) => {
//       if (POWER_FIELDS.includes(field)) {
//         const trimmed = (value ?? "").trim();

//         if (trimmed === "") {
//           // Empty is fine — clear the field cleanly.
//           setPrescription((prev) => recompute(prev, section, eye, field, ""));
//         } else {
//           const raw = parseFloat(trimmed);

//           if (isNaN(raw)) {
//             // Non-numeric entry — clear silently.
//             setPrescription((prev) => recompute(prev, section, eye, field, ""));
//           } else if (raw > POWER_MAX || raw < POWER_MIN) {
//             toast.error(
//               `Value must be between -${POWER_MAX} and +${POWER_MAX}`,
//             );
//             setPrescription((prev) => recompute(prev, section, eye, field, ""));
//           } else {
//             const normalized = normalizeQuarterPower(trimmed);
//             const formatted = formatPower(normalized);
//             setPrescription((prev) =>
//               recompute(prev, section, eye, field, formatted),
//             );
//           }
//         }
//       }

//       // Delay clearing suggestions so onMouseDown on a suggestion fires first.
//       setTimeout(() => {
//         setSuggestions([]);
//         setActiveField(null);
//       }, 150);
//     },
//     [setPrescription],
//   );

//   const handleSuggestionPick = useCallback(
//     (section, eye, field, value) => {
//       setPrescription((prev) => recompute(prev, section, eye, field, value));
//       setSuggestions([]);
//       setActiveField(null);
//     },
//     [setPrescription],
//   );

//   const handleCopy = useCallback(
//     (section, fromEye, toEye) => {
//       setPrescription((prev) => {
//         const draft = {
//           ...prev,
//           [section]: {
//             ...prev[section],
//             [toEye]: { ...prev[section][fromEye] },
//           },
//         };
//         if (section === "eyewear") {
//           const transposed = computeTranspose(draft.eyewear[toEye]);
//           if (transposed) {
//             draft.transpose = { ...draft.transpose, [toEye]: transposed };
//           }
//         }
//         return draft;
//       });
//     },
//     [setPrescription],
//   );

//   const shared = {
//     onFieldChange: handleChange,
//     onFieldBlur: handleBlur,
//     onFocus: handleFocus,
//     onCopy: handleCopy,
//     onSuggestionPick: handleSuggestionPick,
//     activeField,
//     suggestions,
//   };

//   return (
//     <div className="bg-white rounded-xl shadow p-6">
//       <h2 className="text-lg font-semibold mb-4">Prescription Details</h2>

//       {/* Tab switcher */}
//       <div className="flex gap-2 mb-6">
//         {["eyewear", "transpose", "contact"].map((t) => (
//           <button
//             key={t}
//             onClick={(e) => {
//               e.preventDefault();
//               setType(t);
//             }}
//             className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${
//               type === t
//                 ? "bg-orange-500 text-white"
//                 : "bg-gray-100 hover:bg-gray-200"
//             }`}
//           >
//             {t === "eyewear" && "Eyewear"}
//             {t === "transpose" && "Transpose"}
//             {t === "contact" && "Contact Lens"}
//           </button>
//         ))}
//       </div>

//       {/* ── EYEWEAR ── */}
//       {type === "eyewear" && (
//         <>
//           <h2 className="text-lg font-semibold text-gray-800 mb-4">
//             Eyewear Prescription
//           </h2>
//           <div className="grid md:grid-cols-2 gap-6">
//             <EyeForm
//               {...shared}
//               section="eyewear"
//               eye="rightEye"
//               label="Right Eye"
//               copyLabel="Copy → Left"
//               copyTarget="leftEye"
//               eyeData={prescription.eyewear.rightEye}
//             />
//             <EyeForm
//               {...shared}
//               section="eyewear"
//               eye="leftEye"
//               label="Left Eye"
//               copyLabel="Copy → Right"
//               copyTarget="rightEye"
//               eyeData={prescription.eyewear.leftEye}
//             />
//           </div>
//         </>
//       )}

//       {/* ── TRANSPOSE ── */}
//       {type === "transpose" && (
//         <>
//           <h2 className="text-lg font-semibold text-gray-800 mb-4">
//             Transpose Prescription
//           </h2>
//           <p className="text-xs text-gray-400 mb-4 -mt-2">
//             Auto-calculated from Eyewear. You can still edit manually.
//           </p>
//           <div className="grid md:grid-cols-2 gap-6">
//             <EyeForm
//               {...shared}
//               section="transpose"
//               eye="rightEye"
//               label="Right Eye"
//               copyLabel="Copy → Left"
//               copyTarget="leftEye"
//               eyeData={prescription.transpose.rightEye}
//             />
//             <EyeForm
//               {...shared}
//               section="transpose"
//               eye="leftEye"
//               label="Left Eye"
//               copyLabel="Copy → Right"
//               copyTarget="rightEye"
//               eyeData={prescription.transpose.leftEye}
//             />
//           </div>
//         </>
//       )}

//       {/* ── CONTACT LENS ── */}
//       {type === "contact" && (
//         <>
//           <h2 className="text-lg font-semibold text-gray-800 mb-4">
//             Contact Lens Prescription
//           </h2>
//           <div className="grid md:grid-cols-2 gap-6">
//             <EyeForm
//               {...shared}
//               section="contactLens"
//               eye="rightEye"
//               label="Right Eye"
//               copyLabel="Copy → Left"
//               copyTarget="leftEye"
//               eyeData={prescription.contactLens.rightEye}
//             />
//             <EyeForm
//               {...shared}
//               section="contactLens"
//               eye="leftEye"
//               label="Left Eye"
//               copyLabel="Copy → Right"
//               copyTarget="rightEye"
//               eyeData={prescription.contactLens.leftEye}
//             />
//           </div>
//         </>
//       )}
//     </div>
//   );
// }




import { useState, useCallback } from "react";
import { toast } from "react-toastify";

// ─── Pure helpers ─────────────────────────────────────────────────────────────

const POWER_MIN = -30;
const POWER_MAX = 30;
const VISION_OPTIONS = ["6/6", "6/9", "6/12", "6/24", "6/36"];
const VISION_DATALIST_ID = "vision-options";

const normalizeQuarterPower = (value) => {
  let num = parseFloat(value);
  if (isNaN(num)) return "";
  num = Math.round(num / 0.25) * 0.25;
  return num;
};

const formatPower = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return "";
  const fixed = Math.abs(num).toFixed(2);
  if (num > 0) return `+${fixed}`;
  if (num < 0) return `-${fixed}`;
  return "0.00";
};

// NV SPH/CYL/AXIS are derived from D.V + ADD whenever ADD has a valid
// non-negative value; cleared otherwise.
//
// nv_vis rules:
//   - NEVER auto-filled from D.V VIS
//   - Cleared ONLY when ADD field itself is edited (resetVis = true)
//   - Preserved on all other D.V edits (sph/cyl/axis/vis)
//   - Never touched when the user is editing an NV field directly
const computeNV = (eye, { resetVis = false } = {}) => {
  const sph = parseFloat(eye.sph);
  const add = parseFloat(eye.add);
  const hasAdd = eye.add !== "" && !isNaN(add) && add >= 0;

  // Key fix: always read nv_vis from the eye object passed in.
  // resetVis is only true when ADD itself was just edited.
  const nv_vis = resetVis ? "" : (eye.nv_vis ?? "");

  if (!hasAdd) {
    return { ...eye, nv_sph: "", nv_cyl: "", nv_axis: "", nv_vis };
  }

  return {
    ...eye,
    nv_sph: !isNaN(sph) ? formatPower(sph + add) : "",
    nv_cyl: eye.cyl,
    nv_axis: eye.axis,
    nv_vis, // always preserves user-typed value
  };
};

const computeTranspose = (eye) => {
  const sph = parseFloat(eye.sph);
  const cyl = parseFloat(eye.cyl);
  const axis = parseInt(eye.axis);
  const add = parseFloat(eye.add);

  if (isNaN(sph) || isNaN(cyl)) return null;

  const newSph = sph + cyl;
  const newCyl = -cyl;
  const newAxis = !isNaN(axis)
    ? axis + 90 > 180
      ? axis + 90 - 180
      : axis + 90
    : "";

  const hasAdd = eye.add !== "" && !isNaN(add) && add >= 0;

  return {
    sph: formatPower(newSph),
    cyl: formatPower(newCyl),
    axis: newAxis,
    vis: eye.vis || "",
    add: eye.add || "",
    pd: eye.pd || "",
    nv_sph: hasAdd ? formatPower(newSph + add) : "",
    nv_cyl: hasAdd ? formatPower(newCyl) : "",
    nv_axis: hasAdd ? newAxis : "",
    nv_vis: hasAdd ? eye.nv_vis || "" : "",
  };
};

// Single pure updater — applies change then recomputes NV + Transpose atomically.
const recompute = (prev, section, eye, field, value) => {
  const updated = {
    ...prev,
    [section]: {
      ...prev[section],
      // Important: spread existing eye data first so nv_vis and all other
      // fields are present before we apply the single field change.
      [eye]: { ...prev[section][eye], [field]: value },
    },
  };

  if (section === "eyewear") {
    const isNVField = field.startsWith("nv_");

    if (!isNVField) {
      // nv_vis is reset ONLY when ADD was the edited field AND the value
      // actually changed from what was previously stored.
      // Tabbing through ADD without changing it must NOT clear nv_vis.
      const prevAdd = prev[section]?.[eye]?.add ?? "";
      const resetVis = field === "add" && value !== prevAdd;
      const nvEye = computeNV(updated.eyewear[eye], { resetVis });
      updated.eyewear = { ...updated.eyewear, [eye]: nvEye };
    }
    // If isNVField: user is typing directly into NV — don't touch it at all.

    const transposed = computeTranspose(updated.eyewear[eye]);
    if (transposed) {
      updated.transpose = { ...updated.transpose, [eye]: transposed };
    }
  }

  return updated;
};

const generatePowerSuggestions = (value, field) => {
  const base = parseInt(value);
  if (isNaN(base)) return [];
  const variants = [];
  for (let i = 0; i <= 0.75; i += 0.25) {
    const plus = base + i;
    if (field === "add") {
      variants.push(formatPower(plus));
    } else {
      variants.push(formatPower(plus));
      variants.push(formatPower(-(base + i)));
    }
  }
  return variants;
};

const POWER_FIELDS = ["sph", "cyl", "nv_sph", "nv_cyl", "add"];

const inputClass =
  "w-full px-2 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 hover:border-orange-300 transition-all text-center placeholder-gray-300";

// ─── EyeForm ──────────────────────────────────────────────────────────────────

function EyeForm({
  section,
  eye,
  label,
  copyLabel,
  copyTarget,
  eyeData,
  onFieldChange,
  onFieldBlur,
  onFocus,
  onCopy,
  activeField,
  suggestions,
  onSuggestionPick,
}) {
  const renderSuggestions = (f) => {
    if (
      activeField?.section === section &&
      activeField?.eye === eye &&
      activeField?.field === f &&
      suggestions.length > 0
    ) {
      return (
        <div className="absolute bg-white border rounded shadow mt-1 z-20 w-full max-h-40 overflow-y-auto">
          {suggestions.map((item, idx) => (
            <div
              key={idx}
              className="px-3 py-1 hover:bg-orange-100 cursor-pointer text-sm"
              onMouseDown={(e) => {
                e.preventDefault();
                onSuggestionPick(section, eye, f, item);
              }}
            >
              {item}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // const plainInput = (f) => (
  //   <input
  //     className={inputClass}
  //     value={eyeData[f] ?? ""}
  //     onChange={(e) => onFieldChange(section, eye, f, e.target.value)}
  //     onFocus={() => onFocus(section, eye, f)}
  //     onBlur={(e) => onFieldBlur(section, eye, f, e.target.value)}
  //   />
  // );

  const plainInput = (f, opts = {}) => (
    <input
      className={inputClass}
      value={eyeData[f] ?? ""}
      onChange={(e) => onFieldChange(section, eye, f, e.target.value)}
      onFocus={() => onFocus(section, eye, f)}
      onBlur={(e) => onFieldBlur(section, eye, f, e.target.value)}
      list={opts.datalist}
      autoComplete="off"
    />
  );

  const suggestInput = (f) => (
    <div className="relative">
      <input
        className={inputClass}
        value={eyeData[f] ?? ""}
        onChange={(e) => onFieldChange(section, eye, f, e.target.value)}
        onFocus={() => onFocus(section, eye, f)}
        onBlur={(e) => onFieldBlur(section, eye, f, e.target.value)}
      />
      {renderSuggestions(f)}
    </div>
  );

  return (
    <div className="border border-gray-300 rounded-lg p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">{label}</h3>
        <button
          type="button"
          onClick={() => onCopy(section, eye, copyTarget)}
          className={`text-xs px-3 py-1 rounded cursor-pointer ${eye === "rightEye"
            ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
            : "bg-green-100 text-green-600 hover:bg-green-200"
            }`}
        >
          {copyLabel}
        </button>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[50px_repeat(4,1fr)] gap-2 items-center text-center text-xs font-medium text-gray-500 mb-1">
        <span />
        <span>SPH</span>
        <span>CYL</span>
        <span>AXIS</span>
        <span>VIS</span>
      </div>

      {/* D.V row */}
      <div className="grid grid-cols-[50px_repeat(4,1fr)] gap-2 items-center text-center">
        <label className="text-sm text-gray-500">D.V</label>
        {suggestInput("sph")}
        {suggestInput("cyl")}
        {plainInput("axis")}
        {plainInput("vis", { datalist: VISION_DATALIST_ID })}
      </div>

      {/* N.V row */}
      <div className="grid grid-cols-[50px_repeat(4,1fr)] gap-2 mt-2 items-center text-center">
        <label className="text-sm text-gray-500">N.V</label>
        {suggestInput("nv_sph")}
        {suggestInput("nv_cyl")}
        {plainInput("nv_axis")}
        {plainInput("nv_vis", { datalist: VISION_DATALIST_ID })}
      </div>

      {/* ADD / PD row */}
      <div className="grid grid-cols-[50px_1fr_50px_1fr] gap-2 mt-2 items-center text-center">
        <label className="text-sm text-gray-500">ADD</label>
        {suggestInput("add")}
        <label className="text-sm text-gray-500">PD</label>
        {plainInput("pd")}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PrescriptionSection({ prescription, setPrescription }) {
  const [type, setType] = useState("eyewear");
  const [suggestions, setSuggestions] = useState([]);
  const [activeField, setActiveField] = useState(null);

  const handleChange = useCallback(
    (section, eye, field, value) => {
      setPrescription((prev) => recompute(prev, section, eye, field, value));

      if (POWER_FIELDS.includes(field)) {
        const clean = value.replace(/[+-]/g, "");
        if (clean && !clean.includes(".")) {
          setSuggestions(generatePowerSuggestions(clean, field));
          setActiveField({ section, eye, field });
        } else {
          setSuggestions([]);
          setActiveField(null);
        }
      }
    },
    [setPrescription],
  );

  const handleFocus = useCallback((section, eye, field) => {
    setActiveField({ section, eye, field });
    // Don't clear suggestions here — let handleChange manage them.
  }, []);

  const handleBlur = useCallback(
    (section, eye, field, value) => {
      if (POWER_FIELDS.includes(field)) {
        const trimmed = (value ?? "").trim();

        if (trimmed === "") {
          // Empty is fine — clear the field cleanly.
          setPrescription((prev) => recompute(prev, section, eye, field, ""));
        } else {
          const raw = parseFloat(trimmed);

          if (isNaN(raw)) {
            // Non-numeric entry — clear silently.
            setPrescription((prev) => recompute(prev, section, eye, field, ""));
          } else if (raw > POWER_MAX || raw < POWER_MIN) {
            toast.error(
              `Value must be between -${POWER_MAX} and +${POWER_MAX}`,
            );
            setPrescription((prev) => recompute(prev, section, eye, field, ""));
          } else {
            const normalized = normalizeQuarterPower(trimmed);
            const formatted = formatPower(normalized);
            setPrescription((prev) =>
              recompute(prev, section, eye, field, formatted),
            );
          }
        }
      }

      // Delay clearing suggestions so onMouseDown on a suggestion fires first.
      setTimeout(() => {
        setSuggestions([]);
        setActiveField(null);
      }, 150);
    },
    [setPrescription],
  );

  const handleSuggestionPick = useCallback(
    (section, eye, field, value) => {
      setPrescription((prev) => recompute(prev, section, eye, field, value));
      setSuggestions([]);
      setActiveField(null);
    },
    [setPrescription],
  );

  const handleCopy = useCallback(
    (section, fromEye, toEye) => {
      setPrescription((prev) => {
        const draft = {
          ...prev,
          [section]: {
            ...prev[section],
            [toEye]: { ...prev[section][fromEye] },
          },
        };
        if (section === "eyewear") {
          const transposed = computeTranspose(draft.eyewear[toEye]);
          if (transposed) {
            draft.transpose = { ...draft.transpose, [toEye]: transposed };
          }
        }
        return draft;
      });
    },
    [setPrescription],
  );

  const shared = {
    onFieldChange: handleChange,
    onFieldBlur: handleBlur,
    onFocus: handleFocus,
    onCopy: handleCopy,
    onSuggestionPick: handleSuggestionPick,
    activeField,
    suggestions,
  };

  return (
    <div className="bg-white rounded-xl shadow p-6">

      <datalist id={VISION_DATALIST_ID}>
        {VISION_OPTIONS.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>

      <h2 className="text-lg font-semibold mb-4">Prescription Details</h2>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        {["eyewear", "transpose", "contact"].map((t) => (
          <button
            key={t}
            onClick={(e) => {
              e.preventDefault();
              setType(t);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${type === t
              ? "bg-orange-500 text-white"
              : "bg-gray-100 hover:bg-gray-200"
              }`}
          >
            {t === "eyewear" && "Eyewear"}
            {t === "transpose" && "Transpose"}
            {t === "contact" && "Contact Lens"}
          </button>
        ))}
      </div>

      {/* ── EYEWEAR ── */}
      {type === "eyewear" && (
        <>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Eyewear Prescription
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <EyeForm
              {...shared}
              section="eyewear"
              eye="rightEye"
              label="Right Eye"
              copyLabel="Copy → Left"
              copyTarget="leftEye"
              eyeData={prescription.eyewear.rightEye}
            />
            <EyeForm
              {...shared}
              section="eyewear"
              eye="leftEye"
              label="Left Eye"
              copyLabel="Copy → Right"
              copyTarget="rightEye"
              eyeData={prescription.eyewear.leftEye}
            />
          </div>
        </>
      )}

      {/* ── TRANSPOSE ── */}
      {type === "transpose" && (
        <>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Transpose Prescription
          </h2>
          <p className="text-xs text-gray-400 mb-4 -mt-2">
            Auto-calculated from Eyewear. You can still edit manually.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <EyeForm
              {...shared}
              section="transpose"
              eye="rightEye"
              label="Right Eye"
              copyLabel="Copy → Left"
              copyTarget="leftEye"
              eyeData={prescription.transpose.rightEye}
            />
            <EyeForm
              {...shared}
              section="transpose"
              eye="leftEye"
              label="Left Eye"
              copyLabel="Copy → Right"
              copyTarget="rightEye"
              eyeData={prescription.transpose.leftEye}
            />
          </div>
        </>
      )}

      {/* ── CONTACT LENS ── */}
      {type === "contact" && (
        <>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Contact Lens Prescription
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <EyeForm
              {...shared}
              section="contactLens"
              eye="rightEye"
              label="Right Eye"
              copyLabel="Copy → Left"
              copyTarget="leftEye"
              eyeData={prescription.contactLens.rightEye}
            />
            <EyeForm
              {...shared}
              section="contactLens"
              eye="leftEye"
              label="Left Eye"
              copyLabel="Copy → Right"
              copyTarget="rightEye"
              eyeData={prescription.contactLens.leftEye}
            />
          </div>
        </>
      )}
    </div>
  );
}
