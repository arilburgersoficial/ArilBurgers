import React, { useState, useEffect } from "react";
import { useCash } from "../contexts/CashContext";
import { useRestaurant } from "../contexts/RestaurantContext";
import DraggableModal from "../components/DraggableModal";
import Modal from "../components/Modal";
import toast from 'react-hot-toast';

const CashView = () => {
  const { 
    cashRegister, movements, totalSales, loading, 
    openCashRegister, closeCashRegister, closeAndDiscardShift, 
    registerMovement, generateCashReport 
  } = useCash();
  const { restaurant } = useRestaurant();
  
  const [openModal, setOpenModal] = useState({ isOpen: false, amount: '' });
  const [closeModal, setCloseModal] = useState({ isOpen: false, amount: '' });
  const [choiceModalOpen, setChoiceModalOpen] = useState(false);
  const [finalCashAmount, setFinalCashAmount] = useState(0);

  const [reportData, setReportData] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  const [movementAmount, setMovementAmount] = useState("");
  const [movementType, setMovementType] = useState("expense");
  const [movementReason, setMovementReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleOpenCash = async () => {
    const initialCash = parseFloat(openModal.amount);
    if (isNaN(initialCash) || initialCash < 0) {
      return toast.error("Por favor, introduce un monto válido.");
    }
    setIsProcessing(true);
    await openCashRegister(initialCash);
    setIsProcessing(false);
    setOpenModal({ isOpen: false, amount: '' });
    toast.success("Caja abierta exitosamente.");
  };

  const handlePartialCut = async () => {
    setIsProcessing(true);
    const report = await generateCashReport();
    setReportData(report);
    setIsReportModalOpen(true);
    setIsProcessing(false);
  };

  const handleAmountConfirm = () => {
    const finalCash = parseFloat(closeModal.amount);
    if (isNaN(finalCash) || finalCash < 0) {
      return toast.error("Por favor, introduce un monto final válido.");
    }
    setFinalCashAmount(finalCash);
    setCloseModal({ isOpen: false, amount: '' });
    setChoiceModalOpen(true);
  };

  const handleConfirmSaveAndClose = async () => {
    setIsProcessing(true);
    await closeCashRegister(finalCashAmount);
    setChoiceModalOpen(false);
    setIsProcessing(false);
    toast.success("Turno guardado y caja cerrada.");
  };

  const handleConfirmDiscardAndClose = async () => {
    setIsProcessing(true);
    await closeAndDiscardShift();
    setChoiceModalOpen(false);
    setIsProcessing(false);
    toast.success("Turno de prueba descartado y caja cerrada.");
  };

  const handleRegisterMovement = async (e) => {
    e.preventDefault();
    const amount = parseFloat(movementAmount);
    if (isNaN(amount) || amount <= 0) {
        return toast.error("Por favor, introduce un monto válido.");
    }
    if (!movementReason.trim()) {
        return toast.error("Por favor, añade un motivo para el movimiento.");
    }
    setIsProcessing(true);
    await registerMovement(amount, movementType, movementReason.trim());
    setMovementAmount("");
    setMovementReason("");
    setIsProcessing(false);
    toast.success("Movimiento registrado.");
  };

  if (loading) return <p className="text-center p-10">Cargando...</p>;

  return (
    <div className="text-white p-6 max-w-4xl mx-auto">
      <DraggableModal isOpen={openModal.isOpen} onClose={() => setOpenModal({ ...openModal, isOpen: false })} title="Abrir Caja">
        <div className="text-gray-800 space-y-4">
          <label className="block font-semibold">Monto inicial en caja:</label>
          <input 
            type="number" 
            value={openModal.amount}
            onChange={(e) => setOpenModal({ ...openModal, amount: e.target.value })}
            className="w-full border p-3 rounded-lg text-lg" 
            placeholder="0.00"
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button onClick={() => setOpenModal({ isOpen: false, amount: '' })} className="bg-gray-200 px-4 py-2 rounded-lg font-bold">Cancelar</button>
            <button onClick={handleOpenCash} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold">Aceptar</button>
          </div>
        </div>
      </DraggableModal>

      <DraggableModal isOpen={closeModal.isOpen} onClose={() => setCloseModal({ ...closeModal, isOpen: false })} title="Cerrar Caja">
        <div className="text-gray-800 space-y-4">
            <label className="block font-semibold">Monto final contado en caja:</label>
            <input type="number" value={closeModal.amount} onChange={(e) => setCloseModal({ ...closeModal, amount: e.target.value })} className="w-full border p-3 rounded-lg text-lg" placeholder="0.00" autoFocus />
            <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setCloseModal({isOpen: false, amount: ''})} className="bg-gray-200 px-4 py-2 rounded-lg font-bold">Cancelar</button>
                <button onClick={handleAmountConfirm} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">Confirmar Monto</button>
            </div>
        </div>
      </DraggableModal>
      
      <DraggableModal isOpen={choiceModalOpen} onClose={() => setChoiceModalOpen(false)} title="Confirmar Cierre de Turno">
        <div className="text-gray-800">
            <p className="mb-6">Has contado un total de <strong className="text-lg">${finalCashAmount.toFixed(2)}</strong>. ¿Qué deseas hacer?</p>
            <div className="flex flex-col sm:flex-row gap-3">
                {restaurant?.config?.testModeEnabled && (
                  <button onClick={handleConfirmDiscardAndClose} className="flex-1 bg-yellow-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-yellow-600">
                      Descartar Turno (Modo Prueba)
                  </button>
                )}
                <button onClick={handleConfirmSaveAndClose} className="flex-1 bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700">
                    Guardar y Cerrar Turno
                </button>
            </div>
        </div>
      </DraggableModal>

      <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="Reporte de Caja (Corte Parcial)">
        {reportData && (
          <div className="text-gray-800 space-y-2">
            <p className="flex justify-between"><span>Efectivo Inicial:</span> <strong>${(reportData.initialCash || 0).toFixed(2)}</strong></p>
            <p className="flex justify-between text-green-600"><span>(+) Ventas Totales:</span> <strong>${(reportData.totalSales || 0).toFixed(2)}</strong></p>
            <p className="flex justify-between text-green-600"><span>(+) Otros Ingresos:</span> <strong>${(reportData.totalIncome || 0).toFixed(2)}</strong></p>
            <p className="flex justify-between text-red-600"><span>(-) Egresos:</span> <strong>${(reportData.totalExpense || 0).toFixed(2)}</strong></p>
            <hr className="my-2"/>
            <p className="flex justify-between text-lg font-bold"><span>Efectivo Esperado:</span> <span>${(reportData.expectedCash || 0).toFixed(2)}</span></p>
          </div>
        )}
      </Modal>

      {!cashRegister?.isOpen ? (
        <div className="text-center bg-gray-800 p-8 rounded-lg">
          <p className="mb-4 text-gray-400 text-lg">La caja está cerrada.</p>
          <button onClick={() => setOpenModal({ isOpen: true, amount: '' })} className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-bold text-lg">Abrir Caja</button>
        </div>
      ) : (
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-700">
            <div>
              <p className="mb-2"><span className="font-bold">Monto inicial:</span> ${(cashRegister.initialCash || 0).toFixed(2)}</p>
              <p className="text-green-400 font-bold text-lg">Caja abierta ✅</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handlePartialCut} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-bold">Corte Parcial</button>
              <button onClick={() => setCloseModal({ isOpen: true, amount: '' })} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-bold">Cerrar Caja</button>
            </div>
          </div>
          
          <form onSubmit={handleRegisterMovement} className="mb-6 space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
                <input type="number" step="0.01" placeholder="Monto" value={movementAmount} onChange={(e) => setMovementAmount(e.target.value)} className="w-full sm:w-1/3 bg-gray-700 p-2 rounded-lg text-white"/>
                <select value={movementType} onChange={(e) => setMovementType(e.target.value)} className="w-full sm:w-1/3 bg-gray-700 p-2 rounded-lg text-white">
                    <option value="expense">Egreso</option>
                    <option value="income">Ingreso</option>
                </select>
                <button type="submit" className="w-full sm:w-1/3 bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold px-4 py-2 rounded-lg">Registrar Movimiento</button>
            </div>
            <div>
                <input type="text" placeholder="Motivo (ej. Compra de insumos)" value={movementReason} onChange={(e) => setMovementReason(e.target.value)} className="w-full bg-gray-700 p-2 rounded-lg text-white"/>
            </div>
          </form>

          <h2 className="text-xl font-bold mb-3">Movimientos del Turno</h2>
          <ul className="space-y-2">
            <li className="flex justify-between bg-gray-700 p-3 rounded-lg">
                <span className='text-green-400 font-bold'>Ventas del Turno</span>
                <span className='text-green-400 font-bold'>+ ${(totalSales || 0).toFixed(2)}</span>
            </li>
            {movements.map((m) => (
                <li key={m.id} className="bg-gray-700 p-3 rounded-lg">
                    <div className="flex justify-between">
                        <span className={`font-bold ${m.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>{m.type === "income" ? "Ingreso" : "Egreso"}</span>
                        <span className={`font-bold ${m.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>{m.type === 'income' ? '+' : '-'} ${(m.amount || 0).toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{m.reason}</p>
                </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CashView;

