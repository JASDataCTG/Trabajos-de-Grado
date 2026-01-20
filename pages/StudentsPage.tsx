import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { Student, Project, Program } from '../types';
import { Modal } from '../components/Modal';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { PlusIcon, EditIcon, TrashIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

export const StudentsPage: React.FC = () => {
    const { isAdmin } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

    const loadData = useCallback(async () => {
        const [s, p, pr] = await Promise.all([db.getStudents(), db.getProjects(), db.getPrograms()]);
        setStudents(s);
        setProjects(p);
        setPrograms(pr);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (studentData: any) => {
        if (editingStudent) {
            await db.updateStudent({ ...editingStudent, ...studentData });
        } else {
            await db.addStudent(studentData);
        }
        loadData();
        setIsModalOpen(false);
    };

    const handleDelete = async () => {
        if (deletingStudent) {
            await db.deleteStudent(deletingStudent.id);
            loadData();
            setDeletingStudent(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Estudiantes</h1>
                {isAdmin && <button onClick={() => { setEditingStudent(null); setIsModalOpen(true); }} className="bg-primary-600 text-white px-4 py-2 rounded flex items-center"><PlusIcon className="h-5 w-5 mr-1"/> Nuevo</button>}
            </div>
            <div className="bg-white shadow rounded-lg">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr><th className="px-6 py-3">Nombre</th><th className="px-6 py-3">Cédula</th><th className="px-6 py-3">Acciones</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {students.map(s => (
                            <tr key={s.id}>
                                <td className="px-6 py-4">{s.name}</td>
                                <td className="px-6 py-4">{s.cedula}</td>
                                <td className="px-6 py-4 flex gap-2">
                                    {isAdmin && <button onClick={() => { setEditingStudent(s); setIsModalOpen(true); }} className="text-primary-600"><EditIcon className="h-5 w-5"/></button>}
                                    {isAdmin && <button onClick={() => setDeletingStudent(s)} className="text-red-600"><TrashIcon className="h-5 w-5"/></button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Gestionar Estudiante">
                <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleSave(Object.fromEntries(fd)); }} className="space-y-4">
                    <input name="name" defaultValue={editingStudent?.name} placeholder="Nombre" className="w-full border p-2 rounded" required />
                    <input name="email" defaultValue={editingStudent?.email} placeholder="Email" className="w-full border p-2 rounded" required />
                    <input name="cedula" defaultValue={editingStudent?.cedula} placeholder="Cédula" className="w-full border p-2 rounded" required />
                    <select name="programId" defaultValue={editingStudent?.programId} className="w-full border p-2 rounded">
                        {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="flex justify-end gap-2 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded">Cancelar</button><button className="px-4 py-2 bg-primary-600 text-white rounded">Guardar</button></div>
                </form>
            </Modal>
            <ConfirmationDialog isOpen={!!deletingStudent} onClose={() => setDeletingStudent(null)} onConfirm={handleDelete} title="Eliminar" message="¿Confirmas?" />
        </div>
    );
};
