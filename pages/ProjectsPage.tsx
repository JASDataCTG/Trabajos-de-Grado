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
    const [projectFormatName, setProjectFormatName] = useState('');

    useEffect(() => {
        const initialData: Partial<Project> = {
            title: '', presentationDate: '', filesUrl: '',
            statusId: statuses[0]?.id || '', formatId: formats[0]?.id || '',
            isApprovedByDirector: false, writtenGradeReviewer1: null,
            presentationGradeReviewer1: null, writtenGradeReviewer2: null,
            presentationGradeReviewer2: null, ...project
        };
        setFormData(initialData);

        if (initialData.formatId) {
            const format = formats.find(f => f.id === initialData.formatId);
            setProjectFormatName(format?.name || '');
        } else {
            setProjectFormatName('');
        }

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
        onSave(formData, assignments);
    };
    
    const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || 'Desconocido';
    const getRoleName = (id: string) => roles.find(r => r.id === id)?.name || 'Desconocido';

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700">Título</label><input type="text" name="title" value={formData.title || ''} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 disabled:bg-gray-100" disabled={!canEditDetails} /></div>
                <div><label className="block text-sm font-medium text-gray-700">Fecha</label><input type="date" name="presentationDate" value={formData.presentationDate || ''} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 disabled:bg-gray-100" disabled={!canEditDetails}/></div>
                <div><label className="block text-sm font-medium text-gray-700">Estado</label><select name="statusId" value={formData.statusId || ''} onChange={handleChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 disabled:bg-gray-100" disabled={!canEditDetails && !gradeInfo.canGrade}>{statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            </div>
            
            {canEditDetails && (
                <div className="space-y-4 pt-4 border-t">
                    <h4 className="text-lg font-medium">Asignaciones</h4>
                    <div className="space-y-2">{assignments.map(a => (<div key={a.tempId} className="flex justify-between bg-gray-50 p-2 rounded"><span>{getTeacherName(a.teacherId)} - {getRoleName(a.roleId)}</span><button type="button" onClick={() => handleRemoveAssignment(a.tempId)} className="text-red-500"><TrashIcon className="h-4 w-4"/></button></div>))}</div>
                    <div className="flex gap-2"><select name="teacherId" value={newAssignment.teacherId} onChange={handleAssignmentChange} className="border p-2 rounded flex-grow"><option value="">Docente...</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select><select name="roleId" value={newAssignment.roleId} onChange={handleAssignmentChange} className="border p-2 rounded flex-grow"><option value="">Rol...</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select><button type="button" onClick={handleAddAssignment} className="bg-primary-500 text-white px-3 rounded">Añadir</button></div>
                </div>
            )}

            <div className="flex justify-end gap-2 pt-6 border-t">
                <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded">Guardar</button>
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

    const [userPerms, setUserPerms] = useState<Record<string, {canEdit: boolean, grade: {canGrade: boolean, reviewerRole: string | null}}>>({});

    const loadData = useCallback(async () => {
        const [p, s, t, r, st, f, pt] = await Promise.all([
            db.getProjects(), db.getStudents(), db.getTeachers(),
            db.getTeacherRoles(), db.getStatuses(), db.getFormats(),
            db.getProjectTeachers()
        ]);
        setProjects(p);
        setStudents(s);
        setTeachers(t);
        setRoles(r);
        setStatuses(st);
        setFormats(f);
        setProjectTeachers(pt);

        const perms: any = {};
        for(const project of p) {
            perms[project.id] = {
                canEdit: await canEditProject(project.id),
                grade: await canGradeProject(project.id)
            };
        }
        setUserPerms(perms);
    }, [canEditProject, canGradeProject]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (projectData: Partial<Project>, assignments: Array<{teacherId: string, roleId: string}>) => {
        let savedProject: Project;
        if (editingProject) {
            savedProject = await db.updateProject({ ...editingProject, ...projectData } as Project);
        } else {
            savedProject = await db.addProject(projectData as Omit<Project, 'id'>);
        }

        if (userPerms[savedProject.id]?.canEdit || isAdmin) {
            await db.deleteProjectTeachersByProject(savedProject.id);
            for (const a of assignments) {
                await db.addProjectTeacher({ projectId: savedProject.id, teacherId: a.teacherId, roleId: a.roleId });
            }
        }

        loadData();
        setIsModalOpen(false);
    };

    const handleDelete = async () => {
        if (deletingProject) {
            await db.deleteProject(deletingProject.id);
            loadData();
            setDeletingProject(null);
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Proyectos</h1>
                {isAdmin && <button onClick={() => { setEditingProject(null); setIsModalOpen(true); }} className="bg-primary-600 text-white px-4 py-2 rounded flex items-center"><PlusIcon className="h-5 w-5 mr-1"/> Nuevo</button>}
            </div>
            <div className="bg-white shadow rounded-lg overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase">Título</th>
                            <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase">Estado</th>
                            <th className="px-6 py-3 text-left text-xs text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {projects.map(p => (
                            <tr key={p.id}>
                                <td className="px-6 py-4">{p.title}</td>
                                <td className="px-6 py-4">{statuses.find(s => s.id === p.statusId)?.name}</td>
                                <td className="px-6 py-4 flex gap-2">
                                    {(userPerms[p.id]?.canEdit || userPerms[p.id]?.grade.canGrade) && <button onClick={() => { setEditingProject(p); setIsModalOpen(true); }} className="text-primary-600"><EditIcon className="h-5 w-5"/></button>}
                                    {userPerms[p.id]?.canEdit && <button onClick={() => setDeletingProject(p)} className="text-red-600"><TrashIcon className="h-5 w-5"/></button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}>
                {isModalOpen && <ProjectForm project={editingProject} onSave={handleSave} onClose={() => setIsModalOpen(false)} statuses={statuses} formats={formats} teachers={teachers} roles={roles} initialAssignments={editingProject ? projectTeachers.filter(pt => pt.projectId === editingProject.id) : []} canEditDetails={editingProject ? userPerms[editingProject.id]?.canEdit : isAdmin} gradeInfo={editingProject ? userPerms[editingProject.id]?.grade : {canGrade: false, reviewerRole: null}} />}
            </Modal>
            <ConfirmationDialog isOpen={!!deletingProject} onClose={() => setDeletingProject(null)} onConfirm={handleDelete} title="Eliminar" message="¿Confirmas la eliminación del proyecto?" />
        </div>
    );
};
