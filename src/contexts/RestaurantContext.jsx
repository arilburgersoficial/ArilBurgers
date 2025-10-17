import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, auth, storage } from '../firebase/config';
import { doc, onSnapshot, updateDoc, writeBatch, collection, getDocs, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from './AuthContext';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import imageCompression from 'browser-image-compression';
import { v4 as uuidv4 } from 'uuid';

const RestaurantContext = createContext();
export const useRestaurant = () => useContext(RestaurantContext);

// Función helper para fusionar objetos anidados de forma segura
function mergeDeep(target, source) {
    const output = { ...target };
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) Object.assign(output, { [key]: source[key] });
                else output[key] = mergeDeep(target[key], source[key]);
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    return output;
}
function isObject(item) { return (item && typeof item === 'object' && !Array.isArray(item)); }

export const RestaurantProvider = ({ children }) => {
  // El estado ahora se inicializa de forma más completa
  const [restaurant, setRestaurant] = useState({ config: {}, layout: [], categories: [], products: [], promotions: [], ingredientGroups: [] });
  const [loading, setLoading] = useState(true);
  
  const restaurantRef = doc(db, 'restaurants', 'main_instance');

  // Listener principal para la configuración y el layout (datos que sí viven en el doc principal)
  useEffect(() => {
    const unsubscribe = onSnapshot(restaurantRef, (snap) => {
      const data = snap.exists() ? snap.data() : { config: {}, layout: [], ingredientGroups: []};
      setRestaurant(prev => ({ ...prev, ...data }));
    });
    return () => unsubscribe();
  }, []);

  // Listeners para las nuevas colecciones
  useEffect(() => {
    setLoading(true);
    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
        setRestaurant(prev => ({ ...prev, categories: snap.docs.map(d => ({id: d.id, ...d.data()})) }));
    });
    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
        setRestaurant(prev => ({ ...prev, products: snap.docs.map(d => ({id: d.id, ...d.data()})) }));
    });
    const unsubPromotions = onSnapshot(collection(db, 'promotions'), (snap) => {
        setRestaurant(prev => ({ ...prev, promotions: snap.docs.map(d => ({id: d.id, ...d.data()})) }));
    });

    // Se asegura de que todas las colecciones iniciales se carguen antes de quitar el loading
    Promise.all([
        getDocs(collection(db, 'categories')), 
        getDocs(collection(db, 'products')), 
        getDocs(collection(db, 'promotions'))
    ]).then(() => {
        setLoading(false);
    });

    return () => {
        unsubCategories();
        unsubProducts();
        unsubPromotions();
    };
  }, []);
  
  const uploadImage = useCallback(async (file, path) => {
    if (!file) return null;
    const options = { maxSizeMB: 1, maxWidthOrHeight: 1024, useWebWorker: true };
    try {
      const compressedFile = await imageCompression(file, options);
      const storageRef = ref(storage, `${path}/${Date.now()}-${compressedFile.name}`);
      const snapshot = await uploadBytes(storageRef, compressedFile);
      return await getDownloadURL(snapshot.ref);
    } catch (error) {
      console.error("Error al subir imagen:", error);
      throw error;
    }
  }, []);

  // --- FUNCIÓN DE ACTUALIZACIÓN REFACTORIZADA Y MÁS SEGURA ---
  const updateRestaurantConfig = useCallback(async (configUpdates, files = {}) => {
    let updates = { ...configUpdates };

    if (files.logo) {
      updates = mergeDeep(updates, { logoUrl: await uploadImage(files.logo, 'logos') });
    }
    if (files.bg) {
      updates = mergeDeep(updates, { theme: { backgroundImage: await uploadImage(files.bg, 'backgrounds') } });
    }
    if (files.loginBg) {
      updates = mergeDeep(updates, { theme: { loginBackgroundImage: await uploadImage(files.loginBg, 'backgrounds') } });
    }
    
    const docSnap = await getDoc(restaurantRef);
    const currentConfig = docSnap.exists() ? docSnap.data().config : {};
    
    const newConfig = mergeDeep(currentConfig, updates);

    await updateDoc(restaurantRef, { config: newConfig });
  }, [restaurantRef, uploadImage]);
  
  const deleteSalesHistory = useCallback(async (password) => {
    if (!auth.currentUser) throw new Error("No autenticado.");
    const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
    await reauthenticateWithCredential(auth.currentUser, credential);
    const batch = writeBatch(db);
    const collectionsToDelete = ["orders", "movements"];
    for (const coll of collectionsToDelete) {
        const snapshot = await getDocs(collection(db, coll));
        snapshot.forEach(doc => batch.delete(doc.ref));
    }
    batch.update(doc(db, "cashRegisters", "main_register"), { isOpen: false, report: null });
    await batch.commit();
  }, []);

  const updateLayout = useCallback(async (newLayout) => {
    await updateDoc(restaurantRef, { layout: newLayout });
  }, [restaurantRef]);
  
  const addZone = useCallback((zoneName) => {
      const newZone = { id: uuidv4(), name: zoneName, tables: [] };
      const newLayout = [...(restaurant?.layout || []), newZone];
      updateLayout(newLayout);
  }, [restaurant, updateLayout]);

  const updateZone = useCallback((zoneId, updates) => {
      if (!restaurant?.layout) return;
      const newLayout = restaurant.layout.map(zone => 
        zone.id === zoneId ? { ...zone, ...updates } : zone
      );
      updateLayout(newLayout);
  }, [restaurant, updateLayout]);

  const deleteZone = useCallback((zoneId) => {
      if (!restaurant?.layout) return;
      const newLayout = restaurant.layout.filter(zone => zone.id !== zoneId);
      updateLayout(newLayout);
  }, [restaurant, updateLayout]);

  const addTable = useCallback((zoneId, tableName) => {
      if (!restaurant?.layout) return;
      const newTable = { id: uuidv4(), name: tableName };
      const newLayout = restaurant.layout.map(zone => {
        if (zone.id === zoneId) {
          return { ...zone, tables: [...(zone.tables || []), newTable] };
        }
        return zone;
      });
      updateLayout(newLayout);
  }, [restaurant, updateLayout]);

  const updateTable = useCallback((zoneId, tableId, updates) => {
      if (!restaurant?.layout) return;
      const newLayout = restaurant.layout.map(zone => {
        if (zone.id === zoneId) {
          const updatedTables = (zone.tables || []).map(table => 
            table.id === tableId ? { ...table, ...updates } : table
          );
          return { ...zone, tables: updatedTables };
        }
        return zone;
      });
      updateLayout(newLayout);
  }, [restaurant, updateLayout]);

  const deleteTable = useCallback((zoneId, tableId) => {
      if (!restaurant?.layout) return;
      const newLayout = restaurant.layout.map(zone => {
        if (zone.id === zoneId) {
          const filteredTables = (zone.tables || []).filter(table => table.id !== tableId);
          return { ...zone, tables: filteredTables };
        }
        return zone;
      });
      updateLayout(newLayout);
  }, [restaurant, updateLayout]);

  const value = {
    restaurant,
    loading,
    updateRestaurantConfig,
    deleteSalesHistory,
    addZone,
    updateZone,
    deleteZone,
    addTable,
    updateTable,
    deleteTable,
  };

  return <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>;
};

