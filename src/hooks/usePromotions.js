import { useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export const usePromotions = () => {
    const addPromotion = useCallback(async (promoData) => {
        if (!promoData) return;
        try {
            const newPromotion = { 
                ...promoData, 
                isActive: true, 
                discountValue: parseFloat(promoData.discountValue) || 0, 
                requiredQuantity: parseInt(promoData.requiredQuantity, 10) || 2 
            };
            await addDoc(collection(db, 'promotions'), newPromotion);
        } catch (error) {
            console.error(error);
            throw new Error('No se pudo crear la promoción.');
        }
    }, []);
    
    const updatePromotion = useCallback(async (promoId, updatedData) => {
        if (!promoId || !updatedData) return;
        try {
            const promoRef = doc(db, 'promotions', promoId);
            const dataToUpdate = { 
                ...updatedData, 
                discountValue: parseFloat(updatedData.discountValue) || 0, 
                requiredQuantity: parseInt(updatedData.requiredQuantity, 10) || 2 
            };
            await updateDoc(promoRef, dataToUpdate);
            toast.success('Promoción actualizada.');
        } catch (error) {
            console.error(error);
            toast.error('No se pudo actualizar la promoción.');
        }
    }, []);

    const deletePromotion = useCallback(async (promoId, promoName) => {
        if (!promoId) return;
        if (!window.confirm(`¿Seguro que quieres eliminar la promoción "${promoName}"?`)) return;
        const toastId = toast.loading('Eliminando promoción...');
        try {
            const promoRef = doc(db, 'promotions', promoId);
            await deleteDoc(promoRef);
            toast.success('Promoción eliminada.', { id: toastId });
        } catch (error) {
            toast.error('No se pudo eliminar la promoción.', { id: toastId });
            console.error(error);
        }
    }, []);

    return { addPromotion, updatePromotion, deletePromotion };
};

