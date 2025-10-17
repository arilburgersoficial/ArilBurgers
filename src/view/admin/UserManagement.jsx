import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/Modal';

const UserManagement = () => {
    const { usersList, fetchUsers, updateUserRole, deleteUserRecord } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [action, setAction] = useState({ type: null, userId: null, newRole: null, message: '' });

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);
    
    // Función de utilidad para abrir el modal de confirmación
    const openConfirmModal = (type, userId, newRole = null) => {
        const user = usersList.find(u => u.id === userId);
        if (!user) return;
        
        let message = '';
        if (type === 'role') {
            message = `¿Estás seguro de que quieres cambiar el rol de ${user.email} a "${newRole}"?`;
        } else if (type === 'delete') {
            message = `ADVERTENCIA: ¿Estás seguro de que quieres **eliminar permanentemente** al usuario ${user.email} del sistema? Esta acción no se puede deshacer.`;
        }

        setAction({ type, userId, newRole, message });
        setIsModalOpen(true);
    };

    const handleConfirm = () => {
        setIsModalOpen(false);
        if (action.type === 'role' && action.newRole) {
            updateUserRole(action.userId, action.newRole);
        } else if (action.type === 'delete') {
            deleteUserRecord(action.userId);
        }
        setAction({ type: null, userId: null, newRole: null, message: '' });
    };

    const handleRoleChange = (uid, newRole) => {
        // Abrir modal solo si el rol cambia realmente
        const user = usersList.find(u => u.id === uid);
        if (user && user.role !== newRole) {
            openConfirmModal('role', uid, newRole);
        }
    };

    const handleDeleteUser = (uid) => {
        openConfirmModal('delete', uid);
    };
    
    return (
        <div>
            <h2 className="text-2xl font-bold mb-4">Gestión de Usuarios</h2>
            <div className="bg-blue-900/20 border border-blue-500 text-blue-300 p-3 rounded-lg mb-6 text-sm">
                <strong>Nota:</strong> Los nuevos usuarios deben registrarse primero a través de la pantalla de inicio de sesión. Una vez registrados, aparecerán en esta lista para que se les pueda asignar un rol.
            </div>
            <div className="space-y-2">
                {usersList.map(user => (
                    <div key={user.id} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                        <div>
                            <p className="font-bold">{user.email}</p>
                            <p className="text-xs text-gray-400">ID: {user.id}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <select 
                                value={user.role} 
                                onChange={(e) => handleRoleChange(user.id, e.target.value)} 
                                className="bg-gray-800 p-2 rounded text-white"
                            >
                                <option value="admin">Administrador</option>
                                <option value="empleado">Empleado</option>
                            </select>
                            <button 
                                onClick={() => handleDeleteUser(user.id)} 
                                className="bg-red-600 hover:bg-red-700 px-3 py-2 rounded font-bold text-sm"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal de Confirmación */}
            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                title={action.type === 'delete' ? 'Confirmar Eliminación' : 'Confirmar Cambio de Rol'}
            >
                <div className="text-gray-800">
                    <p className="mb-6" dangerouslySetInnerHTML={{ __html: action.message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => setIsModalOpen(false)} 
                            className="bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-400"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleConfirm} 
                            className={`font-bold py-2 px-4 rounded-lg ${action.type === 'delete' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                            {action.type === 'delete' ? 'Sí, Eliminar' : 'Sí, Cambiar'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default UserManagement;
