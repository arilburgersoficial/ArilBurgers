import { useState, useEffect } from "react";
import { useRestaurant } from '../contexts/RestaurantContext';

export const useTotals = (orderItems) => {
    const { restaurant } = useRestaurant();
    const [totals, setTotals] = useState({ subtotal: 0, discount: 0, finalTotal: 0, appliedPromotionName: null });

    useEffect(() => {
        if (!orderItems || orderItems.length === 0) {
            setTotals({ subtotal: 0, discount: 0, finalTotal: 0, appliedPromotionName: null });
            return;
        }

        const subtotal = orderItems.reduce((acc, item) => acc + (item.price || 0) * item.qty, 0);
        let totalDiscount = 0;
        const appliedPromoNames = new Set();

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

            activePromotions.forEach(promo => {
                let promoDiscount = 0;
                
                // Agrupar items por ID para verificar cantidades para promociones
                const groupedItems = orderItems.reduce((acc, item) => {
                    acc[item.id] = (acc[item.id] || 0) + item.qty;
                    return acc;
                }, {});

                if (promo.type === 'quantity') {
                    const totalQty = groupedItems[promo.targetId] || 0;
                    if (totalQty >= promo.requiredQuantity) {
                        promoDiscount = promo.discountValue;
                    }
                } else {
                    const targetItems = orderItems.filter(item => 
                        (promo.appliesTo === 'product' && promo.targetId === item.id) ||
                        (promo.appliesTo === 'category' && promo.targetId === item.categoryId)
                    );

                    if (targetItems.length > 0) {
                        switch (promo.type) {
                            case 'percentage':
                                promoDiscount = targetItems.reduce((sum, item) => sum + (item.price * item.qty) * (promo.discountValue / 100), 0);
                                break;
                            case 'fixed':
                                promoDiscount = targetItems.reduce((sum, item) => sum + (promo.discountValue * item.qty), 0);
                                break;
                            case 'bogo':
                                const totalQty = targetItems.reduce((sum, item) => sum + item.qty, 0);
                                const freeItems = Math.floor(totalQty / 2);
                                promoDiscount = freeItems * (targetItems[0]?.price || 0);
                                break;
                        }
                    }
                }

                if (promoDiscount > 0) {
                    totalDiscount += promoDiscount;
                    appliedPromoNames.add(promo.name);
                }
            });
        }
        
        const finalTotal = subtotal - totalDiscount;

        setTotals({
            subtotal,
            discount: totalDiscount,
            finalTotal,
            appliedPromotionName: Array.from(appliedPromoNames).join(', '),
        });

    }, [orderItems, restaurant]);

    return { totals };
};

