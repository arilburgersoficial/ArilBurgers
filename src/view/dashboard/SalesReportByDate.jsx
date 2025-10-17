import React, { useState } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import toast from 'react-hot-toast';

const SalesReportByDate = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleGenerateReport = async () => {
        if (!startDate || !endDate) {
            toast.error("Por favor, selecciona una fecha de inicio y una de fin.");
            return;
        }

        setLoading(true);
        setReportData(null);

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        try {
            const q = query(
                collection(db, "orders"),
                where("createdAt", ">=", Timestamp.fromDate(start)),
                where("createdAt", "<=", Timestamp.fromDate(end)),
                orderBy("createdAt", "desc")
            );

            const querySnapshot = await getDocs(q);
            const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const totalSales = orders.reduce((sum, order) => sum + ((order.totals.finalTotal ?? order.totals.total) || 0), 0);

            setReportData({
                orders,
                totalSales,
                totalOrders: orders.length,
                startDate: start,
                endDate: end,
            });

        } catch (error) {
            console.error("Error generando el reporte:", error);
            toast.error("Hubo un error al generar el reporte.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 shadow mt-6">
            <div className="flex flex-wrap items-center gap-4 mb-4">
                <div>
                    <label htmlFor="startDate" className="block text-sm mb-1">Desde:</label>
                    <input type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-gray-700 p-2 rounded text-white"/>
                </div>
                <div>
                    <label htmlFor="endDate" className="block text-sm mb-1">Hasta:</label>
                    <input type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-gray-700 p-2 rounded text-white"/>
                </div>
                <button onClick={handleGenerateReport} disabled={loading} className="self-end bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold disabled:opacity-50">
                    {loading ? "Generando..." : "Generar Reporte"}
                </button>
            </div>

            {reportData && (
                <div className="mt-4">
                    <h3 className="text-lg font-semibold">Resultados del {reportData.startDate.toLocaleDateString()} al {reportData.endDate.toLocaleDateString()}</h3>
                    <div className="grid grid-cols-2 gap-4 my-4">
                        <div className="bg-gray-900 p-3 rounded-lg text-center"><p className="text-sm text-gray-400">Ventas Totales</p><p className="text-2xl font-bold text-yellow-400">${reportData.totalSales.toFixed(2)}</p></div>
                        <div className="bg-gray-900 p-3 rounded-lg text-center"><p className="text-sm text-gray-400">Total de Pedidos</p><p className="text-2xl font-bold">{reportData.totalOrders}</p></div>
                    </div>
                    <div className="overflow-x-auto max-h-96"><table className="min-w-full bg-gray-900 rounded-lg"><thead className="bg-gray-700 sticky top-0"><tr><th className="px-4 py-2 text-left">Folio</th><th className="px-4 py-2 text-left">Fecha</th><th className="px-4 py-2 text-right">Total</th></tr></thead><tbody>{reportData.orders.map(order => (<tr key={order.id} className="border-b border-gray-700"><td className="px-4 py-2 font-mono">{order.folio}</td><td className="px-4 py-2 text-sm">{order.createdAt.toDate().toLocaleString()}</td><td className="px-4 py-2 text-right font-semibold">${((order.totals.finalTotal ?? order.totals.total) || 0).toFixed(2)}</td></tr>))}</tbody></table></div>
                </div>
            )}
        </div>
    );
};

export default SalesReportByDate;
