import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { Status, Format, TeacherRole } from '../types';
import { EditIcon, TrashIcon, PlusIcon } from '../components/Icons';
import { ConfirmationDialog } from '../components/ConfirmationDialog';

type EntityType = 'status' | 'format' | 'role';
type Entity = Status | Format | TeacherRole;

interface SettingsListProps<T extends Entity> {
    title: string;
    items: T[];
    placeholder: string;
    onAdd: (name: string) => void;
    onUpdate: (item: T) => void;
    onDelete: (item: T) => void;
}

const SettingsList = <T extends {id: string; name: string}>({ title, items, placeholder, onAdd, onUpdate, onDelete }: SettingsListProps<T>) => {
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
        <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
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
            <ul className="divide-y divide-gray-200">
                {items.map(item => (
                    <li key={item.id} className="py-3 flex justify-between items-center">
                        {editingItem?.id === item.id ? (
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
                        <div className="space-x-2">
                            <button onClick={() => setEditingItem(item)} className="text-primary-600 hover:text-primary-900"><EditIcon className="h-5 w-5" /></button>
                            <button onClick={() => onDelete(item)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5" /></button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export const SettingsPage: React.FC = () => {
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [formats, setFormats] = useState<Format[]>([]);
    const [roles, setRoles] = useState<TeacherRole[]>([]);
    const [deletingItem, setDeletingItem] = useState<{item: Entity, type: EntityType} | null>(null);

    const loadData = useCallback(() => {
        setStatuses(db.getStatuses());
        setFormats(db.getFormats());
        setRoles(db.getTeacherRoles());
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);
    
    const handleAdd = (type: EntityType, name: string) => {
        if(type === 'status') db.addStatus({ name });
        if(type === 'format') db.addFormat({ name });
        if(type === 'role') db.addTeacherRole({ name });
        loadData();
    };
    
    const handleUpdate = (type: EntityType, item: Entity) => {
        if(type === 'status') db.updateStatus(item as Status);
        if(type === 'format') db.updateFormat(item as Format);
        if(type === 'role') db.updateTeacherRole(item as TeacherRole);
        loadData();
    };

    const handleDelete = () => {
        if (!deletingItem) return;
        const { item, type } = deletingItem;

        if(type === 'status') db.deleteStatus(item.id);
        if(type === 'format') db.deleteFormat(item.id);
        if(type === 'role') db.deleteTeacherRole(item.id);

        loadData();
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
                    onUpdate={(item) => handleUpdate('status', item)}
                    onDelete={(item) => setDeletingItem({item, type: 'status'})}
                />
                <SettingsList
                    title="Formatos de Proyecto"
                    items={formats}
                    placeholder="Nuevo nombre de formato"
                    onAdd={(name) => handleAdd('format', name)}
                    onUpdate={(item) => handleUpdate('format', item)}
                    onDelete={(item) => setDeletingItem({item, type: 'format'})}
                />
                <SettingsList
                    title="Roles de Docente"
                    items={roles}
                    placeholder="Nuevo nombre de rol"
                    onAdd={(name) => handleAdd('role', name)}
                    onUpdate={(item) => handleUpdate('role', item)}
                    onDelete={(item) => setDeletingItem({item, type: 'role'})}
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