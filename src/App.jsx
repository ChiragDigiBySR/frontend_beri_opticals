import AppRoutes from "./routes/AppRoutes";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";
import { useDispatch, useSelector } from "react-redux";
import GlobalLoader from "./components/GlobalLoader";
import { hideLoader, showLoader } from "./features/loader/loaderSlice";
import { useEffect } from "react";

function App() {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);

  useEffect(() => {
    if (loading) {
      dispatch(showLoader());
    } else {
      dispatch(hideLoader());
    }
  }, [loading, dispatch]);




  return <>
    <ToastContainer position="top-right" autoClose={5000} />
    <GlobalLoader />

    <AppRoutes />;
  </>
}

export default App;
