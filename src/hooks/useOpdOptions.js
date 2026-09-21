import { useCallback, useMemo, useState } from "react";
import { useSelector } from "react-redux";
// import api from "../../../utils/api";
import api from "../utils/api";

const EMPTY = { history: [], ocularHistory: [], systemicHistory: [], diagnosis: [], advice: [] };

// Reads clinic-added custom options for the OPD report's "Add Another" fields
// (History, Ocular History, Systemic History, Diagnosis, Advice) straight off
// the settings data already loaded into Redux — no separate fetch here.
//
// NOTE: adjust the selector below if your settings slice stores the document
// at a different path than state.settings.data.
export const useOpdOptions = () => {
    const storeOptions = useSelector((state) => state.settings?.data?.opdOptions);

    // Options just added in this session, merged on top of the Redux copy so
    // they show up immediately without waiting for a settings refetch.
    const [pending, setPending] = useState({});

    const options = useMemo(() => {
        const base = { ...EMPTY, ...(storeOptions || {}) };
        Object.keys(pending).forEach((section) => {
            const extra = pending[section].filter((v) => !base[section]?.includes(v));
            base[section] = [...(base[section] || []), ...extra];
        });
        return base;
    }, [storeOptions, pending]);

    const addOption = useCallback((section, value) => {
        const trimmed = typeof value === "string" ? value.trim() : "";
        if (!trimmed) return;

        setPending((prev) => {
            const list = prev[section] || [];
            if (list.includes(trimmed)) return prev;
            return { ...prev, [section]: [...list, trimmed] };
        });

        api.post("/settings/opd-options", { section, value: trimmed }).catch(() => {
            // Kept in local state for this session even if the persist call fails.
        });
    }, []);

    return { options, addOption };
};

export default useOpdOptions;
