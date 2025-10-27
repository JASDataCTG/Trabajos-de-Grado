import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { Student, Project, Program } from '../types';
import { Modal } from '../components/Modal';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { PlusIcon, EditIcon, TrashIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

const StudentForm: React.FC<{
    student: Partial<Student> | null;
    onSave: (student: Omit<Student, 'id'> | Student) => void;
    onClose: () => void;
    projects: Project[];
    programs: Program[];
}> = ({ student, onSave, onClose, projects, programs }) => {
    const { isAdmin } = useAuth();
    const [formData, setFormData] = useState<Partial<Student>>({
        name: '',
        email: '',
        cedula: '',
        projectId: null,
        programId: programs[0]?.id || '',
        ...student
    });

    useEffect(() => {
        setFormData({
            name: '',
            email: '',
            cedula: '',
            projectId: null,
            programId: programs[0]?.id || '',
            ...student
        });
    }, [student, programs]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value === 'null' ? null : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.programId || !formData.cedula) {
            alert('Por favor, completa todos los campos requeridos');
            return;
        }
        onSave(formData as Omit<Student, 'id'> | Student);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre del Estudiante</label>
                <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
                <label htmlFor="cedula" className="block text-sm font-medium text-gray-700">Cédula (será la contraseña)</label>
                <input type="text" name="cedula" id="cedula" value={formData.cedula} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo Electrónico (el usuario será la parte antes del @)</label>
                <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
                <label htmlFor="programId" className="block text-sm font-medium text-gray-700">Programa Académico</label>
                <select name="programId" id="programId" value={formData.programId} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="projectId" className="block text-sm font-medium text-gray-700">Proyecto Asignado</label>
                <select name="projectId" id="projectId" value={formData.projectId || 'null'} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                    <option value="null">-- Sin Asignar --</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onClose} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">Cancelar</button>
                <button type="submit" disabled={!isAdmin} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed">Guardar Estudiante</button>
            </div>
        </form>
    );
};

export const StudentsPage: React.FC = () => {
    const { isAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<Student[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [studentsData, projectsData, programsData] = await Promise.all([
                db.getStudents(),
                db.getProjects(),
                db.getPrograms(),
            ]);
            setStudents(studentsData);
            setProjects(projectsData);
            setPrograms(programsData);
        } catch (error) {
            console.error("Error loading students data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSave = async (student: Omit<Student, 'id'> | Student) => {
        if (!isAdmin) return;
        if ('id' in student) {
            await db.updateStudent(student);
        } else {
            await db.addStudent(student);
        }
        await loadData();
        setIsModalOpen(false);
        setEditingStudent(null);
    };

    const handleDelete = async () => {
        if (deletingStudent && isAdmin) {
            await db.deleteStudent(deletingStudent.id);
            await loadData();
            setDeletingStudent(null);
        }
    };
    
    const getProjectTitle = (projectId: string | null) => {
        if (!projectId) return <span className="text-gray-400 italic">Sin Asignar</span>;
        return projects.find(p => p.id === projectId)?.title || 'Proyecto Desconocido';
    };

    const getProgramName = (programId: string) => {
        return programs.find(p => p.id === programId)?.name || 'Programa Desconocido';
    };
    
    if (loading) {
        return <div className="text-center p-10">Cargando estudiantes...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Estudiantes</h1>
                {isAdmin && (
                    <button onClick={() => { setEditingStudent(null); setIsModalOpen(true); }} className="flex items-center bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 shadow">
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Añadir Estudiante
                    </button>
                )}
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cédula</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Programa</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proyecto Asignado</th>
                                {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {students.map(student => (
                                <tr key={student.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                        <div className="text-xs text-gray-500">{student.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.cedula}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getProgramName(student.programId)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{getProjectTitle(student.projectId)}</td>
                                    {isAdmin && (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button onClick={() => { setEditingStudent(student); setIsModalOpen(true); }} className="text-primary-600 hover:text-primary-900"><EditIcon className="h-5 w-5" /></button>
                                            <button onClick={() => setDeletingStudent(student)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5" /></button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {students.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={isAdmin ? 5 : 4} className="text-center py-10 text-gray-500">No se encontraron estudiantes.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingStudent(null); }} title={editingStudent ? 'Editar Estudiante' : 'Añadir Estudiante'}>
                <StudentForm 
                    student={editingStudent} 
                    onSave={handleSave} 
                    onClose={() => { setIsModalOpen(false); setEditingStudent(null); }}
                    projects={projects}
                    programs={programs}
                />
            </Modal>
            
            <ConfirmationDialog 
                isOpen={!!deletingStudent}
                onClose={() => setDeletingStudent(null)}
                onConfirm={handleDelete}
                title="Eliminar Estudiante"
                message={`¿Estás seguro de que quieres eliminar a ${deletingStudent?.name}? Esto también eliminará su cuenta de usuario. Esta acción no se puede deshacer.`}
            />
        </div>
    );
};