
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../services/database';
import { Status, Format, TeacherRole, Program, Faculty } from '../types';
import { EditIcon, TrashIcon, PlusIcon } from '../components/Icons';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { useAuth } from '../contexts/AuthContext';

type EntityType = 'status' | 'format' | 'role' | 'program' | 'faculty';
type Entity = Status | Format | TeacherRole | Program | Faculty;

interface SettingsListProps<T extends Entity> {
    title: string;
    items: T[];
    placeholder: string;
    faculties?: Faculty[];
    onAdd: (name: string, extraId?: string) => void;
    onUpdate: (item: T) => void;
    onDelete: (item: T) => void;
    onReorder: (items: T[]) => void;
    isLoading?: boolean;
    type: EntityType;
}

const SettingsList = <T extends {id: string; name: string, facultyId?: string, sortOrder?: number}>({ 
    title, items, placeholder, faculties, onAdd, onUpdate, onDelete, onReorder, isLoading, type 
}: SettingsListProps<T>) => {
    const { isAdmin } = useAuth();
    const [newItemName, setNewItemName] = useState('');
    const [selectedFacultyId, setSelectedFacultyId] = useState('');
    const [editingItem, setEditingItem] = useState<T | null>(null);
    const [isManualOrder, setIsManualOrder] = useState(false);

    // Determinar si los items ya tienen un orden personalizado para activar el modo manual por defecto
    useEffect(() => {
        if (items && items.length > 0) {
            const hasCustomOrder = items.some(item => item.sortOrder !== undefined && item.sortOrder < 99);
            if (hasCustomOrder) setIsManualOrder(true);
        }
    }, [items]); // Escuchar cambios en items directamente

    // Lógica de ordenación según el modo seleccionado
    const sortedItems = useMemo(() => {
        const list = [...items];
        if (isManualOrder) {
            return list.sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99) || a.name.localeCompare(b.name));
        }
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, [items, isManualOrder]);

    const handleAdd = () => {
        if (newItemName.trim()) {
            if (type === 'program' && !selectedFacultyId) {
                alert("Debes seleccionar una facultad para el programa.");
                return;
            }
            onAdd(newItemName.trim(), selectedFacultyId);
            setNewItemName('');
            setSelectedFacultyId('');
        }
    };
    
    const handleUpdate = () => {
        if (editingItem && editingItem.name.trim()){
            onUpdate(editingItem);
            setEditingItem(null);
        }
    }

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const newItems = [...sortedItems];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        
        if (targetIndex < 0 || targetIndex >= newItems.length) return;

        // Intercambiar elementos
        const temp = newItems[index];
        newItems[index] = newItems[targetIndex];
        newItems[targetIndex] = temp;

        // Reasignar sortOrder basado en la nueva posición (1-based index)
        const updatedItems = newItems.map((item, idx) => ({
            ...item,
            sortOrder: idx + 1
        }));

        onReorder(updatedItems);
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden transition-all hover:shadow-md min-h-[400px]">
            {/* Header con Selector de Orden */}
            <div className="p-5 bg-gray-50/50 border-b border-gray-100">
                <div className="flex justify-between items-start mb-3">
                    <h2 className="text-[10px] font-black text-uninunez-onix uppercase tracking-[0.2em] font-display">{title}</h2>
                    {isAdmin && (
                        <div className="flex bg-white rounded-lg p-0.5 border border-gray-200 shadow-sm">
                            <button 
                                onClick={() => setIsManualOrder(false)}
                                className={`px-2 py-1 text-[8px] font-black rounded-md transition-all ${!isManualOrder ? 'bg-uninunez-teal text-white shadow-sm' : 'text-gray-400 hover:text-uninunez-teal'}`}
                            >
                                A-Z
                            </button>
                            <button 
                                onClick={() => setIsManualOrder(true)}
                                className={`px-2 py-1 text-[8px] font-black rounded-md transition-all ${isManualOrder ? 'bg-uninunez-orange text-white shadow-sm' : 'text-gray-400 hover:text-uninunez-orange'}`}
                            >
                                MANUAL
                            </button>
                        </div>
                    )}
                </div>
                <p className="text-[8px] text-uninunez-ash font-bold uppercase tracking-widest flex items-center gap-1">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d={isManualOrder ? "M4 6h16M4 12h16M4 18h16" : "M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"} />
                    </svg>
                    Orden {isManualOrder ? 'Personalizado' : 'Alfabético'}
                </p>
            </div>
            
            <div className="p-5 flex-grow">
                {isAdmin && (
                    <div className="space-y-2 mb-6">
                        <input
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder={placeholder}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-xs font-bold focus:ring-1 focus:ring-uninunez-orange outline-none transition-all"
                        />
                        {type === 'program' && faculties && (
                            <select 
                                value={selectedFacultyId}
                                onChange={(e) => setSelectedFacultyId(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-xs font-bold focus:ring-1 focus:ring-uninunez-teal outline-none"
                            >
                                <option value="">Seleccionar Facultad...</option>
                                {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        )}
                        <button 
                            onClick={handleAdd} 
                            disabled={!newItemName.trim()}
                            className="w-full bg-uninunez-orange text-white py-2.5 rounded-xl shadow-lg hover:bg-uninunez-orangeLight disabled:bg-gray-200 disabled:shadow-none transition-all flex justify-center items-center font-black text-[10px] uppercase tracking-widest"
                        >
                            <PlusIcon className="h-4 w-4 mr-2"/> AGREGAR
                        </button>
                    </div>
                )}

                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-uninunez-teal border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-[8px] font-black uppercase text-gray-400 mt-3 tracking-widest">Sincronizando...</span>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {sortedItems.length === 0 ? (
                            <li className="py-12 text-center">
                                <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.3em] italic">Sin registros</p>
                                <p className="text-[8px] text-gray-400 mt-2">Agrega un nuevo elemento arriba</p>
                            </li>
                        ) : (
                            sortedItems.map((item, index) => (
                                <li key={item.id} className="group flex justify-between items-center bg-gray-50/40 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 p-3 rounded-xl transition-all">
                                    <div className="flex items-center gap-3">
                                        {isAdmin && isManualOrder && (
                                            <div className="flex flex-col border-r pr-2 border-gray-200">
                                                <button 
                                                    onClick={() => moveItem(index, 'up')} 
                                                    disabled={index === 0}
                                                    className="p-1 text-gray-400 hover:text-uninunez-orange disabled:opacity-20 transition-colors"
                                                    title="Subir"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 15l7-7 7 7" /></svg>
                                                </button>
                                                <button 
                                                    onClick={() => moveItem(index, 'down')} 
                                                    disabled={index === sortedItems.length - 1}
                                                    className="p-1 text-gray-400 hover:text-uninunez-orange disabled:opacity-20 transition-colors"
                                                    title="Bajar"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" /></svg>
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex flex-col">
                                            {editingItem?.id === item.id && isAdmin ? (
                                                <input 
                                                    type="text"
                                                    value={editingItem.name}
                                                    onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                                                    onBlur={handleUpdate}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                                                    autoFocus
                                                    className="text-xs font-black text-uninunez-teal bg-transparent border-b-2 border-uninunez-teal focus:outline-none"
                                                />
                                            ) : (
                                                <>
                                                    <span className="text-xs font-bold text-uninunez-ash group-hover:text-uninunez-onix transition-colors leading-tight">{item.name}</span>
                                                    {type === 'program' && item.facultyId && (
                                                        <span className="text-[8px] font-black text-uninunez-teal uppercase mt-0.5">
                                                            {faculties?.find(f => f.id === item.facultyId)?.name || 'Sin Facultad'}
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {isAdmin && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                            <button onClick={() => setEditingItem(item)} className="p-1.5 text-uninunez-teal hover:bg-uninunez-teal/10 rounded-lg"><EditIcon className="h-3.5 w-3.5" /></button>
                                            <button onClick={() => onDelete(item)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><TrashIcon className="h-3.5 w-3.5" /></button>
                                        </div>
                                    )}
                                </li>
                            ))
                        )}
                    </ul>
                )}
            </div>
        </div>
    );
};

export const SettingsPage: React.FC = () => {
    const { isAdmin } = useAuth();
    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [formats, setFormats] = useState<Format[]>([]);
    const [roles, setRoles] = useState<TeacherRole[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [deletingItem, setDeletingItem] = useState<{item: Entity, type: EntityType} | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [f, s, fo, r, p] = await Promise.all([
                db.getFaculties(),
                db.getStatuses(), 
                db.getFormats(), 
                db.getTeacherRoles(), 
                db.getPrograms()
            ]);
            setFaculties([...f]);
            setStatuses([...s]);
            setFormats([...fo]);
            setRoles([...r]);
            setPrograms([...p]);
        } catch (error) {
            console.error("Error cargando catálogos:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);
    
    const handleAdd = async (type: EntityType, name: string, facultyId?: string) => {
        if (!isAdmin) return;
        try {
            if(type === 'faculty') await db.addFaculty({ name });
            else if(type === 'status') await db.addStatus({ name });
            else if(type === 'format') await db.addFormat({ name });
            else if(type === 'role') await db.addTeacherRole({ name });
            else if(type === 'program') await db.addProgram({ name, facultyId: facultyId || '' });
            await loadData();
        } catch (error: any) {
            console.error("Error al crear registro:", error);
            alert("Error al crear el registro: " + (error.message || "Error desconocido"));
        }
    };
    
    const handleUpdate = async (type: EntityType, item: Entity) => {
        if (!isAdmin) return;
        try {
            if(type === 'faculty') await db.updateFaculty(item as Faculty);
            else if(type === 'status') await db.updateStatus(item as Status);
            else if(type === 'format') await db.updateFormat(item as Format);
            else if(type === 'role') await db.updateTeacherRole(item as TeacherRole);
            else if(type === 'program') await db.updateProgram(item as Program);
            await loadData();
        } catch (error: any) {
            console.error("Error al actualizar registro:", error);
            alert("Error al actualizar el registro: " + (error.message || "Error desconocido"));
        }
    };

    const handleReorder = async (type: EntityType, items: Entity[]) => {
        if (!isAdmin) return;
        
        // Actualización optimista de la UI inmediata
        if(type === 'faculty') setFaculties(items as Faculty[]);
        else if(type === 'status') setStatuses(items as Status[]);
        else if(type === 'format') setFormats(items as Format[]);
        else if(type === 'role') setRoles(items as TeacherRole[]);
        else if(type === 'program') setPrograms(items as Program[]);

        try {
            // Persistir masivamente los nuevos índices de orden
            await Promise.all(items.map(item => {
                if(type === 'faculty') return db.updateFaculty(item as Faculty);
                if(type === 'status') return db.updateStatus(item as Status);
                if(type === 'format') return db.updateFormat(item as Format);
                if(type === 'role') return db.updateTeacherRole(item as TeacherRole);
                if(type === 'program') return db.updateProgram(item as Program);
                return Promise.resolve();
            }));
        } catch (error) {
            console.error("Error persistiendo orden personalizado:", error);
            loadData(); // Revertir en caso de error de red
        }
    };

    const checkAndSetDelete = (type: EntityType, item: Entity) => {
        setDeletingItem({ item, type });
    };

    const handleDelete = async () => {
        if (!deletingItem || !isAdmin) return;
        const { item, type } = deletingItem;
        try {
            if(type === 'faculty') await db.deleteFaculty(item.id);
            else if(type === 'status') await db.deleteStatus(item.id);
            else if(type === 'format') await db.deleteFormat(item.id);
            else if(type === 'role') await db.deleteTeacherRole(item.id);
            else if(type === 'program') await db.deleteProgram(item.id);
            await loadData();
        } finally {
            setDeletingItem(null);
        }
    }

    return (
        <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto px-2 md:px-0">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <h1 className="text-3xl font-black text-uninunez-onix font-display uppercase tracking-tight">Catálogos Maestros</h1>
                <p className="text-sm text-uninunez-ash font-medium mt-1">Gestión centralizada de la estructura académica institucional. Elige entre orden alfabético automático o manual.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <SettingsList
                    type="faculty"
                    title="Facultades"
                    items={faculties}
                    placeholder="Ej: Fac. de Ingeniería..."
                    isLoading={isLoading}
                    onAdd={(n) => handleAdd('faculty', n)}
                    onUpdate={(i) => handleUpdate('faculty', i)}
                    onDelete={(i) => checkAndSetDelete('faculty', i)}
                    onReorder={(items) => handleReorder('faculty', items)}
                />
                <SettingsList
                    type="program"
                    title="Programas Académicos"
                    items={programs}
                    faculties={faculties}
                    placeholder="Ej: Ing. de Sistemas..."
                    isLoading={isLoading}
                    onAdd={(n, fid) => handleAdd('program', n, fid)}
                    onUpdate={(i) => handleUpdate('program', i)}
                    onDelete={(i) => checkAndSetDelete('program', i)}
                    onReorder={(items) => handleReorder('program', items)}
                />
                <SettingsList
                    type="status"
                    title="Estados del Proyecto"
                    items={statuses}
                    placeholder="Ej: Radicado, Aprobado..."
                    isLoading={isLoading}
                    onAdd={(n) => handleAdd('status', n)}
                    onUpdate={(i) => handleUpdate('status', i)}
                    onDelete={(i) => checkAndSetDelete('status', i)}
                    onReorder={(items) => handleReorder('status', items)}
                />
                <SettingsList
                    type="format"
                    title="Formatos de Trabajo"
                    items={formats}
                    placeholder="Ej: Anteproyecto, Proyecto Final..."
                    isLoading={isLoading}
                    onAdd={(n) => handleAdd('format', n)}
                    onUpdate={(i) => handleUpdate('format', i)}
                    onDelete={(i) => checkAndSetDelete('format', i)}
                    onReorder={(items) => handleReorder('format', items)}
                />
                <SettingsList
                    type="role"
                    title="Roles de Docentes"
                    items={roles}
                    placeholder="Ej: Director, Evaluador..."
                    isLoading={isLoading}
                    onAdd={(n) => handleAdd('role', n)}
                    onUpdate={(i) => handleUpdate('role', i)}
                    onDelete={(i) => checkAndSetDelete('role', i)}
                    onReorder={(items) => handleReorder('role', items)}
                />
            </div>

            <ConfirmationDialog
                isOpen={!!deletingItem}
                onClose={() => setDeletingItem(null)}
                onConfirm={handleDelete}
                title="Confirmar Eliminación"
                message={`¿Estás seguro de que quieres eliminar este registro? Esta acción puede afectar la consistencia de los proyectos vinculados.`}
            />
        </div>
    );
};
