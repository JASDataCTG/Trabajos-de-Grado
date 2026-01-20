import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { Teacher } from '../types';
import { Modal } from '../components/Modal';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { PlusIcon, EditIcon, TrashIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

export const TeachersPage: React.FC = () => {
    const { isAdmin } = useAuth();
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
    const [deletingTeacher, setDeletingTeacher] = useState<Teacher | null>(null);

    const loadData = useCallback(async () => {
        const t = await db.getTeachers();
        setTeachers(t);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (teacherData: any) => {
        if (editingTeacher) {
            await db.updateTeacher({ ...editingTeacher, ...teacherData });
        } else {
            await db.addTeacher(teacherData);
        }
        loadData();
        setIsModalOpen(false);
    };

    const handleDelete = async () => {
        if (deletingTeacher) {
            await db.deleteTeacher(deletingTeacher.id);
            loadData();
            setDeletingTeacher(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Docentes</h1>
                {isAdmin && <button onClick={() => { setEditingTeacher(null); setIsModalOpen(true); }} className="bg-primary-600 text-white px-4 py-2 rounded flex items-center"><PlusIcon className="h-5 w-5 mr-1"/> Nuevo</button>}
            </div>
            <div className="bg-white shadow rounded-lg">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr><th className="px-6 py-3">Nombre</th><th className="px-6 py-3">Email</th><th className="px-6 py-3">Acciones</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {teachers.map(t => (
                            <tr key={t.id}>
                                <td className="px-6 py-4">{t.name}</td>
                                <td className="px-6 py-4">{t.email}</td>
                                <td className="px-6 py-4 flex gap-2">
                                    {isAdmin && <button onClick={() => { setEditingTeacher(t); setIsModalOpen(true); }} className="text-primary-600"><EditIcon className="h-5 w-5"/></button>}
                                    {isAdmin && <button onClick={() => setDeletingTeacher(t)} className="text-red-600"><TrashIcon className="h-5 w-5"/></button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Gestionar Docente">
                <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleSave(Object.fromEntries(fd)); }} className="space-y-4">
                    <input name="name" defaultValue={editingTeacher?.name} placeholder="Nombre" className="w-full border p-2 rounded" required />
                    <input name="email" defaultValue={editingTeacher?.email} placeholder="Email" className="w-full border p-2 rounded" required />
                    <input name="cedula" defaultValue={editingTeacher?.cedula} placeholder="Cédula" className="w-full border p-2 rounded" required />
                    <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded">Cancelar</button><button className="px-4 py-2 bg-primary-600 text-white rounded">Guardar</button></div>
                </form>
            </Modal>
            <ConfirmationDialog isOpen={!!deletingTeacher} onClose={() => setDeletingTeacher(null)} onConfirm={handleDelete} title="Eliminar" message="¿Confirmas?" />
        </div>
    );
};
