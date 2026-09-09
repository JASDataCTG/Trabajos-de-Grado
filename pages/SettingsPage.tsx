
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    onAdd: (name: string, extraId?: string) => Promise<void> | void;
    onUpdate: (item: T) => void;
    onDelete: (item: T) => void;
    isLoading?: boolean;
    type: EntityType;
}

const SettingsList = <T extends {id: string; name: string, facultyId?: string}>({ 
    title, items, placeholder, faculties, onAdd, onUpdate, onDelete, isLoading, type 
}: SettingsListProps<T>) => {
    const { isAdmin, isTeacher } = useAuth();
    const canManage = isAdmin || isTeacher;

    const [newItemName, setNewItemName] = useState('');
    const [selectedFacultyId, setSelectedFacultyId] = useState('');
    const [editingItem, setEditingItem] = useState<T | null>(null);
    const [inputError, setInputError] = useState<string | null>(null);
    const [successFeedback, setSuccessFeedback] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const selectRef = useRef<HTMLSelectElement>(null);

    // Lógica de ordenación alfabética
    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => a.name.localeCompare(b.name));
    }, [items]);

    const handleAdd = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        const trimmed = newItemName.trim();
        if (!trimmed) {
            setInputError('Por favor escribe el nombre antes de agregar.');
            inputRef.current?.focus();
            return;
        }

        if (type === 'program' && !selectedFacultyId) {
            setInputError('Debes seleccionar una facultad para el programa académico.');
            selectRef.current?.focus();
            return;
        }

        setInputError(null);
        setIsSubmitting(true);

        try {
            await onAdd(trimmed, selectedFacultyId);
            setNewItemName('');
            setSelectedFacultyId('');
            setSuccessFeedback('¡Registro agregado con éxito a la base de datos!');
            setTimeout(() => setSuccessFeedback(null), 3000);
        } catch (error: any) {
            setInputError(error?.message || 'Error al guardar en la base de datos.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleUpdate = () => {
        if (editingItem && editingItem.name.trim()){
            onUpdate(editingItem);
            setEditingItem(null);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden transition-all hover:shadow-md min-h-[400px]">
            {/* Header */}
            <div className="p-5 bg-gray-50/50 border-b border-gray-100">
                <h2 className="text-[10px] font-black text-uninunez-onix uppercase tracking-[0.2em] font-display">{title}</h2>
                <p className="text-[8px] text-uninunez-ash font-bold uppercase tracking-widest flex items-center gap-1 mt-2">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                    Orden Alfabético
                </p>
            </div>
            
            <div className="p-5 flex-grow">
                {canManage && (
                    <form onSubmit={handleAdd} className="space-y-2.5 mb-6">
                        <div className="space-y-2">
                            <input
                                ref={inputRef}
                                id={`input-name-${type}`}
                                type="text"
                                value={newItemName}
                                onChange={(e) => {
                                    setNewItemName(e.target.value);
                                    if (inputError) setInputError(null);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAdd();
                                    }
                                }}
                                placeholder={placeholder}
                                className={`w-full bg-gray-50/90 border ${
                                    inputError ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200 focus:border-uninunez-orange focus:ring-2 focus:ring-uninunez-orange/20'
                                } rounded-xl py-2.5 px-4 text-xs font-bold text-uninunez-onix outline-none transition-all placeholder:text-gray-400 placeholder:font-normal`}
                            />
                            {type === 'program' && faculties && (
                                <select 
                                    ref={selectRef}
                                    id={`select-faculty-${type}`}
                                    value={selectedFacultyId}
                                    onChange={(e) => {
                                        setSelectedFacultyId(e.target.value);
                                        if (inputError) setInputError(null);
                                    }}
                                    className={`w-full bg-gray-50/90 border ${
                                        inputError && !selectedFacultyId ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200 focus:border-uninunez-teal focus:ring-2 focus:ring-uninunez-teal/20'
                                    } rounded-xl py-2.5 px-4 text-xs font-bold text-uninunez-onix outline-none transition-all`}
                                >
                                    <option value="">Seleccionar Facultad...</option>
                                    {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                </select>
                            )}
                        </div>

                        {/* Botón activo para agregar */}
                        <button 
                            type="submit"
                            id={`btn-add-${type}`}
                            disabled={isSubmitting}
                            className="w-full bg-uninunez-orange text-white py-2.5 px-4 rounded-xl shadow-md hover:bg-uninunez-orangeLight hover:shadow-lg active:scale-[0.98] transition-all flex justify-center items-center font-black text-xs uppercase tracking-wider cursor-pointer disabled:opacity-75 disabled:cursor-wait"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    GUARDANDO...
                                </>
                            ) : (
                                <>
                                    <PlusIcon className="h-4 w-4 mr-2 stroke-[3]"/> AGREGAR
                                </>
                            )}
                        </button>

                        {/* Mensaje de validación o error */}
                        {inputError && (
                            <div className="text-[11px] font-bold text-red-600 flex items-center gap-1.5 bg-red-50 p-2.5 rounded-xl border border-red-200 animate-fadeIn">
                                <svg className="w-4 h-4 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                </svg>
                                <span>{inputError}</span>
                            </div>
                        )}

                        {/* Feedback de éxito */}
                        {successFeedback && (
                            <div className="text-[11px] font-bold text-emerald-700 flex items-center gap-1.5 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 animate-fadeIn">
                                <svg className="w-4 h-4 flex-shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                                </svg>
                                <span>{successFeedback}</span>
                            </div>
                        )}
                    </form>
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
                                        <div className="flex flex-col">
                                            {editingItem?.id === item.id && canManage ? (
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
                                    
                                    {canManage && (
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
    const { isAdmin, isTeacher } = useAuth();
    const canManage = isAdmin || isTeacher;

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
        if (!canManage) return;
        try {
            if(type === 'faculty') await db.addFaculty({ name });
            else if(type === 'status') await db.addStatus({ name });
            else if(type === 'format') await db.addFormat({ name });
            else if(type === 'role') await db.addTeacherRole({ name });
            else if(type === 'program') await db.addProgram({ name, facultyId: facultyId || '' });
            await loadData();
        } catch (error: any) {
            console.error("Error al crear registro:", error);
            throw new Error(error.message || "Error desconocido al crear registro");
        }
    };
    
    const handleUpdate = async (type: EntityType, item: Entity) => {
        if (!canManage) return;
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

    const checkAndSetDelete = (type: EntityType, item: Entity) => {
        setDeletingItem({ item, type });
    };

    const handleDelete = async () => {
        if (!deletingItem || !canManage) return;
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
    };

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
