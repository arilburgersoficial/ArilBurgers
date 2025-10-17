import React, { useState, useEffect, useMemo } from 'react';
import { useRestaurant } from '../../contexts/RestaurantContext';
import { useCategories } from '../../hooks/useCategories';
import { useProducts } from '../../hooks/useProducts';
import { useInventory } from '../../contexts/InventoryContext';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';

const MenuManagement = () => {
    const { restaurant, uploadImage } = useRestaurant();
    const { addCategory, updateCategory, deleteCategory } = useCategories();
    const { addProduct, updateProduct, deleteProduct } = useProducts();
    const { ingredients } = useInventory();
    
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryName, setCategoryName] = useState('');

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [productForm, setProductForm] = useState({ name: '', description: '', price: 0, image: '', categoryId: '', recipe: [], isHiddenInPOS: false });
    const [recipeIngredient, setRecipeIngredient] = useState({ id: '', quantity: '' });
    const [imageFile, setImageFile] = useState(null);
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

    const filteredProducts = useMemo(() => {
        if (!restaurant?.products) return [];
        if (selectedCategoryFilter === 'all') return restaurant.products;
        return restaurant.products.filter(p => p.categoryId == selectedCategoryFilter);
    }, [selectedCategoryFilter, restaurant?.products]);

    const openCategoryModalForNew = () => {
        setEditingCategory(null);
        setCategoryName('');
        setIsCategoryModalOpen(true);
    };
    const openCategoryModalForEdit = (category) => {
        setEditingCategory(category);
        setCategoryName(category.name);
        setIsCategoryModalOpen(true);
    };

    const handleCategorySubmit = async (e) => {
        e.preventDefault();
        if (editingCategory) {
            await updateCategory(editingCategory.id, categoryName);
        } else {
            await addCategory(categoryName);
        }
        setIsCategoryModalOpen(false);
    };

    const handleDeleteCategory = (categoryId, categoryName) => {
        deleteCategory(categoryId, categoryName);
    };

    useEffect(() => {
        if (editingProduct) {
            setProductForm({ ...editingProduct });
        } else {
            setProductForm({ name: '', description: '', price: 0, image: '', categoryId: restaurant?.categories?.[0]?.id || '', recipe: [], isHiddenInPOS: false });
        }
        setImageFile(null);
    }, [editingProduct, restaurant?.categories]);
    
    const handleProductFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setProductForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    
    const handleProductFormSubmit = async (e) => {
        e.preventDefault();
        const toastId = toast.loading('Guardando producto...');
        try {
            let imageUrl = editingProduct?.image || '';
            if (imageFile) {
                imageUrl = await uploadImage(imageFile, 'products');
            }
            const price = parseFloat(productForm.price);
            if (isNaN(price)) { 
                toast.error("El precio debe ser un número.", { id: toastId }); 
                return; 
            }
            const productData = { ...productForm, price, image: imageUrl };

            if (editingProduct) {
                await updateProduct(editingProduct.id, productData);
            } else {
                await addProduct(productData);
            }
            toast.success('Producto guardado.', { id: toastId });
            setIsProductModalOpen(false);
            setEditingProduct(null);
        } catch (err) {
            toast.error("Error al guardar.", { id: toastId });
        }
    };

    const handleAddIngredientToRecipe = () => {
        const { id, quantity } = recipeIngredient;
        const qty = parseFloat(quantity);
        if (!id || isNaN(qty) || qty <= 0) { toast.error("Selecciona un ingrediente y una cantidad válida."); return; }
        if (productForm.recipe?.find(ing => ing.id === id)) { toast.error("Este ingrediente ya está en la receta."); return; }
        setProductForm(prev => ({ ...prev, recipe: [...(prev.recipe || []), { id, quantity: qty }] }));
        setRecipeIngredient({ id: '', quantity: '' });
    };

    const handleRemoveIngredientFromRecipe = (ingredientId) => {
        setProductForm(prev => ({ ...prev, recipe: prev.recipe.filter(ing => ing.id !== ingredientId) }));
    };
    
    const openProductModalForNew = () => { setEditingProduct(null); setIsProductModalOpen(true); };
    const openProductModalForEdit = (product) => { setEditingProduct(product); setIsProductModalOpen(true); };
    const handleDeleteProduct = (productId) => { deleteProduct(productId); };
    
    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Gestión de Menús</h2>
            <div className="bg-gray-900 p-4 rounded-lg mb-6">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xl font-semibold">Categorías del Menú</h3>
                    <button onClick={openCategoryModalForNew} className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold">Nueva Categoría</button>
                </div>
                <div className="space-y-2">
                    {restaurant?.categories?.map(cat => (
                        <div key={cat.id} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                            <p className="font-bold">{cat.name}</p>
                            <div className="flex gap-2">
                                <button onClick={() => openCategoryModalForEdit(cat)} className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-3 py-1 rounded text-sm font-bold">Editar</button>
                                <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm font-bold">Eliminar</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-gray-900 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xl font-semibold">Productos</h3>
                    <select value={selectedCategoryFilter} onChange={(e) => setSelectedCategoryFilter(e.target.value)} className="bg-gray-700 p-2 rounded">
                        <option value="all">Todas las categorías</option>
                        {restaurant?.categories?.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                    <button onClick={openProductModalForNew} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold">+ Nuevo Producto</button>
                </div>
                <div className="space-y-2">
                    {filteredProducts.map(prod => (
                        <div key={prod.id} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <img src={prod.image || 'https://placehold.co/64x64?text=?'} alt={prod.name} className="w-12 h-12 rounded-md object-cover"/>
                                <div>
                                    <p className="font-bold">{prod.name}</p>
                                    <p className="text-sm text-gray-400">${(prod.price || 0).toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => openProductModalForEdit(prod)} className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 px-3 py-1 rounded text-sm font-bold">Editar</button>
                                <button onClick={() => handleDeleteProduct(prod.id)} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm font-bold">Eliminar</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title={editingCategory ? "Editar Categoría" : "Nueva Categoría"}>
                <form onSubmit={handleCategorySubmit} className="space-y-4 text-gray-800"><label className="block mb-1">Nombre de la Categoría</label><input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="w-full border p-2 rounded" required autoFocus/><div className="flex justify-end gap-2"><button type="button" onClick={() => setIsCategoryModalOpen(false)}>Cancelar</button><button type="submit">Guardar</button></div></form>
            </Modal>
            
            <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}>
                <form onSubmit={handleProductFormSubmit} className="space-y-4 text-gray-800 max-h-[80vh] overflow-y-auto pr-2">
                    <div><label className="block mb-1">Nombre</label><input name="name" value={productForm.name} onChange={handleProductFormChange} className="w-full border p-2 rounded" required /></div>
                    <div><label className="block mb-1">Descripción</label><textarea name="description" value={productForm.description} onChange={handleProductFormChange} className="w-full border p-2 rounded" /></div>
                    <div><label className="block mb-1">Precio</label><input name="price" type="number" step="0.01" value={productForm.price} onChange={handleProductFormChange} className="w-full border p-2 rounded" required /></div>
                    <div><label className="block mb-1">Imagen del Producto</label><input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="w-full bg-gray-100 p-2 rounded file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/></div>
                    <div><label className="block mb-1">Categoría</label><select name="categoryId" value={productForm.categoryId} onChange={handleProductFormChange} className="w-full border p-2 rounded" required>{restaurant?.categories?.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}</select></div>
                    <div className="flex items-center gap-2"><input type="checkbox" id="isHiddenInPOS" name="isHiddenInPOS" checked={productForm.isHiddenInPOS || false} onChange={handleProductFormChange} className="h-4 w-4 rounded"/><label htmlFor="isHiddenInPOS">Oculto en el menú POS</label></div>
                    <div className="border-t pt-4">
                        <h4 className="text-lg font-semibold mb-2">Receta</h4>
                        <div className="space-y-2 mb-3">
                            {productForm.recipe?.map(ing => {
                                const ingredientDetails = ingredients.find(i => i.id === ing.id);
                                return ( <div key={ing.id} className="flex justify-between items-center bg-gray-100 p-2 rounded"> <span className="font-semibold">{ingredientDetails?.name || 'Ingrediente no encontrado'}</span> <div className='flex items-center gap-2'> <span>{ing.quantity} {ingredientDetails?.unit}</span> <button type="button" onClick={() => handleRemoveIngredientFromRecipe(ing.id)} className="text-red-500 font-bold">×</button> </div> </div> );
                            })}
                        </div>
                        <div className="flex gap-2 items-center bg-gray-200 p-2 rounded">
                            <select value={recipeIngredient.id} onChange={(e) => setRecipeIngredient(p => ({...p, id: e.target.value}))} className="flex-grow border p-2 rounded"><option value="">Seleccionar ingrediente...</option>{ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}</select>
                            <input type="number" placeholder="Cant." value={recipeIngredient.quantity} onChange={(e) => setRecipeIngredient(p => ({...p, quantity: e.target.value}))} className="w-20 border p-2 rounded" />
                            <button type="button" onClick={handleAddIngredientToRecipe} className="bg-green-500 text-white px-3 py-2 rounded">+</button>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t"><button type="button" onClick={() => setIsProductModalOpen(false)} className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded">Cancelar</button><button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Guardar</button></div>
                </form>
            </Modal>
        </div>
    );
};

export default MenuManagement;

