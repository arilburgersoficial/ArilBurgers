import React, { useState } from 'react';
import { useRestaurant } from '../../contexts/RestaurantContext';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const LayoutManagement = () => {
    const { restaurant, addZone, updateZone, deleteZone, addTable, updateTable, deleteTable } = useRestaurant();
    const layout = restaurant?.layout || [];

    const [zoneModal, setZoneModal] = useState({ isOpen: false, zone: null });
    const [tableModal, setTableModal] = useState({ isOpen: false, table: null, zoneId: null });
    const [zoneName, setZoneName] = useState('');
    const [tableName, setTableName] = useState('');

    const openZoneModal = (zone = null) => {
        setZoneName(zone ? zone.name : '');
        setZoneModal({ isOpen: true, zone });
    };

    const handleZoneSubmit = () => {
        if (!zoneName.trim()) return toast.error('El nombre del salón no puede estar vacío.');
        if (zoneModal.zone) {
            updateZone(zoneModal.zone.id, { name: zoneName });
            toast.success('Salón actualizado.');
        } else {
            addZone(zoneName);
            toast.success('Salón creado.');
        }
        setZoneModal({ isOpen: false, zone: null });
    };

    const openTableModal = (zoneId, table = null) => {
        setTableName(table ? table.name : '');
        setTableModal({ isOpen: true, table, zoneId });
    };

    const handleTableSubmit = () => {
        if (!tableName.trim()) return toast.error('El nombre de la mesa no puede estar vacío.');
        if (tableModal.table) {
            updateTable(tableModal.zoneId, tableModal.table.id, { name: tableName });
            toast.success('Mesa actualizada.');
        } else {
            addTable(tableModal.zoneId, tableName);
            toast.success('Mesa añadida.');
        }
        setTableModal({ isOpen: false, table: null, zoneId: null });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Gestión de Salones y Mesas</h2>
                <button onClick={() => openZoneModal()} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold">
                    + Añadir Salón
                </button>
            </div>

            {layout.length === 0 ? (
                <div className="text-center bg-gray-900 p-8 rounded-lg">
                    <p className="text-xl text-gray-400">Aún no has creado ningún salón.</p>
                    <p className="text-gray-500 mt-2">Haz clic en "Añadir Salón" para empezar a configurar tu restaurante.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {layout.map(zone => (
                        <div key={zone.id} className="bg-gray-900 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-semibold text-yellow-400">{zone.name}</h3>
                                <div>
                                    <button onClick={() => openZoneModal(zone)} className="text-yellow-500 hover:text-yellow-300 mr-4 font-semibold">Editar Salón</button>
                                    <button onClick={() => {if(window.confirm(`¿Seguro que quieres eliminar el salón "${zone.name}" y todas sus mesas?`)) deleteZone(zone.id)}} className="text-red-500 hover:text-red-300 font-semibold">Eliminar Salón</button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                                {zone.tables.map(table => (
                                    <div key={table.id} className="group relative bg-gray-700 p-4 rounded-lg flex flex-col items-center justify-center aspect-square shadow-md">
                                        <span className="text-2xl font-bold">{table.name}</span>
                                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                            <button onClick={() => openTableModal(zone.id, table)} className="text-sm bg-yellow-600 p-2 rounded-full hover:bg-yellow-700 transition-colors">✏️</button>
                                            <button onClick={() => {if(window.confirm(`¿Eliminar la mesa "${table.name}"?`)) deleteTable(zone.id, table.id)}} className="text-sm bg-red-600 p-2 rounded-full hover:bg-red-700 transition-colors">🗑️</button>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={() => openTableModal(zone.id)} className="border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center aspect-square text-gray-500 hover:bg-gray-700 hover:text-white transition-all">
                                    <span className="text-4xl font-light">+</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal para Salones */}
            <Modal isOpen={zoneModal.isOpen} onClose={() => setZoneModal({ isOpen: false, zone: null })} title={zoneModal.zone ? 'Editar Salón' : 'Nuevo Salón'}>
                <div className="text-gray-800">
                    <label className="block mb-2 font-semibold">Nombre del Salón</label>
                    <input value={zoneName} onChange={(e) => setZoneName(e.target.value)} className="w-full border p-2 rounded" placeholder="Ej: Terraza, Planta Alta"/>
                    <div className="flex justify-end gap-2 mt-4">
                        <button onClick={() => setZoneModal({isOpen: false, zone: null})} className="bg-gray-300 px-4 py-2 rounded font-bold hover:bg-gray-400">Cancelar</button>
                        <button onClick={handleZoneSubmit} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700">Guardar</button>
                    </div>
                </div>
            </Modal>

            {/* Modal para Mesas */}
            <Modal isOpen={tableModal.isOpen} onClose={() => setTableModal({ isOpen: false, table: null, zoneId: null })} title={tableModal.table ? 'Editar Mesa' : 'Nueva Mesa'}>
                 <div className="text-gray-800">
                    <label className="block mb-2 font-semibold">Nombre o Número de Mesa</label>
                    <input value={tableName} onChange={(e) => setTableName(e.target.value)} className="w-full border p-2 rounded" placeholder="Ej: M5, 12, VIP"/>
                     <div className="flex justify-end gap-2 mt-4">
                        <button onClick={() => setTableModal({isOpen: false, table: null, zoneId: null})} className="bg-gray-300 px-4 py-2 rounded font-bold hover:bg-gray-400">Cancelar</button>
                        <button onClick={handleTableSubmit} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700">Guardar</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default LayoutManagement;

