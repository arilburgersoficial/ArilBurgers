import React, { useState, useEffect } from 'react';
import { useShiftReports } from '../../hooks/useShiftReports';
import Modal from '../../components/Modal';
import SkeletonLoader from '../../components/SkeletonLoader';

const SalesReportByShift = () => {
    const { shifts, loading, hasMore, fetchInitialShifts, loadMoreShifts } = useShiftReports();
    const [selectedShift, setSelectedShift] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchInitialShifts();
    }, [fetchInitialShifts]);

    const handleShowDetails = (shift) => {
        setSelectedShift(shift);
        setIsModalOpen(true);
    };

    const ShiftSkeleton = () => (
        <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                    <div>
                        <SkeletonLoader className="h-5 w-32 mb-1" />
                        <SkeletonLoader className="h-4 w-48" />
                    </div>
                    <SkeletonLoader className="h-8 w-24" />
                </div>
            ))}
        </div>
    );

    return (
        <div className="bg-gray-800 rounded-lg p-6 shadow mt-6">
            {loading && shifts.length === 0 && <ShiftSkeleton />}
            
            {!loading && shifts.length === 0 && <p className="text-gray-400">No hay reportes de turnos cerrados.</p>}

            {shifts.length > 0 && (
                <div className="space-y-2">
                    {shifts.map(shift => (
                        <div key={shift.id} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-bold">Turno del {shift.openedAt?.toDate().toLocaleDateString()}</p>
                                <p className="text-xs text-gray-400">
                                    {shift.openedAt?.toDate().toLocaleTimeString()} - {shift.closedAt?.toDate().toLocaleTimeString()}
                                </p>
                            </div>
                            <button onClick={() => handleShowDetails(shift)} className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm font-bold">Ver Reporte</button>
                        </div>
                    ))}
                </div>
            )}

            {hasMore && (
                <div className="text-center mt-4">
                    <button onClick={loadMoreShifts} disabled={loading} className="text-sm text-blue-400 hover:underline">
                        {loading ? 'Cargando...' : 'Cargar más turnos'}
                    </button>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Detalle del Turno">
                {selectedShift?.report && (
                    <div className="text-gray-800 space-y-2">
                        <p className="flex justify-between"><span>Efectivo Inicial:</span> <strong>${(selectedShift.report.initialCash || 0).toFixed(2)}</strong></p>
                        <p className="flex justify-between text-green-600"><span>(+) Ventas Totales:</span> <strong>${(selectedShift.report.totalSales || 0).toFixed(2)}</strong></p>
                        <p className="flex justify-between text-green-600"><span>(+) Otros Ingresos:</span> <strong>${(selectedShift.report.totalIncome || 0).toFixed(2)}</strong></p>
                        <p className="flex justify-between text-red-600"><span>(-) Egresos:</span> <strong>${(selectedShift.report.totalExpense || 0).toFixed(2)}</strong></p>
                        <hr className="my-2"/>
                        <p className="flex justify-between font-bold"><span>Efectivo Esperado:</span> <span>${(selectedShift.report.expectedCash || 0).toFixed(2)}</span></p>
                        <p className="flex justify-between"><span>Efectivo Final (Contado):</span> <strong>${(selectedShift.report.finalCash || 0).toFixed(2)}</strong></p>
                        <p className={`flex justify-between font-bold ${selectedShift.report.difference === 0 ? '' : 'text-red-500'}`}>
                            <span>Diferencia:</span> 
                            <span>${(selectedShift.report.difference || 0).toFixed(2)}</span>
                        </p>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default SalesReportByShift;
