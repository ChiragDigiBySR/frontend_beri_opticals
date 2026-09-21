// import { useEffect, useState } from "react";
// import api from "../utils/api";
// import UserForm from "../components/UserForm";
// import UsersTable from "../components/UsersTable";
// import { useSelector } from "react-redux";

// export default function UserManagement() {
//   const [users, setUsers] = useState([]);
//   const [loading, setLoading] = useState(false);

//   const [storePages, setStorePages] = useState([]);
//   const [storePermissions, setStorePermissions] = useState([]);
//   const permissions = useSelector((state) => state.auth.user.permissions);  // loggedin user permissions
//   const canManageUsers = permissions?.includes("ADD USER") || permissions?.includes("UPDATE USER");

//   const fetchUsers = async () => {
//     try {
//       setLoading(true);
//       const res = await api.get("/users/");
//       if (res.data.success) {
//         setUsers(res.data.data);
//       }
//     } catch (error) {
//       console.error(error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchStore = async () => {
//     try {
//       const res = await api.get("/store/mystore/");
//       if (res.data.success) {
//         setStorePages(res.data.pages || []);
//         setStorePermissions(res.data.permissions || []);
//       }
//     } catch (error) {
//       console.error(error);
//     }
//   };

//   useEffect(() => {
//     fetchUsers();
//     fetchStore();
//   }, []);

//   return (
//     <div className="p-6 space-y-6">
//       <h1 className="text-2xl font-bold text-orange-600">
//         User Management
//       </h1>

//       <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
//         {canManageUsers && (
//           <div className="lg:col-span-1">
//             <UserForm
//               refresh={fetchUsers}
//               users={users}
//               storePages={storePages}
//               storePermissions={storePermissions}
//             />
//           </div>
//         )}

//         <div className={canManageUsers ? "lg:col-span-3" : "lg:col-span-4"}>
//           <UsersTable
//             users={users}
//             loading={loading}
//             refresh={fetchUsers}
//           />
//         </div>
//       </div>
//     </div>
//   );
// }


import { useEffect, useState } from "react";
import api from "../utils/api";
import UserForm from "../components/UserForm";
import UsersTable from "../components/UsersTable";
import { useSelector } from "react-redux";

/* ─── Inline icons ──────────────────────────────────────────────────────── */
const Ico = {
  Users: () => (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Shield: () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Lock: () => (
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
};

/* ─── Stat pill ─────────────────────────────────────────────────────────── */
const StatPill = ({ label, value, color = "bg-gray-100 text-gray-600" }) => (
  <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl ${color}`}>
    <span className="text-lg font-black leading-none">{value}</span>
    <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</span>
  </div>
);

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [storePages, setStorePages] = useState([]);
  const [storePermissions, setStorePermissions] = useState([]);

  const permissions = useSelector((state) => state.auth.user.permissions);
  const canManageUsers =
    permissions?.includes("ADD USER") || permissions?.includes("UPDATE USER");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users/");
      if (res.data.success) setUsers(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStore = async () => {
    try {
      const res = await api.get("/store/mystore/");
      if (res.data.success) {
        setStorePages(res.data.pages || []);
        setStorePermissions(res.data.permissions || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStore();
  }, []);

  const activeUsers = users.filter((u) => u.isActive !== false).length;
  const inactiveUsers = users.length - activeUsers;

  return (
    <div className="min-h-screen bg-[#f7f8fa] p-5 space-y-5">


      {/* ── Content grid ────────────────────────────────────────────────── */}
      <div className={`grid grid-cols-1 gap-5 ${canManageUsers ? "lg:grid-cols-4" : ""}`}>

        {/* Sidebar: Add/Edit User form */}
        {canManageUsers && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-full">

              {/* Form header */}
              <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center">
                  <Ico.Plus />
                </span>
                <span className="text-xs font-bold text-gray-700">Add / Edit User</span>
              </div>

              <div className="p-5">
                <UserForm
                  refresh={fetchUsers}
                  users={users}
                  storePages={storePages}
                  storePermissions={storePermissions}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main: Users table */}
        <div className={canManageUsers ? "lg:col-span-3" : "lg:col-span-4"}>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Table header */}
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center">
                  <Ico.Users />
                </span>
                <span className="text-xs font-bold text-gray-700">All Users</span>
              </div>
              <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
                {users.length} records
              </span>
            </div>

            <div className="p-5">
              <UsersTable
                users={users}
                loading={loading}
                refresh={fetchUsers}
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}