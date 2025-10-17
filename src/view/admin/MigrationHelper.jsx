import React, { useState } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, writeBatch, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const MigrationHelper = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [productMigrationDone, setProductMigrationDone] = useState(false);
    const [promotionMigrationDone, setPromotionMigrationDone] = useState(false);

    const handleMigrateProducts = async () => {
        if (!window.confirm("Esta acción copiará los productos del array antiguo a la nueva colección 'products'. ¿Continuar?")) return;
        setIsLoading(true);
        const toastId = toast.loading('Migrando productos...');
        try {
            const restaurantRef = doc(db, 'restaurants', 'main_instance');
            const docSnap = await getDoc(restaurantRef);
            if (!docSnap.exists() || !docSnap.data().products) {
                toast.error('No se encontró el array de productos.', { id: toastId });
                return;
            }
            const oldArray = docSnap.data().products;
            if (oldArray.length === 0) {
                 toast.success('El array de productos ya está vacío.', { id: toastId });
                 setProductMigrationDone(true);
                 return;
            }
            const batch = writeBatch(db);
            oldArray.forEach(item => {
                const itemRef = doc(db, 'products', item.id || `prod_${Date.now()}_${Math.random()}`);
                batch.set(itemRef, item);
            });
            await batch.commit();
            toast.success(`Se migraron ${oldArray.length} productos.`, { id: toastId, duration: 5000 });
            setProductMigrationDone(true);
        } catch (error) {
            toast.error('Error durante la migración.', { id: toastId });
            console.error("Error en migración:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCleanOldProductsArray = async () => {
        if (!window.confirm("ADVERTENCIA: Esto eliminará el array 'products' del documento principal. Asegúrate de que la migración fue exitosa. ¿Continuar?")) return;
        setIsLoading(true);
        const toastId = toast.loading('Limpiando datos antiguos...');
        try {
            const restaurantRef = doc(db, 'restaurants', 'main_instance');
            await updateDoc(restaurantRef, { products: [] });
            toast.success('Array de productos antiguo eliminado.', { id: toastId });
        } catch(error) {
            toast.error('Error al limpiar.', { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- NUEVA LÓGICA PARA PROMOCIONES ---
    const handleMigratePromotions = async () => {
        if (!window.confirm("Esta acción copiará las promociones del array antiguo a la nueva colección 'promotions'. ¿Continuar?")) return;
        setIsLoading(true);
        const toastId = toast.loading('Migrando promociones...');
        try {
            const restaurantRef = doc(db, 'restaurants', 'main_instance');
            const docSnap = await getDoc(restaurantRef);
            if (!docSnap.exists() || !docSnap.data().promotions) {
                toast.error('No se encontró el array de promociones.', { id: toastId });
                return;
            }
            const oldArray = docSnap.data().promotions;
            if (oldArray.length === 0) {
                 toast.success('El array de promociones ya está vacío.', { id: toastId });
                 setPromotionMigrationDone(true);
                 return;
            }
            const batch = writeBatch(db);
            oldArray.forEach(item => {
                const itemRef = doc(db, 'promotions', item.id || `promo_${Date.now()}_${Math.random()}`);
                batch.set(itemRef, item);
            });
            await batch.commit();
            toast.success(`Se migraron ${oldArray.length} promociones.`, { id: toastId, duration: 5000 });
            setPromotionMigrationDone(true);
        } catch (error) {
            toast.error('Error durante la migración.', { id: toastId });
            console.error("Error en migración:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCleanOldPromotionsArray = async () => {
        if (!window.confirm("ADVERTENCIA: Esto eliminará el array 'promotions' del documento principal. ¿Continuar?")) return;
        setIsLoading(true);
        const toastId = toast.loading('Limpiando datos antiguos...');
        try {
            const restaurantRef = doc(db, 'restaurants', 'main_instance');
            await updateDoc(restaurantRef, { promotions: [] });
            toast.success('Array de promociones antiguo eliminado.', { id: toastId });
        } catch(error) {
            toast.error('Error al limpiar.', { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg mt-8 border border-yellow-500">
            <h3 className="text-xl font-bold text-yellow-400 mb-4">Asistente de Migración de Base de Datos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

           

                {/* Sección de Promociones */}
                <div className="space-y-4 p-4 border border-gray-700 rounded-lg">
                    <p className="font-semibold text-lg">Migración de Promociones</p>
                    <div>
                        <p className="font-semibold">Paso 1: Migrar</p>
                        <p className="text-sm text-gray-400 mb-2">Copia las promociones a la nueva colección.</p>
                        <button onClick={handleMigratePromotions} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 w-full px-4 py-2 rounded font-bold disabled:bg-gray-500">
                            {isLoading ? 'Procesando...' : 'Iniciar Migración de Promociones'}
                        </button>
                    </div>
                    {promotionMigrationDone && (
                         <div>
                            <p className="font-semibold">Paso 2: Limpiar</p>
                            <p className="text-sm text-gray-400 mb-2">Elimina el array `promotions` antiguo.</p>
                            <button onClick={handleCleanOldPromotionsArray} disabled={isLoading} className="bg-red-600 hover:bg-red-700 w-full px-4 py-2 rounded font-bold disabled:bg-gray-500">
                                {isLoading ? 'Procesando...' : 'Limpiar Array de Promociones'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MigrationHelper;

