import { useMemo } from 'react';
import { useRestaurant } from '../contexts/RestaurantContext';

/**
 * Hook profesional y seguro para determinar la promoción más relevante para cada producto.
 * Siempre devuelve un objeto Map para evitar errores de ejecución.
 */
export const useProductPromotions = () => {
    const { restaurant } = useRestaurant();

    const productPromotions = useMemo(() => {
        // Garantiza que siempre se devuelva un Map, incluso si los datos no han cargado.
        if (!restaurant?.promotions || !restaurant?.products) {
            return new Map();
        }

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

        const promotionsMap = new Map();

        // 1. Asignar promociones directas a productos
        activePromotions
            .filter(p => p.appliesTo === 'product')
            .forEach(promo => {
                // Si el producto ya tiene una promo, no la sobrescribimos (la primera encontrada es suficiente por ahora)
                if (!promotionsMap.has(promo.targetId)) {
                    promotionsMap.set(promo.targetId, promo);
                }
            });

        // 2. Asignar promociones de categoría a todos los productos correspondientes
        activePromotions
            .filter(p => p.appliesTo == 'category')
            .forEach(promo => {
                restaurant.products.forEach(product => {
                    if (product.categoryId == promo.targetId && !promotionsMap.has(product.id)) {
                        promotionsMap.set(product.id, promo);
                    }
                });
            });

        return promotionsMap;
    }, [restaurant?.promotions, restaurant?.products, restaurant?.categories]);

    return productPromotions;
};

