import React, { useState, useRef, useEffect, useCallback } from 'react';

const DraggableModal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    const modalRef = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const offset = useRef({ x: 0, y: 0 });

    // Efecto para centrar el modal al abrirse
    useEffect(() => {
        if (isOpen && modalRef.current) {
            const { innerWidth, innerHeight } = window;
            const { offsetWidth, offsetHeight } = modalRef.current;
            setPosition({
                x: (innerWidth - offsetWidth) / 2,
                y: (innerHeight - offsetHeight) / 3,
            });
        }
    }, [isOpen]);

    const handleMouseDown = useCallback((e) => {
        // Solo iniciar el arrastre desde el header
        if (modalRef.current && e.target.classList.contains('modal-header')) {
            setIsDragging(true);
            const modalRect = modalRef.current.getBoundingClientRect();
            offset.current = {
                x: e.clientX - modalRect.left,
                y: e.clientY - modalRect.top,
            };
        }
    }, []);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging) return;
        e.preventDefault();
        setPosition({
            x: e.clientX - offset.current.x,
            y: e.clientY - offset.current.y,
        });
    }, [isDragging]);

    // Efecto para añadir y limpiar los event listeners
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        // Función de limpieza que se ejecuta cuando el componente se desmonta o isDragging cambia
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
            <div
                ref={modalRef}
                className="absolute bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-300"
                style={{ top: `${position.y}px`, left: `${position.x}px`, touchAction: 'none' }} // touch-action para mejor rendimiento en móviles
            >
                <div
                    className="modal-header p-4 bg-gray-100 rounded-t-xl cursor-move flex justify-between items-center border-b"
                    onMouseDown={handleMouseDown}
                >
                    <h2 className="text-lg font-semibold text-gray-800 select-none">{title}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-2xl">&times;</button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default DraggableModal;

