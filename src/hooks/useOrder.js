import { useState, useCallback, useMemo } from 'react';
import { db, auth } from '../firebase/config';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    query,
    where,
    getDocs,
    Timestamp,
} from 'firebase/firestore';
import { useRestaurant } from '../contexts/RestaurantContext';
import { useInventory } from '../contexts/InventoryContext';
import { v4 as uuidv4 } from 'uuid';

export const useOrder = () => {
    const { restaurant } = useRestaurant();
    const { deductFromStock } = useInventory();

    const [activeOrder, setActiveOrder] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const orderItems = useMemo(() => {
        if (!activeOrder) return [];
        const groupedItems = new Map();
        activeOrder.items.forEach(instance => {
            if (groupedItems.has(instance.id)) {
                const existing = groupedItems.get(instance.id);
                existing.quantity += 1;
                existing.instances.push(instance);
            } else {
                groupedItems.set(instance.id, {
                    ...instance,
                    quantity: 1,
                    instances: [instance],
                });
            }
        });
        return Array.from(groupedItems.values());
    }, [activeOrder]);

    const totals = useMemo(() => {
        if (!orderItems || !activeOrder) {
            return { subtotal: 0, discount: 0, shippingCost: 0, finalTotal: 0 };
        }

        const subtotal = orderItems.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0);
        let totalDiscount = 0;
        
        if (restaurant?.promotions) {
            const now = new Date();
            const activePromotions = restaurant.promotions.filter(p => {
                if (!p.isActive) return false;
                const startDate = p.startDate ? new Date(p.startDate) : null;
                const endDate = p.endDate ? new Date(p.endDate) : null;
                if (startDate) startDate.setHours(0, 0, 0, 0);
                if (endDate) {
                    endDate.setHours(23, 59, 59, 999);
                    if (now > endDate) return false;
                }
                if (startDate && now < startDate) return false;
                return true;
            });

            // --- LÓGICA DE DESCUENTOS COMPLETAMENTE REFACTORIZADA ---
            activePromotions.forEach(promo => {
                let promoDiscount = 0;
                
                switch (promo.type) {
                    case 'percentage':
                    case 'fixed':
                    case 'bogo':
                        const targetItems = orderItems.filter(item => 
                            (promo.appliesTo === 'product' && promo.targetId == item.id) ||
                            (promo.appliesTo === 'category' && promo.targetId == item.categoryId)
                        );

                        if (targetItems.length > 0) {
                            const totalQty = targetItems.reduce((sum, item) => sum + item.quantity, 0);
                            if (promo.type === 'percentage') {
                                promoDiscount = targetItems.reduce((sum, item) => sum + (item.price * item.quantity) * (promo.discountValue / 100), 0);
                            } else if (promo.type === 'fixed') {
                                promoDiscount = promo.discountValue * totalQty;
                            } else if (promo.type === 'bogo') {
                                promoDiscount = Math.floor(totalQty / 2) * (targetItems[0]?.price || 0);
                            }
                        }
                        break;
                    
                    case 'quantity':
                        const targetItem = orderItems.find(item => item.id == promo.targetId);
                        if (targetItem && targetItem.quantity >= promo.requiredQuantity) {
                            promoDiscount = promo.discountValue;
                        }
                        break;

                    default:
                        break;
                }
                totalDiscount += promoDiscount;
            });
        }
        
        const shippingCost = activeOrder.shippingCost || 0;
        const finalTotal = subtotal - totalDiscount + shippingCost;

        return { subtotal, discount: totalDiscount, shippingCost, finalTotal };
    }, [orderItems, activeOrder, restaurant]);

    const startNewOrder = useCallback((type, details = {}) => {
        setActiveOrder({
            orderId: uuidv4(),
            orderType: type,
            items: [],
            tableId: details.table?.id || null,
            tableName: details.table?.name || null,
            clientInfo: details.clientInfo || null,
            shippingCost: details.shippingCost || 0,
        });
    }, []);

    const loadOrder = useCallback((order) => {
        const itemsWithInstances = order.items.map(item => ({ ...item, instanceId: uuidv4() }));
        setActiveOrder({ ...order, orderId: order.id, items: itemsWithInstances });
    }, []);

    const addItemToOrder = useCallback((product) => {
        if (!activeOrder) return;
        const newInstance = { ...product, instanceId: uuidv4(), notes: '' };
        setActiveOrder(prev => ({ ...prev, items: [...prev.items, newInstance] }));
    }, [activeOrder]);

    const updateItem = useCallback((instanceId, updates) => {
        if (!activeOrder) return;
        setActiveOrder(prev => ({
            ...prev,
            items: prev.items.map(item => item.instanceId === instanceId ? { ...item, ...updates } : item)
        }));
    }, [activeOrder]);

    const modifyItemQuantity = useCallback((productId, action) => {
        if (!activeOrder) return;
        if (action === 'increase') {
            const productToAdd = restaurant.products.find(p => p.id === productId);
            if (productToAdd) addItemToOrder(productToAdd);
        } else if (action === 'decrease') {
            const lastInstanceOfProduct = [...activeOrder.items].reverse().find(item => item.id === productId);
            if (lastInstanceOfProduct) {
                setActiveOrder(prev => ({
                    ...prev,
                    items: prev.items.filter(item => item.instanceId !== lastInstanceOfProduct.instanceId)
                }));
            }
        }
    }, [activeOrder, restaurant, addItemToOrder]);

    const removeItem = useCallback((productId) => {
        if (!activeOrder) return;
        setActiveOrder(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== productId)
        }));
    }, [activeOrder]);
    
    const clearOrder = useCallback(() => {
        setActiveOrder(null);
    }, []);

    const finalizeOrder = useCallback(async (paymentMethod) => {
        if (!activeOrder || !paymentMethod) return;
        setIsSaving(true);
        try {
            const itemsForDB = orderItems.map(item => {
                const notesCount = {};
                item.instances.forEach(instance => {
                    const note = instance.notes?.trim();
                    if (note) {
                        notesCount[note] = (notesCount[note] || 0) + 1;
                    }
                });
                const notesString = Object.entries(notesCount).map(([note, count]) => count > 1 ? `(x${count}) ${note}` : note).join('; ');
                return {
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    notes: notesString || null,
                };
            });

            const orderData = {
                folio: '', status: 'pending', createdAt: serverTimestamp(), createdBy: auth.currentUser?.uid || null,
                orderType: activeOrder.orderType, 
                tableId: activeOrder.tableId, 
                tableName: activeOrder.tableName, 
                clientInfo: activeOrder.clientInfo, 
                items: itemsForDB, 
                totals,
                paymentMethod: paymentMethod,
            };

            if (activeOrder.id) {
                const orderRef = doc(db, "orders", activeOrder.id);
                await updateDoc(orderRef, orderData);
            } else {
                const now = new Date();
                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const q = query(collection(db, "orders"), where("createdAt", ">=", Timestamp.fromDate(startOfDay)));
                const todaysOrdersSnapshot = await getDocs(q);
                const consecutive = String(todaysOrdersSnapshot.size + 1).padStart(2, '0');
                orderData.folio = `#${now.toISOString().slice(0, 10).replace(/-/g, '')}-${consecutive}`;
                await addDoc(collection(db, "orders"), orderData);
            }
            
            const ingredientsToDeduct = [];
            orderItems.forEach(item => {
                const productDetails = restaurant.products.find(p => p.id === item.id);
                if (productDetails?.recipe) {
                    productDetails.recipe.forEach(recipeIngredient => {
                        const existing = ingredientsToDeduct.find(i => i.id === recipeIngredient.id);
                        const quantityToDeduct = recipeIngredient.quantity * item.quantity;
                        if (existing) {
                            existing.quantity += quantityToDeduct;
                        } else {
                            ingredientsToDeduct.push({ id: recipeIngredient.id, quantity: quantityToDeduct });
                        }
                    });
                }
            });
            if (ingredientsToDeduct.length > 0) {
                await deductFromStock(ingredientsToDeduct);
            }

            clearOrder();
        } catch (err) {
            console.error("Error al finalizar el pedido:", err);
        } finally {
            setIsSaving(false);
        }
    }, [activeOrder, orderItems, totals, restaurant, deductFromStock, clearOrder]);

    return {
        activeOrder,
        orderItems,
        totals,
        isSaving,
        startNewOrder,
        loadOrder,
        addItemToOrder,
        updateItem,
        modifyItemQuantity,
        removeItem,
        clearOrder,
        finalizeOrder,
    };
};

