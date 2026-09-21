import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({
  allowedRoles = [],
  requiredPage,
  children,
}) => {
  const { user, store, loading } = useSelector((state) => state.auth);


  if (loading) return null;

  

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role not allowed
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/404" replace />;
  }

  if(requiredPage == "hasAI") {
    if(store.hasAI) {
      return children;
    }
    else {
      return <Navigate to="/403" replace />;
    }
  }

  // Only check pages for ADMIN & STAFF
  const storeHasPage = store?.pages?.includes(requiredPage);
  const userHasPage = user?.pages?.includes(requiredPage);

  if (
    user?.role !== "SUPER_ADMIN" &&   // SUPER_ADMIN bypass
    ["ADMIN", "STAFF"].includes(user?.role) &&
    requiredPage &&
    (!storeHasPage || !userHasPage)
  ) {
    return <Navigate to="/403" replace />;
  }

  return children;
};

export default ProtectedRoute;