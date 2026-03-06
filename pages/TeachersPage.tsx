
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../services/database';
import { Teacher, Program, Project, ProjectTeacher } from '../types';
import { Modal } from '../components/Modal';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { PlusIcon, EditIcon, TrashIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

export const TeachersPage: React.FC = () => {
    const { isAdmin } = useAuth();
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [projectTeachers, setProjectTeachers] = useState<ProjectTeacher[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
    const [deletingTeacher, setDeletingTeacher] = useState<Teacher | null>(null);

    // Filtros
    const [filterProgram, setFilterProgram] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [t, pr, proj, pt] = await Promise.all([
                db.getTeachers(),
                db.getPrograms(),
                db.getProjects(),
                db.getProjectTeachers()
            ]);
            setTeachers(t);
            setPrograms(pr);
            setProjects(proj);
            setProjectTeachers(pt);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const filteredTeachers = useMemo(() => {
        return teachers.filter(t => {
            const matchesSearch = !searchTerm || 
                                 t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 t.cedula.includes(searchTerm);
            
            // Lógica de filtro por programa y fechas para docentes:
            // Un docente coincide si tiene algún proyecto asignado que cumpla los criterios.
            if (!filterProgram && !filterStartDate && !filterEndDate) return matchesSearch;

            const teacherAssignments = projectTeachers.filter(pt => pt.teacherId === t.id);
            const teacherProjectIds = teacherAssignments.map(pt => pt.projectId);
            const teacherProjects = projects.filter(p => teacherProjectIds.includes(p.id));

            let hasMatchingProject = teacherProjects.some(p => {
                let projectMatches = true;
                if (filterProgram) projectMatches = projectMatches && p.programId === filterProgram;
                if (filterStartDate) projectMatches = projectMatches && new Date(p.presentationDate) >= new Date(filterStartDate);
                if (filterEndDate) projectMatches = projectMatches && new Date(p.presentationDate) <= new Date(filterEndDate);
                return projectMatches;
            });

            return matchesSearch && hasMatchingProject;
        });
    }, [teachers, searchTerm, filterProgram, filterStartDate, filterEndDate, projectTeachers, projects]);

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
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-uninunez-onix uppercase tracking-tight">Docentes</h1>
                    <p className="text-uninunez-ash text-sm font-medium">Cuerpo docente y evaluadores institucionales.</p>
                </div>
                {isAdmin && (
                    <button 
                        onClick={() => { setEditingTeacher(null); setIsModalOpen(true); }} 
                        className="bg-uninunez-onix text-white px-6 py-3 rounded-xl flex items-center text-[10px] font-black uppercase tracking-widest shadow-xl hover:opacity-90 transition-all justify-center lg:w-auto w-full"
                    >
                        <PlusIcon className="h-5 w-5 mr-1"/> Nuevo Docente
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
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-uninunez-onix focus:ring-1 focus:ring-uninunez-onix outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-[9px] font-black text-uninunez-ash uppercase tracking-widest mb-1 ml-1">Programa (Proyectos)</label>
                        <select 
                            value={filterProgram} 
                            onChange={(e) => setFilterProgram(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-uninunez-onix focus:ring-1 focus:ring-uninunez-onix outline-none"
                        >
                            <option value="">TODOS LOS PROGRAMAS</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[9px] font-black text-uninunez-ash uppercase tracking-widest mb-1 ml-1">Proyectos Desde</label>
                        <input 
                            type="date" 
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-uninunez-onix focus:ring-1 focus:ring-uninunez-onix outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-[9px] font-black text-uninunez-ash uppercase tracking-widest mb-1 ml-1">Proyectos Hasta</label>
                        <input 
                            type="date" 
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-uninunez-onix focus:ring-1 focus:ring-uninunez-onix outline-none"
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
                        <div className="w-12 h-12 border-4 border-uninunez-onix border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 border-b">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre Completo</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Identificación</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Institucional</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredTeachers.length > 0 ? filteredTeachers.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-8 py-5 text-sm font-bold text-uninunez-onix">{t.name}</td>
                                        <td className="px-8 py-5 text-sm text-uninunez-ash">{t.cedula}</td>
                                        <td className="px-8 py-5 text-xs font-semibold text-uninunez-teal">{t.email}</td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                {isAdmin && <button onClick={() => { setEditingTeacher(t); setIsModalOpen(true); }} className="p-2.5 bg-uninunez-onix/5 text-uninunez-onix hover:bg-uninunez-onix hover:text-white rounded-xl shadow-sm transition-all"><EditIcon className="h-5 w-5"/></button>}
                                                {isAdmin && <button onClick={() => setDeletingTeacher(t)} className="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl shadow-sm transition-all"><TrashIcon className="h-5 w-5"/></button>}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center text-uninunez-ash font-medium italic">
                                            No se encontraron docentes con los criterios aplicados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Datos del Docente">
                <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); handleSave(Object.fromEntries(fd)); }} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1">Nombre Completo</label>
                        <input 
                            name="name" 
                            defaultValue={editingTeacher?.name} 
                            placeholder="Ej: Dr. Fernando Núñez" 
                            className="w-full border border-gray-200 p-3 rounded-xl font-bold focus:ring-uninunez-orange focus:border-uninunez-orange text-sm outline-none uppercase" 
                            required 
                            onChange={(e) => e.target.value = e.target.value.toUpperCase()}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1">Cédula</label>
                            <input name="cedula" defaultValue={editingTeacher?.cedula} placeholder="Documento" className="w-full border border-gray-200 p-3 rounded-xl focus:ring-uninunez-orange focus:border-uninunez-orange text-sm outline-none" required />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1">Correo Electrónico</label>
                            <input 
                                name="email" 
                                defaultValue={editingTeacher?.email} 
                                placeholder="email@uninunez.edu.co" 
                                className="w-full border border-gray-200 p-3 rounded-xl focus:ring-uninunez-orange focus:border-uninunez-orange text-sm outline-none lowercase" 
                                required 
                                onChange={(e) => e.target.value = e.target.value.toLowerCase()}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-6 border-t mt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 border-2 border-gray-100 rounded-xl text-[10px] font-black uppercase text-gray-400">Cancelar</button>
                        <button className="px-8 py-3 bg-uninunez-orange text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-uninunez-orangeLight transition-all">Guardar Registro</button>
                    </div>
                </form>
            </Modal>
            <ConfirmationDialog isOpen={!!deletingTeacher} onClose={() => setDeletingTeacher(null)} onConfirm={handleDelete} title="Eliminar Docente" message="¿Estás seguro de eliminar este registro? Se perderán las vinculaciones a proyectos." />
        </div>
    );
};
