import { useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export const useProducts = () => {
    const addProduct = useCallback(async (productData) => {
        if (!productData) return;
        try {
            const dataToSave = { 
                ...productData, 
                price: parseFloat(productData.price) || 0,
                recipe: productData.recipe || [], 
                isHiddenInPOS: productData.isHiddenInPOS || false 
            };
            await addDoc(collection(db, 'products'), dataToSave);
        } catch (error) {
            throw new Error('No se pudo crear el producto.');
        }
    }, []);
      
    const updateProduct = useCallback(async (productId, updatedData) => {
        if (!productId || !updatedData) return;
        try {
            const productRef = doc(db, 'products', productId);
            const dataToUpdate = {
                ...updatedData,
                price: parseFloat(updatedData.price) || 0,
            };
            await updateDoc(productRef, dataToUpdate);
        } catch (error) {
            throw new Error('No se pudo actualizar el producto.');
        }
    }, []);

    const deleteProduct = useCallback(async (productId) => {
        if (!productId) return;
        if (!window.confirm("¿Seguro que quieres eliminar este producto?")) return;
        try {
            const productRef = doc(db, 'products', productId);
            await deleteDoc(productRef);
            toast.success('Producto eliminado.');
        } catch (error) {
            toast.error('No se pudo eliminar el producto.');
        }
    }, []);

    return { addProduct, updateProduct, deleteProduct };
};

