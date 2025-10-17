import React, { useState, useEffect } from 'react';
import { useRestaurant } from '../../contexts/RestaurantContext';
import { usePromotions } from '../../hooks/usePromotions';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const PromotionManagement = () => {
    const { restaurant, uploadImage } = useRestaurant();
    const { addPromotion, updatePromotion, deletePromotion } = usePromotions();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPromo, setEditingPromo] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    
    const initialFormState = { name: '', description: '', type: 'percentage', discountValue: 0, appliesTo: 'product', targetId: '', startDate: '', endDate: '', image: null, requiredQuantity: 2 };
    const [form, setForm] = useState(initialFormState);

    useEffect(() => {
        if (editingPromo) {
            setForm({ ...initialFormState, ...editingPromo });
        } else {
            const defaultTargetId = restaurant?.products?.filter(p => !p.isHiddenInPOS)[0]?.id || '';
            setForm({...initialFormState, appliesTo: 'product', targetId: defaultTargetId});
        }
        setImageFile(null);
    }, [editingPromo, restaurant]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        const isNumber = ['discountValue', 'requiredQuantity'].includes(name);
        let newForm = { ...form, [name]: isNumber ? parseFloat(value) || 0 : value };
        if (name === 'type' && value === 'quantity') { newForm.appliesTo = 'product'; }
        setForm(newForm);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!form.targetId) { return toast.error('Debes seleccionar un producto o categoría.'); }
        
        const toastId = toast.loading('Guardando promoción...');
        try {
            let imageUrl = editingPromo?.image || null;
            if (imageFile) {
                imageUrl = await uploadImage(imageFile, 'promotions');
            }
            const promoData = form.type === 'bogo' ? { ...form, discountValue: 0, image: imageUrl } : { ...form, image: imageUrl };

            if (editingPromo) {
                await updatePromotion(editingPromo.id, promoData);
            } else {
                await addPromotion(promoData);
            }
            toast.success('Promoción guardada.', { id: toastId });
            setIsModalOpen(false);
            setEditingPromo(null);
        } catch(err) {
            toast.error("Error al guardar.", { id: toastId });
        }
    };

    // --- CORRECCIÓN CLAVE ---
    // Se pasa el objeto de promoción completo con el estado 'isActive' actualizado.
    // Esto evita que 'updatePromotion' resetee otros campos a sus valores por defecto.
    const toggleActive = (promo) => {
        updatePromotion(promo.id, { ...promo, isActive: !promo.isActive });
    };

    const handleDelete = (promoId, promoName) => { 
        deletePromotion(promoId, promoName);
    };
    
    const getTargetName = (promo) => {
        if (promo.appliesTo === 'category') return restaurant?.categories?.find(c => c.id == promo.targetId)?.name || 'N/A';
        return restaurant?.products?.find(p => p.id == promo.targetId)?.name || 'N/A';
    };

    const getPromoStatus = (promo) => {
        const now = new Date();
        const startDate = promo.startDate ? new Date(promo.startDate) : null;
        const endDate = promo.endDate ? new Date(promo.endDate) : null;
        if (startDate) startDate.setHours(0,0,0,0);
        if (endDate) {
            endDate.setHours(23, 59, 59, 999);
            if (now > endDate) return { text: 'Expirada', color: 'bg-gray-500' };
        }
        if (startDate && now < startDate) return { text: 'Programada', color: 'bg-blue-500' };
        if (promo.isActive) return { text: 'Activa', color: 'bg-green-600' };
        return { text: 'Inactiva', color: 'bg-red-600' };
    };
    
    const getPromoDescription = (promo) => {
        const targetName = `"${getTargetName(promo)}"`;
        switch(promo.type) {
            case 'percentage': return `${promo.discountValue || 0}% DCTO en ${targetName}`;
            case 'fixed': return `$${(promo.discountValue || 0).toFixed(2)} DCTO en ${targetName}`;
            case 'bogo': return `2x1 en ${targetName}`;
            case 'quantity': return `Compra ${promo.requiredQuantity} de ${targetName} y obtén $${(promo.discountValue || 0).toFixed(2)} DCTO`;
            default: return promo.description || '';
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Gestión de Promociones</h2>
                <button onClick={() => { setEditingPromo(null); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold">+ Nueva Promoción</button>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg space-y-2">
                {restaurant?.promotions?.map(promo => {
                    const status = getPromoStatus(promo);
                    return (
                        <div key={promo.id} className="bg-gray-700 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <img src={promo.image || 'https://placehold.co/100x100?text=Promo'} alt={promo.name} className="w-16 h-16 rounded-md object-cover"/>
                                <div className="flex-grow">
                                    <p className="font-bold">{promo.name}</p>
                                    <p className="text-sm text-yellow-400">{getPromoDescription(promo)}</p>
                                </div>
                            </div>
                            <div className="flex items-center flex-wrap justify-end gap-2 w-full sm:w-auto">
                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${status.color}`}>{status.text}</span>
                                <button onClick={() => toggleActive(promo)} className="bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded text-sm font-bold">{promo.isActive ? 'Desactivar' : 'Activar'}</button>
                                <button onClick={() => { setEditingPromo(promo); setIsModalOpen(true); }} className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-3 py-1 rounded text-sm font-bold">Editar</button>
                                <button onClick={() => handleDelete(promo.id, promo.name)} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm font-bold">Eliminar</button>
                            </div>
                        </div>
                    )
                })}
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPromo ? "Editar Promoción" : "Nueva Promoción"}>
                <form onSubmit={handleFormSubmit} className="space-y-4 text-gray-800 max-h-[80vh] overflow-y-auto p-1">
                    <div><label className="block">Nombre</label><input name="name" value={form.name} onChange={handleFormChange} className="w-full border p-2 rounded" required /></div>
                    <div><label className="block">Descripción</label><textarea name="description" value={form.description} onChange={handleFormChange} className="w-full border p-2 rounded" /></div>
                    <div><label className="block">Imagen</label><input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="w-full bg-gray-100 p-2 rounded file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block">Fecha de Inicio (Opcional)</label><input type="date" name="startDate" value={form.startDate} onChange={handleFormChange} className="w-full border p-2 rounded"/></div>
                        <div><label className="block">Fecha de Fin (Opcional)</label><input type="date" name="endDate" value={form.endDate} onChange={handleFormChange} className="w-full border p-2 rounded"/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block">Tipo de Descuento</label>
                            <select name="type" value={form.type} onChange={handleFormChange} className="w-full border p-2 rounded">
                                <option value="percentage">Porcentaje</option>
                                <option value="fixed">Monto Fijo</option>
                                <option value="bogo">Especial (2x1)</option>
                                <option value="quantity">Por Cantidad</option>
                            </select>
                        </div>
                        <div>
                            <label className="block">Valor ({form.type === 'percentage' ? '%' : '$'})</label>
                            <input name="discountValue" type="number" step="0.01" value={form.discountValue} onChange={handleFormChange} className="w-full border p-2 rounded disabled:bg-gray-200" required disabled={form.type === 'bogo'} />
                        </div>
                    </div>
                    {form.type === 'quantity' && (
                        <div className="grid grid-cols-2 gap-4">
                             <div><label className="block">Cantidad Requerida</label><input name="requiredQuantity" type="number" value={form.requiredQuantity} onChange={handleFormChange} className="w-full border p-2 rounded"/></div>
                            <div><label className="block">Producto Aplicable</label><select name="targetId" value={form.targetId} onChange={handleFormChange} className="w-full border p-2 rounded" required>{restaurant?.products?.filter(p => !p.isHiddenInPOS).map(prod => <option key={prod.id} value={prod.id}>{prod.name}</option>)}</select></div>
                        </div>
                    )}
                    {form.type !== 'quantity' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block">Aplica a</label><select name="appliesTo" value={form.appliesTo} onChange={handleFormChange} className="w-full border p-2 rounded"><option value="category">Categoría</option><option value="product">Producto</option></select></div>
                            <div>
                                <label className="block">Selección</label>
                                <select name="targetId" value={form.targetId} onChange={handleFormChange} className="w-full border p-2 rounded" required>
                                    {form.appliesTo === 'category' ? 
                                        restaurant?.categories?.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>) :
                                        restaurant?.products?.filter(p => !p.isHiddenInPOS).map(prod => <option key={prod.id} value={prod.id}>{prod.name}</option>)
                                    }
                                </select>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={() => setIsModalOpen(false)} className="bg-gray-300 px-4 py-2 rounded-lg font-bold">Cancelar</button><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Guardar</button></div>
                </form>
            </Modal>
        </div>
    );
};

export default PromotionManagement;

