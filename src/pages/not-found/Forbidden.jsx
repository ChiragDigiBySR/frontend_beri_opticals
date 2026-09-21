import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-6">
      <div className="bg-white p-10 rounded-2xl shadow-2xl text-center max-w-md w-full animate-fadeIn">

        <div className="flex justify-center mb-6">
          <div className="bg-red-100 p-4 rounded-full">
            <ShieldAlert className="text-red-600 w-10 h-10" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-800">
          403 - Access Denied
        </h1>

        <p className="mt-4 text-gray-600">
          You don’t have permission to access this page.
          Please contact your administrator if you believe this is a mistake.
        </p>

      </div>
    </div>
  );
}