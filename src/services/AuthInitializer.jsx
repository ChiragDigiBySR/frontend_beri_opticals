import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setUser, setAuthLoading, setStore } from "../features/auth/authSlice";
import api from "../utils/api";
import { setEmployees } from "../features/employees/employeeSlice";
import { setSettings } from "../features/settings/settingSlice";
import { useNavigate } from "react-router-dom";
import { setPageFields } from "../features/pagesFields/pageFieldSlice";

const AuthInitializer = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, user } = useSelector((state) => state.auth);
  const { fetched: settingsFetched } = useSelector((state) => state.settings);
  const { fetched: employeesFetched } = useSelector((state) => state.employees);

  // ================= AUTH INIT =================
  const initAuth = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      dispatch(setAuthLoading(false));
      navigate("/login");
      return;
    }

    try {
      const res = await api.get("/auth/verifyToken");

      if (res.data.success) {
        dispatch(setUser(res.data.user));
        dispatch(setStore(res.data.store));
      } else {
        localStorage.removeItem("token");
        navigate("/login");
      }
    } catch (error) {
      console.error("Auth init failed:", error);
      localStorage.removeItem("token");
      navigate("/login");
    } finally {
      dispatch(setAuthLoading(false));
    }
  };

  // ================= SETTINGS INIT =================
  const initSettings = async () => {
    try {
      const res = await api.get("/settings");

      if (res.data.success) {
        dispatch(setSettings(res.data.data || []));
        dispatch(setPageFields(res.data.pageFields || {}));
      } else {
        dispatch(setSettings([]));
      }
    } catch (error) {
      console.error("Settings init failed:", error);
      dispatch(setSettings([]));
    }
  };

  // ================= EMPLOYEE INIT =================
  const initEmployees = async () => {
    try {
      const res = await api.get("/users");

      if (res.data.success) {
        dispatch(setEmployees(res.data.data || []));
      } else {
        dispatch(setEmployees([]));
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
      dispatch(setEmployees([]));
    }
  };

  // ================= EFFECT =================
  useEffect(() => {
    if (loading) {
      initAuth();
    }
  }, [loading]);

  useEffect(() => {
    // Wait until auth finished
    if (!loading && user) {
      // Fetch settings for everyone
      if (user.role !== "SUPER_ADMIN" && !settingsFetched) {
        initSettings();
      }

      // IMPORTANT: Fetch employees ONLY for ADMIN (not SUPER_ADMIN)
      if (user.role !== "SUPER_ADMIN" && !employeesFetched) {
        initEmployees();
      }
    }
  }, [loading, user, settingsFetched, employeesFetched]);

  return children;
};

export default AuthInitializer;