
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../services/database';
import { Student, Program, Project } from '../types';
import { Modal } from '../components/Modal';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { PlusIcon, EditIcon, TrashIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

export const StudentsPage: React.FC = () => {
    const { isAdmin } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

    // Filtros
    const [filterProgram, setFilterProgram] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const loadData = useCallback(async () => {
        setIsLoading(true);
        const [s, p, proj] = await Promise.all([
            db.getStudents(),
            db.getPrograms(),
            db.getProjects()
        ]);
        setStudents(s);
        setPrograms(p);
        setProjects(proj);
        setIsLoading(false);
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchesProgram = !filterProgram || s.programId === filterProgram;
            const matchesSearch = !searchTerm || 
                                 s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 s.cedula.includes(searchTerm);
            
            // Filtro por fecha basado en el proyecto asignado
            let matchesDate = true;
            if (filterStartDate || filterEndDate) {
                const studentProject = projects.find(p => p.id === s.projectId);
                if (!studentProject) {
                    matchesDate = false;
                } else {
                    if (filterStartDate) {
                        matchesDate = matchesDate && new Date(studentProject.presentationDate) >= new Date(filterStartDate);
                    }
                    if (filterEndDate) {
                        matchesDate = matchesDate && new Date(studentProject.presentationDate) <= new Date(filterEndDate);
                    }
                }
            }

            return matchesProgram && matchesSearch && matchesDate;
        });
    }, [students, projects, filterProgram, searchTerm, filterStartDate, filterEndDate]);

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
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-uninunez-onix uppercase tracking-tight">Estudiantes</h1>
                    <p className="text-uninunez-ash text-sm font-medium">Gestión de autores académicos.</p>
                </div>
                {isAdmin && (
                    <button 
                        onClick={() => { setEditingStudent(null); setIsModalOpen(true); }} 
                        className="bg-uninunez-teal text-white px-6 py-3 rounded-xl flex items-center text-[10px] font-black uppercase tracking-widest shadow-xl hover:opacity-90 transition-all justify-center lg:w-auto w-full"
                    >
                        <PlusIcon className="h-5 w-5 mr-1"/> Nuevo Estudiante
                    </button>
                )}
            </div>

            {/* Barra de Filtros */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-1">
                        <label className="block text-[9px] font-black text-uninunez-ash uppercase tracking-widest mb-1 ml-1">Buscar por Nombre o Cédula</label>
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Escribe para buscar..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-uninunez-onix focus:ring-1 focus:ring-uninunez-teal outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-[9px] font-black text-uninunez-ash uppercase tracking-widest mb-1 ml-1">Filtrar por Programa</label>
                        <select 
                            value={filterProgram} 
                            onChange={(e) => setFilterProgram(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-uninunez-onix focus:ring-1 focus:ring-uninunez-teal outline-none"
                        >
                            <option value="">TODOS LOS PROGRAMAS</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[9px] font-black text-uninunez-ash uppercase tracking-widest mb-1 ml-1">Proyecto Desde</label>
                        <input 
                            type="date" 
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-uninunez-onix focus:ring-1 focus:ring-uninunez-teal outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-[9px] font-black text-uninunez-ash uppercase tracking-widest mb-1 ml-1">Proyecto Hasta</label>
                        <input 
                            type="date" 
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-uninunez-onix focus:ring-1 focus:ring-uninunez-teal outline-none"
                        />
                    </div>
                </div>
                {(searchTerm || filterProgram || filterStartDate || filterEndDate) && (
                    <div className="flex justify-end">
                        <button 
                            onClick={() => { setSearchTerm(''); setFilterProgram(''); setFilterStartDate(''); setFilterEndDate(''); }}
                            className="text-[9px] font-black text-uninunez-orange uppercase tracking-widest hover:underline"
                        >
                            Limpiar Filtros
                        </button>
                    </div>
                )}
            </div>
            
            <div className="bg-white shadow rounded-3xl overflow-hidden border border-gray-100 min-h-[400px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-uninunez-teal border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 border-b">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre del Estudiante</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cédula / Documento</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Programa</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredStudents.length > 0 ? filteredStudents.map(s => (
                                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-8 py-5 text-sm font-bold text-uninunez-onix">{s.name}</td>
                                        <td className="px-8 py-5 text-sm text-uninunez-ash">{s.cedula}</td>
                                        <td className="px-8 py-5 text-[10px] font-black text-uninunez-teal uppercase">{getProgramName(s.programId)}</td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                {isAdmin && <button onClick={() => { setEditingStudent(s); setIsModalOpen(true); }} className="p-2.5 bg-uninunez-teal/5 text-uninunez-teal hover:bg-uninunez-teal hover:text-white rounded-xl shadow-sm transition-all"><EditIcon className="h-5 w-5"/></button>}
                                                {isAdmin && <button onClick={() => setDeletingStudent(s)} className="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl shadow-sm transition-all"><TrashIcon className="h-5 w-5"/></button>}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center text-uninunez-ash font-medium italic">
                                            No se encontraron estudiantes con los criterios actuales.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Datos del Estudiante">
                <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleSave(Object.fromEntries(fd)); }} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1">Nombre Completo</label>
                        <input name="name" defaultValue={editingStudent?.name} placeholder="Ej: Juan Pérez" className="w-full border border-gray-200 p-3 rounded-xl font-bold focus:ring-uninunez-orange focus:border-uninunez-orange text-sm outline-none" required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1">Cédula</label>
                            <input name="cedula" defaultValue={editingStudent?.cedula} placeholder="Documento" className="w-full border border-gray-200 p-3 rounded-xl focus:ring-uninunez-orange focus:border-uninunez-orange text-sm outline-none" required />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1">Correo Institucional</label>
                            <input name="email" defaultValue={editingStudent?.email} placeholder="email@uninunez.edu.co" className="w-full border border-gray-200 p-3 rounded-xl focus:ring-uninunez-orange focus:border-uninunez-orange text-sm outline-none" required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1">Programa Académico</label>
                        <select name="programId" defaultValue={editingStudent?.programId || ''} className="w-full border border-gray-200 p-3 rounded-xl focus:ring-uninunez-orange focus:border-uninunez-orange outline-none bg-white text-sm font-bold" required>
                            <option value="">Seleccione el programa...</option>
                            {programs.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-6 border-t mt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 border-2 border-gray-100 rounded-xl text-[10px] font-black uppercase text-gray-400">Cancelar</button>
                        <button className="px-8 py-3 bg-uninunez-orange text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-uninunez-orangeLight transition-all">Guardar Estudiante</button>
                    </div>
                </form>
            </Modal>
            <ConfirmationDialog isOpen={!!deletingStudent} onClose={() => setDeletingStudent(null)} onConfirm={handleDelete} title="Eliminar Estudiante" message="¿Confirmas la eliminación del registro en Supabase?" />
        </div>
    );
};
