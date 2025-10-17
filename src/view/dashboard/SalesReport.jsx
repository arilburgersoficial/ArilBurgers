import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, Timestamp, orderBy, limit, startAfter } from 'firebase/firestore';
import { useShiftReports } from '../../hooks/useShiftReports';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import SkeletonLoader from '../../components/SkeletonLoader';

const ORDERS_PER_PAGE = 20;

// --- Sub-componente para el Reporte por Rango de Fechas (Completamente Reconstruido) ---
const SalesByDate = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(false);

    const handleGenerateReport = async () => {
        if (!startDate || !endDate) return toast.error("Por favor, selecciona un rango de fechas.");
        setLoading(true);
        setReportData(null);

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        try {
            // Query para estadísticas totales (sin límite)
            const statsQuery = query(
                collection(db, "orders"),
                where("createdAt", ">=", Timestamp.fromDate(start)),
                where("createdAt", "<=", Timestamp.fromDate(end))
            );
            const statsSnapshot = await getDocs(statsQuery);
            const totalSales = statsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().totals?.finalTotal || 0), 0);
            const totalOrders = statsSnapshot.size;

            // Query para la primera página de resultados (con límite)
            const firstPageQuery = query(
                collection(db, "orders"),
                where("createdAt", ">=", Timestamp.fromDate(start)),
                where("createdAt", "<=", Timestamp.fromDate(end)),
                orderBy("createdAt", "desc"),
                limit(ORDERS_PER_PAGE)
            );
            const firstPageSnapshot = await getDocs(firstPageQuery);
            const orders = firstPageSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const lastVisible = firstPageSnapshot.docs[firstPageSnapshot.docs.length - 1];
            setLastDoc(lastVisible);
            setHasMore(firstPageSnapshot.docs.length === ORDERS_PER_PAGE);

            setReportData({ 
                orders, 
                totalSales, 
                totalOrders,
                range: `${start.toLocaleDateString()} al ${end.toLocaleDateString()}`
            });

        } catch (error) {
            toast.error("Error al generar el reporte.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = async () => {
        if (!lastDoc) return;
        setLoadingMore(true);

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        try {
             const nextPageQuery = query(
                collection(db, "orders"),
                where("createdAt", ">=", Timestamp.fromDate(start)),
                where("createdAt", "<=", Timestamp.fromDate(end)),
                orderBy("createdAt", "desc"),
                startAfter(lastDoc),
                limit(ORDERS_PER_PAGE)
            );
            const snapshot = await getDocs(nextPageQuery);
            const newOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            setReportData(prev => ({ ...prev, orders: [...prev.orders, ...newOrders] }));
            
            const lastVisible = snapshot.docs[snapshot.docs.length - 1];
            setLastDoc(lastVisible);
            setHasMore(snapshot.docs.length === ORDERS_PER_PAGE);
        } catch(error) {
            toast.error("Error al cargar más pedidos.");
            console.error(error);
        } finally {
            setLoadingMore(false);
        }
    };

    return (
        <div className="mt-4 animate-fade-in">
            <div className="flex flex-wrap items-center gap-4 mb-6">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-gray-700 p-2 rounded border border-gray-600"/>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-gray-700 p-2 rounded border border-gray-600"/>
                <button onClick={handleGenerateReport} disabled={loading} className="bg-blue-600 px-4 py-2 rounded font-bold hover:bg-blue-700 disabled:bg-gray-500">
                    {loading ? "Generando..." : "Generar Reporte"}
                </button>
            </div>

            {loading && <SkeletonLoader className="h-64 w-full" />}

            {reportData && (
                <div className="bg-gray-900/50 p-4 rounded-lg animate-fade-in">
                    <h4 className="font-semibold mb-4">Resultados del {reportData.range}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-800 p-4 rounded-lg text-center">
                            <p className="text-gray-400">Ventas Totales</p>
                            <p className="text-2xl font-bold text-yellow-400">${reportData.totalSales.toFixed(2)}</p>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg text-center">
                            <p className="text-gray-400">Total de Pedidos</p>
                            <p className="text-2xl font-bold">{reportData.totalOrders}</p>
                        </div>
                    </div>
                    <div className="max-h-[50vh] overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-700 sticky top-0">
                                <tr>
                                    <th className="p-3">Folio</th>
                                    <th className="p-3">Fecha</th>
                                    <th className="p-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.orders.map(order => (
                                    <tr key={order.id} className="border-b border-gray-700">
                                        <td className="p-3 font-mono">{order.folio}</td>
                                        <td className="p-3 text-sm">{order.createdAt?.toDate().toLocaleString()}</td>
                                        <td className="p-3 text-right font-semibold">${(order.totals?.finalTotal || 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {hasMore && (
                        <div className="text-center mt-4">
                            <button onClick={handleLoadMore} disabled={loadingMore} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-bold">
                                {loadingMore ? "Cargando..." : "Cargar más"}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


// --- Sub-componente para el Reporte por Turno (sin cambios funcionales) ---
const SalesByShift = () => {
    const { shifts, loading, hasMore, fetchInitialShifts, loadMoreShifts } = useShiftReports();
    const [selectedShift, setSelectedShift] = useState(null);

    useEffect(() => {
        fetchInitialShifts();
    }, [fetchInitialShifts]);

    return (
        <div className="mt-4 animate-fade-in">
            {loading && <p className="text-gray-500">Cargando turnos...</p>}
            <div className="space-y-2">
                {shifts.map(shift => (
                    <div key={shift.id} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-semibold">Turno del {shift.openedAt?.toDate().toLocaleDateString()}</p>
                            <p className="text-xs text-gray-400">{shift.openedAt?.toDate().toLocaleTimeString()} - {shift.closedAt?.toDate().toLocaleTimeString()}</p>
                        </div>
                        <button onClick={() => setSelectedShift(shift)} className="bg-blue-600 px-3 py-1 rounded text-sm font-bold hover:bg-blue-700">Ver Reporte</button>
                    </div>
                ))}
            </div>
            {hasMore && <button onClick={loadMoreShifts} disabled={loading} className="text-sm text-blue-400 mt-4 hover:underline">{loading ? 'Cargando...' : 'Cargar más'}</button>}
            
            <Modal isOpen={!!selectedShift} onClose={() => setSelectedShift(null)} title="Detalle del Turno">
                {selectedShift?.report && (
                    <div className="text-gray-800 space-y-2">
                        <p className="flex justify-between"><span>Efectivo Inicial:</span> <strong>${(selectedShift.report.initialCash || 0).toFixed(2)}</strong></p>
                        <p className="flex justify-between text-green-600"><span>(+) Ventas Totales:</span> <strong>${(selectedShift.report.totalSales || 0).toFixed(2)}</strong></p>
                        <p className="flex justify-between text-green-600"><span>(+) Otros Ingresos:</span> <strong>${(selectedShift.report.totalIncome || 0).toFixed(2)}</strong></p>
                        <p className="flex justify-between text-red-600"><span>(-) Egresos:</span> <strong>${(selectedShift.report.totalExpense || 0).toFixed(2)}</strong></p>
                        <hr className="my-2"/>
                        <p className="flex justify-between font-bold"><span>Efectivo Esperado:</span> <span>${(selectedShift.report.expectedCash || 0).toFixed(2)}</span></p>
                        <p className="flex justify-between"><span>Efectivo Final (Contado):</span> <strong>${(selectedShift.report.finalCash || 0).toFixed(2)}</strong></p>
                        <p className={`flex justify-between font-bold ${selectedShift.report.difference === 0 ? 'text-green-700' : 'text-red-600'}`}>
                            <span>Diferencia:</span> 
                            <span>${(selectedShift.report.difference || 0).toFixed(2)}</span>
                        </p>
                    </div>
                )}
            </Modal>
        </div>
    );
};


// --- Componente Principal ---
const SalesReport = () => {
    const [reportType, setReportType] = useState('date'); // Inicia en "Por Rango de Fechas" para que sea lo primero que se ve

    return (
        <section className="bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-yellow-400 border-b-2 border-gray-700 pb-3 mb-4">Análisis de Ventas Históricas</h3>
            <div className="flex border-b border-gray-700">
                <button onClick={() => setReportType('shift')} className={`px-4 py-2 font-semibold transition-colors ${reportType === 'shift' ? 'border-b-2 border-yellow-400 text-yellow-400' : 'text-gray-400 hover:text-white'}`}>Por Turno</button>
                <button onClick={() => setReportType('date')} className={`px-4 py-2 font-semibold transition-colors ${reportType === 'date' ? 'border-b-2 border-yellow-400 text-yellow-400' : 'text-gray-400 hover:text-white'}`}>Por Rango de Fechas</button>
            </div>
            {reportType === 'shift' ? <SalesByShift /> : <SalesByDate />}
        </section>
    );
};

export default SalesReport;

