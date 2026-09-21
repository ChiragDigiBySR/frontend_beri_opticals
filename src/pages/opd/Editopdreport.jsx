import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
    FiClipboard, FiEye, FiActivity, FiUsers, FiTarget, FiZap, FiLayers, FiCircle, FiSliders,
    FiTrendingUp, FiCheckSquare, FiFileText, FiSave, FiAlertCircle, FiArrowLeft, FiCalendar,
} from "react-icons/fi";

import HistorySection from "./sections/HistorySection";
import OcularHistorySection from "./sections/OcularHistorySection";
import SystemicHistorySection from "./sections/SystemicHistorySection";
import AllergySection from "./sections/AllergySection";
import BirthDevelopmentSection from "./sections/BirthDevelopmentSection";
import VisionSection from "./sections/VisionSection";
import RefractionSection from "./sections/RefractionSection";
import PrescribedGlassesSection from "./sections/PrescribedGlassesSection";
import ContactLensSection from "./sections/ContactLensSection";
import SlitLampSection from "./sections/SlitLampSection";
import BinocularVisionSection from "./sections/BinocularVisionSection";
import VisionTherapyPlanSection from "./sections/VisionTherapyPlanSection";
import DiagnosisSection from "./sections/DiagnosisSection";
import AdviceSection from "./sections/AdviceSection";
import FollowUpSection from "./sections/FollowUpSection";
import PatientSection from "./sections/Patientsection";

import { hideLoader, showLoader } from "../../features/loader/loaderSlice";
import api from "../../utils/api";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { useOpdOptions } from "../../hooks/useOpdOptions";

// Sections that read/write clinic-added "Add Another" options
const OPD_OPTIONS_SECTION_KEY = {
    history: "history",
    ocular: "ocularHistory",
    systemic: "systemicHistory",
    diagnosis: "diagnosis",
    advice: "advice",
};

const SECTIONS = [
    {
        id: "history",
        label: "History",
        icon: FiClipboard,
        description: "Chief complaint and duration",
    },
    {
        id: "ocular",
        label: "Ocular History",
        icon: FiEye,
        description: "Spectacle & lens use, prior surgery",
    },
    {
        id: "systemic",
        label: "Systemic History",
        icon: FiActivity,
        description: "Diabetes, thyroid, allergies...",
    },
    {
        id: "allergy",
        label: "Allergy",
        icon: FiAlertCircle,
        description: "Known drug/other allergies",
    },
    {
        id: "birth",
        label: "Birth & Development",
        icon: FiUsers,
        description: "Birth, delivery, milestones",
    },
    {
        id: "vision",
        label: "Vision",
        icon: FiEye,
        description: "Unaided acuity & present glasses",
    },
    {
        id: "refraction",
        label: "Refraction",
        icon: FiTarget,
        description: "Auto, retinoscopy, subjective, final",
    },
    {
        id: "prescribedGlasses",
        label: "Prescribed Glasses",
        icon: FiSliders,
        description: "Glasses dispensed to patient",
    },
    {
        id: "contactLens",
        label: "Contact Lens",
        icon: FiCircle,
        description: "Lens type, fit, wear schedule",
    },
    {
        id: "slitLamp",
        label: "Slit Lamp Exam",
        icon: FiLayers,
        description: "Anterior segment findings",
    },
    {
        id: "binocular",
        label: "Binocular Vision",
        icon: FiZap,
        description: "Phorias, vergence, accommodation",
    },
    {
        id: "therapyPlan",
        label: "Vision Therapy Plan",
        icon: FiTrendingUp,
        description: "Recommended exercises & schedule",
    },
    {
        id: "diagnosis",
        label: "Diagnosis",
        icon: FiCheckSquare,
        description: "Final clinical diagnoses",
    },
    {
        id: "advice",
        label: "Advice",
        icon: FiFileText,
        description: "Instructions given to patient",
    },
    {
        id: "followUp",
        label: "Follow-up",
        icon: FiCalendar,
        description: "Next visit schedule",
    },
];

const GROUPS = [
    {
        title: "History",
        ids: ["history", "ocular", "systemic", "allergy", "birth"],
    },
    {
        title: "Vision & Refraction",
        ids: [
            "vision",
            "refraction",
            "prescribedGlasses",
            "contactLens",
        ],
    },
    {
        title: "Clinical Exam",
        ids: ["slitLamp", "binocular"],
    },
    {
        title: "Plan & Outcome",
        ids: ["therapyPlan", "diagnosis", "advice", "followUp"],
    },
];

const SECTION_COMPONENTS = {
    history: HistorySection,
    ocular: OcularHistorySection,
    systemic: SystemicHistorySection,
    allergy: AllergySection,
    birth: BirthDevelopmentSection,
    vision: VisionSection,
    refraction: RefractionSection,
    prescribedGlasses: PrescribedGlassesSection,
    contactLens: ContactLensSection,
    slitLamp: SlitLampSection,
    binocular: BinocularVisionSection,
    therapyPlan: VisionTherapyPlanSection,
    diagnosis: DiagnosisSection,
    advice: AdviceSection,

    // NEW
    followUp: FollowUpSection,
};

// Maps UI section IDs to actual OPDReport schema fields
const SCHEMA_FIELD_MAP = {
    history: "history",
    ocular: "ocularHistory",
    systemic: "systemicHistory",
    allergy: "allergy",
    birth: "birthDevelopment",
    vision: "vision",
    refraction: "refraction",
    prescribedGlasses: "prescribedGlasses",
    contactLens: "contactLens",
    slitLamp: "slitLamp",
    binocular: "binocularVision",
    therapyPlan: "visionTherapyPlan",
    diagnosis: "diagnosis",
    advice: "advice",

    // NEW
    followUp: "followUp",
};

const hasData = (obj) =>
    !!obj &&
    typeof obj === "object" &&
    Object.keys(obj).length > 0;

// Builds formData from existing OPD report
const buildInitialFormData = (report) => {
    const data = {
        patient: report?.patient || {},
    };

    SECTIONS.forEach((s) => {
        data[s.id] =
            report?.[SCHEMA_FIELD_MAP[s.id]] || {};
    });

    return data;
};

const EditOPDReport = ({ onBack, onSaved }) => {
    const { id } = useParams();

    const [report, setReport] = useState(null);

    const [activeId, setActiveId] = useState(
        SECTIONS[0].id
    );

    const [formData, setFormData] = useState(() =>
        buildInitialFormData(null)
    );

    const [loading, setLoading] = useState(false);
    const [fetchingReport, setFetchingReport] =
        useState(true);

    const [patientErrors, setPatientErrors] = useState({});

    const [opdDate, setOpdDate] = useState(() =>
        new Date().toISOString().slice(0, 10)
    );

    const [opdTime, setOpdTime] = useState(() =>
        new Date().toTimeString().slice(0, 5)
    );

    const dispatch = useDispatch();

    const {
        options: opdOptions,
        addOption: addOpdOption,
    } = useOpdOptions();

    // =============================
    // Fetch OPD report
    // =============================

    useEffect(() => {
        const fetchOPDReport = async () => {
            if (!id) {
                toast.error("OPD report ID is missing");
                setFetchingReport(false);
                return;
            }

            try {
                setFetchingReport(true);

                const res = await api.get(
                    `/opd/get-single/${id}`
                );

                if (res.data.success) {
                    const fetchedReport = res.data.report;

                    setReport(fetchedReport);

                    // This now also loads followUp
                    setFormData(
                        buildInitialFormData(fetchedReport)
                    );

                    if (fetchedReport.opdDate) {
                        setOpdDate(
                            new Date(
                                fetchedReport.opdDate
                            )
                                .toISOString()
                                .slice(0, 10)
                        );
                    }

                    if (fetchedReport.opdTime) {
                        setOpdTime(
                            fetchedReport.opdTime
                        );
                    }
                }
            } catch (err) {
                toast.error(
                    err.response?.data?.message ||
                    "Failed to fetch OPD report"
                );

                onBack?.();
            } finally {
                setFetchingReport(false);
            }
        };

        fetchOPDReport();
    }, [id]);

    const updateSection = (
        sectionId,
        data
    ) => {
        setFormData((prev) => ({
            ...prev,
            [sectionId]: data,
        }));
    };

    const activeIndex = SECTIONS.findIndex(
        (s) => s.id === activeId
    );

    const activeMeta = SECTIONS[activeIndex];

    const ActiveComponent =
        SECTION_COMPONENTS[activeId];

    const ActiveIcon = activeMeta.icon;

    const filledCount = SECTIONS.filter(
        (s) => hasData(formData[s.id])
    ).length;

    const progressPct = Math.round(
        (filledCount / SECTIONS.length) * 100
    );

    // =============================
    // Patient validation
    // =============================

    const validatePatientData = (
        patient = {}
    ) => {
        const errs = {};

        if (
            !patient.name ||
            !patient.name.trim()
        ) {
            errs.name =
                "Patient name is required.";
        }

        if (
            !patient.mobile ||
            !patient.mobile.trim()
        ) {
            errs.mobile =
                "Mobile number is required.";
        }

        return errs;
    };

    // =============================
    // Save changes
    // =============================

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validationErrors =
            validatePatientData(
                formData.patient
            );

        setPatientErrors(
            validationErrors
        );

        if (
            Object.keys(validationErrors)
                .length > 0
        ) {
            toast.error(
                "Please fill in the patient's name and mobile number before saving."
            );

            return;
        }

        const confirm =
            await Swal.fire({
                title:
                    "Save changes to this OPD report?",
                text:
                    "Please make sure the details are correct before submitting.",
                icon: "question",
                showCancelButton: true,
                confirmButtonColor:
                    "#ea580c",
                cancelButtonColor:
                    "#9ca3af",
                confirmButtonText:
                    "Yes, save changes",
            });

        if (!confirm.isConfirmed)
            return;

        // =============================
        // Build PUT payload
        // =============================

        const payload = {
            patient: formData.patient,
            opdDate,
            opdTime,
        };

        SECTIONS.forEach((s) => {
            payload[
                SCHEMA_FIELD_MAP[s.id]
            ] = formData[s.id];
        });

        try {
            setLoading(true);

            dispatch(showLoader());

            const res = await api.put(
                `/opd/${report.opdNumber}`,
                payload
            );

            if (res.data.success) {
                toast.success(
                    res.data.message
                );

                onSaved?.(
                    res.data.report
                );

                onBack?.();
            }
        } catch (err) {
            toast.error(
                err.response?.data?.message ||
                "Something went wrong"
            );
        } finally {
            setLoading(false);

            dispatch(hideLoader());
        }
    };

    // =============================
    // Loading state
    // =============================

    if (fetchingReport) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    Loading OPD report...
                </div>
            </div>
        );
    }

    if (!report) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-6">

                {/* Page header */}
                <div className="flex items-start justify-between flex-wrap gap-4 mb-6">

                    <div>
                        <button
                            type="button"
                            onClick={onBack}
                            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 transition mb-2"
                        >
                            <FiArrowLeft size={13} />
                            Back to list
                        </button>

                        <h1 className="text-xl font-bold text-gray-800">
                            Edit OPD Report
                        </h1>

                        <p className="text-xs text-gray-400 mt-1">
                            {report.opdNumber}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">

                        {/* OPD date & time */}
                        <div className="flex items-center gap-2">

                            <div>
                                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                                    OPD Date
                                </label>

                                <input
                                    type="date"
                                    value={opdDate}
                                    onChange={(e) =>
                                        setOpdDate(
                                            e.target.value
                                        )
                                    }
                                    className="px-2.5 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                                />
                            </div>

                            <div>
                                <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                                    Time
                                </label>

                                <input
                                    type="time"
                                    value={opdTime}
                                    onChange={(e) =>
                                        setOpdTime(
                                            e.target.value
                                        )
                                    }
                                    className="px-2.5 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                                />
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="text-right">
                            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                                {filledCount} of{" "}
                                {SECTIONS.length}{" "}
                                sections
                            </div>

                            <div className="w-36 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-orange-500 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${progressPct}%`,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Save */}
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition shadow-sm shadow-orange-200"
                        >
                            {loading ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <FiSave size={13} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Patient */}
                <PatientSection
                    data={formData.patient || {}}
                    onChange={(data) => {
                        updateSection(
                            "patient",
                            data
                        );

                        if (
                            Object.keys(
                                patientErrors
                            ).length > 0
                        ) {
                            setPatientErrors(
                                validatePatientData(
                                    data
                                )
                            );
                        }
                    }}
                    errors={patientErrors}
                />

                {/* Mobile section tabs */}
                <div className="md:hidden flex gap-2 overflow-x-auto pb-3 mb-3 -mx-4 px-4">
                    {SECTIONS.map(
                        (s, i) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() =>
                                    setActiveId(
                                        s.id
                                    )
                                }
                                className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-xl text-[11px] font-semibold border transition
                                    ${activeId ===
                                        s.id
                                        ? "bg-orange-500 text-white border-orange-500"
                                        : "bg-white text-gray-600 border-gray-200"
                                    }`}
                            >
                                <span className="opacity-60">
                                    {i + 1}.
                                </span>

                                {s.label}
                            </button>
                        )
                    )}
                </div>

                <div className="flex gap-5 items-start">

                    {/* Sidebar */}
                    <div className="hidden md:block w-64 shrink-0 sticky top-6">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">

                            {GROUPS.map(
                                (
                                    group,
                                    gi
                                ) => (
                                    <div
                                        key={
                                            group.title
                                        }
                                        className={
                                            gi >
                                                0
                                                ? "mt-4"
                                                : ""
                                        }
                                    >
                                        <div className="px-2 mb-1.5 text-[9px] font-bold text-gray-300 uppercase tracking-widest">
                                            {
                                                group.title
                                            }
                                        </div>

                                        {group.ids.map(
                                            (
                                                sectionId
                                            ) => {
                                                const s =
                                                    SECTIONS.find(
                                                        (
                                                            sec
                                                        ) =>
                                                            sec.id ===
                                                            sectionId
                                                    );

                                                const Icon =
                                                    s.icon;

                                                const isActive =
                                                    activeId ===
                                                    sectionId;

                                                const filled =
                                                    hasData(
                                                        formData[
                                                        sectionId
                                                        ]
                                                    );

                                                return (
                                                    <button
                                                        key={
                                                            sectionId
                                                        }
                                                        type="button"
                                                        onClick={() =>
                                                            setActiveId(
                                                                sectionId
                                                            )
                                                        }
                                                        className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-left text-xs font-semibold transition mb-0.5
                                                            ${isActive
                                                                ? "bg-orange-50 text-orange-600"
                                                                : "text-gray-500 hover:bg-gray-50"
                                                            }`}
                                                    >
                                                        <span
                                                            className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition
                                                                ${isActive
                                                                    ? "bg-orange-500 text-white"
                                                                    : "bg-gray-50 text-gray-400"
                                                                }`}
                                                        >
                                                            <Icon
                                                                size={
                                                                    13
                                                                }
                                                            />
                                                        </span>

                                                        <span className="flex-1 truncate">
                                                            {
                                                                s.label
                                                            }
                                                        </span>

                                                        <span
                                                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${filled
                                                                    ? "bg-orange-400"
                                                                    : "bg-gray-200"
                                                                }`}
                                                        />
                                                    </button>
                                                );
                                            }
                                        )}
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* Active section */}
                    <div className="flex-1 min-w-0">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-7">

                            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-100">

                                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50 text-orange-500 shrink-0">
                                    <ActiveIcon size={18} />
                                </span>

                                <div className="min-w-0">
                                    <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                                        Section{" "}
                                        {activeIndex +
                                            1}{" "}
                                        of{" "}
                                        {
                                            SECTIONS.length
                                        }
                                    </div>

                                    <h2 className="text-sm font-bold text-gray-800 truncate">
                                        {
                                            activeMeta.label
                                        }
                                    </h2>

                                    <p className="text-xs text-gray-400 truncate">
                                        {
                                            activeMeta.description
                                        }
                                    </p>
                                </div>
                            </div>

                            {ActiveComponent && (
                                <ActiveComponent
                                    data={
                                        formData[
                                        activeId
                                        ] || {}
                                    }
                                    onChange={(
                                        data
                                    ) =>
                                        updateSection(
                                            activeId,
                                            data
                                        )
                                    }

                                    {...(activeId ===
                                        "prescribedGlasses"
                                        ? {
                                            finalRefraction:
                                                formData
                                                    .refraction
                                                    ?.finalPrescription,
                                        }
                                        : {})}

                                    {...(OPD_OPTIONS_SECTION_KEY[
                                        activeId
                                    ]
                                        ? {
                                            customOptions:
                                                opdOptions[
                                                OPD_OPTIONS_SECTION_KEY[
                                                activeId
                                                ]
                                                ] || [],

                                            onAddOption: (
                                                value
                                            ) =>
                                                addOpdOption(
                                                    OPD_OPTIONS_SECTION_KEY[
                                                    activeId
                                                    ],
                                                    value
                                                ),
                                        }
                                        : {})}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditOPDReport;