
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
    gradeInfo: { canGrade: boolean, reviewerRole: string | null };
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
            presentationGradeReviewer2: null, finalGrade: null, ...project
        };
        setFormData(initialData);
        setAssignments(initialAssignments.map(a => ({ teacherId: a.teacherId, roleId: a.roleId, tempId: Math.random() })));
        setAssignedStudentIds(initialStudentIds);
        setNewAssignment({ teacherId: '', roleId: '' });
        setSelectedStudentId('');
    }, [project, initialAssignments, initialStudentIds, statuses]);

    const calculateFinalAverage = (data: Partial<Project>) => {
        const g1w = data.writtenGradeReviewer1;
        const g1p = data.presentationGradeReviewer1;
        const g2w = data.writtenGradeReviewer2;
        const g2p = data.presentationGradeReviewer2;

        let avg1 = 0; let count1 = 0;
        if (g1w !== null) { avg1 += g1w; count1++; }
        if (g1p !== null) { avg1 += g1p; count1++; }
        const finalAvg1 = count1 > 0 ? avg1 / count1 : null;

        let avg2 = 0; let count2 = 0;
        if (g2w !== null) { avg2 += g2w; count2++; }
        if (g2p !== null) { avg2 += g2p; count2++; }
        const finalAvg2 = count2 > 0 ? avg2 / count2 : null;

        if (finalAvg1 !== null && finalAvg2 !== null) {
            return Number(((finalAvg1 + finalAvg2) / 2).toFixed(2));
        } else if (finalAvg1 !== null) {
            return Number(finalAvg1.toFixed(2));
        } else if (finalAvg2 !== null) {
            return Number(finalAvg2.toFixed(2));
        }
        return null;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let finalValue: any = value;
        if (type === 'number') {
            if (value === '') finalValue = null;
            else {
                const num = parseFloat(value);
                if (num < 1.0 || num > 5.0) return;
                finalValue = num;
            }
        }
        setFormData(prev => {
            const nextData = { ...prev, [name]: finalValue };
            if (name.includes('Grade')) nextData.finalGrade = calculateFinalAverage(nextData);
            return nextData;
        });
    };

    const handleAddAssignment = () => {
        if (newAssignment.teacherId && newAssignment.roleId) {
            if (assignments.some(a => a.teacherId === newAssignment.teacherId)) { alert('Docente ya asignado.'); return; }
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

    const removeStudent = (id: string) => setAssignedStudentIds(prev => prev.filter(sid => sid !== id));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;
        if (!formData.title?.trim() || !formData.presentationDate) { alert("Título y Fecha obligatorios."); return; }
        setIsSaving(true);
        try { 
            await onSave(formData, assignments, assignedStudentIds); 
            onClose(); 
        }
        catch (error) { console.error(error); alert("Error al guardar."); }
        finally { setIsSaving(false); }
    };
    
    const getTeacherName = (id: string) => teachers.find(t => t.id === id)?.name || 'Desconocido';
    const getRoleName = (id: string) => roles.find(r => r.id === id)?.name || 'Desconocido';
    const getStudentName = (id: string) => {
        const found = allStudents.find(s => s.id === id);
        return found ? found.name : 'Estudiante no encontrado';
    };

    const canGradeReviewer1 = isAdmin || (gradeInfo.canGrade && gradeInfo.reviewerRole?.toLowerCase().includes('1'));
    const canGradeReviewer2 = isAdmin || (gradeInfo.canGrade && gradeInfo.reviewerRole?.toLowerCase().includes('2'));

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 scrollbar-thin">
            <div className="space-y-4">
                <div>
                    <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1 ml-1">Título Institucional</label>
                    <input type="text" name="title" value={formData.title || ''} onChange={handleChange} required className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-uninunez-orange focus:border-uninunez-orange text-sm disabled:bg-gray-50 font-bold" disabled={!canEditDetails} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1 ml-1">Fecha de Radicación</label>
                        <input type="date" name="presentationDate" value={formData.presentationDate || ''} onChange={handleChange} required className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-uninunez-orange focus:border-uninunez-orange text-sm disabled:bg-gray-50" disabled={!canEditDetails}/>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1 ml-1">Estado del Proyecto</label>
                        <select name="statusId" value={formData.statusId || ''} onChange={handleChange} required className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-uninunez-orange focus:border-uninunez-orange text-sm disabled:bg-gray-50" disabled={!canEditDetails && !gradeInfo.canGrade}>
                            {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-uninunez-onix/5 p-5 rounded-2xl border border-uninunez-onix/10 space-y-4">
                <div className="flex justify-between items-center border-b border-uninunez-onix/10 pb-3">
                    <h4 className="text-[10px] font-black text-uninunez-onix uppercase tracking-widest">Calificaciones Académicas</h4>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-uninunez-ash uppercase">Promedio:</span>
                        <div className="bg-uninunez-orange text-white px-3 py-1 rounded-lg text-xs font-black shadow-md min-w-[50px] text-center">{formData.finalGrade?.toFixed(2) || '0.00'}</div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`p-4 rounded-xl border-2 transition-all ${canGradeReviewer1 ? 'bg-white border-uninunez-teal/30 shadow-sm' : 'bg-gray-100 border-transparent opacity-60'}`}>
                        <p className="text-[10px] font-black text-uninunez-teal uppercase mb-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-uninunez-teal"></span> Evaluador 1</p>
                        <div className="grid grid-cols-2 gap-3">
                            <input type="number" step="0.1" name="writtenGradeReviewer1" placeholder="Escrito" value={formData.writtenGradeReviewer1 ?? ''} onChange={handleChange} disabled={!canGradeReviewer1} className="w-full text-xs border rounded-lg p-2 font-bold" />
                            <input type="number" step="0.1" name="presentationGradeReviewer1" placeholder="Sust." value={formData.presentationGradeReviewer1 ?? ''} onChange={handleChange} disabled={!canGradeReviewer1} className="w-full text-xs border rounded-lg p-2 font-bold" />
                        </div>
                    </div>
                    <div className={`p-4 rounded-xl border-2 transition-all ${canGradeReviewer2 ? 'bg-white border-uninunez-teal/30 shadow-sm' : 'bg-gray-100 border-transparent opacity-60'}`}>
                        <p className="text-[10px] font-black text-uninunez-teal uppercase mb-3 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-uninunez-teal"></span> Evaluador 2</p>
                        <div className="grid grid-cols-2 gap-3">
                            <input type="number" step="0.1" name="writtenGradeReviewer2" placeholder="Escrito" value={formData.writtenGradeReviewer2 ?? ''} onChange={handleChange} disabled={!canGradeReviewer2} className="w-full text-xs border rounded-lg p-2 font-bold" />
                            <input type="number" step="0.1" name="presentationGradeReviewer2" placeholder="Sust." value={formData.presentationGradeReviewer2 ?? ''} onChange={handleChange} disabled={!canGradeReviewer2} className="w-full text-xs border rounded-lg p-2 font-bold" />
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="pt-4 border-t border-gray-100">
                <h4 className="text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-4 ml-1">Integrantes (Estudiantes)</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                    {assignedStudentIds.length > 0 ? assignedStudentIds.map(sid => (
                        <div key={sid} className="flex items-center bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm">
                            <span className="text-[10px] font-bold text-gray-700 mr-2">{getStudentName(sid)}</span>
                            {canEditDetails && <button type="button" onClick={() => removeStudent(sid)} className="text-red-400 hover:text-red-600"><TrashIcon className="h-3.5 w-3.5"/></button>}
                        </div>
                    )) : <p className="text-[10px] text-gray-400 italic py-2">No hay estudiantes vinculados todavía.</p>}
                </div>
                {canEditDetails && (
                    <div className="flex gap-2">
                        <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="flex-grow border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                            <option value="">Vincular estudiante...</option>
                            {allStudents.filter(s => (!s.projectId || assignedStudentIds.includes(s.id)) && !assignedStudentIds.includes(s.id)).map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.cedula})</option>
                            ))}
                        </select>
                        <button type="button" onClick={handleAddStudent} className="bg-uninunez-orange text-white px-5 rounded-xl text-[10px] font-black uppercase hover:bg-uninunez-orangeLight">Añadir</button>
                    </div>
                )}
            </div>

            <div className="pt-4 border-t border-gray-100">
                <h4 className="text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-4 ml-1">Asignaciones (Docentes)</h4>
                <div className="space-y-2 mb-4">
                    {assignments.map(a => (
                        <div key={a.tempId} className="flex justify-between items-center bg-white px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm">
                            <span className="text-[11px] font-bold text-gray-700">{getTeacherName(a.teacherId)} — <span className="text-uninunez-teal uppercase font-black tracking-widest">{getRoleName(a.roleId)}</span></span>
                            {canEditDetails && <button type="button" onClick={() => setAssignments(prev => prev.filter(x => x.tempId !== a.tempId))} className="text-red-400 p-1"><TrashIcon className="h-4 w-4"/></button>}
                        </div>
                    ))}
                </div>
                {canEditDetails && (
                    <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
                        <select value={newAssignment.teacherId} onChange={(e) => setNewAssignment(p => ({...p, teacherId: e.target.value}))} className="sm:col-span-3 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                            <option value="">Seleccionar Docente...</option>
                            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <select value={newAssignment.roleId} onChange={(e) => setNewAssignment(p => ({...p, roleId: e.target.value}))} className="sm:col-span-3 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                            <option value="">Rol...</option>
                            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <button type="button" onClick={handleAddAssignment} className="sm:col-span-1 bg-uninunez-orange text-white rounded-xl text-[10px] font-black uppercase">OK</button>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t sticky bottom-0 bg-white/95 pb-2">
                <button type="button" onClick={onClose} disabled={isSaving} className="px-6 py-3 border-2 border-gray-100 rounded-xl text-[10px] font-black uppercase text-gray-400">Cancelar</button>
                <button type="submit" disabled={isSaving} className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase shadow-xl transition-all ${isSaving ? 'bg-gray-400' : 'bg-uninunez-orange hover:bg-uninunez-orangeLight text-white'}`}>
                    {isSaving ? 'Guardando...' : project ? 'Actualizar Proyecto' : 'Guardar Proyecto'}
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
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [deletingProject, setDeletingProject] = useState<Project | null>(null);
    const [userPerms, setUserPerms] = useState<Record<string, any>>({});

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [p, s, t, r, st, f, pt] = await Promise.all([
                db.getProjects(), 
                db.getStudents(), 
                db.getTeachers(),
                db.getTeacherRoles(), 
                db.getStatuses(), 
                db.getFormats(),
                db.getProjectTeachers()
            ]);
            
            const perms: any = {};
            for(const project of p) {
                perms[project.id] = { 
                    canEdit: await canEditProject(project.id), 
                    grade: await canGradeProject(project.id) 
                };
            }
            
            setProjects([...p]); 
            setStudents([...s]); 
            setTeachers([...t]); 
            setRoles([...r]); 
            setStatuses([...st]); 
            setFormats([...f]); 
            setProjectTeachers([...pt]); 
            setUserPerms(perms);
        } catch (error) { 
            console.error("Error al cargar datos:", error); 
        } finally { 
            setIsLoading(false); 
        }
    }, [canEditProject, canGradeProject]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSave = async (projectData: Partial<Project>, assignments: Array<{teacherId: string, roleId: string}>, studentIds: string[]) => {
        try {
            let savedProject: Project;
            if (editingProject) {
                savedProject = await db.updateProject({ ...editingProject, ...projectData } as Project);
            } else {
                savedProject = await db.addProject(projectData as Omit<Project, 'id'>);
            }

            if (!editingProject || isAdmin || userPerms[savedProject.id]?.canEdit) {
                // 1. Limpiar docentes asignados
                await db.deleteProjectTeachersByProject(savedProject.id);
                for (const a of assignments) {
                    await db.addProjectTeacher({ projectId: savedProject.id, teacherId: a.teacherId, roleId: a.roleId });
                }
                
                // 2. Vincular estudiantes (Espera a que todos terminen para evitar desajustes)
                const sts = await db.getStudents();
                const studentUpdatePromises = [];
                
                // Desvincular los que ya no están
                const studentsToUnlink = sts.filter(s => s.projectId === savedProject.id && !studentIds.includes(s.id));
                for (const s of studentsToUnlink) {
                    studentUpdatePromises.push(db.updateStudent({ ...s, projectId: null }));
                }
                
                // Vincular nuevos
                for (const sid of studentIds) {
                    const s = sts.find(st => st.id === sid);
                    if (s && s.projectId !== savedProject.id) {
                        studentUpdatePromises.push(db.updateStudent({ ...s, projectId: savedProject.id }));
                    }
                }
                
                await Promise.all(studentUpdatePromises);
            }
            
            await loadData(); 
            setIsModalOpen(false);
            setEditingProject(null);
        } catch (err) { 
            console.error("Error guardando proyecto:", err); 
            alert("No se pudo guardar el proyecto. Revisa la consola (F12) para ver el error de Supabase.");
        }
    };

    const handleDelete = async () => { 
        if (deletingProject) { 
            await db.deleteProject(deletingProject.id); 
            await loadData(); 
            setDeletingProject(null); 
        } 
    };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-uninunez-onix font-display uppercase tracking-tight">Banco de Proyectos</h1>
                    <p className="text-uninunez-ash text-sm font-medium">Gestión integral de expedientes académicos.</p>
                </div>
                {isAdmin && (
                    <button 
                        onClick={() => { setEditingProject(null); setIsModalOpen(true); }} 
                        className="bg-uninunez-orange text-white px-6 py-3 rounded-xl flex items-center text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-uninunez-orangeLight transition-all active:scale-95"
                    >
                        <PlusIcon className="h-5 w-5 mr-2"/> Nuevo Proyecto
                    </button>
                )}
            </div>

            <div className="bg-white shadow-sm border border-gray-100 rounded-3xl overflow-hidden min-h-[400px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="w-12 h-12 border-4 border-uninunez-orange border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs font-black text-uninunez-ash uppercase tracking-widest">Sincronizando expedientes...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Proyecto</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Autores (Estudiantes)</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Nota Final</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {projects.map(p => {
                                    const linkedStudents = students.filter(s => s.projectId === p.id);
                                    return (
                                        <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="text-sm font-bold text-uninunez-onix group-hover:text-uninunez-orange transition-colors">{p.title}</div>
                                                <div className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tight">Radicación: {p.presentationDate}</div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-wrap gap-1">
                                                    {linkedStudents.length > 0 ? linkedStudents.map(s => (
                                                        <span key={s.id} className="inline-block px-2 py-0.5 bg-jade-50 text-[10px] font-bold text-jade-700 rounded uppercase border border-jade-100 shadow-sm">{s.name}</span>
                                                    )) : <span className="text-[10px] text-gray-300 italic">Sin estudiantes vinculados</span>}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg bg-uninunez-teal/10 text-uninunez-teal">{statuses.find(s => s.id === p.statusId)?.name || 'PENDIENTE'}</span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className={`px-3 py-1 text-sm font-black rounded-lg ${p.finalGrade ? (p.finalGrade >= 3.0 ? 'bg-jade-100 text-jade-700' : 'bg-red-100 text-red-600') : 'bg-gray-100 text-gray-400'}`}>{p.finalGrade?.toFixed(2) || '---'}</span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {(isAdmin || userPerms[p.id]?.canEdit || userPerms[p.id]?.grade?.canGrade) && (
                                                        <button onClick={() => { setEditingProject(p); setIsModalOpen(true); }} className="p-2.5 bg-uninunez-teal/5 text-uninunez-teal hover:bg-uninunez-teal hover:text-white rounded-xl shadow-sm transition-all"><EditIcon className="h-5 w-5"/></button>
                                                    )}
                                                    {(isAdmin || userPerms[p.id]?.canEdit) && <button onClick={() => setDeletingProject(p)} className="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl shadow-sm transition-all"><TrashIcon className="h-5 w-5"/></button>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {!isLoading && projects.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-20">
                                            <p className="text-uninunez-ash italic text-sm">No se han encontrado proyectos registrados.</p>
                                            {isAdmin && <p className="text-xs text-gray-400 mt-2">Haz clic en "Nuevo Proyecto" para comenzar.</p>}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProject ? 'Expediente de Proyecto' : 'Nuevo Registro Académico'}>
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
                        canEditDetails={editingProject ? (isAdmin || userPerms[editingProject.id]?.canEdit) : true} 
                        gradeInfo={editingProject ? userPerms[editingProject.id]?.grade : {canGrade: false, reviewerRole: null}} 
                    />
                )}
            </Modal>
            <ConfirmationDialog isOpen={!!deletingProject} onClose={() => setDeletingProject(null)} onConfirm={handleDelete} title="Confirmar Eliminación" message="¿Desea eliminar permanentemente este expediente del banco institucional? Esta acción borrará todas las notas asociadas." />
        </div>
    );
};
