export default function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      {/* CLASES DE ANCHO ACTUALIZADAS */}
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md md:max-w-2xl p-6 relative">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">{title}</h2>
        <button
          className="absolute top-3 right-3 text-gray-600 hover:text-gray-900"
          onClick={onClose}
        >
          ✖
        </button>
        <div>{children}</div>
      </div>
    </div>
  );
}
