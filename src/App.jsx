import React, { useState, useEffect, lazy, Suspense } from "react";
import { useAuth } from "./contexts/AuthContext";
import { useRestaurant } from './contexts/RestaurantContext';
import { Toaster } from 'react-hot-toast';

import Header from "./components/Header";
import LoginScreen from "./views/LoginScreen";

// Vistas cargadas de forma diferida (lazy loading)
const PosView = lazy(() => import('./views/PosView.jsx'));
const TableView = lazy(() => import('./views/TableView.jsx'));
const KitchenView = lazy(() => import('./views/KitchenView.jsx'));
const OrdersView = lazy(() => import('./views/OrdersView.jsx'));
const DashboardView = lazy(() => import('./views/DashboardView.jsx'));
const CashView = lazy(() => import('./views/CashView.jsx'));
const AdminView = lazy(() => import('./views/AdminView.jsx'));
const KioskView = lazy(() => import('./views/KioskView.jsx'));


const App = () => {
  const { user, role, loading: authLoading } = useAuth();
  const { restaurant, loading: restaurantLoading } = useRestaurant();
  const [currentView, setCurrentView] = useState("pos");
  
  // Estado para gestionar la carga de un pedido o el inicio de uno nuevo
  const [loadOrderConfig, setLoadOrderConfig] = useState(null);
  const [isKioskMode, setIsKioskMode] = useState(false);


  // Navega a la vista POS para iniciar un nuevo pedido en la mesa seleccionada
  const handleSelectTable = (table) => {
    setLoadOrderConfig({ type: 'new_dine_in', table });
    setCurrentView('pos');
  };
  
  // Navega a la vista POS para reanudar un pedido existente
  const handleResumeOrder = (order) => {
    setLoadOrderConfig({ type: 'load_order', order });
    setCurrentView('pos');
  };

  const loading = authLoading || restaurantLoading;
  
  useEffect(() => {
    if (restaurant?.config?.theme?.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', restaurant.config.theme.primaryColor);
    }
  }, [restaurant]);

  if (loading) {
      return <div className="bg-gray-900 min-h-screen flex items-center justify-center"><p className="text-white text-center">Cargando aplicación...</p></div>;
  }
  
  if (!user && !isKioskMode) return <LoginScreen />;

  if (isKioskMode) { /* ... Lógica Kiosko sin cambios ... */ }

  const renderView = () => {
    switch (currentView) {
      case "pos": 
        return <PosView loadOrderConfig={loadOrderConfig} clearLoadOrderConfig={() => setLoadOrderConfig(null)} setCurrentView={setCurrentView} />;
      case "mesas":
        return <TableView onSelectTable={handleSelectTable} onResumeOrder={handleResumeOrder} />;
      case "kitchen": 
        return <KitchenView onResumeOrder={handleResumeOrder} />;
      case "orders": 
        return <OrdersView />;
      case "dashboard": 
        return <DashboardView />;
      case "cash": 
        return <CashView />;
      case "admin": 
        return <AdminView />;
      default: 
        return <PosView loadOrderConfig={loadOrderConfig} clearLoadOrderConfig={() => setLoadOrderConfig(null)} setCurrentView={setCurrentView} />;
    }
  };

  return (
    <div className="bg-gray-900 min-h-screen text-white relative">
        <Toaster position="bottom-center" />
        <Header
          setCurrentView={setCurrentView}
          currentView={currentView}
          currentUserRole={role}
        />
        <main className="container mx-auto">
          <Suspense fallback={<div className="text-center p-10 animate-pulse">Cargando...</div>}>
            {renderView()}
          </Suspense>
        </main>
    </div>
  );
};

export default App;

