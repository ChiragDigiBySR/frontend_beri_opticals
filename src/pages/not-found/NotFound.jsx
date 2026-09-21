// import { Link } from "react-router-dom";

// export default function NotFound() {
//   return (
//     <div className="flex items-center justify-center min-h-screen bg-gray-50 px-6">
//       <div className="text-center">
//         <h1 className="text-7xl font-bold text-red-500">404</h1>

//         <h2 className="mt-4 text-2xl font-semibold text-gray-800">
//           Page Not Found
//         </h2>

//         <p className="mt-2 text-gray-500">
//           The page you are looking for does not exist or you don’t have access.
//         </p>

//         {/* <Link
//           to="/"
//           className="inline-block mt-6 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
//         >
//           Go Back to Dashboard
//         </Link> */}
//       </div>
//     </div>
//   );
// }


import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 px-6">
      <div className="text-center animate-fadeIn">
        <h1 className="text-8xl font-extrabold text-gray-800 tracking-widest animate-bounce">
          404
        </h1>

        <div className="bg-red-500 text-white px-4 py-1 text-sm rounded-md inline-block mt-4 shadow-md animate-pulse">
          PAGE NOT FOUND
        </div>

        <p className="mt-6 text-gray-600 max-w-md mx-auto">
          The page you are looking for doesn’t exist or may have been moved.
          Please check the URL.
        </p>
        
      </div>
    </div>
  );
}