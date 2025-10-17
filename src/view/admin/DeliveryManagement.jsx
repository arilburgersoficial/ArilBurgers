import React, { useMemo } from 'react';
import { useOrders } from '../../hooks/useOrders';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

// Componente de Timer (reutilizado de KitchenView con ajustes)
const DeliveryTimer = ({ createdAt }) => {
    const [elapsed, setElapsed] = React.useState("00:00");
    React.useEffect(() => {
        if (!createdAt?.toDate) return;
        const timer = setInterval(() => {
            const diff = new Date().getTime() - createdAt.toDate().getTime();
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setElapsed(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
        }, 1000);
        return () => clearInterval(timer);
    }, [createdAt]);
    return <span className="font-mono text-lg">{elapsed}</span>;
};

// Tarjeta para un pedido de delivery individual
const DeliveryOrderCard = ({ order, onUpdateStatus }) => {
    const { folio, clientInfo, items, createdAt, status } = order;

    return (
        <div className="bg-gray-800 rounded-xl shadow-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-lg text-yellow-400">{folio}</p>
                    <p className="font-semibold">{clientInfo?.name}</p>
                    <p className="text-sm text-gray-400">{clientInfo?.phone}</p>
                </div>
                <DeliveryTimer createdAt={createdAt} />
            </div>
            <div className="text-sm text-gray-300">
                <p>{clientInfo?.address}</p>
                <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clientInfo?.address)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                >
                    Abrir en Google Maps
                </a>
            </div>
            <div className="border-t border-gray-700 pt-2">
                <p className="font-semibold text-xs text-gray-400 mb-1">PRODUCTOS:</p>
                <ul className="text-sm space-y-1">
                    {items.map((item, index) => (
                        <li key={index} className="flex justify-between">
                            <span>{item.qty} x {item.name}</span>
                            <span>${(item.price * item.qty).toFixed(2)}</span>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="pt-3 border-t border-gray-700">
                {status === 'completed' && (
                    <button 
                        onClick={() => onUpdateStatus(order.id, 'out_for_delivery')}
                        className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-2 rounded-lg"
                    >
                        Despachar Pedido
                    </button>
                )}
                {status === 'out_for_delivery' && (
                    <button 
                        onClick={() => onUpdateStatus(order.id, 'delivered')}
                        className="w-full bg-green-600 hover:bg-green-700 font-bold py-2 rounded-lg"
                    >
                        Marcar como Entregado
                    </button>
                )}
            </div>
        </div>
    );
};

const DeliveryManagement = () => {
    const { orders, loading } = useOrders();

    const handleUpdateStatus = async (orderId, newStatus) => {
        const orderRef = doc(db, "orders", orderId);
        try {
            await updateDoc(orderRef, { status: newStatus });
            toast.success(`Pedido actualizado a: ${newStatus.replace('_', ' ')}`);
        } catch (error) {
            toast.error("Error al actualizar el pedido.");
            console.error("Error updating order status:", error);
        }
    };

    // Filtramos los pedidos que son de delivery y están en estados relevantes para la gestión
    const ordersReady = useMemo(() => orders.filter(o => o.orderType === 'delivery' && o.status === 'completed'), [orders]);
    const ordersInTransit = useMemo(() => orders.filter(o => o.orderType === 'delivery' && o.status === 'out_for_delivery'), [orders]);

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Gestión de Entregas (Delivery)</h2>

            {loading && <p className="text-gray-400">Cargando pedidos...</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Columna 1: Pedidos listos para enviar */}
                <div className="bg-gray-900 p-4 rounded-xl">
                    <h3 className="text-xl font-semibold mb-4 text-center">Listos para Enviar ({ordersReady.length})</h3>
                    <div className="space-y-4 h-[calc(100vh-20rem)] overflow-y-auto custom-scrollbar pr-2">
                        {ordersReady.length > 0 ? (
                            ordersReady.map(order => <DeliveryOrderCard key={order.id} order={order} onUpdateStatus={handleUpdateStatus} />)
                        ) : (
                            <p className="text-center text-gray-500 pt-10">No hay pedidos listos.</p>
                        )}
                    </div>
                </div>

                {/* Columna 2: Pedidos en camino */}
                <div className="bg-gray-900 p-4 rounded-xl">
                    <h3 className="text-xl font-semibold mb-4 text-center">En Camino ({ordersInTransit.length})</h3>
                    <div className="space-y-4 h-[calc(100vh-20rem)] overflow-y-auto custom-scrollbar pr-2">
                         {ordersInTransit.length > 0 ? (
                            ordersInTransit.map(order => <DeliveryOrderCard key={order.id} order={order} onUpdateStatus={handleUpdateStatus} />)
                        ) : (
                            <p className="text-center text-gray-500 pt-10">No hay pedidos en reparto.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeliveryManagement;

