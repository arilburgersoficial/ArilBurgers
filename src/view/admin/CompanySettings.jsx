import React, { useState, useEffect, useRef } from 'react';
import { useRestaurant } from '../../contexts/RestaurantContext';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const SettingsSection = ({ title, children }) => (
    <section className="bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold text-yellow-400 border-b-2 border-gray-700 pb-3 mb-6">{title}</h3>
        <div className="space-y-6">
            {children}
        </div>
    </section>
);

const FormField = ({ label, description, children }) => (
    <div>
        <label className="block mb-1 font-semibold text-gray-200">{label}</label>
        {description && <p className="text-xs text-gray-400 mb-2">{description}</p>}
        {children}
    </div>
);

const CompanySettings = () => {
    const { restaurant, updateRestaurantConfig, deleteSalesHistory, loading } = useRestaurant();
    const { isLoaded, initAutocomplete } = useGoogleMaps();
    
    const [config, setConfig] = useState(restaurant?.config || {});
    const [files, setFiles] = useState({ logo: null, bg: null, loginBg: null });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const addressInputRef = useRef(null);

    useEffect(() => {
        setConfig(restaurant?.config || {});
    }, [restaurant]);

    useEffect(() => {
        if (isLoaded && addressInputRef.current) {
            initAutocomplete(addressInputRef);
        }
    }, [isLoaded, initAutocomplete]);

    const handleInputChange = (path, value) => {
        const keys = path.split('.');
        setConfig(prevConfig => {
            const newConfig = JSON.parse(JSON.stringify(prevConfig));
            let temp = newConfig;
            keys.forEach((key, index) => {
                if (index === keys.length - 1) temp[key] = value;
                else {
                    temp[key] = temp[key] || {};
                    temp = temp[key];
                }
            });
            return newConfig;
        });
    };
    
    const handleFileChange = (e) => {
        setFiles(prev => ({ ...prev, [e.target.name]: e.target.files[0] }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        toast.loading('Guardando configuración...');
        try {
            await updateRestaurantConfig(config, files);
            toast.dismiss();
            toast.success('Configuración guardada exitosamente.');
        } catch (error) {
            toast.dismiss();
            toast.error('Error al guardar la configuración.');
            console.error(error);
        } finally {
            setIsSaving(false);
            setFiles({ logo: null, bg: null, loginBg: null });
        }
    };

    const handleDeleteHistory = async () => {
        if (!password) return toast.error("La contraseña es requerida.");
        try {
            await deleteSalesHistory(password);
            toast.success("Historial de ventas borrado exitosamente.");
            setIsDeleteModalOpen(false);
            setPassword('');
        } catch (err) {
            toast.error("Contraseña incorrecta o error al borrar.");
        }
    };
    
    const addPaymentMethod = () => {
        const newMethod = { id: `pm_${Date.now()}`, name: '' };
        const updatedMethods = [...(config.paymentMethods || []), newMethod];
        handleInputChange('paymentMethods', updatedMethods);
    };

    const updatePaymentMethod = (id, newName) => {
        const updatedMethods = (config.paymentMethods || []).map(pm => pm.id === id ? { ...pm, name: newName } : pm);
        handleInputChange('paymentMethods', updatedMethods);
    };

    const removePaymentMethod = (id) => {
        const updatedMethods = (config.paymentMethods || []).filter(pm => pm.id !== id);
        handleInputChange('paymentMethods', updatedMethods);
    };

    if (loading) {
        return <p className="text-center text-gray-400">Cargando configuración...</p>;
    }

    return (
        <div>
            <form onSubmit={handleSave} className="space-y-8">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-bold">Configuración de la Empresa</h2>
                    <button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-bold text-lg transition-colors shadow-lg hover:shadow-blue-500/50">
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-8">
                        <SettingsSection title="Información y Operación">
                            <FormField label="Nombre del Restaurante">
                                <input type="text" value={config.restaurantName || ''} onChange={e => handleInputChange('restaurantName', e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
                            </FormField>
                            <FormField label="Tu Clave de API de Google Maps">
                                <input type="password" value={config.delivery?.googleMapsApiKey || ''} onChange={e => handleInputChange('delivery.googleMapsApiKey', e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                            </FormField>
                             <FormField label="Dirección del Local (para Delivery)">
                                <input ref={addressInputRef} type="text" defaultValue={config.delivery?.address || ''} onBlur={e => handleInputChange('delivery.address', e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                            </FormField>
                             <FormField label="Tarifa de Envío por Kilómetro ($)">
                                <input type="number" step="0.50" value={config.delivery?.ratePerKm || ''} onChange={e => handleInputChange('delivery.ratePerKm', parseFloat(e.target.value) || 0)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                            </FormField>
                        </SettingsSection>
                        <SettingsSection title="Identidad Visual y Tema">
                            <FormField label="Color de Acento Principal">
                                <input type="color" value={config.theme?.primaryColor || '#fbbf24'} onChange={e => handleInputChange('theme.primaryColor', e.target.value)} className="w-full h-12 bg-gray-700 rounded cursor-pointer border border-gray-600"/>
                            </FormField>
                             <FormField label="Logo del Restaurante" description="Recomendado: 128x128px, formato PNG o JPG.">
                                <input type="file" name="logo" accept="image/png, image/jpeg" onChange={handleFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-yellow-400 hover:file:bg-gray-600 cursor-pointer"/>
                            </FormField>
                            <FormField label="Imagen de Fondo (Aplicación)">
                                <input type="file" name="bg" accept="image/png, image/jpeg" onChange={handleFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-yellow-400 hover:file:bg-gray-600 cursor-pointer"/>
                            </FormField>
                            <FormField label="Imagen de Fondo (Login)">
                                <input type="file" name="loginBg" accept="image/png, image/jpeg" onChange={handleFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-yellow-400 hover:file:bg-gray-600 cursor-pointer"/>
                            </FormField>
                        </SettingsSection>
                    </div>
                    <div className="space-y-8">
                        <SettingsSection title="Métodos de Pago">
                            <div className="space-y-3">
                                {(config.paymentMethods || []).map(method => (
                                    <div key={method.id} className="flex items-center gap-2">
                                        <input type="text" value={method.name} onChange={e => updatePaymentMethod(method.id, e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                                        <button type="button" onClick={() => removePaymentMethod(method.id)} className="bg-red-600 p-2 rounded hover:bg-red-700 transition-colors">🗑️</button>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={addPaymentMethod} className="text-blue-400 hover:underline font-semibold w-full text-left">+ Añadir método</button>
                        </SettingsSection>
                        <SettingsSection title="Zona de Peligro">
                            <FormField label="Modo de Prueba" description="Permite descartar turnos de caja sin guardar las ventas.">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={config.testModeEnabled || false} onChange={e => handleInputChange('testModeEnabled', e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>
                            </FormField>
                            <FormField label="Borrar Historial de Ventas" description="Esta acción es irreversible y requiere tu contraseña.">
                                 <button type="button" onClick={() => setIsDeleteModalOpen(true)} className="bg-red-800 hover:bg-red-700 px-4 py-2 rounded font-bold w-full border border-red-600">
                                    Borrar Historial
                                </button>
                            </FormField>
                        </SettingsSection>
                    </div>
                </div>
            </form>
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Borrado de Historial">
                <div className='text-gray-800'>
                    <p className='mb-4'>Esta acción borrará permanentemente todas las órdenes y movimientos. Para confirmar, ingresa tu contraseña de administrador.</p>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border p-2 rounded mb-2" placeholder="Contraseña"/>
                    <div className="flex justify-end gap-2 mt-4">
                        <button onClick={() => setIsDeleteModalOpen(false)} className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded font-bold">Cancelar</button>
                        <button onClick={handleDeleteHistory} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold">Confirmar Borrado</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CompanySettings;

