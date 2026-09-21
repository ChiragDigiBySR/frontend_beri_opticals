import { useSelector } from "react-redux";

export default function Loader() {
  const { loading } = useSelector((state) => state.loader);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/25 backdrop-blur-sm">
      <div className="w-16 h-16 border-4 border-gray-300 border-t-orange-500 rounded-full animate-spin"></div>
    </div>
  );
}