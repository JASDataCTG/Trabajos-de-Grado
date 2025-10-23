import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { Project, Student, Teacher, TeacherRole, Status, Format, ProjectTeacher } from '../types';
import { Modal } from '../components/Modal';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { PlusIcon, EditIcon, TrashIcon } from '../components/Icons';

const ProjectForm: React.FC<{
    project: Partial<Project> | null;
    onSave: (project: Omit<Project, 'id'> | Project, assignments: Array<{teacherId: string, roleId: string}>) => void;
    onClose: () => void;
    statuses: Status[];
    formats: Format[];
    teachers: Teacher[];
    roles: TeacherRole[];
    initialAssignments: ProjectTeacher[];
}> = ({ project, onSave, onClose, statuses, formats, teachers, roles, initialAssignments }) => {
    const [formData, setFormData] = useState<Partial<Project>>({});
    const [assignments, setAssignments] = useState<Array<{teacherId: string, roleId: string, tempId: number}>>([]);
    const [newAssignment, setNewAssignment] = useState({ teacherId: '', roleId: '' });

    useEffect(() => {
        setFormData({
            title: '',
            presentationDate: '',
            filesUrl: '',
            statusId: statuses[0]?.id || '',
            formatId: formats[0]?.id || '',
            ...project
        });
        setAssignments(initialAssignments.map(a => ({
            teacherId: a.teacherId,
            roleId: a.roleId,
            tempId: Math.random()
        })));
        setNewAssignment({ teacherId: '', roleId: '' });
    }, [project, initialAssignments, statuses, formats]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAssignmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewAssignment(prev => ({...prev, [name]: value}));
    };

    const handleAddAssignment = () => {
        if (newAssignment.teacherId && newAssignment.roleId) {
            if (assignments.some(a => a.teacherId === newAssignment.teacherId)) {
                alert('Este docente ya ha sido asignado al proyecto.');
                return;
            }
            setAssignments(prev => [...prev, {...newAssignment, tempId: Math.random()}]);
            setNewAssignment({ teacherId: '', roleId: '' });
        } else {
            alert('Por favor, selecciona un docente y un rol.');
        }
    };

    const handleRemoveAssignment = (tempId: number) => {
        setAssignments(prev => prev.filter(a => a.tempId !== tempId));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.presentationDate || !formData.statusId || !formData.formatId) {
            alert('Por favor, completa todos los campos requeridos del proyecto.');
            return;
        }
        onSave(formData as Omit<Project, 'id'> | Project, assignments);
    };
    
    const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || 'Desconocido';
    const getRoleName = (id: string) => roles.find(r => r.id === id)?.name || 'Desconocido';

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
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
            </div>

            <hr className="my-6" />

            <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-800">Docentes Asignados</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {assignments.length > 0 ? assignments.map((a) => (
                        <div key={a.tempId} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                            <div>
                                <p className="font-medium text-gray-900">{getTeacherName(a.teacherId)}</p>
                                <p className="text-sm text-gray-500">{getRoleName(a.roleId)}</p>
                            </div>
                            <button type="button" onClick={() => handleRemoveAssignment(a.tempId)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors">
                                <TrashIcon className="h-5 w-5" />
                            </button>
                        </div>
                    )) : (
                        <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-md">No hay docentes asignados.</p>
                    )}
                </div>

                <div className="flex items-end space-x-3 pt-2">
                    <div className="flex-grow">
                        <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700">Docente</label>
                        <select 
                            name="teacherId" 
                            id="teacherId" 
                            value={newAssignment.teacherId} 
                            onChange={handleAssignmentChange} 
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="">Seleccionar docente...</option>
                            {teachers.filter(t => !assignments.some(a => a.teacherId === t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div className="flex-grow">
                        <label htmlFor="roleId" className="block text-sm font-medium text-gray-700">Rol</label>
                        <select 
                            name="roleId" 
                            id="roleId" 
                            value={newAssignment.roleId} 
                            onChange={handleAssignmentChange} 
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="">Seleccionar rol...</option>
                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                    <button type="button" onClick={handleAddAssignment} className="bg-primary-100 text-primary-800 px-4 py-2 rounded-md hover:bg-primary-200 h-[38px] flex-shrink-0 font-medium">
                        Añadir
                    </button>
                </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
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

    const handleSave = (project: Omit<Project, 'id'> | Project, assignments: Array<{teacherId: string, roleId: string}>) => {
        let savedProject: Project;
        if ('id' in project && project.id) {
            savedProject = db.updateProject(project as Project);
        } else {
            savedProject = db.addProject(project);
        }

        const existingAssignments = db.getProjectTeachers().filter(pt => pt.projectId === savedProject.id);
        existingAssignments.forEach(pt => db.deleteProjectTeacher(pt.id));
        
        assignments.forEach(assignment => {
            if (assignment.teacherId && assignment.roleId) {
                db.addProjectTeacher({
                    projectId: savedProject.id,
                    teacherId: assignment.teacherId,
                    roleId: assignment.roleId,
                });
            }
        });

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
                    teachers={teachers}
                    roles={roles}
                    initialAssignments={editingProject ? projectTeachers.filter(pt => pt.projectId === editingProject.id) : []}
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