
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { Status, Format, TeacherRole, Program, Student, Project, ProjectTeacher, Faculty } from '../types';
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
    isLoading?: boolean;
    type: EntityType;
}

const SettingsList = <T extends {id: string; name: string, facultyId?: string}>({ 
    title, items, placeholder, faculties, onAdd, onUpdate, onDelete, isLoading, type 
}: SettingsListProps<T>) => {
    const { isAdmin } = useAuth();
    const [newItemName, setNewItemName] = useState('');
    const [selectedFacultyId, setSelectedFacultyId] = useState('');
    const [editingItem, setEditingItem] = useState<T | null>(null);

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

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden transition-all hover:shadow-md">
            <div className="p-5 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-[10px] font-black text-uninunez-onix uppercase tracking-[0.2em] font-display">{title}</h2>
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
                    <div className="py-10 flex justify-center">
                        <div className="w-6 h-6 border-2 border-uninunez-orange border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {items.length === 0 ? (
                            <li className="py-8 text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest italic">Sin registros</li>
                        ) : (
                            items.map((item) => (
                                <li key={item.id} className="group flex justify-between items-center bg-gray-50/40 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 p-3 rounded-xl transition-all">
                                    <div className="flex flex-col flex-grow">
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
            setFaculties(f);
            setStatuses(s);
            setFormats(fo);
            setRoles(r);
            setPrograms(p);
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
        } catch (error) {
            alert("Error al crear el registro.");
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
        } catch (error) {
            alert("Error al actualizar el registro.");
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
                <p className="text-sm text-uninunez-ash font-medium mt-1">Gestión centralizada de la estructura académica institucional.</p>
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
                message={`¿Estás seguro de que quieres eliminar este registro de los catálogos maestros?`}
            />
        </div>
    );
};
