import React, { useState, useMemo } from "react";
import { useOrder } from "../hooks/useOrder";
import { useRestaurant } from "../contexts/RestaurantContext";
import { useProductPromotions } from "../hooks/useProductPromotions"; // <-- NUEVO HOOK
import toast from 'react-hot-toast';

// ... (Componente KioskProductCard sin cambios)
const KioskProductCard = ({ product, promotion, onProductClick }) => {
    // ... Lógica existente ...
    const getPromoDetails = () => {
        if (!promotion) return { bannerText: null, discountedPrice: null };

        let bannerText = "OFERTA";
        let discountedPrice = null;

        switch (promotion.type) {
            case 'percentage':
                discountedPrice = product.price * (1 - promotion.discountValue / 100);
                break;
            case 'fixed':
                discountedPrice = product.price - promotion.discountValue;
                break;
            case 'bogo':
                bannerText = "2x1";
                break;
            case 'quantity':
                bannerText = "POR CANTIDAD";
                break;
            default:
                break;
        }
        return { bannerText, discountedPrice: discountedPrice ? Math.max(0, discountedPrice) : null };
    };

    const { bannerText, discountedPrice } = getPromoDetails();

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-transform duration-300 flex flex-col relative">
            {bannerText && (
                <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                    {bannerText}
                </div>
            )}
            <img src={product.image || 'https://placehold.co/600x400?text=Producto'} alt={product.name} className="w-full h-48 object-cover"/>
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-xl font-bold text-gray-800">{product.name}</h3>
                <p className="text-sm text-gray-500 mt-1 flex-grow">{product.description}</p>
                <div className="mt-4 flex justify-between items-center">
                    <div className="flex flex-col">
                        {discountedPrice !== null ? (
                            <>
                                <span className="text-gray-500 line-through text-lg">${(product.price || 0).toFixed(2)}</span>
                                <span className="text-2xl font-bold text-red-600">${discountedPrice.toFixed(2)}</span>
                            </>
                        ) : (
                            <span className="text-2xl font-bold text-gray-900">${(product.price || 0).toFixed(2)}</span>
                        )}
                    </div>
                    <button 
                        onClick={() => onProductClick(product)}
                        className="bg-[var(--primary-color)] text-white font-bold py-2 px-4 rounded-lg shadow-md hover:opacity-90 transition-opacity"
                    >
                        Agregar
                    </button>
                </div>
            </div>
        </div>
    );
};


// ... (Componente FloatingCart sin cambios)
const FloatingCart = ({ orderItems, totals, onFinalize, onClear }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <>
            {/* Botón flotante principal */}
            <div className="fixed bottom-6 right-6 z-40">
                <button onClick={() => setIsOpen(!isOpen)} className="bg-gray-900 text-white rounded-full p-4 shadow-lg flex items-center gap-3">
                    <span className="text-lg">🛒</span>
                    <span className="font-bold">{orderItems.length} Items</span>
                    <span className="bg-[var(--primary-color)] text-gray-900 font-bold rounded-full px-3 py-1">${(totals?.finalTotal || 0).toFixed(2)}</span>
                </button>
            </div>

            {/* Panel del carrito */}
            <div className={`fixed bottom-0 left-0 right-0 bg-white p-6 shadow-2xl rounded-t-2xl transform transition-transform duration-300 z-50 ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Tu Pedido</h2>
                    <button onClick={() => setIsOpen(false)} className="text-2xl text-gray-500">&times;</button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-3 mb-4">
                    {/* ... */}
                </div>
                <div className="border-t pt-4 space-y-2">
                    <p className="flex justify-between text-gray-600"><span>Subtotal:</span> <span>${(totals?.subtotal || 0).toFixed(2)}</span></p>
                    {totals?.discount > 0 && <p className="flex justify-between text-green-600"><span>Descuento:</span> <span>-${(totals.discount || 0).toFixed(2)}</span></p>}
                    <p className="flex justify-between font-bold text-xl text-gray-900"><span>Total:</span> <span>${(totals?.finalTotal || 0).toFixed(2)}</span></p>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                    <button onClick={onClear} className="bg-gray-200 text-gray-700 font-bold py-3 rounded-lg">Limpiar</button>
                    <button onClick={onFinalize} className="bg-green-500 text-white font-bold py-3 rounded-lg">Finalizar Compra</button>
                </div>
            </div>
        </>
    );
};

const KioskView = () => {
    const { restaurant } = useRestaurant();
    const { orderItems, addItem, clearOrder, finalizeOrder, totals } = useOrder();
    const { productPromotions } = useProductPromotions(); // <-- USO DEL NUEVO HOOK
    const [selectedCategory, setSelectedCategory] = useState('all');

    const filteredProducts = useMemo(() => {
        const products = restaurant?.products?.filter(p => !p.isHiddenInPOS) || [];
        if (selectedCategory === 'all') return products;
        return products.filter(p => p.categoryId === selectedCategory);
    }, [selectedCategory, restaurant]);

    const handleFinalize = () => {
        if (orderItems.length > 0) {
            finalizeOrder();
            toast.success("¡Pedido enviado a cocina! Gracias por tu compra.");
        } else {
            toast.error("Tu carrito está vacío.");
        }
    };
    
    const primaryColor = restaurant?.config?.theme?.primaryColor || '#fbbf24';

    return (
        <div className="bg-gray-100 min-h-screen">
            <header className="bg-white shadow-md p-4 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    {restaurant?.config?.logoUrl && <img src={restaurant.config.logoUrl} alt="Logo" className="h-10 w-10 rounded-full object-cover"/>}
                    <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>{restaurant?.config?.restaurantName || "POS System"}</h1>
                </div>
            </header>

            <main className="container mx-auto p-6">
                <div className="mb-6">
                    <h2 className="text-3xl font-bold text-gray-800 mb-4">Nuestro Menú</h2>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        <button onClick={() => setSelectedCategory('all')} style={selectedCategory === 'all' ? { backgroundColor: primaryColor, color: 'white' } : {}} className="bg-white text-gray-700 px-5 py-2 rounded-full font-semibold shadow-sm transition-colors">Todos</button>
                        {restaurant?.categories?.map(cat => (
                             <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={selectedCategory === cat.id ? { backgroundColor: primaryColor, color: 'white' } : {}} className="bg-white text-gray-700 px-5 py-2 rounded-full font-semibold shadow-sm transition-colors">{cat.name}</button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredProducts.map(product => {
                        const promotion = productPromotions.get(product.id);
                        return <KioskProductCard key={product.id} product={product} promotion={promotion} onProductClick={addItem} />
                    })}
                </div>
            </main>

            <FloatingCart 
                orderItems={orderItems} 
                totals={totals}
                onClear={clearOrder}
                onFinalize={handleFinalize}
            />
        </div>
    );
};

export default KioskView;

