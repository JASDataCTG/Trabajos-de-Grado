import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { Status, Format, TeacherRole, AppDatabase } from '../types';
import { EditIcon, TrashIcon, PlusIcon } from '../components/Icons';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { arrayToCsv, csvToArray } from '../utils/csv';

type EntityType = 'status' | 'format' | 'role';
type Entity = Status | Format | TeacherRole;

// --- Components ---

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

type AllEntityTypes = keyof AppDatabase;

const DataManagement: React.FC = () => {
    const [confirmImport, setConfirmImport] = useState<{type: AllEntityTypes, data: any[]} | null>(null);

    const entities: { key: AllEntityTypes; name: string }[] = [
        { key: 'projects', name: 'Proyectos' },
        { key: 'students', name: 'Estudiantes' },
        { key: 'teachers', name: 'Docentes' },
        { key: 'projectTeachers', name: 'Asignaciones Docente-Proyecto' },
        { key: 'statuses', name: 'Estados' },
        { key: 'formats', name: 'Formatos' },
        { key: 'teacherRoles', name: 'Roles de Docente' },
    ];

    const handleExport = (entityKey: AllEntityTypes) => {
        const entityName = entityKey.charAt(0).toUpperCase() + entityKey.slice(1);
        const getter = `get${entityName}` as keyof typeof db;
        const data = (db as any)[getter]();
        const csv = arrayToCsv(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${entityKey}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, entity: AllEntityTypes) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const data = csvToArray(text);
            if(data.length > 0) {
                setConfirmImport({ type: entity, data });
            } else {
                alert('El archivo CSV está vacío o tiene un formato incorrecto.');
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input to allow re-uploading the same file
    };
    
    const confirmImportAction = () => {
        if (!confirmImport) return;
        try {
            db.replaceAll(confirmImport.type, confirmImport.data);
            alert(`¡Datos de ${entities.find(e => e.key === confirmImport.type)?.name} importados con éxito! La página se recargará para reflejar los cambios.`);
            setConfirmImport(null);
            window.location.reload();
        } catch (error) {
            console.error("Error al importar datos:", error);
            alert("Ocurrió un error al importar los datos. Revisa la consola para más detalles.");
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 col-span-1 md:col-span-2 lg:col-span-3">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Gestión de Datos</h2>
            <p className="text-sm text-gray-600 mb-6">Realiza copias de seguridad o migra tus datos exportando e importando archivos CSV.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-4">Exportar Datos</h3>
                    <div className="space-y-2 flex flex-col items-start">
                        {entities.map(entity => (
                             <button key={entity.key} onClick={() => handleExport(entity.key)} className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                                Exportar {entity.name}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                     <h3 className="text-lg font-medium text-gray-700 mb-4">Importar Datos</h3>
                     <p className="text-xs text-yellow-800 bg-yellow-50 p-3 rounded-lg mb-4 ring-1 ring-yellow-200">
                        <span className="font-bold">Atención:</span> La importación reemplazará <span className="font-bold">todos</span> los datos existentes para la categoría seleccionada.
                    </p>
                    <div className="space-y-4">
                        {entities.map(entity => (
                            <div key={`import-${entity.key}`}>
                                <label htmlFor={`import-${entity.key}`} className="text-sm font-medium text-gray-700 sr-only">
                                    Importar {entity.name} (.csv)
                                </label>
                                <input 
                                    type="file" 
                                    id={`import-${entity.key}`}
                                    accept=".csv,text/csv"
                                    onChange={(e) => handleFileChange(e, entity.key)}
                                    className="block w-full text-sm text-gray-500
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-full file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-primary-50 file:text-primary-700
                                        hover:file:bg-primary-100 cursor-pointer"
                                    aria-describedby={`help-text-${entity.key}`}
                                />
                                <p id={`help-text-${entity.key}`} className="mt-1 text-xs text-gray-500">Importar {entity.name}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <ConfirmationDialog
                isOpen={!!confirmImport}
                onClose={() => setConfirmImport(null)}
                onConfirm={confirmImportAction}
                title={`Confirmar Importación de ${entities.find(e => e.key === confirmImport?.type)?.name}`}
                message={`Estás a punto de reemplazar TODOS los datos de "${entities.find(e => e.key === confirmImport?.type)?.name}" con el contenido del archivo. Esta acción no se puede deshacer. ¿Deseas continuar?`}
            />
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
                <DataManagement />
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