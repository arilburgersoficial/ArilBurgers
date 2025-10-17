import React, { useState, useEffect } from "react";
import { useOrder } from "../hooks/useOrder";
import { useCash } from "../contexts/CashContext";
import { useProductPromotions } from "../hooks/useProductPromotions";
import { useRestaurant } from "../contexts/RestaurantContext";
import { useGoogleMaps } from "../hooks/useGoogleMaps";
import toast from 'react-hot-toast';

import Menu from "./pos/Menu";
import CurrentOrder from "./pos/CurrentOrder";
import OrderTypeModal from './pos/OrderTypeModal';
import ClientInfoModal from './pos/ClientInfoModal';
import ProductCustomizationModal from './pos/ProductCustomizationModal';
import PaymentModal from './pos/PaymentModal';

const PosView = ({ loadOrderConfig, clearLoadOrderConfig, setCurrentView }) => {
  const { cashRegister } = useCash();
  const { restaurant } = useRestaurant();
  const productPromotions = useProductPromotions();
  const { isLoaded: isMapsLoaded, calculateDistance } = useGoogleMaps();

  const {
    activeOrder, orderItems, totals, isSaving,
    startNewOrder, loadOrder, addItemToOrder, updateItem,
    modifyItemQuantity, removeItem, clearOrder, finalizeOrder,
  } = useOrder();

  const [orderTypeModalOpen, setOrderTypeModalOpen] = useState(false);
  const [clientInfoModalOpen, setClientInfoModalOpen] = useState(false);
  const [customizationModal, setCustomizationModal] = useState({ isOpen: false, item: null });
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);

  useEffect(() => {
    if (loadOrderConfig) {
      if (loadOrderConfig.type === 'new_dine_in') {
        startNewOrder('dine-in', { table: loadOrderConfig.table });
      } else if (loadOrderConfig.type === 'load_order') {
        loadOrder(loadOrderConfig.order);
      }
      clearLoadOrderConfig();
    }
  }, [loadOrderConfig, startNewOrder, loadOrder, clearLoadOrderConfig]);

  const handleProductClick = (product) => {
    if (!cashRegister?.isOpen) {
      toast.error("Para registrar un pedido, primero debes abrir la caja.");
      setCurrentView('cash');
      return;
    }
    if (!activeOrder) {
      setPendingProduct(product);
      setOrderTypeModalOpen(true);
    } else {
      addItemToOrder(product);
    }
  };

  const handleOrderTypeSelect = (type) => {
    setOrderTypeModalOpen(false);
    if (type === 'delivery') {
      setClientInfoModalOpen(true);
    } else {
      startNewOrder(type);
    }
  };

  useEffect(() => {
    if (activeOrder && pendingProduct) {
      addItemToOrder(pendingProduct);
      setPendingProduct(null);
    }
  }, [activeOrder, pendingProduct, addItemToOrder]);

  const handleClientInfoSave = async (clientInfo) => {
    setClientInfoModalOpen(false);
    const origin = restaurant?.config?.delivery?.address;
    const ratePerKm = restaurant?.config?.delivery?.ratePerKm;

    if (!origin || ratePerKm == null) {
        toast.error("La configuración de delivery (dirección/tarifa) no está completa.", { duration: 4000 });
        startNewOrder('delivery', { clientInfo, shippingCost: 0 });
        return;
    }

    if (!isMapsLoaded) {
        toast("Servicio de mapas inicializando, el costo de envío no se calculará esta vez.", { icon: '🗺️', duration: 4000 });
        startNewOrder('delivery', { clientInfo, shippingCost: 0 });
        return;
    }

    const toastId = toast.loading('Calculando costo de envío...');
    try {
        const distanceInKm = await calculateDistance(origin, clientInfo.address);
        const shippingCost = distanceInKm * ratePerKm;
        
        toast.success(`Envío: $${shippingCost.toFixed(2)} (${distanceInKm.toFixed(1)} km)`, { id: toastId });
        startNewOrder('delivery', { clientInfo, shippingCost });
    } catch (error) {
        toast.error(error.message || 'No se pudo calcular la distancia.', { id: toastId });
        console.error(error);
        startNewOrder('delivery', { clientInfo, shippingCost: 0 });
    }
  };
  
  const handleCustomizationSave = (instanceId, notes) => {
    updateItem(instanceId, { notes });
    setCustomizationModal({ isOpen: false, item: null });
  };

  const handleInitiateFinalizeOrder = () => {
    if (activeOrder && orderItems.length > 0) {
      setPaymentModalOpen(true);
    }
  };

  const handlePaymentSelect = (paymentMethod) => {
    setPaymentModalOpen(false);
    finalizeOrder(paymentMethod);
  };

  return (
    <>
      <OrderTypeModal isOpen={orderTypeModalOpen} onClose={() => setOrderTypeModalOpen(false)} onSelect={handleOrderTypeSelect} />
      <ClientInfoModal isOpen={clientInfoModalOpen} onClose={() => setClientInfoModalOpen(false)} onSave={handleClientInfoSave} />
      <ProductCustomizationModal isOpen={customizationModal.isOpen} onClose={() => setCustomizationModal({ isOpen: false, item: null })} item={customizationModal.item} onSave={handleCustomizationSave} />
      <PaymentModal 
        isOpen={paymentModalOpen} 
        onClose={() => setPaymentModalOpen(false)} 
        onSelectPayment={handlePaymentSelect} 
        paymentMethods={restaurant?.config?.paymentMethods || []} 
      />

      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-120px)] p-4">
        <Menu onProductClick={handleProductClick} productPromotions={productPromotions} />
        <aside className="w-full lg:w-[350px] xl:w-[400px] flex-shrink-0">
          <CurrentOrder
            activeOrder={activeOrder}
            orderItems={orderItems}
            totals={totals}
            isSaving={isSaving}
            onItemInstanceClick={(instance) => setCustomizationModal({ isOpen: true, item: instance })}
            onModifyQuantity={modifyItemQuantity}
            onRemoveItem={removeItem}
            onClearOrder={clearOrder}
            onFinalizeOrder={handleInitiateFinalizeOrder}
          />
        </aside>
      </div>
    </>
  );
};

export default PosView;

