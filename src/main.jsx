import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { CashProvider } from './contexts/CashContext';
import { RestaurantProvider } from './contexts/RestaurantContext';
import { InventoryProvider } from './contexts/InventoryContext'; // IMPORTAMOS
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <CashProvider>
        <RestaurantProvider>
          <InventoryProvider> {/* ENVOLVEMOS LA APP */}
            <App />
          </InventoryProvider>
        </RestaurantProvider>
      </CashProvider>
    </AuthProvider>
  </React.StrictMode>
);

