import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { Status, Format, TeacherRole } from '../types';
import { EditIcon, TrashIcon, PlusIcon } from '../components/Icons';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { useAuth } from '../contexts/AuthContext';

type EntityType = 'status' | 'format' | 'role';
type Entity = Status | Format | TeacherRole;

interface SettingsListProps<T extends Entity> {
    title: string;
    items: T[];
    placeholder: string;
    onAdd: (name: string) => Promise<void>;
    onUpdate: (item: T) => Promise<void>;
    onDelete: (item: T) => void;
    loading: boolean;
}

const SettingsList = <T extends {id: string; name: string}>({ title, items, placeholder, onAdd, onUpdate, onDelete, loading }: SettingsListProps<T>) => {
    const { isAdmin } = useAuth();
    const [newItemName, setNewItemName] = useState('');
    const [editingItem, setEditingItem] = useState<T | null>(null);

    const handleAdd = async () => {
        if (newItemName.trim()) {
            await onAdd(newItemName.trim());
            setNewItemName('');
        }
    };
    
    const handleUpdate = async () => {
        if (editingItem && editingItem.name.trim()){
            await onUpdate(editingItem);
            setEditingItem(null);
        }
    }

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
            {isAdmin && (
                <div className="flex space-x-2 mb-4">
                    <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder={placeholder}
                        className="flex-grow border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                    <button onClick={handleAdd} className="flex-shrink-0 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center">
                        <PlusIcon className="h-5 w-5"/>
                    </button>
                </div>
            )}
            {loading ? <p>Cargando...</p> : (
            <ul className="divide-y divide-gray-200">
                {items.map(item => (
                    <li key={item.id} className="py-3 flex justify-between items-center">
                        {editingItem?.id === item.id && isAdmin ? (
                           <input 
                            type="text"
                            value={editingItem.name}
                            onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                            onBlur={handleUpdate}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdate()}
                            autoFocus
                            className="text-sm text-gray-800 border-b border-primary-500 focus:outline-none"
                           />
                        ) : (
                            <span className="text-sm text-gray-800">{item.name}</span>
                        )}
                        {isAdmin && (
                            <div className="space-x-2">
                                <button onClick={() => setEditingItem(item)} className="text-primary-600 hover:text-primary-900"><EditIcon className="h-5 w-5" /></button>
                                <button onClick={() => onDelete(item)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5" /></button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
            )}
        </div>
    );
};


export const SettingsPage: React.FC = () => {
    const { isAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [formats, setFormats] = useState<Format[]>([]);
    const [roles, setRoles] = useState<TeacherRole[]>([]);
    const [deletingItem, setDeletingItem] = useState<{item: Entity, type: EntityType} | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [statusesData, formatsData, rolesData] = await Promise.all([
                db.getStatuses(),
                db.getFormats(),
                db.getTeacherRoles(),
            ]);
            setStatuses(statusesData);
            setFormats(formatsData);
            setRoles(rolesData);
        } catch (error) {
            console.error("Error loading settings:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleAdd = async (type: EntityType, name: string) => {
        if (!isAdmin) return;
        if(type === 'status') await db.addStatus({ name });
        if(type === 'format') await db.addFormat({ name });
        if(type === 'role') await db.addTeacherRole({ name });
        await loadData();
    };
    
    const handleUpdate = async (type: EntityType, item: Entity) => {
        if (!isAdmin) return;
        if(type === 'status') await db.updateStatus(item as Status);
        if(type === 'format') await db.updateFormat(item as Format);
        if(type === 'role') await db.updateTeacherRole(item as TeacherRole);
        await loadData();
    };

    const handleDelete = async () => {
        if (!deletingItem || !isAdmin) return;
        const { item, type } = deletingItem;

        if(type === 'status') await db.deleteStatus(item.id);
        if(type === 'format') await db.deleteFormat(item.id);
        if(type === 'role') await db.deleteTeacherRole(item.id);

        await loadData();
        setDeletingItem(null);
    }

    const getEntityTypeSpanish = (type: EntityType | undefined) => {
        if (!type) return '';
        switch (type) {
            case 'status': return 'Estado';
            case 'format': return 'Formato';
            case 'role': return 'Rol';
            default: return '';
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Configuración</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <SettingsList
                    title="Estados de Proyecto"
                    items={statuses}
                    placeholder="Nuevo nombre de estado"
                    onAdd={(name) => handleAdd('status', name)}
                    onUpdate={(item) => handleUpdate('status', item as Status)}
                    onDelete={(item) => setDeletingItem({item: item as Status, type: 'status'})}
                    loading={loading}
                />
                <SettingsList
                    title="Formatos de Proyecto"
                    items={formats}
                    placeholder="Nuevo nombre de formato"
                    onAdd={(name) => handleAdd('format', name)}
                    onUpdate={(item) => handleUpdate('format', item as Format)}
                    onDelete={(item) => setDeletingItem({item: item as Format, type: 'format'})}
                    loading={loading}
                />
                <SettingsList
                    title="Roles de Docente"
                    items={roles}
                    placeholder="Nuevo nombre de rol"
                    onAdd={(name) => handleAdd('role', name)}
                    onUpdate={(item) => handleUpdate('role', item as TeacherRole)}
                    onDelete={(item) => setDeletingItem({item: item as TeacherRole, type: 'role'})}
                    loading={loading}
                />
            </div>
            <ConfirmationDialog
                isOpen={!!deletingItem}
                onClose={() => setDeletingItem(null)}
                onConfirm={handleDelete}
                title={`Eliminar ${getEntityTypeSpanish(deletingItem?.type)}`}
                message={`¿Estás seguro de que quieres eliminar "${deletingItem?.item.name}"? Esto podría afectar a los proyectos existentes.`}
            />
        </div>
    );
};