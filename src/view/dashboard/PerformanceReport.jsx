import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';

const PerformanceReport = () => {
    const [completedOrders, setCompletedOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCompletedOrders = async () => {
            setLoading(true);
            setError(null);
            try {
                const today = new Date();
                const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

                const q = query(
                    collection(db, "orders"),
                    where("status", "==", "completed"),
                    where("completedAt", ">=", Timestamp.fromDate(startOfDay)),
                    orderBy("completedAt", "desc")
                );
                
                const snapshot = await getDocs(q);
                const orders = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const createdAt = data.createdAt?.toDate();
                    const completedAt = data.completedAt?.toDate();
                    let duration = null;
                    if (createdAt && completedAt) {
                        duration = (completedAt.getTime() - createdAt.getTime()) / 60000; // en minutos
                    }
                    return { id: doc.id, ...data, duration };
                });
                setCompletedOrders(orders);
            } catch (err) {
                if (err.code === 'failed-precondition') {
                    setError('Índice de Firestore requerido. Revisa la consola del desarrollador para crearlo.');
                    console.error("Error de Firestore: Índice faltante. Por favor, crea el índice compuesto en tu base de datos.", err);
                } else {
                    setError('No se pudieron cargar los datos de rendimiento.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchCompletedOrders();
    }, []);

    const avgTime = useMemo(() => {
        if (completedOrders.length === 0) return 0;
        const totalMinutes = completedOrders.reduce((sum, order) => sum + (order.duration || 0), 0);
        return totalMinutes / completedOrders.length;
    }, [completedOrders]);

    return (
        <section className="bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-yellow-400 border-b-2 border-gray-700 pb-3 mb-4">Rendimiento de Cocina (Hoy)</h3>
            
            {loading && <p className="text-sm text-gray-500 text-center">Calculando rendimiento...</p>}
            
            {error && <p className="text-sm text-red-400 p-4 bg-red-900/50 rounded-lg">{error}</p>}

            {!loading && !error && (
                <>
                    <div className="text-center">
                        <p className="text-gray-400">Tiempo Promedio de Preparación</p>
                        <p className="text-4xl font-bold text-white">{avgTime.toFixed(1)} <span className="text-lg">min</span></p>
                    </div>
                    <div className="mt-4 max-h-40 overflow-y-auto pr-2">
                        {completedOrders.length === 0 ? <p className="text-center text-gray-500 pt-4">No hay pedidos completados hoy.</p> : (
                            <ul className="text-sm space-y-1">
                                {completedOrders.map(order => (
                                    <li key={order.id} className="flex justify-between border-b border-gray-700 py-1">
                                        <span className="font-mono text-gray-400">{order.folio}</span>
                                        <span className="font-semibold">{order.duration?.toFixed(1) || 'N/A'} min</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </>
            )}
        </section>
    );
};

export default PerformanceReport;

