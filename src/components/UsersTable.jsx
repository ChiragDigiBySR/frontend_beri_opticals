import { useReactTable, getCoreRowModel, flexRender, createColumnHelper, } from "@tanstack/react-table";
import { FiTrash2 } from "react-icons/fi";
import api from "../utils/api";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";

export default function UsersTable({ users, loading, refresh }) {

    const permissions = useSelector((state) => state.auth.user.permissions);  // loggedin user permissions

    const columnHelper = createColumnHelper();

    const columns = [
        columnHelper.accessor("name", {
            header: "Name",
            cell: ({ getValue }) => {
                const name = getValue() || "";
                const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
                return (
                    <div className="flex items-center gap-2.5 justify-center">
                        <span className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {initials}
                        </span>
                        <span className="font-medium text-gray-700">{name}</span>
                    </div>
                );
            },
        }),
        columnHelper.accessor("mobile", { header: "Mobile" }),
        columnHelper.accessor("email", { header: "Email" }),
        columnHelper.accessor("designation", {
            header: "Designation",
            cell: ({ getValue }) => (
                <span className="inline-block text-[10px] font-bold uppercase tracking-wide bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded-full">
                    {getValue()}
                </span>
            ),
        }),
        columnHelper.accessor("commission", { header: "Commission %" }),
        columnHelper.accessor("isActive", {
            header: "Status",
            cell: ({ getValue }) => {
                const active = getValue() !== false;
                return (
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-red-500"}`} />
                        {active ? "Active" : "Inactive"}
                    </span>
                );
            },
        }),

        ...(permissions?.includes("DELETE USER")
            ? [
                columnHelper.display({
                    id: "actions",
                    header: "Actions",
                    cell: ({ row }) => (
                        <button
                            onClick={async () => {
                                const result = await Swal.fire({
                                    title: "Are you sure?",
                                    text: "This user will be deleted!",
                                    icon: "warning",
                                    showCancelButton: true,
                                    confirmButtonColor: "#ea580c",
                                    cancelButtonColor: "#6b7280",
                                    confirmButtonText: "Yes, delete it!",
                                });

                                if (result.isConfirmed) {
                                    try {
                                        await api.delete(
                                            `/users/delete-user/${row.original._id}`
                                        );

                                        await Swal.fire({
                                            title: "Deleted!",
                                            text: "User has been deleted.",
                                            icon: "success",
                                            confirmButtonColor: "#ea580c",
                                        });

                                        refresh();
                                    } catch (error) {
                                        Swal.fire({
                                            title: "Error!",
                                            text:
                                                error.response?.data?.error ||
                                                "Something went wrong",
                                            icon: "error",
                                        });
                                    }
                                }
                            }}
                            className="text-red-600 cursor-pointer font-medium hover:text-red-800"
                        >
                            <FiTrash2 size={18} />
                        </button>
                    ),
                }),
            ]
            : []),
    ];

    const table = useReactTable({
        data: users,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="bg-white shadow-lg rounded-2xl p-4 sm:p-5">
            <h2 className="font-semibold text-lg mb-4">All Users</h2>

            {loading ? (
                <div className="space-y-2 animate-pulse">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-11 bg-gray-100 rounded-xl" />
                    ))}
                </div>
            ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-3">
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" className="text-orange-400">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-500">No users yet</p>
                    <p className="text-xs text-gray-400 mt-1">Users you add will show up here.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-sm min-w-[720px]">
                        <thead className="bg-orange-50">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <th key={header.id} className="p-3 text-center text-[11px] font-bold uppercase tracking-wide text-black-600">
                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>

                        <tbody>
                            {table.getRowModel().rows.map((row, i) => (
                                <tr
                                    key={row.id}
                                    className={`border-b border-gray-50 last:border-b-0 hover:bg-orange-50/40 transition-colors ${i % 2 === 1 ? "bg-gray-50/40" : ""
                                        }`}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="p-3 text-center">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}