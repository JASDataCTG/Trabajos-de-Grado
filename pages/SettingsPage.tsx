
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { Status, Format, TeacherRole, Program, Student, Project, ProjectTeacher } from '../types';
import { EditIcon, TrashIcon, PlusIcon } from '../components/Icons';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { useAuth } from '../contexts/AuthContext';

type EntityType = 'status' | 'format' | 'role' | 'program';
type Entity = Status | Format | TeacherRole | Program;

interface SettingsListProps<T extends Entity> {
    title: string;
    items: T[];
    placeholder: string;
    onAdd: (name: string) => void;
    onUpdate: (item: T) => void;
    onDelete: (item: T) => void;
    isLoading?: boolean;
}

const SettingsList = <T extends {id: string; name: string}>({ 
    title, items, placeholder, onAdd, onUpdate, onDelete, isLoading 
}: SettingsListProps<T>) => {
    const { isAdmin } = useAuth();
    const [newItemName, setNewItemName] = useState('');
    const [editingItem, setEditingItem] = useState<T | null>(null);

    const handleAdd = () => {
        if (newItemName.trim()) {
            onAdd(newItemName.trim());
            setNewItemName('');
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
            <div className="p-6 bg-gray-50/50 border-b border-gray-100">
                <h2 className="text-xs font-black text-uninunez-onix uppercase tracking-[0.2em] font-display">{title}</h2>
            </div>
            
            <div className="p-6 flex-grow">
                {isAdmin && (
                    <div className="flex gap-2 mb-6">
                        <input
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder={placeholder}
                            className="flex-grow bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-xs font-bold focus:ring-1 focus:ring-uninunez-orange outline-none transition-all"
                        />
                        <button 
                            onClick={handleAdd} 
                            disabled={!newItemName.trim()}
                            className="bg-uninunez-orange text-white p-2.5 rounded-xl shadow-lg hover:bg-uninunez-orangeLight disabled:bg-gray-200 disabled:shadow-none transition-all"
                            title="Agregar nuevo"
                        >
                            <PlusIcon className="h-5 w-5"/>
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
                            items.map(item => (
                                <li key={item.id} className="group flex justify-between items-center bg-gray-50/30 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 p-3 rounded-xl transition-all">
                                    {editingItem?.id === item.id && isAdmin ? (
                                        <input 
                                            type="text"
                                            value={editingItem.name}
                                            onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                                            onBlur={handleUpdate}
                                            onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                                            autoFocus
                                            className="flex-grow text-xs font-black text-uninunez-teal bg-transparent border-b-2 border-uninunez-teal focus:outline-none"
                                        />
                                    ) : (
                                        <span className="text-xs font-bold text-uninunez-ash group-hover:text-uninunez-onix transition-colors">{item.name}</span>
                                    )}
                                    
                                    {isAdmin && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => setEditingItem(item)} 
                                                className="p-1.5 text-uninunez-teal hover:bg-uninunez-teal/10 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <EditIcon className="h-3.5 w-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => onDelete(item)} 
                                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <TrashIcon className="h-3.5 w-3.5" />
                                            </button>
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
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [formats, setFormats] = useState<Format[]>([]);
    const [roles, setRoles] = useState<TeacherRole[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    
    // Datos para verificación de integridad
    const [projects, setProjects] = useState<Project[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [projectTeachers, setProjectTeachers] = useState<ProjectTeacher[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [deletingItem, setDeletingItem] = useState<{item: Entity, type: EntityType} | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [s, f, r, p, st, projs, pt] = await Promise.all([
                db.getStatuses(), 
                db.getFormats(), 
                db.getTeacherRoles(), 
                db.getPrograms(), 
                db.getStudents(),
                db.getProjects(),
                db.getProjectTeachers()
            ]);
            setStatuses(s);
            setFormats(f);
            setRoles(r);
            setPrograms(p);
            setStudents(st);
            setProjects(projs);
            setProjectTeachers(pt);
        } catch (error) {
            console.error("Error cargando catálogos:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleAdd = async (type: EntityType, name: string) => {
        if (!isAdmin) return;
        try {
            if(type === 'status') await db.addStatus({ name });
            else if(type === 'format') await db.addFormat({ name });
            else if(type === 'role') await db.addTeacherRole({ name });
            else if(type === 'program') await db.addProgram({ name });
            await loadData();
        } catch (error) {
            alert("Error al crear el registro.");
        }
    };
    
    const handleUpdate = async (type: EntityType, item: Entity) => {
        if (!isAdmin) return;
        try {
            if(type === 'status') await db.updateStatus(item as Status);
            else if(type === 'format') await db.updateFormat(item as Format);
            else if(type === 'role') await db.updateTeacherRole(item as TeacherRole);
            else if(type === 'program') await db.updateProgram(item as Program);
            await loadData();
        } catch (error) {
            alert("Error al actualizar el registro.");
        }
    };

    const checkIntegrityAndSetDelete = (type: EntityType, item: Entity) => {
        let inUse = false;
        let reason = "";

        switch (type) {
            case 'status':
                inUse = projects.some(p => p.statusId === item.id);
                reason = "Hay proyectos académicos utilizando este estado actualmente.";
                break;
            case 'format':
                inUse = projects.some(p => p.formatId === item.id);
                reason = "Este formato está asignado a uno o más proyectos activos.";
                break;
            case 'role':
                inUse = projectTeachers.some(pt => pt.roleId === item.id);
                reason = "Existen docentes vinculados a proyectos bajo este rol específico.";
                break;
            case 'program':
                const inStudents = students.some(s => s.programId === item.id);
                const inProjects = projects.some(p => p.programId === item.id);
                inUse = inStudents || inProjects;
                reason = "Este programa cuenta con estudiantes matriculados o proyectos de grado radicados.";
                break;
        }

        if (inUse) {
            alert(`BLOQUEO DE INTEGRIDAD: No es posible eliminar "${item.name}".\n\nMotivo: ${reason}`);
            return;
        }

        setDeletingItem({ item, type });
    };

    const handleDelete = async () => {
        if (!deletingItem || !isAdmin) return;
        const { item, type } = deletingItem;

        try {
            if(type === 'status') await db.deleteStatus(item.id);
            else if(type === 'format') await db.deleteFormat(item.id);
            else if(type === 'role') await db.deleteTeacherRole(item.id);
            else if(type === 'program') await db.deleteProgram(item.id);
            await loadData();
        } catch (error) {
            alert("Error al eliminar el registro.");
        } finally {
            setDeletingItem(null);
        }
    }

    const getEntityTypeSpanish = (type: EntityType | undefined) => {
        if (!type) return '';
        switch (type) {
            case 'status': return 'Estado';
            case 'format': return 'Formato';
            case 'role': return 'Rol de Docente';
            case 'program': return 'Programa Académico';
            default: return '';
        }
    }

    return (
        <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto px-2 md:px-0">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-uninunez-onix font-display uppercase tracking-tight">Configuración del Sistema</h1>
                    <p className="text-sm text-uninunez-ash font-medium mt-1">Gestión de catálogos y parámetros institucionales.</p>
                </div>
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="bg-uninunez-teal p-2 rounded-lg text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <p className="text-[10px] text-uninunez-ash font-bold uppercase leading-tight max-w-[200px]">
                        Los cambios afectan la integridad de los reportes y el banco de proyectos.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <SettingsList
                    title="Estados de Proyecto"
                    items={statuses}
                    placeholder="Ej: Aprobado..."
                    isLoading={isLoading}
                    onAdd={(name) => handleAdd('status', name)}
                    onUpdate={(item) => handleUpdate('status', item)}
                    onDelete={(item) => checkIntegrityAndSetDelete('status', item)}
                />
                <SettingsList
                    title="Formatos de Entrega"
                    items={formats}
                    placeholder="Ej: Tesis..."
                    isLoading={isLoading}
                    onAdd={(name) => handleAdd('format', name)}
                    onUpdate={(item) => handleUpdate('format', item)}
                    onDelete={(item) => checkIntegrityAndSetDelete('format', item)}
                />
                <SettingsList
                    title="Roles Docentes"
                    items={roles}
                    placeholder="Ej: Jurado..."
                    isLoading={isLoading}
                    onAdd={(name) => handleAdd('role', name)}
                    onUpdate={(item) => handleUpdate('role', item)}
                    onDelete={(item) => checkIntegrityAndSetDelete('role', item)}
                />
                <SettingsList
                    title="Programas Académicos"
                    items={programs}
                    placeholder="Ej: Derecho..."
                    isLoading={isLoading}
                    onAdd={(name) => handleAdd('program', name)}
                    onUpdate={(item) => handleUpdate('program', item)}
                    onDelete={(item) => checkIntegrityAndSetDelete('program', item)}
                />
            </div>

            <ConfirmationDialog
                isOpen={!!deletingItem}
                onClose={() => setDeletingItem(null)}
                onConfirm={handleDelete}
                title={`Eliminar ${getEntityTypeSpanish(deletingItem?.type)}`}
                message={`¿Estás seguro de que quieres eliminar "${deletingItem?.item.name}"? Esta acción no se puede deshacer.`}
            />
        </div>
    );
};
