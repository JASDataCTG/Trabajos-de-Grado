
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { Project, Student, Teacher, TeacherRole, Status, Format, ProjectTeacher } from '../types';
import { Modal } from '../components/Modal';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { PlusIcon, EditIcon, TrashIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

const ProjectForm: React.FC<{
    project: Partial<Project> | null;
    onSave: (projectData: Partial<Project>, assignments: Array<{teacherId: string, roleId: string}>, studentIds: string[]) => void;
    onClose: () => void;
    statuses: Status[];
    formats: Format[];
    teachers: Teacher[];
    allStudents: Student[];
    roles: TeacherRole[];
    initialAssignments: ProjectTeacher[];
    initialStudentIds: string[];
    canEditDetails: boolean;
    gradeInfo: { canGrade: boolean, reviewerRole: string | null };
}> = ({ project, onSave, onClose, statuses, formats, teachers, allStudents, roles, initialAssignments, initialStudentIds, canEditDetails, gradeInfo }) => {
    const { isAdmin } = useAuth();
    const [formData, setFormData] = useState<Partial<Project>>({});
    const [assignments, setAssignments] = useState<Array<{teacherId: string, roleId: string, tempId: number}>>([]);
    const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);
    const [newAssignment, setNewAssignment] = useState({ teacherId: '', roleId: '' });
    const [selectedStudentId, setSelectedStudentId] = useState('');

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
        setAssignedStudentIds(initialStudentIds);
        setNewAssignment({ teacherId: '', roleId: '' });
        setSelectedStudentId('');
    }, [project, initialAssignments, initialStudentIds, statuses]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddAssignment = () => {
        if (newAssignment.teacherId && newAssignment.roleId) {
            if (assignments.some(a => a.teacherId === newAssignment.teacherId)) {
                alert('Este docente ya ha sido asignado.'); return;
            }
            setAssignments(prev => [...prev, {...newAssignment, tempId: Math.random()}]);
            setNewAssignment({ teacherId: '', roleId: '' });
        }
    };

    const handleAddStudent = () => {
        if (selectedStudentId && !assignedStudentIds.includes(selectedStudentId)) {
            setAssignedStudentIds(prev => [...prev, selectedStudentId]);
            setSelectedStudentId('');
        }
    };

    const removeStudent = (id: string) => {
        setAssignedStudentIds(prev => prev.filter(sid => sid !== id));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData, assignments, assignedStudentIds);
    };
    
    const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || 'Desconocido';
    const getRoleName = (id: string) => roles.find(r => r.id === id)?.name || 'Desconocido';
    const getStudentName = (id: string) => allStudents.find(s => s.id === id)?.name || 'Estudiante';

    // Estudiantes que no tienen proyecto o que ya están en este proyecto
    const availableStudents = allStudents.filter(s => !s.projectId || assignedStudentIds.includes(s.id));

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-uninunez-ash uppercase tracking-widest mb-1.5">Título del Proyecto</label>
                    <input type="text" name="title" value={formData.title || ''} onChange={handleChange} required className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-uninunez-orange focus:border-uninunez-orange text-sm disabled:bg-gray-50" disabled={!canEditDetails} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-uninunez-ash uppercase tracking-widest mb-1.5">Fecha de Radicación</label>
                        <input type="date" name="presentationDate" value={formData.presentationDate || ''} onChange={handleChange} required className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-uninunez-orange focus:border-uninunez-orange text-sm disabled:bg-gray-50" disabled={!canEditDetails}/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-uninunez-ash uppercase tracking-widest mb-1.5">Estado del Proceso</label>
                        <select name="statusId" value={formData.statusId || ''} onChange={handleChange} required className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-uninunez-orange focus:border-uninunez-orange text-sm disabled:bg-gray-50" disabled={!canEditDetails && !gradeInfo.canGrade}>
                            {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>
            
            <div className="pt-4 border-t border-gray-100">
                <h4 className="text-sm font-black text-uninunez-onix uppercase tracking-widest mb-4">Integrantes (Estudiantes)</h4>
                <div className="space-y-2 mb-3">
                    {assignedStudentIds.map(sid => (
                        <div key={sid} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                            <span className="text-sm font-medium text-gray-700">{getStudentName(sid)}</span>
                            {canEditDetails && (
                                <button type="button" onClick={() => removeStudent(sid)} className="text-red-500 hover:text-red-700 p-1">
                                    <TrashIcon className="h-4 w-4"/>
                                </button>
                            )}
                        </div>
                    ))}
                    {assignedStudentIds.length === 0 && <p className="text-xs text-gray-400 italic">No hay estudiantes vinculados.</p>}
                </div>
                {canEditDetails && (
                    <div className="flex gap-2">
                        <select 
                            value={selectedStudentId} 
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            className="flex-grow border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-uninunez-orange"
                        >
                            <option value="">Seleccionar Estudiante...</option>
                            {availableStudents.filter(s => !assignedStudentIds.includes(s.id)).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <button type="button" onClick={handleAddStudent} className="bg-uninunez-orange text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-uninunez-orangeLight shadow-md">
                            Añadir
                        </button>
                    </div>
                )}
            </div>

            <div className="pt-4 border-t border-gray-100">
                <h4 className="text-sm font-black text-uninunez-onix uppercase tracking-widest mb-4">Asignaciones (Docentes)</h4>
                <div className="space-y-2 mb-3">
                    {assignments.map(a => (
                        <div key={a.tempId} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                            <span className="text-sm font-medium text-gray-700">{getTeacherName(a.teacherId)} — <span className="text-uninunez-teal font-bold text-xs uppercase">{getRoleName(a.roleId)}</span></span>
                            {canEditDetails && (
                                <button type="button" onClick={() => setAssignments(prev => prev.filter(x => x.tempId !== a.tempId))} className="text-red-500 hover:text-red-700 p-1">
                                    <TrashIcon className="h-4 w-4"/>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                {canEditDetails && (
                    <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
                        <select name="teacherId" value={newAssignment.teacherId} onChange={(e) => setNewAssignment(p => ({...p, teacherId: e.target.value}))} className="sm:col-span-3 border border-gray-300 rounded-lg px-3 py-2 text-sm">
                            <option value="">Docente...</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <select name="roleId" value={newAssignment.roleId} onChange={(e) => setNewAssignment(p => ({...p, roleId: e.target.value}))} className="sm:col-span-3 border border-gray-300 rounded-lg px-3 py-2 text-sm">
                            <option value="">Rol...</option>
                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <button type="button" onClick={handleAddAssignment} className="sm:col-span-1 bg-uninunez-orange text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-uninunez-orangeLight shadow-md">
                            Añadir
                        </button>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
                <button type="button" onClick={onClose} className="px-6 py-2.5 border-2 border-gray-200 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-8 py-2.5 bg-uninunez-orange text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-uninunez-orangeLight shadow-lg transform transition active:scale-95">Guardar Proyecto</button>
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

    const handleSave = async (projectData: Partial<Project>, assignments: Array<{teacherId: string, roleId: string}>, studentIds: string[]) => {
        let savedProject: Project;
        if (editingProject) {
            savedProject = await db.updateProject({ ...editingProject, ...projectData } as Project);
        } else {
            savedProject = await db.addProject(projectData as Omit<Project, 'id'>);
        }

        // 1. Sincronizar Docentes
        if (userPerms[savedProject.id]?.canEdit || isAdmin || !editingProject) {
            await db.deleteProjectTeachersByProject(savedProject.id);
            for (const a of assignments) {
                await db.addProjectTeacher({ projectId: savedProject.id, teacherId: a.teacherId, roleId: a.roleId });
            }

            // 2. Sincronizar Estudiantes
            // Liberar estudiantes que antes estaban en este proyecto pero ya no
            const prevProjectStudents = students.filter(s => s.projectId === savedProject.id);
            for (const s of prevProjectStudents) {
                if (!studentIds.includes(s.id)) {
                    await db.updateStudent({ ...s, projectId: null });
                }
            }
            // Asignar nuevos estudiantes
            for (const sid of studentIds) {
                const s = students.find(x => x.id === sid);
                if (s && s.projectId !== savedProject.id) {
                    await db.updateStudent({ ...s, projectId: savedProject.id });
                }
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
                <div>
                    <h1 className="text-3xl font-black text-uninunez-onix font-display uppercase tracking-tight">Banco de Proyectos</h1>
                    <p className="text-uninunez-ash text-sm font-medium">Gestión integral de trabajos de grado y asignaciones.</p>
                </div>
                {isAdmin && (
                    <button 
                        onClick={() => { setEditingProject(null); setIsModalOpen(true); }} 
                        className="bg-uninunez-orange text-white px-6 py-2.5 rounded-xl flex items-center text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-uninunez-orangeLight transition-transform active:scale-95"
                    >
                        <PlusIcon className="h-5 w-5 mr-2"/> Nuevo Proyecto
                    </button>
                )}
            </div>
            <div className="bg-white shadow-sm border border-gray-100 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Título del Proyecto</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estado Actual</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {projects.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-bold text-uninunez-onix">{p.title}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg bg-uninunez-teal/10 text-uninunez-teal">
                                            {statuses.find(s => s.id === p.statusId)?.name || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex gap-3">
                                        {(userPerms[p.id]?.canEdit || userPerms[p.id]?.grade.canGrade) && (
                                            <button onClick={() => { setEditingProject(p); setIsModalOpen(true); }} className="text-uninunez-teal hover:text-uninunez-tealLight p-1.5 hover:bg-uninunez-teal/5 rounded-lg transition-colors">
                                                <EditIcon className="h-5 w-5"/>
                                            </button>
                                        )}
                                        {userPerms[p.id]?.canEdit && (
                                            <button onClick={() => setDeletingProject(p)} className="text-red-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                                                <TrashIcon className="h-5 w-5"/>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {projects.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="text-center py-20 text-gray-400 italic text-sm">No se han registrado proyectos en la plataforma.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProject ? 'Actualizar Información de Proyecto' : 'Registro de Nuevo Proyecto'}>
                {isModalOpen && (
                    <ProjectForm 
                        project={editingProject} 
                        onSave={handleSave} 
                        onClose={() => setIsModalOpen(false)} 
                        statuses={statuses} 
                        formats={formats} 
                        teachers={teachers} 
                        allStudents={students}
                        roles={roles} 
                        initialAssignments={editingProject ? projectTeachers.filter(pt => pt.projectId === editingProject.id) : []} 
                        initialStudentIds={editingProject ? students.filter(s => s.projectId === editingProject.id).map(s => s.id) : []}
                        canEditDetails={editingProject ? userPerms[editingProject.id]?.canEdit : isAdmin} 
                        gradeInfo={editingProject ? userPerms[editingProject.id]?.grade : {canGrade: false, reviewerRole: null}} 
                    />
                )}
            </Modal>
            <ConfirmationDialog isOpen={!!deletingProject} onClose={() => setDeletingProject(null)} onConfirm={handleDelete} title="Confirmar Eliminación" message="¿Estás seguro de que deseas eliminar este proyecto del banco institucional? Esta acción es irreversible." />
        </div>
    );
};
