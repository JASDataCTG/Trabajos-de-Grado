import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { Project, Student, Teacher, TeacherRole, Status, Format, ProjectTeacher } from '../types';
import { Modal } from '../components/Modal';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { PlusIcon, EditIcon, TrashIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

const ProjectForm: React.FC<{
    project: Partial<Project> | null;
    onSave: (projectData: Partial<Project>, assignments: Array<{teacherId: string, roleId: string}>) => void;
    onClose: () => void;
    statuses: Status[];
    formats: Format[];
    teachers: Teacher[];
    roles: TeacherRole[];
    initialAssignments: ProjectTeacher[];
    canEditDetails: boolean;
    gradeInfo: { canGrade: boolean, reviewerRole: string | null };
}> = ({ project, onSave, onClose, statuses, formats, teachers, roles, initialAssignments, canEditDetails, gradeInfo }) => {
    const { isAdmin } = useAuth();
    const [formData, setFormData] = useState<Partial<Project>>({});
    const [assignments, setAssignments] = useState<Array<{teacherId: string, roleId: string, tempId: number}>>([]);
    const [newAssignment, setNewAssignment] = useState({ teacherId: '', roleId: '' });

    useEffect(() => {
        const initialData: Partial<Project> = {
            title: '', presentationDate: '', filesUrl: '',
            statusId: statuses[0]?.id || '', formatId: formats[0]?.id || '',
            isApprovedByDirector: false, writtenGradeReviewer1: null,
            presentationGradeReviewer1: null, writtenGradeReviewer2: null,
            presentationGradeReviewer2: null, ...project
        };
        setFormData(initialData);
        setAssignments(initialAssignments.map(a => ({ teacherId: a.teacherId, roleId: a.roleId, tempId: Math.random() })));
        setNewAssignment({ teacherId: '', roleId: '' });
    }, [project, initialAssignments, statuses, formats]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'number') {
            setFormData(prev => ({ ...prev, [name]: value === '' ? null : parseFloat(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: checked }));
    };
    
    const handleGradeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const grade = value === '' ? null : Math.max(0, Math.min(5, parseFloat(value)));
        if (gradeInfo.reviewerRole?.includes('1')) {
            setFormData(prev => ({ ...prev, [name === 'writtenGrade' ? 'writtenGradeReviewer1' : 'presentationGradeReviewer1']: grade }));
        } else if (gradeInfo.reviewerRole?.includes('2')) {
            setFormData(prev => ({ ...prev, [name === 'writtenGrade' ? 'writtenGradeReviewer2' : 'presentationGradeReviewer2']: grade }));
        } else if (gradeInfo.reviewerRole === 'admin') {
            // Admin defaults to controlling reviewer 1's grades if empty, but can change either
            if(formData.writtenGradeReviewer1 === null && formData.presentationGradeReviewer1 === null) {
                 setFormData(prev => ({ ...prev, [name === 'writtenGrade' ? 'writtenGradeReviewer1' : 'presentationGradeReviewer1']: grade }));
            } else {
                 setFormData(prev => ({ ...prev, [name === 'writtenGrade' ? 'writtenGradeReviewer2' : 'presentationGradeReviewer2']: grade }));
            }
        }
    };

    const handleAssignmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setNewAssignment(prev => ({...prev, [e.target.name]: e.target.value}));
    };
    
    const handleAddAssignment = () => {
        if (newAssignment.teacherId && newAssignment.roleId) {
            if (assignments.some(a => a.teacherId === newAssignment.teacherId)) {
                alert('Este docente ya ha sido asignado al proyecto.'); return;
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
        if (canEditDetails && (!formData.title || !formData.presentationDate || !formData.statusId || !formData.formatId)) {
            alert('Por favor, completa todos los campos requeridos del proyecto.');
            return;
        }
        onSave(formData, assignments);
    };
    
    const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || 'Desconocido';
    const getRoleName = (id: string) => roles.find(r => r.id === id)?.name || 'Desconocido';

    const isReviewerOnly = gradeInfo.canGrade && !canEditDetails;
    const canSubmit = canEditDetails || gradeInfo.canGrade;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className={`space-y-4 ${isReviewerOnly ? 'opacity-75' : ''}`}>
                <fieldset disabled={!canEditDetails}>
                    <div className="space-y-4">
                        <div><label htmlFor="title" className="block text-sm font-medium text-gray-700">Título del Proyecto</label><input type="text" name="title" id="title" value={formData.title || ''} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100" /></div>
                        <div><label htmlFor="presentationDate" className="block text-sm font-medium text-gray-700">Fecha de Presentación</label><input type="date" name="presentationDate" id="presentationDate" value={formData.presentationDate || ''} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100" /></div>
                        <div><label htmlFor="filesUrl" className="block text-sm font-medium text-gray-700">URL de Archivos</label><input type="url" name="filesUrl" id="filesUrl" value={formData.filesUrl || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100" /></div>
                        <div><label htmlFor="statusId" className="block text-sm font-medium text-gray-700">Estado</label><select name="statusId" id="statusId" value={formData.statusId || ''} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100">{statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                        <div><label htmlFor="formatId" className="block text-sm font-medium text-gray-700">Formato</label><select name="formatId" id="formatId" value={formData.formatId || ''} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100">{formats.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
                    </div>
                </fieldset>
            </div>
            
            {canEditDetails && (
                <>
                    <hr /><div className="space-y-4">
                        <h4 className="text-lg font-medium text-gray-800">Docentes Asignados</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">{assignments.length > 0 ? assignments.map((a) => (<div key={a.tempId} className="flex items-center justify-between bg-gray-50 p-3 rounded-md"><div><p className="font-medium text-gray-900">{getTeacherName(a.teacherId)}</p><p className="text-sm text-gray-500">{getRoleName(a.roleId)}</p></div><button type="button" onClick={() => handleRemoveAssignment(a.tempId)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 transition-colors"><TrashIcon className="h-5 w-5" /></button></div>)) : (<p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-md">No hay docentes asignados.</p>)}</div>
                        <div className="flex items-end space-x-3 pt-2"><div className="flex-grow"><label htmlFor="teacherId" className="block text-sm font-medium text-gray-700">Docente</label><select name="teacherId" id="teacherId" value={newAssignment.teacherId} onChange={handleAssignmentChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"><option value="">Seleccionar docente...</option>{teachers.filter(t => !assignments.some(a => a.teacherId === t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div><div className="flex-grow"><label htmlFor="roleId" className="block text-sm font-medium text-gray-700">Rol</label><select name="roleId" id="roleId" value={newAssignment.roleId} onChange={handleAssignmentChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500"><option value="">Seleccionar rol...</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div><button type="button" onClick={handleAddAssignment} className="bg-primary-100 text-primary-800 px-4 py-2 rounded-md hover:bg-primary-200 h-[38px] flex-shrink-0 font-medium">Añadir</button></div>
                    </div>
                    <div className="pt-4 mt-4 border-t"><label className="flex items-center"><input type="checkbox" name="isApprovedByDirector" checked={!!formData.isApprovedByDirector} onChange={handleCheckboxChange} className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" /><span className="ml-2 text-sm text-gray-700 font-medium">Autorizar proyecto para revisión por evaluadores</span></label></div>
                </>
            )}

            {gradeInfo.canGrade && (
                <div className="space-y-4 pt-4 mt-4 border-t">
                    <h4 className="text-lg font-medium text-gray-800">Calificaciones de Evaluador</h4>
                    {!formData.isApprovedByDirector && !isAdmin ? (<p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-md">El proyecto debe ser aprobado por el director antes de poder ingresar calificaciones.</p>) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="writtenGrade" className="block text-sm font-medium text-gray-700">Nota Trabajo Escrito (0.0 - 5.0)</label>
                            <input type="number" name="writtenGrade" id="writtenGrade" min="0" max="5" step="0.1" onChange={handleGradeChange}
                             value={
                                (gradeInfo.reviewerRole?.includes('1') ? formData.writtenGradeReviewer1 :
                                 gradeInfo.reviewerRole?.includes('2') ? formData.writtenGradeReviewer2 :
                                 (formData.writtenGradeReviewer1 ?? '')) ?? ''
                             }
                             className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                        </div>
                        <div>
                            <label htmlFor="presentationGrade" className="block text-sm font-medium text-gray-700">Nota Sustentación (0.0 - 5.0)</label>
                            <input type="number" name="presentationGrade" id="presentationGrade" min="0" max="5" step="0.1" onChange={handleGradeChange}
                             value={
                                (gradeInfo.reviewerRole?.includes('1') ? formData.presentationGradeReviewer1 :
                                 gradeInfo.reviewerRole?.includes('2') ? formData.presentationGradeReviewer2 :
                                 (formData.presentationGradeReviewer1 ?? '')) ?? ''
                             }
                             className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                        </div>
                    </div>)}
                    <div className="text-xs text-gray-500 space-y-1">
                        <p>Evaluador 1: Escrito ({formData.writtenGradeReviewer1 ?? 'N/A'}), Sustentación ({formData.presentationGradeReviewer1 ?? 'N/A'})</p>
                        <p>Evaluador 2: Escrito ({formData.writtenGradeReviewer2 ?? 'N/A'}), Sustentación ({formData.presentationGradeReviewer2 ?? 'N/A'})</p>
                    </div>
                </div>
            )}

            <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
                <button type="button" onClick={onClose} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300">Cancelar</button>
                <button type="submit" disabled={!canSubmit} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed">Guardar Cambios</button>
            </div>
        </form>
    );
};

export const ProjectsPage: React.FC = () => {
    const { isAdmin, canEditProject, canGradeProject } = useAuth();
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

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = (projectData: Partial<Project>, assignments: Array<{teacherId: string, roleId: string}>) => {
        let savedProject: Project;

        if (editingProject) { // Editing existing project
            const originalProject = db.getProjectById(editingProject.id);
            if (!originalProject) return;
            const mergedProject = { ...originalProject, ...projectData };
            savedProject = db.updateProject(mergedProject);
        } else { // Creating new project
            if (!isAdmin) return;
            savedProject = db.addProject(projectData as Omit<Project, 'id'>);
        }

        // Only Directors/Admins can change assignments
        if (canEditProject(savedProject.id)) {
            const existingAssignments = db.getProjectTeachers().filter(pt => pt.projectId === savedProject.id);
            existingAssignments.forEach(pt => db.deleteProjectTeacher(pt.id));
            assignments.forEach(a => db.addProjectTeacher({ projectId: savedProject.id, teacherId: a.teacherId, roleId: a.roleId }));
        }

        loadData();
        setIsModalOpen(false);
        setEditingProject(null);
    };

    const handleDelete = () => {
        if (deletingProject && canEditProject(deletingProject.id)) {
            db.deleteProject(deletingProject.id);
            loadData();
            setDeletingProject(null);
        }
    };
    
    const getStatusName = (id: string) => statuses.find(s => s.id === id)?.name || 'N/A';
    const getStudentsForProject = (projectId: string) => students.filter(s => s.projectId === projectId).map(s => s.name).join(', ') || <span className="text-gray-400 italic">Ninguno</span>;
    const getTeachersForProject = (projectId: string) => {
        const assigned = projectTeachers.filter(pt => pt.projectId === projectId).map(pt => {
            const teacher = teachers.find(t => t.id === pt.teacherId);
            const role = roles.find(r => r.id === pt.roleId);
            return { teacherName: teacher?.name || '?', roleName: role?.name || '?' };
        });
        return assigned.length > 0 ? assigned.map(t => `${t.teacherName} (${t.roleName})`).join(', ') : <span className="text-gray-400 italic">Ninguno</span>;
    };
    const calculateAverage = (g1: number | null, g2: number | null): string => {
        const grades = [g1, g2].filter(g => typeof g === 'number') as number[];
        if (grades.length === 0) return 'N/A';
        return (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1);
    };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Proyectos</h1>
                {isAdmin && (
                    <button onClick={() => { setEditingProject(null); setIsModalOpen(true); }} className="flex items-center bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 shadow">
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Añadir Proyecto
                    </button>
                )}
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden"><div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50"><tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estudiantes</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Docentes</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aprob. Director</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notas (Escrito/Sust.)</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr></thead>
                    <tbody className="bg-white divide-y divide-gray-200">{projects.map(project => {
                        const userCanEditDetails = canEditProject(project.id);
                        const gradeInfo = canGradeProject(project.id);
                        const finalWritten = calculateAverage(project.writtenGradeReviewer1, project.writtenGradeReviewer2);
                        const finalPresentation = calculateAverage(project.presentationGradeReviewer1, project.presentationGradeReviewer2);
                        return (<tr key={project.id}>
                            <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{project.title}</div><div className="text-xs text-gray-500">Entrega: {project.presentationDate}</div></td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">{getStudentsForProject(project.id)}</td>
                            <td className="px-6 py-4 whitespace-normal text-sm text-gray-500">{getTeachersForProject(project.id)}</td>
                            <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">{getStatusName(project.statusId)}</span></td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">{project.isApprovedByDirector ? <span className="text-green-600 text-lg font-bold">✓</span> : <span className="text-red-500 text-lg font-bold">✗</span>}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{finalWritten} / {finalPresentation}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                {(userCanEditDetails || gradeInfo.canGrade) && <button onClick={() => { setEditingProject(project); setIsModalOpen(true); }} className="text-primary-600 hover:text-primary-900"><EditIcon className="h-5 w-5" /></button>}
                                {userCanEditDetails && <button onClick={() => setDeletingProject(project)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5" /></button>}
                            </td>
                        </tr>);
                    })}{projects.length === 0 && (<tr><td colSpan={8} className="text-center py-10 text-gray-500">No se encontraron proyectos. Crea uno para comenzar.</td></tr>)}
                    </tbody>
                </table>
            </div></div>
            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingProject(null); }} title={editingProject ? 'Editar/Calificar Proyecto' : 'Añadir Proyecto'}>
                {isModalOpen && <ProjectForm project={editingProject} onSave={handleSave} onClose={() => { setIsModalOpen(false); setEditingProject(null); }} statuses={statuses} formats={formats} teachers={teachers} roles={roles} initialAssignments={editingProject ? projectTeachers.filter(pt => pt.projectId === editingProject.id) : []} canEditDetails={editingProject ? canEditProject(editingProject.id) : isAdmin} gradeInfo={editingProject ? canGradeProject(editingProject.id) : {canGrade: false, reviewerRole: null}} />}
            </Modal>
            <ConfirmationDialog isOpen={!!deletingProject} onClose={() => setDeletingProject(null)} onConfirm={handleDelete} title="Eliminar Proyecto" message={`¿Estás seguro de que quieres eliminar el proyecto "${deletingProject?.title}"? Esto también desasignará a sus estudiantes y eliminará los roles de los docentes. Esta acción no se puede deshacer.`} />
        </div>
    );
};