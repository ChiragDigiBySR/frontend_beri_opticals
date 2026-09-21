import { useEffect, useMemo, useRef, useState } from "react";
import { FiPrinter, FiArrowLeft, FiEdit2, FiEye } from "react-icons/fi";

// ─── Label lookups (kept in sync with the section components) ────────────────
const OCULAR_HISTORY_ITEMS = [
    { id: "spectacleUse", label: "Spectacle use" },
    { id: "contactLensUse", label: "Contact lens use" },
    { id: "ocularSurgery", label: "Ocular surgery" },
    { id: "trauma", label: "Trauma" },
    { id: "eyeRubbing", label: "Eye rubbing" },
    { id: "previousVisionTherapy", label: "Previous vision therapy" },
    { id: "previousPatching", label: "Previous patching" },
    { id: "strabismusHistory", label: "Strabismus history" },
];

const SYSTEMIC_HISTORY_ITEMS = [
    { id: "diabetes", label: "Diabetes" },
    { id: "hypertension", label: "Hypertension" },
    { id: "thyroidDisorder", label: "Thyroid disorder" },
    { id: "cholesterol", label: "Cholesterol" },
    { id: "rheumatoidArthritis", label: "Rheumatoid Arthritis" },
    { id: "neurologicalDisorder", label: "Neurological disorder" },
    { id: "medications", label: "Medications" },
    { id: "allergies", label: "Allergies" },
    { id: "developmentalDisorders", label: "Developmental disorders" },
];

const DEFAULT_DIAGNOSES = [
    "Myopia", "Hyperopia", "Astigmatism", "Amblyopia",
    "Convergence Insufficiency", "Convergence Excess",
    "Accommodative Insufficiency", "Accommodative Excess",
    "Fusional Vergence Dysfunction", "Oculomotor Dysfunction",
    "Suppression", "Strabismus", "Intermittent Exotropia",
    "Esophoria", "Exophoria", "Vertical Phoria",
    "Computer Vision Syndrome", "Dry Eye Disease",
].map((label) => ({ id: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label }));

const ADVICE_TEMPLATES = [
    { id: "wearSpectaclesFullTime", label: "Wear spectacles full time" },
    { id: "wearSpectaclesNearWork", label: "Wear spectacles for near work" },
    { id: "visionTherapyAdvised", label: "Vision therapy advised" },
    { id: "contactLensTrialAdvised", label: "Contact lens trial advised" },
    { id: "scleralLensTrialAdvised", label: "Scleral lens trial advised" },
    { id: "orthoKConsultationAdvised", label: "Orthokeratology consultation advised" },
    { id: "maintainVisualHygiene", label: "Maintain visual hygiene" },
    { id: "follow202020Rule", label: "Follow 20-20-20 rule" },
    { id: "reduceScreenTime", label: "Reduce excessive screen time" },
    { id: "increaseOutdoorActivities", label: "Increase outdoor activities" },
    { id: "followUp", label: "Follow-up", hasDays: true },
    { id: "cycloplegicRefractionAdvised", label: "Cycloplegic refraction advised" },
    { id: "dilatedFundusExamAdvised", label: "Dilated fundus examination advised" },
];

const BV_TESTS = [
    { id: "stereopsis", label: "Stereopsis" },
    { id: "wfdt", label: "W4DT" },
    { id: "eom", label: "EOM" },
    { id: "saccades", label: "Saccades" },
    { id: "pursuits", label: "Pursuits" },
    { id: "coverTest", label: "Cover Test" },
    { id: "nearHorizontalPhoria", label: "Near Horizontal Phoria" },
    { id: "distanceHorizontalPhoria", label: "Distance Horizontal Phoria" },
    { id: "nearVerticalPhoria", label: "Near Vertical Phoria" },
    { id: "acToARatio", label: "AC/A Ratio" },
    { id: "distanceVerticalPhoria", label: "Distance Vertical Phoria" },
    { id: "npcAccommodative", label: "NPC Accommodative" },
    { id: "npcNonAccommodative", label: "NPC Non-accommodative" },
    { id: "nra", label: "NRA" },
    { id: "pra", label: "PRA" },
    { id: "npa", label: "NPA" },
    { id: "amplitudeOfAccommodation", label: "Amplitude of Accommodation" },
    { id: "hofstetterValue", label: "Hofstetter Value" },
    { id: "accommodativeFacility", label: "Accommodative Facility" },
    { id: "vergenceFacility", label: "Vergence Facility" },
    { id: "nfvDistance", label: "NFV Distance" },
    { id: "nfvNear", label: "NFV Near" },
    { id: "pfvDistance", label: "PFV Distance" },
    { id: "pfvNear", label: "PFV Near" },
];

const SLIT_LAMP_FINDINGS = [
    { id: "lidsLashes", label: "Lids & Lashes" },
    { id: "conjunctiva", label: "Conjunctiva" },
    { id: "cornea", label: "Cornea" },
    { id: "anteriorChamber", label: "Anterior Chamber" },
    { id: "iris", label: "Iris" },
    { id: "tearFilm", label: "Tear Film" },
    { id: "lens", label: "Lens" },
    { id: "vitreous", label: "Vitreous" },
    { id: "pupil", label: "Pupil" },
];

const hasText = (v) => typeof v === "string" && v.trim().length > 0;

const labelFor = (fixedList, id) => {
    const fixed = fixedList.find((i) => i.id === id);
    if (fixed) return fixed.label;
    return id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const ageFromDob = (dob) => {
    if (!dob) return "";
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return "";
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age >= 0 ? String(age) : "";
};

const genderShort = (g) => {
    if (!hasText(g)) return "";
    const s = g.trim().toLowerCase();
    if (s.startsWith("m")) return "M";
    if (s.startsWith("f")) return "F";
    return g.trim().charAt(0).toUpperCase();
};

// Builds the "Chief Complain:" style running prose the template uses, from the
// structured section data. Only printable items are included — this template is
// the printed artifact, so it honours every print flag (unlike the on-screen view).
const buildNarratives = (report) => {
    const history = report.history || {};
    const ocular = report.ocularHistory || {};
    const systemic = report.systemicHistory || {};
    const allergy = report.allergy || {};
    const birth = report.birthDevelopment || {};

    // Ocular history → "Spectacle use: <detail>. Trauma: No."
    const ocularParts = Object.entries(ocular.items || {})
        .filter(([, v]) => v?.answer)
        .map(([id, v]) => {
            const label = labelFor(OCULAR_HISTORY_ITEMS, id);
            return v.answer === "yes"
                ? `${label}: ${hasText(v.detail) ? v.detail : "Yes"}`
                : `No ${label.toLowerCase()}`;
        });

    const systemicParts = Object.entries(systemic.items || {})
        .filter(([, v]) => v?.answer)
        .map(([id, v]) => {
            const label = labelFor(SYSTEMIC_HISTORY_ITEMS, id);
            if (v.answer !== "yes") return `No ${label.toLowerCase()}`;
            const detail = [v.detail, v.duration].filter(hasText).join(" — ");
            return `${label}${detail ? `: ${detail}` : ""}`;
        });

    const birthParts = [
        ["birthWeight", "Birth weight"],
        ["termStatus", ""],
        ["modeOfDelivery", "Delivered by"],
        ["firstCry", "First cry"],
        ["pregnancyComplications", "Pregnancy"],
        ["birthComplications", "Birth complications"],
        ["nicuAdmission", "NICU"],
        ["vaccinationStatus", "Immunisation / vaccination status"],
        ["developmentalMilestones", "Developmental milestones"],
        ["notes", ""],
    ]
        // print flag respected — this is the printed report
        .filter(([key]) => birth[key]?.print && hasText(birth[key]?.value))
        .map(([key, prefix]) => (prefix ? `${prefix}: ${birth[key].value}` : birth[key].value));

    let allergyText = "";
    if (allergy.answer === "yes") allergyText = hasText(allergy.detail) ? allergy.detail : "Present";
    else if (allergy.answer === "no") allergyText = "Not aware of any";

    return {
        chiefComplaint: [history.chiefComplaint, history.duration].filter(hasText).join(" — "),
        ocular: ocularParts.join(". "),
        systemic: systemicParts.join(". "),
        birth: birthParts.join(", "),
        allergy: allergyText,
    };
};

const fmtRx = (row) => {
    if (!row) return "";
    const { sph, cyl, axis } = row;
    if (!hasText(sph) && !hasText(cyl) && !hasText(axis)) return "";
    const sphPart = hasText(sph) ? sph : "";
    const cylPart = hasText(cyl) ? `${cyl}DC` : "";
    const axisPart = hasText(axis) ? `×${axis}` : "";
    return [sphPart, cylPart, axisPart].filter(Boolean).join("/");
};

// ─── Editable primitives ─────────────────────────────────────────────────────
// Each editable node writes straight into `overrides` keyed by a stable path, so a
// clinician's manual tweak survives re-render without mutating the saved report.
const Editable = ({ editing, value, onChange, className = "", placeholder = "" }) => {
    if (!editing) {
        return <span className={className}>{value || placeholder}</span>;
    }
    return (
        <span
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onChange(e.currentTarget.textContent)}
            className={`${className} outline-none rounded px-1 -mx-1 bg-yellow-50 hover:bg-yellow-100 focus:bg-white focus:ring-2 focus:ring-orange-300 transition`}
        >
            {value || placeholder}
        </span>
    );
};

const LabelledBox = ({ label, children, width = "auto" }) => (
    <div className="flex items-end gap-1.5">
        <span className="text-[10px] font-bold whitespace-nowrap pb-1">{label}</span>
        <div className="border border-black px-2 py-1 min-h-[24px] text-[11px]" style={{ width, minWidth: 40 }}>
            {children}
        </div>
    </div>
);

// report:   the full OPDReport document
// clinic:   { doctorName, title, speciality, addressLines: [], phone } — letterhead
// onBack:   return to wherever this was opened from
const OPDPrintTemplate = ({ report = {}, clinic = {}, onBack }) => {
    const [editing, setEditing] = useState(false);
    const [overrides, setOverrides] = useState({});
    const printRef = useRef(null);

    const set = (key) => (val) => setOverrides((o) => ({ ...o, [key]: val }));
    // Editable value resolution: a manual override wins, otherwise the report value
    const val = (key, fallback) => (overrides[key] !== undefined ? overrides[key] : fallback);

        // Set title on print report page else DigiOptics print - HTML file
    useEffect(() => {
        const originalTitle = document.title;

        document.title = "Case Report";

        return () => {
            document.title = originalTitle;
        };
    }, []);

    const patient = report.patient || {};
    const vision = report.vision || {};
    const refraction = report.refraction || {};
    const slit = report.slitLamp || {};
    const bv = report.binocularVision || {};
    const diagnosis = report.diagnosis || {};
    const advice = report.advice || {};

    const narratives = useMemo(() => buildNarratives(report), [report]);

    const allDiagnoses = [...DEFAULT_DIAGNOSES, ...(diagnosis.customDiagnoses || [])]
        .filter((d, i, arr) => arr.findIndex((x) => x.id === d.id) === i);
    const checkedDiagnoses = allDiagnoses.filter((d) => diagnosis.selected?.[d.id]?.checked);

    const allAdvice = [...ADVICE_TEMPLATES, ...(advice.customTemplates || [])]
        .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);
    const checkedAdvice = allAdvice.filter((t) => advice.selected?.[t.id]);

    // Print flags honoured throughout — this IS the printed report
    const printableBvTests = BV_TESTS.filter((t) => {
        const row = bv.tests?.[t.id];
        return row?.print && (hasText(row.report) || hasText(row.notes));
    });

    const finalRx = refraction.finalPrescription || {};
    const showFinalRx = finalRx.print !== false;

    const dryRetino = refraction.dryRetinoscopy || {};
    const wetRefr = refraction.wetRefraction || {};
    const drySubj = refraction.drySubjectiveRefraction || {};

    const clinicName = clinic.clinicName || "Eye Luminus Clinic";
    const addressLines = clinic.addressLines || [];

    return (
        <div className="max-w-4xl mx-auto">
            <style>{`
                @media print {
                    @page { size: A4; margin: 12mm; }

                    .no-print { display: none !important; }

                    /* Hide everything that is NOT an ancestor of the report.
                       display:none (not visibility:hidden) matters here — hidden-but-
                       present elements still occupy layout space, which is what pushed
                       the report down the page and left a large gap at the top. */
                    body *:not(:has(#opd-template-print)):not(#opd-template-print):not(#opd-template-print *) {
                        display: none !important;
                    }

                    /* Unwrap every ancestor (modal overlay, scroll box, page shell) so the
                       report flows as ordinary page content. Without this the modal's
                       fixed positioning + max-height + overflow-auto clip the report to a
                       single screen, which is why content past page 1 never printed. */
                    body, html,
                    *:has(#opd-template-print) {
                        display: block !important;
                        position: static !important;
                        overflow: visible !important;
                        max-height: none !important;
                        height: auto !important;
                        max-width: none !important;
                        width: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: 0 !important;
                        background: #fff !important;
                        box-shadow: none !important;
                        inset: auto !important;
                        transform: none !important;
                        backdrop-filter: none !important;
                    }

                    /* Static flow = normal pagination, so long reports continue onto page 2+ */
                    #opd-template-print {
                        position: static !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        max-width: none !important;
                        border: 0 !important;
                        box-shadow: none !important;
                    }

                    /* Keep a single row/list-item from splitting mid-line, but deliberately
                       do NOT force whole multi-item sections (Slit Lamp, BV, Diagnosis,
                       Advice) to stay together — that was pushing an entire ~15-line block
                       onto a fresh page the moment it didn't quite fit at the bottom of
                       page 1, producing a near-empty "phantom" second page even when the
                       report content itself would genuinely fit in one. */
                    #opd-template-print table { page-break-inside: auto; }
                    #opd-template-print tr { page-break-inside: avoid; }
                    #opd-template-print thead { display: table-header-group; }
                    #opd-template-print li { page-break-inside: avoid; }
                    #opd-template-print p { page-break-inside: avoid; }

                    /* Normalize line-height/box-sizing for print — a taller default line-height
                       for the serif font (varies by browser/OS) is enough on its own to push
                       total content just past one page's worth */
                    #opd-template-print, #opd-template-print * {
                        box-sizing: border-box;
                        line-height: 1.35;
                    }

                    /* Strip the edit-mode highlight so an edited report prints clean */
                    #opd-template-print [contenteditable] {
                        background: transparent !important;
                        box-shadow: none !important;
                        outline: none !important;
                    }

                    /* Force background/foreground colours to render rather than drop out */
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            `}</style>

            {/* Toolbar */}
            <div className="no-print flex items-center justify-between mb-5">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition"
                >
                    <FiArrowLeft size={13} /> Back
                </button>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setEditing((e) => !e)}
                        className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition border
                            ${editing
                                ? "bg-orange-50 text-orange-600 border-orange-300"
                                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                    >
                        {editing ? <><FiEye size={13} /> Done Editing</> : <><FiEdit2 size={13} /> Edit Before Print</>}
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                    >
                        <FiPrinter size={13} /> Print
                    </button>
                </div>
            </div>

            {editing && (
                <div className="no-print mb-4 px-4 py-2.5 rounded-xl bg-yellow-50 border border-yellow-200 text-[11px] text-yellow-800">
                    Click any highlighted text to edit it. Changes affect this printout only — the saved report is not modified.
                </div>
            )}

            {/* ── The A4 template ── */}
            <div
                id="opd-template-print"
                ref={printRef}
                className="bg-white border border-gray-200 print:border-0 p-10 print:p-0 text-black"
                style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
                {/* Letterhead */}
                <div className="flex justify-between items-start mb-1">
                    <div className="w-1/3">
                        {clinic.logoUrl && <img src={clinic.logoUrl} alt="" className="h-16 object-contain" />}
                    </div>
                    <div className="text-right text-[11px] leading-snug">
                        <p className="font-bold text-[13px]">{clinic.doctorName || "Doctor Name"}</p>
                        {hasText(clinic.title) && <p className="font-semibold">{clinic.title}</p>}
                        {hasText(clinic.speciality) && <p className="font-semibold">{clinic.speciality}</p>}
                        <p className="font-semibold">{clinicName}</p>
                        {addressLines.map((line, i) => <p key={i}>{line}</p>)}
                        {hasText(clinic.phone) && <p>{clinic.phone}</p>}
                    </div>
                </div>

                <div className="border-t-2 border-black my-2" />

                <h1 className="text-center text-[13px] font-bold tracking-wide mb-3">CASE REPORT</h1>

                {/* Name / Age & sex / Date / MRN */}
                <div className="flex flex-wrap items-end gap-4 mb-3">
                    <div className="flex items-end gap-1.5 flex-1 min-w-[240px]">
                        <span className="text-[10px] font-bold whitespace-nowrap pb-1">Name</span>
                        <div className="border border-black px-2 py-1 min-h-[24px] text-[11px] flex-1">
                            <Editable editing={editing} value={val("name", patient.name || "")} onChange={set("name")} placeholder="—" />
                        </div>
                    </div>
                    <LabelledBox label="Age & sex" width="40px">
                        <Editable editing={editing} value={val("age", ageFromDob(patient.dob))} onChange={set("age")} placeholder="" />
                    </LabelledBox>
                    <div className="border border-black px-2 py-1 min-h-[24px] text-[11px]" style={{ minWidth: 34 }}>
                        <Editable editing={editing} value={val("sex", genderShort(patient.gender))} onChange={set("sex")} placeholder="" />
                    </div>
                    <LabelledBox label="Date" width="80px">
                        <Editable
                            editing={editing}
                            value={val("date", report.createdAt ? new Date(report.createdAt).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB"))}
                            onChange={set("date")}
                        />
                    </LabelledBox>
                    <LabelledBox label="MRN" width="70px">
                        <Editable editing={editing} value={val("mrn", report.opdNumber || "")} onChange={set("mrn")} placeholder="" />
                    </LabelledBox>

                    <LabelledBox label="Patient ID" width="70px">
                        <Editable editing={editing} value={val("patNumber", report.patNumber || "")} onChange={set("patNumber")} placeholder="" />
                    </LabelledBox>
                </div>

                {/* Narrative history block */}
                <div className="text-[11px] leading-relaxed space-y-0.5 mb-3">
                    <p>
                        <span className="font-bold">Mobile no: </span>
                        <Editable editing={editing} value={val("mobile", patient.mobile ? `${patient.countryCode || ""}-${patient.mobile}` : "")} onChange={set("mobile")} placeholder="—" />
                    </p>
                    {(hasText(narratives.chiefComplaint) || editing) && (
                        <p>
                            <span className="font-bold">Chief Complain: </span>
                            <Editable editing={editing} value={val("chiefComplaint", narratives.chiefComplaint)} onChange={set("chiefComplaint")} placeholder="—" />
                        </p>
                    )}
                    {(hasText(narratives.ocular) || editing) && (
                        <p>
                            <span className="font-bold">Ocular history: </span>
                            <Editable editing={editing} value={val("ocular", narratives.ocular)} onChange={set("ocular")} placeholder="—" />
                        </p>
                    )}
                    {(hasText(narratives.systemic) || editing) && (
                        <p>
                            <span className="font-bold">Systemic history: </span>
                            <Editable editing={editing} value={val("systemic", narratives.systemic)} onChange={set("systemic")} placeholder="—" />
                        </p>
                    )}
                    {(hasText(narratives.birth) || editing) && (
                        <p>
                            <span className="font-bold">Birth & Developmental History: </span>
                            <Editable editing={editing} value={val("birth", narratives.birth)} onChange={set("birth")} placeholder="—" />
                        </p>
                    )}
                    {(hasText(narratives.allergy) || editing) && (
                        <p>
                            <span className="font-bold">Allergy: </span>
                            <Editable editing={editing} value={val("allergy", narratives.allergy)} onChange={set("allergy")} placeholder="—" />
                        </p>
                    )}
                </div>

                {/* Unaided vision */}
                <p className="text-[11px] font-bold mb-1">
                    Unaided Vision&nbsp;&nbsp;
                    <span className="font-bold">OD: </span>
                    <span className="font-normal">
                        <Editable editing={editing} value={val("uvOd", vision.unaided?.distance?.od || "")} onChange={set("uvOd")} placeholder="—" />
                    </span>
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    <span className="font-bold">OS: </span>
                    <span className="font-normal">
                        <Editable editing={editing} value={val("uvOs", vision.unaided?.distance?.os || "")} onChange={set("uvOs")} placeholder="—" />
                    </span>
                </p>

                {/* Refraction table */}
                {showFinalRx && (
                    <>
                        <p className="text-[11px] font-bold mb-1">REFRACTION:</p>
                        <table className="w-full border-collapse text-[11px] mb-3">
                            <thead>
                                <tr>
                                    <th className="border border-black px-2 py-1 w-16"></th>
                                    <th className="border border-black px-2 py-1 font-bold">Sphere</th>
                                    <th className="border border-black px-2 py-1 font-bold">Cylinder</th>
                                    <th className="border border-black px-2 py-1 font-bold">Axis</th>
                                    <th className="border border-black px-2 py-1 font-bold">Add</th>
                                    <th className="border border-black px-2 py-1 font-bold">VISION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {["od", "os"].map((eye) => (
                                    <tr key={eye}>
                                        <td className="border border-black px-2 py-1 font-bold">{eye.toUpperCase()}</td>
                                        {["sph", "cyl", "axis"].map((f) => (
                                            <td key={f} className="border border-black px-2 py-1 text-center">
                                                <Editable editing={editing} value={val(`rx-${eye}-${f}`, finalRx[eye]?.[f] || "")} onChange={set(`rx-${eye}-${f}`)} placeholder="" />
                                            </td>
                                        ))}
                                        <td className="border border-black px-2 py-1 text-center">
                                            <Editable editing={editing} value={val(`rx-${eye}-add`, finalRx.add || "")} onChange={set(`rx-${eye}-add`)} placeholder="" />
                                        </td>
                                        <td className="border border-black px-2 py-1 text-center">
                                            <Editable editing={editing} value={val(`rx-${eye}-vision`, finalRx[eye]?.vision || vision.presentGlasses?.[eye]?.vision || "")} onChange={set(`rx-${eye}-vision`)} placeholder="" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}

                {/* Retinoscopy / RR lines */}
                <div className="text-[11px] space-y-1 mb-3">
                    {(dryRetino.print !== false) && (
                        <div className="flex">
                            <span className="font-bold w-32 shrink-0">RETINOSCOPY:</span>
                            <span className="flex-1">
                                <span className="font-bold">OD: </span>
                                <Editable editing={editing} value={val("retinoOd", fmtRx(dryRetino.od))} onChange={set("retinoOd")} placeholder="—" />
                            </span>
                            <span className="flex-1">
                                <span className="font-bold">OS: </span>
                                <Editable editing={editing} value={val("retinoOs", fmtRx(dryRetino.os))} onChange={set("retinoOs")} placeholder="—" />
                            </span>
                        </div>
                    )}
                    {(drySubj.print !== false) && (
                        <div className="flex">
                            <span className="font-bold w-32 shrink-0">UN-DILATED RR:</span>
                            <span className="flex-1">
                                <span className="font-bold">OD: </span>
                                <Editable editing={editing} value={val("undilOd", fmtRx(drySubj.od))} onChange={set("undilOd")} placeholder="—" />
                            </span>
                            <span className="flex-1">
                                <span className="font-bold">OS: </span>
                                <Editable editing={editing} value={val("undilOs", fmtRx(drySubj.os))} onChange={set("undilOs")} placeholder="—" />
                            </span>
                        </div>
                    )}
                    {(wetRefr.print !== false) && (
                        <div className="flex">
                            <span className="font-bold w-32 shrink-0">DILATED RR:</span>
                            <span className="flex-1">
                                <span className="font-bold">OD: </span>
                                <Editable editing={editing} value={val("dilOd", fmtRx(wetRefr.od))} onChange={set("dilOd")} placeholder="—" />
                            </span>
                            <span className="flex-1">
                                <span className="font-bold">OS: </span>
                                <Editable editing={editing} value={val("dilOs", fmtRx(wetRefr.os))} onChange={set("dilOs")} placeholder="—" />
                            </span>
                        </div>
                    )}
                </div>

                {/* Slit lamp — two columns OD / OS */}
                {slit.print && (
                    <div className="mb-3">
                        <p className="text-[11px] font-bold mb-1">SLIT LAMP EXAMINATION:</p>
                        <div className="grid grid-cols-2 gap-8 text-[11px]">
                            {["od", "os"].map((eye) => (
                                <div key={eye}>
                                    <p className="font-bold mb-0.5">{eye.toUpperCase()}</p>
                                    {SLIT_LAMP_FINDINGS.filter((f) => hasText(slit[eye]?.[f.id])).map((f) => (
                                        <p key={f.id}>
                                            {f.label}:{" "}
                                            <Editable editing={editing} value={val(`slit-${eye}-${f.id}`, slit[eye][f.id])} onChange={set(`slit-${eye}-${f.id}`)} />
                                        </p>
                                    ))}
                                    {slit.fundus?.status && (
                                        <p>
                                            Fundus:{" "}
                                            <Editable
                                                editing={editing}
                                                value={val(`fundus-${eye}`, slit.fundus.status === "normal" ? "Pt seen un-dilated" : (slit.fundus.remarks || ""))}
                                                onChange={set(`fundus-${eye}`)}
                                            />
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Binocular vision findings */}
                {printableBvTests.length > 0 && (
                    <div className="mb-3">
                        <p className="text-[11px] font-bold mb-1">BINOCULAR VISION FINDINGS:</p>
                        <ul className="list-disc pl-6 text-[11px] space-y-0.5">
                            {printableBvTests.map((t) => (
                                <li key={t.id}>
                                    {t.label}:{" "}
                                    <Editable
                                        editing={editing}
                                        value={val(`bv-${t.id}`, [bv.tests[t.id].report, bv.tests[t.id].notes].filter(hasText).join(" — "))}
                                        onChange={set(`bv-${t.id}`)}
                                    />
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Diagnosis */}
                {checkedDiagnoses.length > 0 && (
                    <div className="mb-3">
                        <p className="text-[11px] font-bold mb-1">DIAGNOSIS:</p>
                        <ul className="list-disc pl-6 text-[11px] space-y-0.5">
                            {checkedDiagnoses.map((d) => (
                                <li key={d.id}>
                                    <Editable
                                        editing={editing}
                                        value={val(`dx-${d.id}`, [d.label, diagnosis.selected[d.id]?.detail].filter(hasText).join(" — "))}
                                        onChange={set(`dx-${d.id}`)}
                                    />
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Advice */}
                {(checkedAdvice.length > 0 || hasText(advice.freeText)) && (
                    <div className="mb-8">
                        <p className="text-[11px] font-bold mb-1">ADVICE:</p>
                        <ul className="list-disc pl-6 text-[11px] space-y-0.5">
                            {checkedAdvice.map((t) => (
                                <li key={t.id}>
                                    <Editable
                                        editing={editing}
                                        value={val(`adv-${t.id}`, t.hasDays && advice.followUpDays ? `${t.label} after ${advice.followUpDays} days` : t.label)}
                                        onChange={set(`adv-${t.id}`)}
                                    />
                                </li>
                            ))}
                            {hasText(advice.freeText) && (
                                <li>
                                    <Editable editing={editing} value={val("adviceFree", advice.freeText)} onChange={set("adviceFree")} />
                                </li>
                            )}
                        </ul>
                    </div>
                )}

                {/* Signature */}
                <div className="flex justify-end mt-6 text-[11px]">
                    <span>Optometrist Sign:</span>
                </div>
            </div>
        </div>
    );
};

export default OPDPrintTemplate;