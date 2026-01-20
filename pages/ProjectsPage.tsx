
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { Project, Student, Teacher, TeacherRole, Status, Format, ProjectTeacher } from '../types';
import { Modal } from '../components/Modal';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { PlusIcon, EditIcon, TrashIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

const ProjectForm: React.FC<{
    project: Partial<Project> | null;
    onSave: (projectData: Partial<Project>, assignments: Array<{teacherId: string, roleId: string}>, studentIds: string[]) => Promise<void>;
    onClose: () => void;
    statuses: Status[];
    formats: Format[];
    teachers: Teacher[];
    allStudents: Student[];
    roles: TeacherRole[];
    initialAssignments: ProjectTeacher[];
    initialStudentIds: string[];
    canEditDetails: boolean;
    gradeInfo: { canGrade: boolean, reviewerRole: string | null, reviewerSlot: 1 | 2 | 'admin' | null };
}> = ({ project, onSave, onClose, statuses, formats, teachers, allStudents, roles, initialAssignments, initialStudentIds, canEditDetails, gradeInfo }) => {
    const { isAdmin } = useAuth();
    const [formData, setFormData] = useState<Partial<Project>>({});
    const [assignments, setAssignments] = useState<Array<{teacherId: string, roleId: string, tempId: number}>>([]);
    const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);
    const [newAssignment, setNewAssignment] = useState({ teacherId: '', roleId: '' });
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

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
        const { name, value, type } = e.target;
        let val: any = value;
        
        if (type === 'number') {
            if (value === '') {
                val = null;
            } else {
                const num = parseFloat(value);
                if (num < 1.0 || num > 5.0) return;
                val = num;
            }
        }
        setFormData(prev => ({ ...prev, [name]: val }));
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

    const calculateFinalGrade = () => {
        const g1w = formData.writtenGradeReviewer1 ?? 0;
        const g1p = formData.presentationGradeReviewer1 ?? 0;
        const g2w = formData.writtenGradeReviewer2 ?? 0;
        const g2p = formData.presentationGradeReviewer2 ?? 0;

        let ev1Avg = 0;
        let ev2Avg = 0;
        let activeEvaluators = 0;

        if (g1w > 0 || g1p > 0) {
            ev1Avg = (g1w + g1p) / ((g1w > 0 ? 1 : 0) + (g1p > 0 ? 1 : 0));
            activeEvaluators++;
        }
        if (g2w > 0 || g2p > 0) {
            ev2Avg = (g2w + g2p) / ((g2w > 0 ? 1 : 0) + (g2p > 0 ? 1 : 0));
            activeEvaluators++;
        }

        if (activeEvaluators === 0) return "0.00";
        return ((ev1Avg + ev2Avg) / activeEvaluators).toFixed(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;
        
        if (!formData.title?.trim() || !formData.presentationDate) {
            alert("Título y Fecha son obligatorios.");
            return;
        }

        setIsSaving(true);
        try {
            await onSave(formData, assignments, assignedStudentIds);
            onClose();
        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Error al guardar los datos. Intente nuevamente.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || 'Desconocido';
    const getRoleName = (id: string) => roles.find(r => r.id === id)?.name || 'Desconocido';
    const getStudentName = (id: string) => allStudents.find(s => s.id === id)?.name || 'Estudiante';

    const isGradingDisabled1 = !(isAdmin || gradeInfo.reviewerSlot === 1);
    const isGradingDisabled2 = !(isAdmin || gradeInfo.reviewerSlot === 2);

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div>
                    <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-[0.1em] mb-1.5 ml-1">Título del Proyecto</label>
                    <input type="text" name="title" value={formData.title || ''} onChange={handleChange} required className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-uninunez-orange focus:border-uninunez-orange text-sm disabled:bg-gray-50" disabled={!canEditDetails} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-[0.1em] mb-1.5 ml-1">Fecha de Radicación</label>
                        <input type="date" name="presentationDate" value={formData.presentationDate || ''} onChange={handleChange} required className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-uninunez-orange focus:border-uninunez-orange text-sm disabled:bg-gray-50" disabled={!canEditDetails}/>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-[0.1em] mb-1.5 ml-1">Estado Institucional</label>
                        <select name="statusId" value={formData.statusId || ''} onChange={handleChange} required className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-uninunez-orange focus:border-uninunez-orange text-sm disabled:bg-gray-50" disabled={!canEditDetails && !gradeInfo.canGrade}>
                            {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-uninunez-onix/5 p-6 rounded-2xl border border-uninunez-onix/10 space-y-4">
                <div className="flex justify-between items-center border-b border-uninunez-onix/10 pb-4">
                    <div>
                        <h4 className="text-[11px] font-black text-uninunez-onix uppercase tracking-[0.2em]">Evaluación Académica (Evaluadores)</h4>
                        <p className="text-[9px] text-uninunez-ash font-bold uppercase mt-1">Escala Institucional 1.0 - 5.0</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-uninunez-ash uppercase">Nota Final:</span>
                        <div className="bg-uninunez-orange text-white px-4 py-1.5 rounded-lg text-sm font-black shadow-md min-w-[60px] text-center">
                            {calculateFinalGrade()}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-4 rounded-xl border-2 transition-all ${!isGradingDisabled1 ? 'bg-white border-uninunez-teal shadow-md' : 'bg-gray-50 border-transparent opacity-60'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] font-black text-uninunez-teal uppercase tracking-widest">Docente Evaluador 1</p>
                            {!isGradingDisabled1 && <span className="bg-uninunez-teal text-white text-[8px] px-2 py-0.5 rounded uppercase font-bold animate-pulse">Habilitado</span>}
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Nota Escrita</label>
                                <input type="number" step="0.1" min="1" max="5" name="writtenGradeReviewer1" value={formData.writtenGradeReviewer1 ?? ''} onChange={handleChange} disabled={isGradingDisabled1} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-uninunez-teal font-bold text-uninunez-onix" placeholder="0.0" />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Nota Sustentación</label>
                                <input type="number" step="0.1" min="1" max="5" name="presentationGradeReviewer1" value={formData.presentationGradeReviewer1 ?? ''} onChange={handleChange} disabled={isGradingDisabled1} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-uninunez-teal font-bold text-uninunez-onix" placeholder="0.0" />
                            </div>
                        </div>
                    </div>

                    <div className={`p-4 rounded-xl border-2 transition-all ${!isGradingDisabled2 ? 'bg-white border-uninunez-teal shadow-md' : 'bg-gray-50 border-transparent opacity-60'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] font-black text-uninunez-teal uppercase tracking-widest">Docente Evaluador 2</p>
                            {!isGradingDisabled2 && <span className="bg-uninunez-teal text-white text-[8px] px-2 py-0.5 rounded uppercase font-bold animate-pulse">Habilitado</span>}
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Nota Escrita</label>
                                <input type="number" step="0.1" min="1" max="5" name="writtenGradeReviewer2" value={formData.writtenGradeReviewer2 ?? ''} onChange={handleChange} disabled={isGradingDisabled2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-uninunez-teal font-bold text-uninunez-onix" placeholder="0.0" />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Nota Sustentación</label>
                                <input type="number" step="0.1" min="1" max="5" name="presentationGradeReviewer2" value={formData.presentationGradeReviewer2 ?? ''} onChange={handleChange} disabled={isGradingDisabled2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-uninunez-teal font-bold text-uninunez-onix" placeholder="0.0" />
                            </div>
                        </div>
                    </div>
                </div>
                
                {gradeInfo.canGrade && !isAdmin && (
                    <div className="mt-2 text-[9px] font-bold text-uninunez-ash bg-white/50 p-2 rounded-lg border border-uninunez-onix/5 text-center uppercase tracking-tight">
                        Acceso de Evaluador: <span className="text-uninunez-teal">{gradeInfo.reviewerRole}</span>. 
                        Los campos de calificación están restringidos a su rol asignado.
                    </div>
                )}
            </div>
            
            <div className="pt-4 border-t border-gray-100">
                <h4 className="text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-4 ml-1">Integrantes Estudiantiles</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                    {assignedStudentIds.map(sid => (
                        <div key={sid} className="flex items-center bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
                            <span className="text-xs font-bold text-gray-600 mr-2">{getStudentName(sid)}</span>
                            {canEditDetails && (
                                <button type="button" onClick={() => removeStudent(sid)} className="text-red-400 hover:text-red-600 transition-colors">
                                    <TrashIcon className="h-3.5 w-3.5"/>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                {canEditDetails && (
                    <div className="flex gap-2">
                        <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="flex-grow border border-gray-200 rounded-xl px-4 py-2.5 text-sm">
                            <option value="">Vincular Estudiante...</option>
                            {allStudents.filter(s => (!s.projectId || assignedStudentIds.includes(s.id)) && !assignedStudentIds.includes(s.id)).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <button type="button" onClick={handleAddStudent} className="bg-uninunez-orange text-white px-5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-uninunez-orangeLight shadow-md">Añadir</button>
                    </div>
                )}
            </div>

            <div className="pt-4 border-t border-gray-100">
                <h4 className="text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-4 ml-1">Cuerpo Docente del Proyecto</h4>
                <div className="space-y-2 mb-4">
                    {assignments.map(a => (
                        <div key={a.tempId} className="flex justify-between items-center bg-white px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm">
                            <span className="text-sm font-bold text-gray-700">{getTeacherName(a.teacherId)} — <span className="text-uninunez-orange text-[10px] uppercase font-black">{getRoleName(a.roleId)}</span></span>
                            {canEditDetails && (
                                <button type="button" onClick={() => setAssignments(prev => prev.filter(x => x.tempId !== a.tempId))} className="text-red-400 hover:text-red-600 p-1">
                                    <TrashIcon className="h-4 w-4"/>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                {canEditDetails && (
                    <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
                        <select value={newAssignment.teacherId} onChange={(e) => setNewAssignment(p => ({...p, teacherId: e.target.value}))} className="sm:col-span-3 border border-gray-200 rounded-xl px-4 py-2.5 text-sm">
                            <option value="">Docente...</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <select value={newAssignment.roleId} onChange={(e) => setNewAssignment(p => ({...p, roleId: e.target.value}))} className="sm:col-span-3 border border-gray-200 rounded-xl px-4 py-2.5 text-sm">
                            <option value="">Rol...</option>
                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <button type="button" onClick={handleAddAssignment} className="sm:col-span-1 bg-uninunez-orange text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-uninunez-orangeLight shadow-md">OK</button>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
                <button type="button" onClick={onClose} disabled={isSaving} className="px-6 py-3 border-2 border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all">Cancelar</button>
                <button type="submit" disabled={isSaving} className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transform transition active:scale-95 ${isSaving ? 'bg-gray-400' : 'bg-uninunez-orange hover:bg-uninunez-orangeLight text-white'}`}>
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
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

    const [userPerms, setUserPerms] = useState<Record<string, {canEdit: boolean, grade: {canGrade: boolean, reviewerRole: string | null, reviewerSlot: 1 | 2 | 'admin' | null}}>>({});

    const loadData = useCallback(async () => {
        try {
            const [p, s, t, r, st, f, pt] = await Promise.all([
                db.getProjects(), db.getStudents(), db.getTeachers(),
                db.getTeacherRoles(), db.getStatuses(), db.getFormats(),
                db.getProjectTeachers()
            ]);
            
            const perms: any = {};
            for(const project of p) {
                perms[project.id] = {
                    canEdit: await canEditProject(project.id),
                    grade: await canGradeProject(project.id)
                };
            }
            
            setProjects(p);
            setStudents(s);
            setTeachers(t);
            setRoles(r);
            setStatuses(st);
            setFormats(f);
            setProjectTeachers(pt);
            setUserPerms(perms);
        } catch (error) {
            console.error("Error cargando datos maestros:", error);
        }
    }, [canEditProject, canGradeProject]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (projectData: Partial<Project>, assignments: Array<{teacherId: string, roleId: string}>, studentIds: string[]) => {
        try {
            let savedProject: Project;
            const isEditing = !!editingProject;
            
            if (isEditing) {
                savedProject = await db.updateProject({ ...editingProject, ...projectData } as Project);
            } else {
                savedProject = await db.addProject(projectData as Omit<Project, 'id'>);
            }

            // Solo actualizar vínculos si es administrador o creador (o si es nuevo)
            if (!isEditing || isAdmin || userPerms[savedProject.id]?.canEdit) {
                await db.deleteProjectTeachersByProject(savedProject.id);
                for (const a of assignments) {
                    await db.addProjectTeacher({ projectId: savedProject.id, teacherId: a.teacherId, roleId: a.roleId });
                }

                // Actualizar estudiantes vinculados
                const studentsData = await db.getStudents();
                const prevProjectStudents = studentsData.filter(s => s.projectId === savedProject.id);
                
                for (const s of prevProjectStudents) {
                    if (!studentIds.includes(s.id)) {
                        await db.updateStudent({ ...s, projectId: null });
                    }
                }
                for (const sid of studentIds) {
                    const s = studentsData.find(x => x.id === sid);
                    if (s && s.projectId !== savedProject.id) {
                        await db.updateStudent({ ...s, projectId: savedProject.id });
                    }
                }
            }

            await loadData();
            setIsModalOpen(false);
        } catch (err) {
            console.error("Error en proceso de guardado:", err);
            throw err;
        }
    };

    const handleDelete = async () => {
        if (deletingProject) {
            try {
                await db.deleteProject(deletingProject.id);
                await loadData();
                setDeletingProject(null);
            } catch (err) {
                alert("No se pudo eliminar el proyecto.");
            }
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-uninunez-onix font-display uppercase tracking-tight">Gestión Académica</h1>
                    <p className="text-uninunez-ash text-sm font-medium">Control de trabajos de grado, evaluaciones y seguimiento.</p>
                </div>
                {isAdmin && (
                    <button 
                        onClick={() => { setEditingProject(null); setIsModalOpen(true); }} 
                        className="bg-uninunez-orange text-white px-6 py-3 rounded-xl flex items-center text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-uninunez-orangeLight transition-all active:scale-95"
                    >
                        <PlusIcon className="h-5 w-5 mr-2"/> Registrar Proyecto
                    </button>
                )}
            </div>

            <div className="bg-white shadow-sm border border-gray-100 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Proyecto</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado de Trámite</th>
                                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {projects.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="text-sm font-bold text-uninunez-onix group-hover:text-uninunez-orange transition-colors">{p.title}</div>
                                        <div className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tight">Radicado: {p.presentationDate}</div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-uninunez-teal/10 text-uninunez-teal">
                                            {statuses.find(s => s.id === p.statusId)?.name || 'POR DEFINIR'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-2">
                                            {(isAdmin || userPerms[p.id]?.canEdit || userPerms[p.id]?.grade.canGrade) && (
                                                <button onClick={() => { setEditingProject(p); setIsModalOpen(true); }} className="p-2.5 bg-uninunez-teal/5 text-uninunez-teal hover:bg-uninunez-teal hover:text-white rounded-xl transition-all">
                                                    <EditIcon className="h-5 w-5"/>
                                                </button>
                                            )}
                                            {(isAdmin || userPerms[p.id]?.canEdit) && (
                                                <button onClick={() => setDeletingProject(p)} className="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all">
                                                    <TrashIcon className="h-5 w-5"/>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {projects.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="text-center py-10 text-gray-400 italic">No hay proyectos registrados.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProject ? 'Ficha Técnica de Proyecto' : 'Registro de Nuevo Proyecto'}>
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
                        canEditDetails={editingProject ? (isAdmin || userPerms[editingProject.id]?.canEdit) : isAdmin} 
                        gradeInfo={editingProject ? userPerms[editingProject.id]?.grade : {canGrade: false, reviewerRole: null, reviewerSlot: null}} 
                    />
                )}
            </Modal>
            <ConfirmationDialog isOpen={!!deletingProject} onClose={() => setDeletingProject(null)} onConfirm={handleDelete} title="Confirmar Eliminación" message="¿Estás seguro de que deseas eliminar este proyecto del banco institucional? Esta acción eliminará también las asignaciones y calificaciones registradas." />
        </div>
    );
};
