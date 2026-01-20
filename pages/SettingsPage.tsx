
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { Status, Format, TeacherRole, Program, Student } from '../types';
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
}

const SettingsList = <T extends {id: string; name: string}>({ title, items, placeholder, onAdd, onUpdate, onDelete }: SettingsListProps<T>) => {
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
            {isAdmin && (
                <div className="flex space-x-2 mb-4">
                    <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder={placeholder}
                        className="flex-grow border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                    <button onClick={handleAdd} className="flex-shrink-0 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center shadow-sm">
                        <PlusIcon className="h-5 w-5"/>
                    </button>
                </div>
            )}
            <ul className="divide-y divide-gray-100">
                {items.length === 0 ? (
                    <li className="py-4 text-center text-xs text-gray-400 italic">No hay registros</li>
                ) : (
                    items.map(item => (
                        <li key={item.id} className="py-3 flex justify-between items-center group">
                            {editingItem?.id === item.id && isAdmin ? (
                            <input 
                                type="text"
                                value={editingItem.name}
                                onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                                onBlur={handleUpdate}
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                                autoFocus
                                className="text-sm text-gray-800 border-b-2 border-primary-500 focus:outline-none bg-primary-50 px-1"
                            />
                            ) : (
                                <span className="text-sm text-gray-700 font-medium">{item.name}</span>
                            )}
                            {isAdmin && (
                                <div className="space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingItem(item)} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-md"><EditIcon className="h-4 w-4" /></button>
                                    <button onClick={() => onDelete(item)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"><TrashIcon className="h-4 w-4" /></button>
                                </div>
                            )}
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
};

export const SettingsPage: React.FC = () => {
    const { isAdmin } = useAuth();
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [formats, setFormats] = useState<Format[]>([]);
    const [roles, setRoles] = useState<TeacherRole[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [deletingItem, setDeletingItem] = useState<{item: Entity, type: EntityType} | null>(null);

    const loadData = useCallback(async () => {
        const [s, f, r, p, st] = await Promise.all([
            db.getStatuses(), db.getFormats(), db.getTeacherRoles(), db.getPrograms(), db.getStudents()
        ]);
        setStatuses(s);
        setFormats(f);
        setRoles(r);
        setPrograms(p);
        setStudents(st);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleAdd = async (type: EntityType, name: string) => {
        if (!isAdmin) return;
        if(type === 'status') await db.addStatus({ name });
        if(type === 'format') await db.addFormat({ name });
        if(type === 'role') await db.addTeacherRole({ name });
        if(type === 'program') await db.addProgram({ name });
        loadData();
    };
    
    const handleUpdate = async (type: EntityType, item: Entity) => {
        if (!isAdmin) return;
        if(type === 'status') await db.updateStatus(item as Status);
        if(type === 'format') await db.updateFormat(item as Format);
        if(type === 'role') await db.updateTeacherRole(item as TeacherRole);
        if(type === 'program') await db.updateProgram(item as Program);
        loadData();
    };

    const handleDelete = async () => {
        if (!deletingItem || !isAdmin) return;
        const { item, type } = deletingItem;

        if(type === 'status') await db.deleteStatus(item.id);
        if(type === 'format') await db.deleteFormat(item.id);
        if(type === 'role') await db.deleteTeacherRole(item.id);
        if(type === 'program') await db.deleteProgram(item.id);

        loadData();
        setDeletingItem(null);
    }

    const getEntityTypeSpanish = (type: EntityType | undefined) => {
        if (!type) return '';
        switch (type) {
            case 'status': return 'Estado';
            case 'format': return 'Formato';
            case 'role': return 'Rol';
            case 'program': return 'Programa Académico';
            default: return '';
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h1 className="text-3xl font-bold text-gray-900 uppercase tracking-tight">Configuración del Sistema</h1>
                <p className="text-sm text-gray-500 mt-1">Gestión de parámetros globales y catálogos de la institución.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <SettingsList
                    title="Estados de Proyecto"
                    items={statuses}
                    placeholder="Ej: Aprobado"
                    onAdd={(name) => handleAdd('status', name)}
                    onUpdate={(item) => handleUpdate('status', item)}
                    onDelete={(item) => setDeletingItem({item, type: 'status'})}
                />
                <SettingsList
                    title="Formatos"
                    items={formats}
                    placeholder="Ej: Anteproyecto"
                    onAdd={(name) => handleAdd('format', name)}
                    onUpdate={(item) => handleUpdate('format', item)}
                    onDelete={(item) => setDeletingItem({item, type: 'format'})}
                />
                <SettingsList
                    title="Roles de Docente"
                    items={roles}
                    placeholder="Ej: Director"
                    onAdd={(name) => handleAdd('role', name)}
                    onUpdate={(item) => handleUpdate('role', item)}
                    onDelete={(item) => setDeletingItem({item, type: 'role'})}
                />
                <SettingsList
                    title="Programas"
                    items={programs}
                    placeholder="Ej: Ing. de Sistemas"
                    onAdd={(name) => handleAdd('program', name)}
                    onUpdate={(item) => handleUpdate('program', item)}
                    onDelete={(item) => {
                        const isProgramInUse = students.some(s => s.programId === item.id);
                        if (isProgramInUse) {
                            alert('No se puede eliminar este programa porque tiene estudiantes asignados.');
                            return;
                        }
                        setDeletingItem({item, type: 'program'});
                    }}
                />
            </div>

            <div className="bg-primary-50 border border-primary-100 p-4 rounded-xl flex items-center gap-4">
                <div className="bg-primary-500 p-2 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-sm text-primary-800 font-medium">
                    Los cambios realizados aquí se reflejan instantáneamente en toda la plataforma y base de datos central.
                </p>
            </div>

            <ConfirmationDialog
                isOpen={!!deletingItem}
                onClose={() => setDeletingItem(null)}
                onConfirm={handleDelete}
                title={`Eliminar ${getEntityTypeSpanish(deletingItem?.type)}`}
                message={`¿Estás seguro de que quieres eliminar "${deletingItem?.item.name}"? Esta acción no se puede deshacer y puede afectar la integridad de los reportes.`}
            />
        </div>
    );
};
