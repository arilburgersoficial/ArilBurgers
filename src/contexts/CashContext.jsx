import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebase/config';
import {
  doc, onSnapshot, collection, query, where, getDocs, serverTimestamp, setDoc, updateDoc, addDoc, writeBatch
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

const CashContext = createContext();
export const useCash = () => useContext(CashContext);

export const CashProvider = ({ children }) => {
  const { user } = useAuth();
  const [cashRegister, setCashRegister] = useState(null);
  const [movements, setMovements] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [loading, setLoading] = useState(true);

  const cashDocRef = doc(db, 'cashRegisters', 'main_register');

  useEffect(() => {
    if (!user) {
      setCashRegister(null);
      setMovements([]);
      setTotalSales(0);
      setLoading(false);
      return;
    }

    // Listener principal para el estado de la caja
    const unsubscribeCash = onSnapshot(cashDocRef, (snap) => {
      const data = snap.exists() ? snap.data() : { isOpen: false };
      setCashRegister(data);
      setLoading(false);
    }, (error) => {
      console.error("Error en listener de caja:", error);
      setLoading(false);
    });

    return () => unsubscribeCash();
  }, [user]);

  // Listeners secundarios para movimientos y ventas, dependen del estado de la caja
  useEffect(() => {
    if (cashRegister?.isOpen && cashRegister.openedAt) {
      // Listener para MOVIMIENTOS en tiempo real
      const qMov = query(collection(db, 'movements'), where('createdAt', '>=', cashRegister.openedAt));
      const unsubscribeMov = onSnapshot(qMov, (snapshot) => {
        setMovements(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // Listener para VENTAS en tiempo real
      const qSales = query(collection(db, 'orders'), where('createdAt', '>=', cashRegister.openedAt));
      const unsubscribeSales = onSnapshot(qSales, (snapshot) => {
        const calculatedSales = snapshot.docs.reduce((sum, doc) => {
          const orderTotals = doc.data().totals;
          const totalValue = (orderTotals.finalTotal ?? orderTotals.total) || 0;
          return sum + totalValue;
        }, 0);
        setTotalSales(calculatedSales);
      });

      // Limpia los listeners cuando la caja se cierra o el componente se desmonta
      return () => {
        unsubscribeMov();
        unsubscribeSales();
      };
    } else {
      setMovements([]);
      setTotalSales(0);
    }
  }, [cashRegister]);


  const generateCashReport = useCallback(async () => {
    if (!cashRegister?.isOpen) return null;
    const totalIncome = movements.filter(m => m.type === 'income').reduce((sum, m) => sum + m.amount, 0);
    const totalExpense = movements.filter(m => m.type === 'expense').reduce((sum, m) => sum + m.amount, 0);
    const initialCash = cashRegister.initialCash;
    const expectedCash = initialCash + totalSales + totalIncome - totalExpense;
    return { initialCash, totalSales, totalIncome, totalExpense, expectedCash, generatedAt: new Date() };
  }, [cashRegister, movements, totalSales]);

  const openCashRegister = async (initialCash) => {
    await setDoc(cashDocRef, {
      isOpen: true,
      initialCash,
      openedAt: serverTimestamp(),
      openedBy: auth.currentUser?.uid,
      closedAt: null,
      closedBy: null,
      report: null,
    });
  };

  const closeCashRegister = async (finalCash) => {
    const report = await generateCashReport();
    if (report) {
      report.finalCash = finalCash;
      report.difference = finalCash - report.expectedCash;
    }
    await addDoc(collection(db, 'shiftReports'), {
      openedAt: cashRegister.openedAt,
      closedAt: serverTimestamp(),
      closedBy: auth.currentUser?.uid,
      report,
    });
    await updateDoc(cashDocRef, {
      isOpen: false, initialCash: 0, openedAt: null, openedBy: null,
      closedAt: serverTimestamp(), closedBy: auth.currentUser?.uid, report,
    });
  };

  const closeAndDiscardShift = useCallback(async () => {
    if (!cashRegister?.isOpen || !cashRegister.openedAt) return;
    const batch = writeBatch(db);
    const ordersQuery = query(collection(db, 'orders'), where('createdAt', '>=', cashRegister.openedAt));
    const ordersSnapshot = await getDocs(ordersQuery);
    ordersSnapshot.forEach(doc => batch.delete(doc.ref));
    const movementsQuery = query(collection(db, 'movements'), where('createdAt', '>=', cashRegister.openedAt));
    const movementsSnapshot = await getDocs(movementsQuery);
    movementsSnapshot.forEach(doc => batch.delete(doc.ref));
    batch.update(cashDocRef, {
      isOpen: false, initialCash: 0, openedAt: null, openedBy: null,
      closedAt: serverTimestamp(), closedBy: auth.currentUser?.uid, report: { discarded: true },
    });
    await batch.commit();
  }, [cashRegister]);

  const registerMovement = async (amount, type, reason) => {
    await addDoc(collection(db, 'movements'), {
      type,
      amount,
      reason: reason || '',
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser?.uid,
      cashRegisterId: cashDocRef.id,
    });
  };

  const value = {
    cashRegister,
    movements,
    totalSales,
    loading,
    openCashRegister,
    closeCashRegister,
    closeAndDiscardShift,
    registerMovement,
    generateCashReport,
  };

  return <CashContext.Provider value={value}>{children}</CashContext.Provider>;
};

