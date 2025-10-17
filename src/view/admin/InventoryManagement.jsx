import React, { useState, useEffect, useMemo } from 'react';
import { useInventory } from '../../contexts/InventoryContext';
import { useRestaurant } from '../../contexts/RestaurantContext';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import SkeletonLoader from '../../components/SkeletonLoader';

// --- NUEVO: Componente de Iconos para Acciones ---
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
const AccordionToggleIcon = ({ isOpen }) => <svg className={`w-6 h-6 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>;

// --- NUEVO: Componente Acordeón para Grupos ---
const IngredientGroupAccordion = ({ group, children }) => {
    const [isOpen, setIsOpen] = useState(true);
    return (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-4 bg-gray-900 hover:bg-gray-700">
                <h3 className="text-lg font-bold text-yellow-400">{group ? group.name : 'Sin Grupo'}</h3>
                <AccordionToggleIcon isOpen={isOpen} />
            </button>
            {isOpen && <div className="p-4">{children}</div>}
        </div>
    );
};

const InventoryManagement = () => {
    const { ingredients, loading, addIngredient, updateIngredient, deleteIngredient, restockIngredient, recordWaste } = useInventory();
    const { restaurant, addIngredientGroup, updateIngredientGroup, deleteIngredientGroup } = useRestaurant();
    
    // Estados del componente (sin cambios mayores)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIngredient, setEditingIngredient] = useState(null);
    const [form, setForm] = useState({ name: '', unit: 'pieza', stock: 0, lowStockThreshold: 10, groupId: '' });
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [groupName, setGroupName] = useState('');
    const [restockModal, setRestockModal] = useState({ isOpen: false, ingredient: null, quantity: '', totalCost: '' });
    const [wasteModal, setWasteModal] = useState({ isOpen: false, ingredient: null, quantity: '' });

    // Lógica de Skeletons y Modales (sin cambios funcionales, solo estilo)
    const TableSkeleton = () => (
        <div className="space-y-2 mt-4">
            {[...Array(5)].map((_, i) => <SkeletonLoader key={i} className="h-12 w-full" />)}
        </div>
    );
    // ... (El resto de los manejadores de eventos como handleFormSubmit, handleDelete, etc., permanecen igual)
     useEffect(() => {
        if (editingIngredient) {
            setForm({ name: editingIngredient.name, unit: editingIngredient.unit, stock: editingIngredient.stock, lowStockThreshold: editingIngredient.lowStockThreshold || 10, groupId: editingIngredient.groupId || '' });
        } else {
            setForm({ name: '', unit: 'pieza', stock: 0, lowStockThreshold: 10, groupId: '' });
        }
    }, [editingIngredient]);
    const handleGroupSubmit = async (e) => { e.preventDefault(); if (!groupName.trim()) return; try { if (editingGroup) { await updateIngredientGroup(editingGroup.id, groupName); toast.success("Grupo actualizado."); } else { await addIngredientGroup(groupName); toast.success("Grupo creado."); } setIsGroupModalOpen(false); } catch (err) { toast.error("No se pudo guardar el grupo."); }};
    const handleDeleteGroup = (group) => { if (window.confirm(`¿Seguro que quieres eliminar "${group.name}"? Los ingredientes no se borrarán.`)) { deleteIngredientGroup(group); toast.success("Grupo eliminado."); }};
    const handleFormChange = (e) => { const { name, value } = e.target; const isNumber = ['stock', 'lowStockThreshold'].includes(name); setForm(p => ({ ...p, [name]: isNumber ? parseFloat(value) || 0 : value })); };
    const handleFormSubmit = async (e) => { e.preventDefault(); if (!form.groupId) { toast.error("Por favor, asigna un grupo."); return; } try { if (editingIngredient) { await updateIngredient(editingIngredient.id, form); toast.success('Ingrediente actualizado'); } else { await addIngredient(form); toast.success('Ingrediente añadido'); } setIsModalOpen(false); } catch (err) { toast.error("No se pudo guardar."); }};
    const handleDelete = (id) => { if (window.confirm("¿Seguro?")) { deleteIngredient(id); toast.success('Ingrediente eliminado.'); } };
    const handleRestockSubmit = async (e) => { e.preventDefault(); const qty = parseFloat(restockModal.quantity); const cost = parseFloat(restockModal.totalCost); if (isNaN(qty) || isNaN(cost) || qty <= 0) { toast.error("Valores inválidos."); return; } await restockIngredient(restockModal.ingredient.id, qty, cost); toast.success('Stock actualizado'); setRestockModal({ isOpen: false, ingredient: null, quantity: '', totalCost: '' }); };
    const handleWasteSubmit = async (e) => { e.preventDefault(); const qty = parseFloat(wasteModal.quantity); if (isNaN(qty) || qty <= 0) { toast.error("Cantidad inválida."); return; } await recordWaste(wasteModal.ingredient.id, qty); toast.success('Merma registrada.'); setWasteModal({ isOpen: false, ingredient: null, quantity: '' }); };


    const ingredientsByGroup = useMemo(() => {
        const grouped = {};
        (restaurant?.ingredientGroups || []).forEach(g => grouped[g.id] = []);
        grouped['ungrouped'] = []; // Grupo para ingredientes sin asignar

        ingredients.forEach(ing => {
            if (ing.groupId && grouped[ing.groupId]) {
                grouped[ing.groupId].push(ing);
            } else {
                grouped['ungrouped'].push(ing);
            }
        });
        return grouped;
    }, [ingredients, restaurant?.ingredientGroups]);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Gestión de Inventario</h2>
                <div className="flex gap-2">
                    <button onClick={() => setIsGroupModalOpen(true)} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-bold">Gestionar Grupos</button>
                    <button onClick={() => { setEditingIngredient(null); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-bold">+ Nuevo Ingrediente</button>
                </div>
            </div>

            {loading ? <TableSkeleton/> : (
                <div className="space-y-4">
                    {restaurant?.ingredientGroups?.map(group => (
                        <IngredientGroupAccordion key={group.id} group={group}>
                            <IngredientTable 
                                ingredients={ingredientsByGroup[group.id] || []}
                                setRestockModal={setRestockModal}
                                setWasteModal={setWasteModal}
                                setEditingIngredient={setEditingIngredient}
                                setIsModalOpen={setIsModalOpen}
                                handleDelete={handleDelete}
                            />
                        </IngredientGroupAccordion>
                    ))}
                    {(ingredientsByGroup['ungrouped'] || []).length > 0 && (
                        <IngredientGroupAccordion group={null}>
                            <IngredientTable 
                                ingredients={ingredientsByGroup['ungrouped']}
                                setRestockModal={setRestockModal}
                                setWasteModal={setWasteModal}
                                setEditingIngredient={setEditingIngredient}
                                setIsModalOpen={setIsModalOpen}
                                handleDelete={handleDelete}
                            />
                        </IngredientGroupAccordion>
                    )}
                </div>
            )}
            
            {/* --- MODALES --- */}
            <Modal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} title="Gestionar Grupos de Ingredientes">
                <div className="space-y-3">
                    {restaurant?.ingredientGroups?.map(g => (
                        <div key={g.id} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                           <span className="font-semibold text-gray-800">{g.name}</span>
                           <div className="flex gap-2">
                               <button onClick={() => {setEditingGroup(g); setGroupName(g.name);}} className="text-blue-600 hover:text-blue-800"><EditIcon/></button>
                               <button onClick={() => handleDeleteGroup(g)} className="text-red-600 hover:text-red-800"><DeleteIcon/></button>
                           </div>
                        </div>
                    ))}
                </div>
                <form onSubmit={handleGroupSubmit} className="mt-4 pt-4 border-t">
                    <h4 className="font-bold text-gray-800 mb-2">{editingGroup ? 'Editando Grupo' : 'Crear Nuevo Grupo'}</h4>
                    <div className="flex gap-2">
                        <input value={groupName} onChange={(e) => setGroupName(e.target.value)} className="flex-grow border p-2 rounded" placeholder="Nombre del grupo" required />
                        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded font-semibold">Guardar</button>
                        {editingGroup && <button type="button" onClick={() => {setEditingGroup(null); setGroupName('');}} className="bg-gray-300 px-4 py-2 rounded">Cancelar</button>}
                    </div>
                </form>
            </Modal>
            
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingIngredient ? "Editar Ingrediente" : "Nuevo Ingrediente"}>
                 <form onSubmit={handleFormSubmit} className="space-y-4 text-gray-800">
                    <div><label className="font-semibold">Nombre</label><input name="name" value={form.name} onChange={handleFormChange} className="w-full border p-2 rounded mt-1" required /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="font-semibold">Unidad</label><select name="unit" value={form.unit} onChange={handleFormChange} className="w-full border p-2 rounded mt-1"><option value="kg">kg</option><option value="g">g</option><option value="L">L</option><option value="ml">ml</option><option value="pieza">pieza</option></select></div>
                        <div><label className="font-semibold">Grupo</label><select name="groupId" value={form.groupId} onChange={handleFormChange} className="w-full border p-2 rounded mt-1" required><option value="">Seleccionar...</option>{restaurant?.ingredientGroups?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="font-semibold">Stock Actual</label><input name="stock" type="number" step="0.01" value={form.stock} onChange={handleFormChange} className="w-full border p-2 rounded mt-1" required /></div>
                        <div><label className="font-semibold">Alerta Stock Bajo</label><input name="lowStockThreshold" type="number" step="0.01" value={form.lowStockThreshold} onChange={handleFormChange} className="w-full border p-2 rounded mt-1" required /></div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t"><button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-200 px-4 py-2 rounded font-semibold">Cancelar</button><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-semibold">Guardar</button></div>
                </form>
            </Modal>

            <Modal isOpen={restockModal.isOpen} onClose={() => setRestockModal({ isOpen: false, ingredient: null })} title={`Resurtir: ${restockModal.ingredient?.name}`}><form onSubmit={handleRestockSubmit} className="space-y-4 text-gray-800"><div><label className="font-semibold">Cantidad Añadida</label><input type="number" step="0.01" value={restockModal.quantity} onChange={(e) => setRestockModal(p => ({...p, quantity: e.target.value}))} className="w-full border p-2 rounded mt-1" required /></div><div><label className="font-semibold">Costo Total</label><input type="number" step="0.01" value={restockModal.totalCost} onChange={(e) => setRestockModal(p => ({...p, totalCost: e.target.value}))} className="w-full border p-2 rounded mt-1" required /></div><div className="flex justify-end gap-2 pt-4 border-t"><button type="button" onClick={() => setRestockModal({ isOpen: false, ingredient: null })} className="bg-gray-200 px-4 py-2 rounded font-semibold">Cancelar</button><button type="submit" className="bg-green-600 text-white px-4 py-2 rounded font-semibold">Confirmar</button></div></form></Modal>
            <Modal isOpen={wasteModal.isOpen} onClose={() => setWasteModal({ isOpen: false, ingredient: null })} title={`Registrar Merma: ${wasteModal.ingredient?.name}`}><form onSubmit={handleWasteSubmit} className="space-y-4 text-gray-800"><div><label className="font-semibold">Cantidad Perdida</label><input type="number" step="0.01" value={wasteModal.quantity} onChange={(e) => setWasteModal(p => ({...p, quantity: e.target.value}))} className="w-full border p-2 rounded mt-1" required /></div><div className="flex justify-end gap-2 pt-4 border-t"><button type="button" onClick={() => setWasteModal({ isOpen: false, ingredient: null })} className="bg-gray-200 px-4 py-2 rounded font-semibold">Cancelar</button><button type="submit" className="bg-orange-500 text-white px-4 py-2 rounded font-semibold">Confirmar</button></div></form></Modal>

        </div>
    );
};


// --- NUEVO: Componente Tabla de Ingredientes ---
const IngredientTable = ({ ingredients, setRestockModal, setWasteModal, setEditingIngredient, setIsModalOpen, handleDelete }) => {
    if (ingredients.length === 0) {
        return <p className="text-gray-400 text-center py-4">No hay ingredientes en este grupo.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-gray-700 text-sm text-gray-400">
                        <th className="p-2">Nombre</th>
                        <th className="p-2">Stock</th>
                        <th className="p-2">Costo Unitario</th>
                        <th className="p-2 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {ingredients.map(ing => {
                        const stockPercentage = ing.lowStockThreshold > 0 ? (ing.stock / (ing.lowStockThreshold * 2)) * 100 : 100;
                        let stockColor = 'bg-green-500';
                        if (ing.stock <= 0) stockColor = 'bg-red-700';
                        else if (ing.stock <= ing.lowStockThreshold) stockColor = 'bg-red-500';
                        else if (ing.stock <= ing.lowStockThreshold * 1.5) stockColor = 'bg-yellow-500';

                        return (
                            <tr key={ing.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="p-3 font-semibold">{ing.name}</td>
                                <td className="p-3">
                                    <div className="flex flex-col">
                                        <span>{ing.stock.toFixed(2)} {ing.unit}</span>
                                        <div className="w-full bg-gray-600 rounded-full h-1.5 mt-1">
                                            <div className={`${stockColor} h-1.5 rounded-full`} style={{ width: `${Math.min(stockPercentage, 100)}%` }}></div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-3">${(ing.unitCost || 0).toFixed(2)}</td>
                                <td className="p-3">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setRestockModal({ isOpen: true, ingredient: ing, quantity: '', totalCost: ''})} className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600">Resurtir</button>
                                        <button onClick={() => setWasteModal({ isOpen: true, ingredient: ing, quantity: '' })} className="bg-orange-500 text-white p-2 rounded-lg hover:bg-orange-600">Merma</button>
                                        <button onClick={() => { setEditingIngredient(ing); setIsModalOpen(true); }} className="text-blue-400 hover:text-blue-300 p-2"><EditIcon/></button>
                                        <button onClick={() => handleDelete(ing.id)} className="text-red-400 hover:text-red-300 p-2"><DeleteIcon/></button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};


export default InventoryManagement;
