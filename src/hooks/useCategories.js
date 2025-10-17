import { useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import toast from 'react-hot-toast';

export const useCategories = () => {
    const addCategory = useCallback(async (categoryName) => {
        if (!categoryName.trim()) return;
        try {
            await addDoc(collection(db, 'categories'), { name: categoryName.trim() });
            toast.success('Categoría creada.');
        } catch (error) {
            toast.error('No se pudo crear la categoría.');
        }
    }, []);
    
    const updateCategory = useCallback(async (categoryId, newName) => {
        if (!categoryId || !newName.trim()) return;
        try {
            const categoryRef = doc(db, 'categories', categoryId);
            await updateDoc(categoryRef, { name: newName.trim() });
            toast.success('Categoría actualizada.');
        } catch (error) {
            toast.error('No se pudo actualizar la categoría.');
        }
    }, []);

    const deleteCategory = useCallback(async (categoryId, categoryName) => {
        if (!categoryId) return;
        if (!window.confirm(`¿Seguro que quieres eliminar "${categoryName}"? Se borrarán todos sus productos.`)) return;

        const toastId = toast.loading('Eliminando categoría...');
        try {
            const batch = writeBatch(db);
            
            const categoryRef = doc(db, 'categories', categoryId);
            batch.delete(categoryRef);

            const q = query(collection(db, 'products'), where('categoryId', '==', categoryId));
            const productsSnapshot = await getDocs(q);
            productsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            toast.success('Categoría y productos eliminados.', { id: toastId });
        } catch (error) {
            toast.error('Error al eliminar la categoría.', { id: toastId });
        }
    }, []);

    return { addCategory, updateCategory, deleteCategory };
};


