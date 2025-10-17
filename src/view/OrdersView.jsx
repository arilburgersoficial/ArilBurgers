import React, { useState, useEffect } from "react";
import { usePaginatedOrders } from "../hooks/usePaginatedOrders";
import Modal from "../components/Modal";
import SkeletonLoader from '../components/SkeletonLoader';

const OrdersView = () => {
  const { orders, loading, hasMore, fetchInitialOrders, loadMoreOrders } = usePaginatedOrders();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchInitialOrders();
  }, [fetchInitialOrders]);

  const handleShowDetails = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const TableSkeleton = () => (
    [...Array(10)].map((_, i) => (
        <tr key={i} className="border-b border-gray-700">
            <td className="px-4 py-3"><SkeletonLoader className="h-5 w-24" /></td>
            <td className="px-4 py-3"><SkeletonLoader className="h-5 w-16" /></td>
            <td className="px-4 py-3"><SkeletonLoader className="h-5 w-20" /></td>
            <td className="px-4 py-3"><SkeletonLoader className="h-5 w-32" /></td>
            <td className="px-4 py-3"><SkeletonLoader className="h-5 w-20" /></td>
            <td className="px-4 py-3"><SkeletonLoader className="h-7 w-20" /></td>
        </tr>
    ))
  );

  return (
    <div className="text-white p-6">
      <h1 className="text-3xl font-bold mb-6">📦 Historial de Pedidos</h1>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Detalle del Pedido: ${selectedOrder?.folio}`}
      >
        {selectedOrder && (
          <div className="text-gray-800">
            <div className="space-y-2 mb-4">
              {selectedOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between border-b pb-1">
                  <span>{item.quantity} × {item.name}</span>
                  <span className="font-semibold">${((item.price * item.quantity) || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 space-y-1 font-mono">
                <p className="flex justify-between"><span>Subtotal:</span><span>${(selectedOrder.totals.subtotal || 0).toFixed(2)}</span></p>
                {selectedOrder.totals.discount > 0 && <p className="flex justify-between text-green-600"><span>Descuento:</span><span>-${(selectedOrder.totals.discount || 0).toFixed(2)}</span></p>}
                <p className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>${((selectedOrder.totals.finalTotal) || 0).toFixed(2)}</span>
                </p>
            </div>
             <div className="border-t pt-2 mt-4">
              <p className="flex justify-between font-semibold">
                  <span>Método de Pago:</span>
                  <span className="capitalize">{selectedOrder.paymentMethod || 'No especificado'}</span>
              </p>
            </div>
          </div>
        )}
      </Modal>

      {orders.length === 0 && !loading ? (
        <p className="text-gray-400">No hay pedidos registrados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <thead className="bg-gray-700 text-[var(--primary-color)]">
              <tr>
                <th className="px-4 py-3 text-left">Folio</th>
                <th className="px-4 py-3 text-left">Total</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Método de Pago</th>
                <th className="px-4 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && orders.length === 0 ? <TableSkeleton /> : orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-gray-700 hover:bg-gray-700 transition"
                >
                  <td className="px-4 py-3 font-mono">{order.folio || `#${order.id.slice(-5)}`}</td>
                  <td className="px-4 py-3 font-bold text-[var(--primary-color)]">
                    ${((order.totals?.finalTotal) || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        order.status === "pending" ? "bg-red-500 text-white"
                          : order.status === "preparing" ? "bg-yellow-500 text-gray-900"
                          : "bg-green-500 text-white"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 capitalize">{order.paymentMethod}</td>
                  <td className="px-4 py-3">
                    <button 
                      onClick={() => handleShowDetails(order)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold"
                    >
                      Detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <div className="text-center mt-6">
            <button
                onClick={loadMoreOrders}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-bold disabled:opacity-50"
            >
                {loading ? "Cargando..." : "Cargar más pedidos"}
            </button>
        </div>
      )}
    </div>
  );
};

export default OrdersView;

