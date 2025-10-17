import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRestaurant } from "../contexts/RestaurantContext";

const Header = ({ setCurrentView, currentView, currentUserRole }) => {
  const { user, logout } = useAuth();
  const { restaurant } = useRestaurant();

  const primaryColor = restaurant?.config?.theme?.primaryColor || '#fbbf24';
  const restaurantName = restaurant?.config?.restaurantName || "POS System";
  const logoUrl = restaurant?.config?.logoUrl;

  // Se añade el botón "Mesas" a la navegación principal
  const navItems = [
    { view: "pos", label: "POS", roles: ["admin", "empleado"] },
    { view: "mesas", label: "Mesas", roles: ["admin", "empleado"] },
    { view: "kitchen", label: "Cocina", roles: ["admin", "empleado"] },
    { view: "orders", label: "Pedidos", roles: ["admin", "empleado"] },
    { view: "cash", label: "Caja", roles: ["admin", "empleado"] },
    { view: "dashboard", label: "Dashboard", roles: ["admin"] },
    { view: "admin", label: "Admin", roles: ["admin"] },
  ];

  return (
    <header className="bg-gray-800 text-white shadow-md">
      <div className="container mx-auto p-4 flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {logoUrl && <img src={logoUrl} alt="Logo" className="h-8 w-8 rounded-full object-cover"/>}
          <h1 className="text-xl font-bold" style={{ color: primaryColor }}>{restaurantName}</h1>
        </div>
        
        <nav className="flex items-center gap-2 sm:gap-4 order-last w-full sm:order-none sm:w-auto mt-4 sm:mt-0">
          {navItems.map(item =>
            (item.roles || []).includes(currentUserRole) && (
              <button
                key={item.view}
                onClick={() => setCurrentView(item.view)}
                style={currentView === item.view ? { backgroundColor: primaryColor, color: '#1a202c' } : {}}
                className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-semibold transition ${
                  currentView !== item.view ? 'hover:bg-gray-700' : ''
                }`}
              >
                {item.label}
              </button>
            )
          )}
        </nav>

        <div className="flex items-center gap-4">
          {user && (
            <>
              <span className="text-sm hidden sm:block">{user.email}</span>
              <button onClick={logout} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg text-sm font-semibold">
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;

