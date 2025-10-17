import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { 
    collection, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    serverTimestamp,
    runTransaction,
    writeBatch,
    getDocs,
    query,
    where,
    documentId
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

const InventoryContext = createContext();
export const useInventory = () => useContext(InventoryContext);

export const InventoryProvider = ({ children }) => {
    const { user } = useAuth();
    const [ingredients, setIngredients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setIngredients([]);
            setLoading(false);
            return;
        }
        const ingredientsCol = collection(db, 'inventory');
        const unsubscribe = onSnapshot(ingredientsCol, (snapshot) => {
            const ingredientsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setIngredients(ingredientsData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const addIngredient = useCallback(async (ingredientData) => {
        const ingredientsCol = collection(db, 'inventory');
        await addDoc(ingredientsCol, {
            ...ingredientData,
            unitCost: 0,
            usageCount: 0,
            createdAt: serverTimestamp(),
        });
    }, []);

    const addMultipleIngredients = useCallback(async (ingredientsData) => {
        const batch = writeBatch(db);
        const ingredientsCol = collection(db, 'inventory');
        ingredientsData.forEach(ingredient => {
            const newIngredientRef = doc(ingredientsCol);
            batch.set(newIngredientRef, { ...ingredient, unitCost: 0, usageCount: 0, createdAt: serverTimestamp() });
        });
        await batch.commit();
    }, []);

    const updateIngredient = useCallback(async (id, ingredientData) => {
        const ingredientDoc = doc(db, 'inventory', id);
        await updateDoc(ingredientDoc, ingredientData);
    }, []);

    const deleteIngredient = useCallback(async (id) => {
        const ingredientDoc = doc(db, 'inventory', id);
        await deleteDoc(ingredientDoc);
    }, []);

    const restockIngredient = useCallback(async (id, quantity, totalCost) => {
        const ingredientDoc = doc(db, 'inventory', id);
        await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(ingredientDoc);
            if (!sfDoc.exists()) { throw "Document does not exist!"; }
            
            const oldStock = sfDoc.data().stock || 0;
            const newStock = oldStock + quantity;
            const newUnitCost = totalCost / quantity;

            transaction.update(ingredientDoc, { 
                stock: newStock,
                unitCost: newUnitCost 
            });
        });
    }, []);

    const recordWaste = useCallback(async (id, quantity) => {
        const ingredientDoc = doc(db, 'inventory', id);
        await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(ingredientDoc);
            if (!sfDoc.exists()) { throw "Document does not exist!"; }
            const newStock = sfDoc.data().stock - quantity;
            transaction.update(ingredientDoc, { stock: Math.max(0, newStock) });
        });
    }, []);
    
    const deductFromStock = useCallback(async (ingredientsToDeduct) => {
        if (ingredientsToDeduct.length === 0) return;
        const batch = writeBatch(db);
        const ingredientsCol = collection(db, 'inventory');
        const idsToFetch = ingredientsToDeduct.map(ing => ing.id);
        const q = query(ingredientsCol, where(documentId(), 'in', idsToFetch));
        const snapshot = await getDocs(q);
        const stockUpdates = new Map(snapshot.docs.map(doc => [doc.id, doc.data()]));
        ingredientsToDeduct.forEach(ingToDeduct => {
            const currentIngredient = stockUpdates.get(ingToDeduct.id);
            if (currentIngredient) {
                const ingredientRef = doc(db, 'inventory', ingToDeduct.id);
                const newStock = currentIngredient.stock - ingToDeduct.quantity;
                const newUsageCount = (currentIngredient.usageCount || 0) + 1;
                batch.update(ingredientRef, { stock: newStock, usageCount: newUsageCount });
            }
        });
        await batch.commit();
    }, []);

    const value = {
        ingredients, loading, addIngredient, addMultipleIngredients, updateIngredient, deleteIngredient, 
        restockIngredient, recordWaste, deductFromStock
    };

    return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};

