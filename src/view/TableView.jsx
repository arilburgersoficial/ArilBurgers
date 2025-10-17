import React, { useMemo } from 'react';
import { useRestaurant } from '../contexts/RestaurantContext';
import { useOrders } from '../hooks/useOrders';
import SkeletonLoader from '../components/SkeletonLoader';

const TableView = ({ onSelectTable, onResumeOrder, setCurrentView }) => {
    // --- CORRECCIÓN CLAVE ---
    const { restaurant, loading: restaurantLoading } = useRestaurant();
    const layout = restaurant?.layout || [];

    const { orders, loading: ordersLoading } = useOrders();

    const occupiedTables = useMemo(() => {
        if (ordersLoading) return new Set();
        const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing');
        return new Set(activeOrders.map(o => o.tableId));
    }, [orders, ordersLoading]);

    const loading = restaurantLoading || ordersLoading;

    if (loading) {
        return <div className="p-6"><SkeletonLoader className="h-64 w-full" /></div>;
    }

    return (
        <div className="p-6 text-white">
            <h1 className="text-3xl font-bold mb-6">Gestión de Mesas</h1>
            
            {/* La condición ahora usa la variable segura 'layout' */}
            {layout.length === 0 ? (
                <div className="text-center bg-gray-800 p-8 rounded-lg">
                    <p className="text-xl text-gray-400">No has configurado ningún salón o mesa.</p>
                    {/* Botón añadido para guiar al usuario a la configuración */}
                    <button 
                        onClick={() => setCurrentView('admin')}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                    >
                        Ir a Configuración
                    </button>
                </div>
            ) : (
                <div className="space-y-8">
                    {layout.map(zone => (
                        <section key={zone.id}>
                            <h2 className="text-2xl font-semibold mb-4 border-b-2 border-gray-700 pb-2">{zone.name}</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                {zone.tables.map(table => {
                                    const isOccupied = occupiedTables.has(table.id);
                                    const order = isOccupied ? orders.find(o => o.tableId === table.id && (o.status === 'pending' || o.status === 'preparing')) : null;

                                    return (
                                        <button 
                                            key={table.id}
                                            onClick={() => isOccupied && order ? onResumeOrder(order) : onSelectTable(table)}
                                            className={`relative aspect-square flex flex-col items-center justify-center p-4 rounded-lg shadow-lg transform transition-all hover:scale-105 ${
                                                isOccupied 
                                                ? 'bg-red-800 border-2 border-red-600' 
                                                : 'bg-green-800 border-2 border-green-600'
                                            }`}
                                        >
                                            <span className="text-3xl font-bold">{table.name}</span>
                                            <span className={`text-sm font-semibold ${isOccupied ? 'text-red-300' : 'text-green-300'}`}>
                                                {isOccupied ? 'Ocupada' : 'Libre'}
                                            </span>
                                            {isOccupied && order && (
                                                <span className="absolute bottom-2 right-2 text-xs font-mono bg-black/50 px-2 py-1 rounded">
                                                    {order.folio}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TableView;

