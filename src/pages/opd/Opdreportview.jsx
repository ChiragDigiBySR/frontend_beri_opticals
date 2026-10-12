import { FiPrinter, FiArrowLeft, FiUser } from "react-icons/fi";

// ─── Static label lookups (mirror the section components' own lists, so a
// stored id/key always resolves to the same human label the clinician saw) ──
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
    { id: "wfdt", label: "WFDT" },
    { id: "eom", label: "EOM" },
    { id: "saccades", label: "Saccades" },
    { id: "pursuits", label: "Pursuits" },
    { id: "coverTest", label: "Cover Test" },
    { id: "nearHorizontalPhoria", label: "Near Horizontal Phoria" },
    { id: "distanceHorizontalPhoria", label: "Distance Horizontal Phoria" },
    { id: "nearVerticalPhoria", label: "Near Vertical Phoria" },
    { id: "acToARatio", label: "AC:A Ratio" },
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

const REFRACTION_TABLES = [
    { id: "autoRefractometry", label: "Auto Refractometry" },
    { id: "autoKeratometry", label: "Auto Keratometry" },
    { id: "dryRetinoscopy", label: "Dry Retinoscopy" },
    { id: "wetRetinoscopy", label: "Wet Retinoscopy" },
    { id: "drySubjectiveRefraction", label: "Dry Subjective Refraction" },
    { id: "wetRefraction", label: "Wet Refraction (Post-cycloplegic)" },
    { id: "finalPrescription", label: "Final Prescription" },
];

const slugify = (label) => label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");

// ─── layout helpers ───────────────────────────────────────────────────────
const hasText = (v) => typeof v === "string" && v.trim().length > 0;

const SectionBlock = ({ title, children, className = "", hidden = false }) => (
    <div className={`mb-5 break-inside-avoid ${className}`}>
        <div className="flex items-center gap-2 mb-2">
            <div className="w-0.5 h-3.5 bg-orange-400 rounded-full print:bg-gray-800" />
            <span className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">{title}</span>
            {hidden && <NoPrintBadge />}
        </div>
        <div className="pl-3 border-l border-gray-100 print:border-gray-300">{children}</div>
    </div>
);

// Marks content that is recorded but excluded from the printed report.
// The view deliberately shows ALL data regardless of print flags — this badge is
// the only thing that reflects the flag, so nothing is ever silently hidden here.
const NoPrintBadge = () => (
    <span className="ml-2 shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-400 align-middle">
        not printed
    </span>
);

const Row = ({ label, value, hidden = false }) => {
    if (!hasText(value)) return null;
    return (
        <div className="flex gap-2 py-0.5 text-sm">
            <span className="text-gray-400 shrink-0 min-w-[180px]">{label}</span>
            <span className="text-gray-800 font-medium">{value}</span>
            {hidden && <NoPrintBadge />}
        </div>
    );
};

const EyeTable = ({ label, od, os, ou, add, columns = ["SPH", "CYL", "AXIS"], hidden = false }) => {
    const rowHasAny = (row) => row && Object.values(row).some((v) => hasText(v));
    if (!rowHasAny(od) && !rowHasAny(os) && !hasText(add)) return null;
    const keys = columns.map((c) => c.toLowerCase());
    return (
        <div className="mb-2">
            <p className="text-xs font-semibold text-gray-600 mb-1">
                {label}
                {hidden && <NoPrintBadge />}
            </p>
            <table className="text-xs border-collapse">
                <thead>
                    <tr>
                        <th className="text-left text-gray-400 font-medium pr-4 pb-1"></th>
                        {columns.map((c) => <th key={c} className="text-left text-gray-400 font-medium pr-4 pb-1">{c}</th>)}
                        {add !== undefined && <th className="text-left text-gray-400 font-medium pb-1">ADD</th>}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="pr-4 text-gray-500 font-medium">OD</td>
                        {keys.map((k) => <td key={k} className="pr-4 text-gray-800">{od?.[k] || "—"}</td>)}
                        {add !== undefined && <td rowSpan={2} className="text-gray-800 align-middle">{add || "—"}</td>}
                    </tr>
                    <tr>
                        <td className="pr-4 text-gray-500 font-medium">OS</td>
                        {keys.map((k) => <td key={k} className="pr-4 text-gray-800">{os?.[k] || "—"}</td>)}
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

const AcuityTable = ({ rows }) => {
    const visible = rows.filter((r) => hasText(r.od) || hasText(r.os) || hasText(r.ou));
    if (visible.length === 0) return null;
    return (
        <table className="text-xs border-collapse mb-2">
            <thead>
                <tr>
                    <th className="text-left text-gray-400 font-medium pr-4 pb-1"></th>
                    <th className="text-left text-gray-400 font-medium pr-4 pb-1">OD</th>
                    <th className="text-left text-gray-400 font-medium pr-4 pb-1">OS</th>
                    <th className="text-left text-gray-400 font-medium pb-1">OU</th>
                </tr>
            </thead>
            <tbody>
                {visible.map((r) => (
                    <tr key={r.label}>
                        <td className="pr-4 text-gray-500 font-medium whitespace-nowrap">{r.label}</td>
                        <td className="pr-4 text-gray-800">{r.od || "—"}</td>
                        <td className="pr-4 text-gray-800">{r.os || "—"}</td>
                        <td className="text-gray-800">{r.ou || "—"}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

// report: the full OPDReport document (as returned by GET/list endpoints)
// onBack: return to the list
// embedded: true when rendered inside another chrome (e.g. a modal) — skips the
// outer card border/shadow/padding and the Back/Print toolbar, which the host provides
const OPDReportView = ({ report = {}, onBack, embedded = false }) => {
    const patient = report.patient || {};
    const history = report.history || {};
    const ocular = report.ocularHistory || {};
    const systemic = report.systemicHistory || {};
    const allergy = report.allergy || {};
    const birth = report.birthDevelopment || {};
    const vision = report.vision || {};
    const refraction = report.refraction || {};
    const pgp = report.prescribedGlasses || {};
    const cl = report.contactLens || {};
    const slit = report.slitLamp || {};
    const bv = report.binocularVision || {};
    const therapy = report.visionTherapyPlan || {};
    const diagnosis = report.diagnosis || {};
    const advice = report.advice || {};

    const ocularItems = { ...Object.fromEntries(OCULAR_HISTORY_ITEMS.map((i) => [i.id, i])), ...ocular.items };
    const systemicItems = { ...Object.fromEntries(SYSTEMIC_HISTORY_ITEMS.map((i) => [i.id, i])), ...systemic.items };

    // Resolve a printable label for stored history item keys — fixed items already
    // have a label above; a custom (Add Another) id only has answer/detail, so we
    // fall back to prettifying its slug.
    const labelFor = (fixedList, id) => {
        const fixed = fixedList.find((i) => i.id === id);
        if (fixed) return fixed.label;
        return id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const allDiagnoses = [...DEFAULT_DIAGNOSES, ...(diagnosis.customDiagnoses || [])]
        .filter((d, i, arr) => arr.findIndex((x) => x.id === d.id) === i);
    const checkedDiagnoses = allDiagnoses.filter((d) => diagnosis.selected?.[d.id]?.checked);

    const allAdviceTemplates = [...ADVICE_TEMPLATES, ...(advice.customTemplates || [])]
        .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);
    const checkedAdvice = allAdviceTemplates.filter((t) => advice.selected?.[t.id]);

    // View shows everything that was recorded; the print flag only controls the badge.
    const printableRow = (field, label) =>
        hasText(field?.value) ? <Row key={label} label={label} value={field.value} hidden={!field.print} /> : null;

    // In the modal (embedded), short label/value sections pair up two-per-row via CSS grid
    // dense packing; table-heavy sections opt out with wideCls to keep their own full row.
    const wideCls = embedded ? "sm:col-span-2" : "";

    return (
        <div className={embedded ? "" : "max-w-3xl mx-auto"}>
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #opd-print-area, #opd-print-area * { visibility: visible; }
                    #opd-print-area { position: absolute; inset: 0; }
                    .no-print { display: none !important; }
                }
            `}</style>

            {/* Toolbar — hidden on print, and hidden entirely when embedded (host provides back/print controls) */}
            {!embedded && (
                <div className="no-print flex items-center justify-between mb-5">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition"
                    >
                        <FiArrowLeft size={13} /> Back to list
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                    >
                        <FiPrinter size={13} /> Print
                    </button>
                </div>
            )}

            <div id="opd-print-area" className={embedded
                ? "print:p-6"
                : "bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 print:border-0 print:shadow-none print:p-0"}>

                {/* Patient */}
                <div className={embedded ? "grid grid-cols-1 sm:grid-cols-2 sm:[grid-auto-flow:dense] gap-x-8 print:grid-cols-1" : ""}>
                    <SectionBlock title="Patient Details">
                        <div className="flex items-center gap-2 mb-1.5">
                            <FiUser size={13} className="text-gray-400" />
                            <span className="text-sm font-bold text-gray-800">{patient.name || "—"}</span>
                            {patient.gender && <span className="text-xs text-gray-400">({patient.gender})</span>}
                        </div>
                        <Row label="Mobile" value={patient.mobile ? `${patient.countryCode || ""} ${patient.mobile}` : ""} />
                        <Row label="Email" value={patient.email} />
                        <Row label="Date of Birth" value={patient.dob ? new Date(patient.dob).toLocaleDateString() : ""} />
                        <Row label="Relation" value={patient.relationType && patient.relationType !== "Self" ? `${patient.relationType} ${patient.relationName || ""}` : ""} />

                    </SectionBlock>

                    {/* History */}
                    {(hasText(history.chiefComplaint) || hasText(history.duration)) && (
                        <SectionBlock title="History">
                            <Row label="Chief Complaint" value={history.chiefComplaint} />
                            <Row label="Duration" value={history.duration} />
                        </SectionBlock>
                    )}

                    {/* Ocular History */}
                    {Object.keys(ocular.items || {}).some((id) => ocular.items[id]?.answer) && (
                        <SectionBlock title="Ocular History">
                            {Object.entries(ocular.items).filter(([, v]) => v?.answer).map(([id, v]) => (
                                <Row key={id} label={labelFor(OCULAR_HISTORY_ITEMS, id)} value={v.answer === "yes" ? (v.detail || "Yes") : "No"} />
                            ))}
                        </SectionBlock>
                    )}

                    {/* Systemic History */}
                    {Object.keys(systemic.items || {}).some((id) => systemic.items[id]?.answer) && (
                        <SectionBlock title="Systemic History">
                            {Object.entries(systemic.items).filter(([, v]) => v?.answer).map(([id, v]) => (
                                <Row
                                    key={id}
                                    label={labelFor(SYSTEMIC_HISTORY_ITEMS, id)}
                                    value={v.answer === "yes" ? [v.detail, v.duration].filter(Boolean).join(" — ") || "Yes" : "No"}
                                />
                            ))}
                        </SectionBlock>
                    )}

                    {/* Allergy */}
                    {allergy.answer && (
                        <SectionBlock title="Allergy">
                            <Row label="Allergy" value={allergy.answer === "yes" ? (allergy.detail || "Yes") : "Not aware of any"} />
                        </SectionBlock>
                    )}

                    {/* Birth & Development — only printable fields */}
                    {["birthWeight", "termStatus", "modeOfDelivery", "firstCry", "pregnancyComplications",
                        "birthComplications", "nicuAdmission", "vaccinationStatus", "developmentalMilestones", "notes"]
                        .some((k) => hasText(birth[k]?.value)) && (
                            <SectionBlock title="Birth & Development">
                                {printableRow(birth.birthWeight, "Birth Weight")}
                                {printableRow(birth.termStatus, "Term Status")}
                                {printableRow(birth.modeOfDelivery, "Mode of Delivery")}
                                {printableRow(birth.firstCry, "First Cry")}
                                {printableRow(birth.pregnancyComplications, "Pregnancy Complications")}
                                {printableRow(birth.birthComplications, "Birth Complications")}
                                {printableRow(birth.nicuAdmission, "NICU Admission")}
                                {printableRow(birth.vaccinationStatus, "Vaccination Status")}
                                {printableRow(birth.developmentalMilestones, "Developmental Milestones")}
                                {printableRow(birth.notes, "Notes")}
                            </SectionBlock>
                        )}

                    {/* Vision */}
                    <SectionBlock title="Vision" className={wideCls}>
                        <AcuityTable
                            rows={[
                                { label: "Unaided Distance", ...vision.unaided?.distance },
                                { label: "Unaided Near", ...vision.unaided?.near },
                                { label: "Vision with Pinhole", ...vision.unaided?.pinhole },
                                { label: "Color Vision", ...vision.unaided?.colorVision },
                                { label: "Contrast Sensitivity", ...vision.unaided?.contrastSensitivity },
                            ]}
                        />
                        <Row label="Contrast Sensitivity Note" value={vision.unaided?.contrastSensitivityNote} />
                        {vision.presentGlasses?.wearsGlasses === "yes" && (
                            <EyeTable label="Present Glasses" od={vision.presentGlasses.od} os={vision.presentGlasses.os} add={vision.presentGlasses.add} columns={["SPH", "CYL", "AXIS", "VISION"]} />
                        )}
                    </SectionBlock>

                    {/* Refraction — all tables shown; badge marks any excluded from print */}
                    {REFRACTION_TABLES.some((t) => refraction[t.id]) && (
                        <SectionBlock title="Refraction" className={wideCls}>
                            {REFRACTION_TABLES.filter((t) => refraction[t.id]).map((t) => (
                                <EyeTable
                                    key={t.id}
                                    label={t.label}
                                    hidden={!refraction[t.id]?.print}
                                    od={refraction[t.id]?.od}
                                    os={refraction[t.id]?.os}
                                    add={t.id === "finalPrescription" ? refraction[t.id]?.add : undefined}
                                    columns={t.id === "autoKeratometry" ? ["SPH", "CYL", "AXIS", "BC"] : ["SPH", "CYL", "AXIS"]}
                                />
                            ))}
                        </SectionBlock>
                    )}

                    {/* Prescribed Glasses */}
                    {/* {(hasText(pgp.od?.sph) || hasText(pgp.os?.sph) || hasText(pgp.add)) && (
                        <SectionBlock title="Prescribed Glasses">
                            <EyeTable label="Prescription" od={pgp.od} os={pgp.os} add={pgp.add} columns={["SPH", "CYL", "AXIS"]} />
                        </SectionBlock>
                    )} */}


                    {/* Contact Lens */}
                    {cl.usesContactLens === "yes" && (
                        <SectionBlock title="Contact Lens" hidden={!cl.print}>
                            <Row label="Lens Type" value={cl.lensType} />
                            <Row label="Brand" value={cl.brand} />
                            <Row label="Base Curve" value={cl.baseCurve} />
                            <Row label="Diameter" value={cl.diameter} />

                            {/* Contact Lens Power */}
                            {(cl.power?.od ||
                                cl.power?.os ||
                                hasText(cl.power?.add)) && (
                                    <div className="mt-3 mb-3">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">
                                            Contact Lens Power
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full min-w-[360px] border-collapse text-sm">
                                                <thead>
                                                    <tr className="bg-gray-50">
                                                        <th className="border border-gray-200 px-3 py-2 text-left text-[10px] font-semibold text-gray-500">
                                                            Eye
                                                        </th>
                                                        {["SPH", "CYL", "AXIS", "VISION"].map(
                                                            (field) => (
                                                                <th
                                                                    key={field}
                                                                    className="border border-gray-200 px-3 py-2 text-center text-[10px] font-semibold text-gray-500"
                                                                >
                                                                    {field}
                                                                </th>
                                                            )
                                                        )}
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {[
                                                        { key: "od", label: "OD" },
                                                        { key: "os", label: "OS" },
                                                    ].map(({ key, label }) => {
                                                        const eye = cl.power?.[key] || {};

                                                        return (
                                                            <tr key={key}>
                                                                <td className="border border-gray-200 px-3 py-2 font-semibold text-gray-700">
                                                                    {label}
                                                                </td>

                                                                {["sph", "cyl", "axis", "vision"].map(
                                                                    (field) => (
                                                                        <td
                                                                            key={field}
                                                                            className="border border-gray-200 px-3 py-2 text-center text-gray-700"
                                                                        >
                                                                            {hasText(eye[field])
                                                                                ? eye[field]
                                                                                : "—"}
                                                                        </td>
                                                                    )
                                                                )}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {hasText(cl.power?.add) && (
                                            <div className="mt-2">
                                                <Row label="ADD" value={cl.power.add} />
                                            </div>
                                        )}
                                    </div>
                                )}

                            <Row label="Wearing Schedule" value={cl.wearingSchedule} />
                            <Row label="Solution Used" value={cl.solutionUsed} />
                            <Row label="Notes" value={cl.notes} />
                        </SectionBlock>
                    )}

                    {/* Slit Lamp */}
                    {(slit.od || slit.os || slit.fundus?.status) && (
                        <SectionBlock title="Slit Lamp Examination" className={wideCls} hidden={!slit.print}>
                            {["lidsLashes", "conjunctiva", "cornea", "anteriorChamber", "iris", "lens", "vitreous", "pupil", "tearFilm"]
                                .filter((k) => hasText(slit.od?.[k]) || hasText(slit.os?.[k]))
                                .map((k) => (
                                    <div key={k} className="flex gap-2 py-0.5 text-sm">
                                        <span className="text-gray-400 shrink-0 min-w-[140px] capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                                        <span className="text-gray-800">OD: {slit.od?.[k] || "—"} &nbsp; OS: {slit.os?.[k] || "—"}</span>
                                    </div>
                                ))}
                            {slit.fundus?.status === "normal" && <Row label="Fundus" value="Patient seen Undilated" />}
                            {slit.fundus?.status === "notNormal" && <Row label="Fundus" value={slit.fundus.remarks} />}
                        </SectionBlock>
                    )}

                    {/* Binocular Vision — all tests shown; badge marks any excluded from print */}
                    {(BV_TESTS.some((t) => bv.tests?.[t.id]) || bv.notes) && (
                        <SectionBlock title="Binocular Vision" className={wideCls}>
                            {BV_TESTS.filter((t) => bv.tests?.[t.id]).map((t) => (
                                <Row
                                    key={t.id}
                                    label={t.label}
                                    hidden={!bv.tests[t.id].print}
                                    value={[bv.tests[t.id].report, bv.tests[t.id].notes].filter(hasText).join(" — ")}
                                />
                            ))}
                            {printableRow(bv.notes, "Notes")}
                        </SectionBlock>
                    )}

                    {/* Vision Therapy Plan */}
                    {hasText(therapy.plan) && (
                        <SectionBlock title="Vision Therapy Plan" hidden={!therapy.print}>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">{therapy.plan}</p>
                        </SectionBlock>
                    )}

                    {/* Diagnosis */}
                    {checkedDiagnoses.length > 0 && (
                        <SectionBlock title="Diagnosis">
                            {checkedDiagnoses.map((d) => (
                                <Row key={d.id} label={d.label} value={diagnosis.selected[d.id]?.detail || "✓"} />
                            ))}
                        </SectionBlock>
                    )}

                    {/* Advice */}
                    {(checkedAdvice.length > 0 || hasText(advice.freeText)) && (
                        <SectionBlock title="Advice" className={wideCls}>
                            {checkedAdvice.map((t) => (
                                <Row key={t.id} label={t.label} value={t.hasDays && advice.followUpDays ? `After ${advice.followUpDays} days` : "✓"} />
                            ))}
                            {hasText(advice.freeText) && <p className="text-sm text-gray-800 whitespace-pre-wrap mt-1">{advice.freeText}</p>}
                        </SectionBlock>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OPDReportView;