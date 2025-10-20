import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { Project, Student, Teacher, TeacherRole, Status, Format, ProjectTeacher } from '../types';
import { Modal } from '../components/Modal';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { PlusIcon, EditIcon, TrashIcon } from '../components/Icons';

const ProjectForm: React.FC<{
    project: Partial<Project> | null;
    onSave: (project: Omit<Project, 'id'> | Project) => void;
    onClose: () => void;
    statuses: Status[];
    formats: Format[];
}> = ({ project, onSave, onClose, statuses, formats }) => {
    const [formData, setFormData] = useState<Partial<Project>>({
        title: '',
        presentationDate: '',
        filesUrl: '',
        statusId: statuses[0]?.id || '',
        formatId: formats[0]?.id || '',
        ...project
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.presentationDate || !formData.statusId || !formData.formatId) {
            alert('Por favor, completa todos los campos requeridos');
            return;
        }
        onSave(formData as Omit<Project, 'id'> | Project);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Título del Proyecto</label>
                <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
                <label htmlFor="presentationDate" className="block text-sm font-medium text-gray-700">Fecha de Presentación</label>
                <input type="date" name="presentationDate" id="presentationDate" value={formData.presentationDate} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
                <label htmlFor="filesUrl" className="block text-sm font-medium text-gray-700">URL de Archivos</label>
                <input type="url" name="filesUrl" id="filesUrl" value={formData.filesUrl} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
                <label htmlFor="statusId" className="block text-sm font-medium text-gray-700">Estado</label>
                <select name="statusId" id="statusId" value={formData.statusId} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                    {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="formatId" className="block text-sm font-medium text-gray-700">Formato</label>
                <select name="formatId" id="formatId" value={formData.formatId} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                    {formats.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onClose} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">Cancelar</button>
                <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">Guardar Proyecto</button>
            </div>
        </form>
    );
};

export const ProjectsPage: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [roles, setRoles] = useState<TeacherRole[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [formats, setFormats] = useState<Format[]>([]);
    const [projectTeachers, setProjectTeachers] = useState<ProjectTeacher[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [deletingProject, setDeletingProject] = useState<Project | null>(null);

    const loadData = useCallback(() => {
        setProjects(db.getProjects());
        setStudents(db.getStudents());
        setTeachers(db.getTeachers());
        setRoles(db.getTeacherRoles());
        setStatuses(db.getStatuses());
        setFormats(db.getFormats());
        setProjectTeachers(db.getProjectTeachers());
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSave = (project: Omit<Project, 'id'> | Project) => {
        if ('id' in project) {
            db.updateProject(project);
        } else {
            db.addProject(project);
        }
        loadData();
        setIsModalOpen(false);
        setEditingProject(null);
    };

    const handleDelete = () => {
        if (deletingProject) {
            db.deleteProject(deletingProject.id);
            loadData();
            setDeletingProject(null);
        }
    };
    
    const getStatusName = (id: string) => statuses.find(s => s.id === id)?.name || 'N/A';
    const getStudentsForProject = (projectId: string) => students.filter(s => s.projectId === projectId);
    const getTeachersForProject = (projectId: string) => {
        return projectTeachers
            .filter(pt => pt.projectId === projectId)
            .map(pt => {
                const teacher = teachers.find(t => t.id === pt.teacherId);
                const role = roles.find(r => r.id === pt.roleId);
                return {
                    teacherName: teacher?.name || 'Docente Desconocido',
                    roleName: role?.name || 'Rol Desconocido',
                };
            });
    };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Proyectos</h1>
                <button onClick={() => { setEditingProject(null); setIsModalOpen(true); }} className="flex items-center bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 shadow">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Añadir Proyecto
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estudiantes</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Docentes</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {projects.map(project => (
                                <tr key={project.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{project.title}</div>
                                        <div className="text-xs text-gray-500">Entrega: {project.presentationDate}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {getStudentsForProject(project.id).map(s => s.name).join(', ') || 'Ninguno'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {getTeachersForProject(project.id).map(t => `${t.teacherName} (${t.roleName})`).join(', ') || 'Ninguno'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">{getStatusName(project.statusId)}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        <button onClick={() => { setEditingProject(project); setIsModalOpen(true); }} className="text-primary-600 hover:text-primary-900"><EditIcon className="h-5 w-5" /></button>
                                        <button onClick={() => setDeletingProject(project)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5" /></button>
                                    </td>
                                </tr>
                            ))}
                             {projects.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-gray-500">No se encontraron proyectos. Crea uno para comenzar.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingProject(null); }} title={editingProject ? 'Editar Proyecto' : 'Añadir Proyecto'}>
                <ProjectForm 
                    project={editingProject} 
                    onSave={handleSave} 
                    onClose={() => { setIsModalOpen(false); setEditingProject(null); }}
                    statuses={statuses}
                    formats={formats}
                />
            </Modal>
            
            <ConfirmationDialog 
                isOpen={!!deletingProject}
                onClose={() => setDeletingProject(null)}
                onConfirm={handleDelete}
                title="Eliminar Proyecto"
                message={`¿Estás seguro de que quieres eliminar el proyecto "${deletingProject?.title}"? Esto también desasignará a sus estudiantes y eliminará los roles de los docentes. Esta acción no se puede deshacer.`}
            />
        </div>
    );
};