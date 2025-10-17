import React from "react";
import { useOrders } from "../hooks/useOrders";
import { db } from "../firebase/config";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import SkeletonLoader from '../components/SkeletonLoader';
import { useRestaurant } from '../contexts/RestaurantContext';

const OrderTimer = ({ createdAt }) => {
    const [elapsed, setElapsed] = React.useState("00:00");
    React.useEffect(() => {
        if (!createdAt?.toDate) return;
        const timer = setInterval(() => {
            const diff = new Date().getTime() - createdAt.toDate().getTime();
            const minutes = String(Math.floor(diff / 60000)).padStart(2, '0');
            const seconds = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
            setElapsed(`${minutes}:${seconds}`);
        }, 1000);
        return () => clearInterval(timer);
    }, [createdAt]);
    return <span className="text-lg font-mono">{elapsed}</span>;
};

const KitchenView = ({ onResumeOrder }) => {
  const { orders, loading } = useOrders();
  const { restaurant } = useRestaurant();

  const updateStatus = async (id, newStatus) => {
    const updates = { status: newStatus };
    // Si el pedido se marca como 'completado', añadimos la fecha de finalización.
    if (newStatus === 'completed') {
        updates.completedAt = serverTimestamp();
    }
    await updateDoc(doc(db, "orders", id), updates);
  };
  
  const KitchenSkeleton = () => (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg shadow-lg p-4 space-y-4">
                <SkeletonLoader className="h-6 w-3/4" />
                <SkeletonLoader className="h-4 w-1/2" />
                <div className="border-t border-b border-gray-700 py-3 space-y-2">
                    <SkeletonLoader className="h-5 w-full" />
                    <SkeletonLoader className="h-5 w-full" />
                </div>
                <SkeletonLoader className="h-10 w-full mt-4" />
            </div>
        ))}
    </div>
  );

  if (loading) {
    return (
        <div className="text-white p-6">
            <h1 className="text-3xl font-bold mb-6">📋 Pedidos en Cocina</h1>
            <KitchenSkeleton />
        </div>
    );
  }

  const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing');

  return (
    <div className="text-white p-6">
      <h1 className="text-3xl font-bold mb-6">📋 Pedidos en Cocina</h1>
      {activeOrders.length === 0 ? (
        <div className="text-center bg-gray-800 p-8 rounded-lg">
            <p className="text-2xl text-gray-400">No hay pedidos activos en cocina.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {activeOrders.map((order) => (
            <div key={order.id} className="bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col">
              <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-yellow-400 font-mono">{order.folio}</h2>
                    {order.tableName ? (
                        <p className="text-md font-semibold text-gray-200">Mesa: {order.tableName}</p>
                    ) : (
                        <p className="text-sm font-semibold capitalize text-gray-300">{order.orderType?.replace('-', ' ')}</p>
                    )}
                </div>
                <OrderTimer createdAt={order.createdAt} />
              </div>

              <div className="flex-grow space-y-3 overflow-y-auto my-3 border-t border-b border-gray-700 py-3">
                {order.items.map((item, idx) => (
                    <div key={idx}>
                        <div className="flex justify-between">
                            <span className="font-bold">{item.quantity} × {item.name}</span>
                        </div>
                        {item.notes && (
                            <div className="bg-yellow-200 text-yellow-900 p-2 mt-1 rounded-md text-sm font-semibold">
                                <ul className="list-disc list-inside">
                                    {item.notes.split(';').map((note, noteIdx) => (
                                        <li key={noteIdx}>{note.trim()}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
              </div>
              
              {order.orderType === 'delivery' && order.clientInfo && (
                  <div className="text-sm my-2 text-gray-300 border-t border-gray-700 pt-2">
                      <p><strong>Cliente:</strong> {order.clientInfo.name}</p>
                      <a 
                          href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(restaurant?.config?.delivery?.address || '')}&destination=${encodeURIComponent(order.clientInfo.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline font-semibold"
                      >
                          Ver Ruta en Mapa
                      </a>
                  </div>
              )}

              <div className="mt-auto flex gap-2 pt-2">
                <button onClick={() => onResumeOrder(order)} className="flex-1 bg-blue-600 hover:bg-blue-700 font-bold py-2 rounded-lg text-sm">Editar/Añadir</button>
                {order.status === "pending" && (<button onClick={() => updateStatus(order.id, "preparing")} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-2 rounded-lg text-sm">Preparar</button>)}
                {order.status === "preparing" && (<button onClick={() => updateStatus(order.id, "completed")} className="flex-1 bg-green-500 hover:bg-green-600 font-bold py-2 rounded-lg text-sm">Completar</button>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KitchenView;

