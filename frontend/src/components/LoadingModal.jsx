export default function LoadingModal({ message = "Loading...", subtext = "Please wait." }) {
  return (
    <div className="relative w-full h-full">
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-200/50 transition-all duration-300 ease-in-out">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center transform transition-transform duration-300 animate-[fadeIn_0.3s_ease-in_forwards]">
            <h3 className="text-xl font-bold text-blue-600 mb-2">{message}</h3>
            <p className="text-gray-700">{subtext}</p>
        </div>
        </div>
    </div>
  );
}
