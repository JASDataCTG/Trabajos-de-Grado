
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { Student, Program } from '../types';
import { Modal } from '../components/Modal';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { PlusIcon, EditIcon, TrashIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

export const StudentsPage: React.FC = () => {
    const { isAdmin } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        const [s, p] = await Promise.all([
            db.getStudents(),
            db.getPrograms()
        ]);
        setStudents(s);
        setPrograms(p);
        setIsLoading(false);
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
    
    const getProgramName = (id?: string) => {
        if (!id) return '---';
        return programs.find(p => p.id === id)?.name || '---';
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-uninunez-onix uppercase tracking-tight">Estudiantes</h1>
                    <p className="text-uninunez-ash text-sm font-medium">Gestión de autores académicos.</p>
                </div>
                {isAdmin && <button onClick={() => { setEditingStudent(null); setIsModalOpen(true); }} className="bg-uninunez-teal text-white px-6 py-3 rounded-xl flex items-center text-[10px] font-black uppercase tracking-widest shadow-xl"><PlusIcon className="h-5 w-5 mr-1"/> Nuevo Estudiante</button>}
            </div>
            
            <div className="bg-white shadow rounded-3xl overflow-hidden border border-gray-100">
                {isLoading ? (
                    <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-uninunez-teal border-t-transparent rounded-full animate-spin"></div></div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre del Estudiante</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cédula / Documento</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Programa</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {students.map(s => (
                                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-8 py-5 text-sm font-bold text-uninunez-onix">{s.name}</td>
                                    <td className="px-8 py-5 text-sm text-uninunez-ash">{s.cedula}</td>
                                    <td className="px-8 py-5 text-xs font-semibold text-uninunez-teal">{getProgramName(s.programId)}</td>
                                    <td className="px-8 py-5 text-right flex justify-end gap-2">
                                        {isAdmin && <button onClick={() => { setEditingStudent(s); setIsModalOpen(true); }} className="p-2 text-uninunez-teal hover:bg-uninunez-teal hover:text-white rounded-lg transition-colors"><EditIcon className="h-5 w-5"/></button>}
                                        {isAdmin && <button onClick={() => setDeletingStudent(s)} className="p-2 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors"><TrashIcon className="h-5 w-5"/></button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Datos del Estudiante">
                <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleSave(Object.fromEntries(fd)); }} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1">Nombre Completo</label>
                        <input name="name" defaultValue={editingStudent?.name} placeholder="Ej: Juan Pérez" className="w-full border border-gray-200 p-3 rounded-xl font-bold focus:ring-uninunez-orange focus:border-uninunez-orange outline-none" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1">Cédula</label>
                            <input name="cedula" defaultValue={editingStudent?.cedula} placeholder="Documento" className="w-full border border-gray-200 p-3 rounded-xl focus:ring-uninunez-orange focus:border-uninunez-orange outline-none" required />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1">Correo Institucional</label>
                            <input name="email" defaultValue={editingStudent?.email} placeholder="email@uninunez.edu.co" className="w-full border border-gray-200 p-3 rounded-xl focus:ring-uninunez-orange focus:border-uninunez-orange outline-none" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1">Programa Académico</label>
                        <select name="programId" defaultValue={editingStudent?.programId || ''} className="w-full border border-gray-200 p-3 rounded-xl focus:ring-uninunez-orange focus:border-uninunez-orange outline-none bg-white text-sm" required>
                            <option value="">Seleccione el programa...</option>
                            {programs.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-6 border-t mt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 border rounded-xl text-[10px] font-black uppercase text-gray-400">Cancelar</button>
                        <button className="px-8 py-3 bg-uninunez-orange text-white rounded-xl text-[10px] font-black uppercase shadow-lg">Guardar Estudiante</button>
                    </div>
                </form>
            </Modal>
            <ConfirmationDialog isOpen={!!deletingStudent} onClose={() => setDeletingStudent(null)} onConfirm={handleDelete} title="Eliminar Estudiante" message="¿Confirmas la eliminación del registro en Supabase?" />
        </div>
    );
};
