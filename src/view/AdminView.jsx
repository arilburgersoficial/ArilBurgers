import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import CompanySettings from './admin/CompanySettings';
import UserManagement from './admin/UserManagement';
import MenuManagement from './admin/MenuManagement';
import LayoutManagement from './admin/LayoutManagement';
import PromotionManagement from './admin/PromotionManagement';
import InventoryManagement from './admin/InventoryManagement';
import DeliveryManagement from './admin/DeliveryManagement';

const AdminView = () => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState('company');
  
  const tabs = [
    { id: 'company', label: 'Empresa', component: <CompanySettings /> },
    { id: 'users', label: 'Usuarios', component: <UserManagement /> },
    { id: 'menus', label: 'Menus', component: <MenuManagement /> },
    { id: 'layout', label: 'Salones y Mesas', component: <LayoutManagement /> },
    { id: 'promotions', label: 'Promociones', component: <PromotionManagement /> },
    { id: 'inventory', label: 'Inventario', component: <InventoryManagement /> },
    { id: 'delivery', label: 'Delivery', component: <DeliveryManagement /> },
  ];

  const activeComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="flex flex-col md:flex-row gap-8 p-4">
      <aside className="w-full md:w-1/5">
        <h1 className="text-3xl font-bold mb-6">Administración</h1>
        <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-left p-3 rounded-lg transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[var(--primary-color)] text-gray-900 font-bold'
                  : 'hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="w-full md:w-4/5 bg-gray-800 p-6 rounded-lg">
        {activeComponent}
      </main>
    </div>
  );
};

export default AdminView;

