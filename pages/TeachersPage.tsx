import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { Teacher, Project, TeacherRole, ProjectTeacher } from '../types';
import { Modal } from '../components/Modal';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { PlusIcon, EditIcon, TrashIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

const TeacherForm: React.FC<{
    teacher: Partial<Teacher> | null;
    onSave: (teacher: Omit<Teacher, 'id'> | Teacher) => void;
    onClose: () => void;
}> = ({ teacher, onSave, onClose }) => {
    const { isAdmin } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        cedula: '',
        ...teacher
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.cedula) {
            alert('Por favor, completa todos los campos requeridos');
            return;
        }
        onSave(formData as Omit<Teacher, 'id'> | Teacher);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre del Docente</label>
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
            <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onClose} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">Cancelar</button>
                <button type="submit" disabled={!isAdmin} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed">Guardar Docente</button>
            </div>
        </form>
    );
};

export const TeachersPage: React.FC = () => {
    const { isAdmin } = useAuth();
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [roles, setRoles] = useState<TeacherRole[]>([]);
    const [projectTeachers, setProjectTeachers] = useState<ProjectTeacher[]>([]);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
    const [deletingTeacher, setDeletingTeacher] = useState<Teacher | null>(null);

    const loadData = useCallback(() => {
        setTeachers(db.getTeachers());
        setProjects(db.getProjects());
        setRoles(db.getTeacherRoles());
        setProjectTeachers(db.getProjectTeachers());
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSave = (teacher: Omit<Teacher, 'id'> | Teacher) => {
        if (!isAdmin) return;
        if ('id' in teacher) {
            db.updateTeacher(teacher);
        } else {
            db.addTeacher(teacher);
        }
        loadData();
        setIsModalOpen(false);
        setEditingTeacher(null);
    };

    const handleDelete = () => {
        if (deletingTeacher && isAdmin) {
            db.deleteTeacher(deletingTeacher.id);
            loadData();
            setDeletingTeacher(null);
        }
    };
    
    const getProjectsForTeacher = (teacherId: string) => {
        return projectTeachers
            .filter(pt => pt.teacherId === teacherId)
            .map(pt => {
                const project = projects.find(p => p.id === pt.projectId);
                const role = roles.find(r => r.id === pt.roleId);
                return {
                    projectName: project?.title || 'Proyecto Desconocido',
                    roleName: role?.name || 'Rol Desconocido',
                };
            });
    };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Docentes</h1>
                {isAdmin && (
                    <button onClick={() => { setEditingTeacher(null); setIsModalOpen(true); }} className="flex items-center bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 shadow">
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Añadir Docente
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Correo Electrónico</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proyectos y Roles Asignados</th>
                                {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {teachers.map(teacher => (
                                <tr key={teacher.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{teacher.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.cedula}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {getProjectsForTeacher(teacher.id).map(p => `${p.projectName} (${p.roleName})`).join(', ') || 'Ninguno'}
                                    </td>
                                    {isAdmin && (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button onClick={() => { setEditingTeacher(teacher); setIsModalOpen(true); }} className="text-primary-600 hover:text-primary-900"><EditIcon className="h-5 w-5" /></button>
                                            <button onClick={() => setDeletingTeacher(teacher)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5" /></button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                             {teachers.length === 0 && (
                                <tr>
                                    <td colSpan={isAdmin ? 5 : 4} className="text-center py-10 text-gray-500">No se encontraron docentes.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingTeacher(null); }} title={editingTeacher ? 'Editar Docente' : 'Añadir Docente'}>
                <TeacherForm 
                    teacher={editingTeacher} 
                    onSave={handleSave} 
                    onClose={() => { setIsModalOpen(false); setEditingTeacher(null); }}
                />
            </Modal>
            
            <ConfirmationDialog 
                isOpen={!!deletingTeacher}
                onClose={() => setDeletingTeacher(null)}
                onConfirm={handleDelete}
                title="Eliminar Docente"
                message={`¿Estás seguro de que quieres eliminar a ${deletingTeacher?.name}? Esto también eliminará su cuenta de usuario y su asignación a proyectos. Esta acción no se puede deshacer.`}
            />
        </div>
    );
};