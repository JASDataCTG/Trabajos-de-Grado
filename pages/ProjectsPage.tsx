
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { db } from '../services/database';
import { Project, Student, Teacher, TeacherRole, Status, Format, ProjectTeacher, Program } from '../types';
import { Modal } from '../components/Modal';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { PlusIcon, EditIcon, TrashIcon, SearchIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

const ProjectForm: React.FC<{
    project: Partial<Project> | null;
    onSave: (projectData: Partial<Project>, assignments: Array<{teacherId: string, roleId: string}>, studentIds: string[]) => Promise<void>;
    onClose: () => void;
    statuses: Status[];
    formats: Format[];
    programs: Program[];
    teachers: Teacher[];
    allStudents: Student[];
    roles: TeacherRole[];
    initialAssignments: ProjectTeacher[];
    initialStudentIds: string[];
    canEditDetails: boolean;
    gradeInfo: { canGrade: boolean, reviewerRole: string | null };
    existingProjects: Project[];
    allProjectTeachers: ProjectTeacher[];
}> = ({ project, onSave, onClose, statuses, formats, programs, teachers, allStudents, roles, initialAssignments, initialStudentIds, canEditDetails, gradeInfo, existingProjects, allProjectTeachers }) => {
    const { isAdmin } = useAuth();
    const [formData, setFormData] = useState<Partial<Project>>({});
    const [assignments, setAssignments] = useState<Array<{teacherId: string, roleId: string, tempId: number}>>([]);
    const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);
    const [newAssignment, setNewAssignment] = useState({ teacherId: '', roleId: '' });
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [studentSearch, setStudentSearch] = useState('');
    const [teacherSearch, setTeacherSearch] = useState('');
    const [showStudentResults, setShowStudentResults] = useState(false);
    const [showTeacherResults, setShowTeacherResults] = useState(false);
    const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);

    const uniqueTitles = useMemo(() => {
        const titles = (existingProjects || [])
            .map(p => p.title)
            .filter(Boolean);
        return Array.from(new Set(titles));
    }, [existingProjects]);

    const filteredTitleSuggestions = useMemo(() => {
        const term = (formData.title || '').trim().toLowerCase();
        if (!term || term.length < 2) return [];
        return uniqueTitles.filter(title => 
            title.toLowerCase().includes(term) && 
            title.toLowerCase() !== term
        ).slice(0, 5);
    }, [formData.title, uniqueTitles]);

    useEffect(() => {
        let inferredProgramId = project?.programId;
        if (!inferredProgramId && initialStudentIds.length > 0) {
             const student = allStudents.find(s => s.id === initialStudentIds[0]);
             if (student && student.programId) {
                 inferredProgramId = student.programId;
             }
        }

        const initialData: Partial<Project> = {
            title: '', presentationDate: '', filesUrl: '',
            statusId: project?.statusId || statuses.find(s => s.name.toLowerCase().includes('presentado'))?.id || statuses[0]?.id || '', 
            formatId: project?.formatId || formats[0]?.id || '',
            isApprovedByDirector: false, writtenGradeReviewer1: null,
            presentationGradeReviewer1: null, writtenGradeReviewer2: null,
            presentationGradeReviewer2: null, finalGrade: null,
            ...project,
            programId: project?.programId || inferredProgramId || programs[0]?.id || '' 
        };
        setFormData(initialData);
        setAssignments(initialAssignments.map(a => ({ teacherId: a.teacherId, roleId: a.roleId, tempId: Math.random() })));
        setAssignedStudentIds(initialStudentIds);
        setNewAssignment({ teacherId: '', roleId: '' });
        setSelectedStudent(null);
    }, [project, initialAssignments, initialStudentIds, statuses, formats, programs, allStudents]);

    const calculateFinalAverage = (data: Partial<Project>) => {
        const g1w = data.writtenGradeReviewer1;
        const g1p = data.presentationGradeReviewer1;
        const g2w = data.writtenGradeReviewer2;
        const g2p = data.presentationGradeReviewer2;

        let avg1 = 0; let count1 = 0;
        if (g1w !== null && g1w !== undefined) { avg1 += Number(g1w); count1++; }
        if (g1p !== null && g1p !== undefined) { avg1 += Number(g1p); count1++; }
        const finalAvg1 = count1 > 0 ? avg1 / count1 : null;

        let avg2 = 0; let count2 = 0;
        if (g2w !== null && g2w !== undefined) { avg2 += Number(g2w); count2++; }
        if (g2p !== null && g2p !== undefined) { avg2 += Number(g2p); count2++; }
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
        
        if (name === 'title') {
            finalValue = value.toUpperCase();
        } else if (type === 'number') {
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
            setTeacherSearch('');
            setShowTeacherResults(false);
        }
    };

    const handleAddStudent = () => {
        if (selectedStudent && !assignedStudentIds.includes(selectedStudent.id)) {
            setAssignedStudentIds(prev => [...prev, selectedStudent.id]);
            setSelectedStudent(null);
            setStudentSearch('');
            setShowStudentResults(false);
        }
    };

    const removeStudent = (id: string) => setAssignedStudentIds(prev => prev.filter(sid => sid !== id));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;
        if (!formData.title?.trim() || !formData.presentationDate) { alert("Título y Fecha obligatorios."); return; }
        const dataToSave = { ...formData, finalGrade: calculateFinalAverage(formData) };
        setIsSaving(true);
        try { 
            await onSave(dataToSave, assignments, assignedStudentIds); 
            onClose(); 
        }
        catch (error: any) { console.error(error); alert("Fallo al guardar: " + error.message); }
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

    // Búsqueda en tiempo real para Estudiantes
    const filteredStudentsList = useMemo(() => {
        if (studentSearch.length < 2) return [];
        return allStudents.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
                                 String(s.cedula).includes(studentSearch);
            return !assignedStudentIds.includes(s.id) && matchesSearch;
        }).slice(0, 5); // Limitar a 5 para mejor UI
    }, [allStudents, studentSearch, assignedStudentIds]);

    // Búsqueda en tiempo real para Docentes
    const filteredTeachersList = useMemo(() => {
        if (teacherSearch.length < 2) return [];
        return teachers.filter(t => {
            return t.name.toLowerCase().includes(teacherSearch.toLowerCase()) || 
                   String(t.cedula).includes(teacherSearch);
        }).slice(0, 5);
    }, [teachers, teacherSearch]);

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 scrollbar-thin">
            <div className="space-y-4">
                <div>
                    <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1 ml-1">Título Institucional</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            name="title" 
                            value={formData.title || ''} 
                            onChange={handleChange} 
                            onFocus={() => setShowTitleSuggestions(true)}
                            onBlur={() => {
                                // Slightly delay blur so onMouseDown can focus and select
                                setTimeout(() => setShowTitleSuggestions(false), 200);
                            }}
                            required 
                            className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-uninunez-orange focus:border-uninunez-orange text-sm disabled:bg-gray-50 font-bold uppercase transition-all" 
                            disabled={!canEditDetails} 
                            autoComplete="off" 
                        />
                        {showTitleSuggestions && filteredTitleSuggestions.length > 0 && (
                            <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                                {filteredTitleSuggestions.map((t, idx) => (
                                    <li 
                                        key={idx} 
                                        onMouseDown={() => { 
                                            const matchingP = existingProjects.find(p => p.title === t);
                                            if (matchingP) {
                                                setFormData(prev => ({ 
                                                    ...prev, 
                                                    title: t,
                                                    filesUrl: matchingP.filesUrl || '',
                                                    presentationDate: matchingP.presentationDate || '',
                                                    programId: matchingP.programId || prev.programId || '',
                                                    statusId: matchingP.statusId || prev.statusId || '',
                                                    formatId: matchingP.formatId || prev.formatId || ''
                                                }));

                                                const relatedStudentIds = allStudents
                                                    .filter(s => s.projectId === matchingP.id)
                                                    .map(s => s.id);
                                                if (relatedStudentIds.length > 0) {
                                                    setAssignedStudentIds(relatedStudentIds);
                                                }

                                                if (allProjectTeachers) {
                                                    const relatedTeachers = allProjectTeachers
                                                        .filter(pt => pt.projectId === matchingP.id)
                                                        .map(pt => ({
                                                            teacherId: pt.teacherId,
                                                            roleId: pt.roleId,
                                                            tempId: Math.random()
                                                        }));
                                                    if (relatedTeachers.length > 0) {
                                                        setAssignments(relatedTeachers);
                                                    }
                                                }
                                            } else {
                                                setFormData(prev => ({ ...prev, title: t }));
                                            }
                                            setShowTitleSuggestions(false);
                                        }}
                                        className="px-4 py-3 hover:bg-uninunez-orange/5 cursor-pointer border-b border-gray-50 last:border-0"
                                    >
                                        <div className="text-[11px] font-bold text-uninunez-onix uppercase">{t}</div>
                                        <div className="text-[9px] text-uninunez-teal font-black uppercase mt-0.5">Auto-rellenar Datos, Integrantes y Docentes</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                
                <div>
                    <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1 ml-1">URL de Archivos (Drive/Dropbox)</label>
                    <input type="url" name="filesUrl" value={formData.filesUrl || ''} onChange={handleChange} placeholder="https://..." className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-uninunez-teal focus:border-uninunez-teal text-xs text-uninunez-teal font-mono disabled:bg-gray-50" disabled={!canEditDetails} autoComplete="off" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1 ml-1">Fecha de Radicación</label>
                        <input type="date" name="presentationDate" value={formData.presentationDate || ''} onChange={handleChange} required className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-uninunez-orange focus:border-uninunez-orange text-sm disabled:bg-gray-50" disabled={!canEditDetails}/>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1 ml-1">Programa Académico Principal</label>
                        <select name="programId" value={formData.programId || ''} onChange={handleChange} required className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-uninunez-orange focus:border-uninunez-orange text-sm disabled:bg-gray-50 font-bold text-uninunez-teal" disabled={!canEditDetails}>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1 ml-1">Estado del Proyecto</label>
                        <select name="statusId" value={formData.statusId || ''} onChange={handleChange} required className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-uninunez-orange focus:border-uninunez-orange text-sm disabled:bg-gray-50 font-bold" disabled={!canEditDetails}>
                            {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1 ml-1">Formato de Trabajo</label>
                        <select name="formatId" value={formData.formatId || ''} onChange={handleChange} required className="block w-full px-4 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:ring-uninunez-orange focus:border-uninunez-orange text-sm disabled:bg-gray-50 font-bold" disabled={!canEditDetails}>
                            {formats.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-uninunez-onix/5 p-5 rounded-2xl border border-uninunez-onix/10 space-y-4">
                <div className="flex justify-between items-center border-b border-uninunez-onix/10 pb-3">
                    <h4 className="text-[10px] font-black text-uninunez-onix uppercase tracking-widest">Calificaciones</h4>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-uninunez-ash uppercase">Nota Final:</span>
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
                <div className="flex flex-wrap gap-2 mb-4">
                    {assignedStudentIds.length > 0 ? assignedStudentIds.map(sid => {
                        const student = allStudents.find(s => s.id === sid);
                        const studentProgram = programs.find(p => p.id === student?.programId)?.name || 'N/A';
                        return (
                            <div key={sid} className="flex items-center bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-sm animate-fadeIn">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-700">{student?.name || 'Desconocido'}</span>
                                    <span className="text-[8px] font-black text-uninunez-teal uppercase tracking-tighter">{studentProgram}</span>
                                </div>
                                {canEditDetails && <button type="button" onClick={() => removeStudent(sid)} className="text-red-400 hover:text-red-600 ml-2"><TrashIcon className="h-3.5 w-3.5"/></button>}
                            </div>
                        );
                    }) : <p className="text-[10px] text-gray-400 italic py-2">No hay estudiantes vinculados todavía.</p>}
                </div>

                {canEditDetails && (
                    <div className="relative bg-gray-50/50 p-4 rounded-2xl border-2 border-dashed border-gray-200 group focus-within:border-uninunez-orange transition-all">
                        <div className="flex gap-2">
                            <div className="flex-grow relative">
                                <input 
                                    type="text" 
                                    placeholder="Buscar por nombre o cédula..." 
                                    value={studentSearch}
                                    onChange={(e) => { setStudentSearch(e.target.value.toUpperCase()); setShowStudentResults(true); }}
                                    onFocus={() => setShowStudentResults(true)}
                                    className="w-full px-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:ring-1 focus:ring-uninunez-orange outline-none font-bold uppercase"
                                    autoComplete="off"
                                />
                                {showStudentResults && filteredStudentsList.length > 0 && (
                                    <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                                        {filteredStudentsList.map(s => (
                                            <li 
                                                key={s.id} 
                                                onClick={() => { setSelectedStudent(s); setStudentSearch(s.name); setShowStudentResults(false); }}
                                                className="px-4 py-3 hover:bg-uninunez-orange/5 cursor-pointer border-b border-gray-50 last:border-0"
                                            >
                                                <div className="text-[11px] font-black text-uninunez-onix">{s.name}</div>
                                                <div className="text-[9px] text-uninunez-ash">{s.cedula}</div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <button 
                                type="button" 
                                onClick={handleAddStudent} 
                                disabled={!selectedStudent}
                                className="bg-uninunez-orange text-white px-6 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:bg-gray-200 transition-all shadow-md active:scale-95"
                            >
                                Vincular
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="pt-4 border-t border-gray-100">
                <h4 className="text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-4 ml-1">Asignaciones (Docentes)</h4>
                <div className="space-y-2 mb-4">
                    {assignments.map(a => (
                        <div key={a.tempId} className="flex justify-between items-center bg-white px-4 py-3 rounded-xl border border-gray-100 shadow-sm animate-fadeIn">
                            <span className="text-[11px] font-bold text-gray-700">{getTeacherName(a.teacherId)} — <span className="text-uninunez-teal uppercase font-black tracking-widest">{getRoleName(a.roleId)}</span></span>
                            {canEditDetails && <button type="button" onClick={() => setAssignments(prev => prev.filter(x => x.tempId !== a.tempId))} className="text-red-400 p-1 hover:bg-red-50 rounded-lg"><TrashIcon className="h-4 w-4"/></button>}
                        </div>
                    ))}
                </div>

                {canEditDetails && (
                    <div className="bg-gray-50/50 p-4 rounded-2xl border-2 border-dashed border-gray-200 group focus-within:border-uninunez-teal transition-all">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            <div className="sm:col-span-6 relative">
                                <input 
                                    type="text" 
                                    placeholder="Buscar docente..." 
                                    value={teacherSearch}
                                    onChange={(e) => { setTeacherSearch(e.target.value.toUpperCase()); setShowTeacherResults(true); }}
                                    onFocus={() => setShowTeacherResults(true)}
                                    className="w-full px-4 py-2.5 text-xs border border-gray-200 rounded-xl outline-none font-bold uppercase"
                                    autoComplete="off"
                                />
                                {showTeacherResults && filteredTeachersList.length > 0 && (
                                    <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                                        {filteredTeachersList.map(t => (
                                            <li 
                                                key={t.id} 
                                                onClick={() => { setNewAssignment(p => ({...p, teacherId: t.id})); setTeacherSearch(t.name); setShowTeacherResults(false); }}
                                                className="px-4 py-3 hover:bg-uninunez-teal/5 cursor-pointer border-b border-gray-50"
                                            >
                                                <div className="text-[11px] font-black text-uninunez-onix">{t.name}</div>
                                                <div className="text-[9px] text-uninunez-ash">{t.cedula}</div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="sm:col-span-4">
                                <select 
                                    value={newAssignment.roleId} 
                                    onChange={(e) => setNewAssignment(p => ({...p, roleId: e.target.value}))} 
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs bg-white font-bold"
                                >
                                    <option value="">Seleccionar Rol...</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>)}
                                </select>
                            </div>
                            <button 
                                type="button" 
                                onClick={handleAddAssignment} 
                                disabled={!newAssignment.teacherId || !newAssignment.roleId}
                                className="sm:col-span-2 bg-uninunez-orange text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:bg-gray-200 shadow-md transition-all active:scale-95"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t sticky bottom-0 bg-white/95 pb-2">
                <button type="button" onClick={onClose} disabled={isSaving} className="px-6 py-3 border-2 border-gray-100 rounded-xl text-[10px] font-black uppercase text-gray-400 hover:bg-gray-50 transition-all">Cancelar</button>
                <button type="submit" disabled={isSaving} className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase shadow-xl transition-all ${isSaving ? 'bg-gray-400' : 'bg-uninunez-orange hover:bg-uninunez-orangeLight text-white active:scale-95'}`}>
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
    const [programs, setPrograms] = useState<Program[]>([]);
    const [projectTeachers, setProjectTeachers] = useState<ProjectTeacher[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [deletingProject, setDeletingProject] = useState<Project | null>(null);
    const [userPerms, setUserPerms] = useState<Record<string, any>>({});
    const [searchTerm, setSearchTerm] = useState('');

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [p, s, t, r, st, f, pt, pr] = await Promise.all([
                db.getProjects(), 
                db.getStudents(), 
                db.getTeachers(),
                db.getTeacherRoles(), 
                db.getStatuses(), 
                db.getFormats(),
                db.getProjectTeachers(),
                db.getPrograms()
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
            setPrograms([...pr]);
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
                await db.deleteProjectTeachersByProject(savedProject.id);
                for (const a of assignments) {
                    await db.addProjectTeacher({ projectId: savedProject.id, teacherId: a.teacherId, roleId: a.roleId });
                }
                
                const sts = await db.getStudents();
                for (const s of sts) {
                   if (s.projectId === savedProject.id && !studentIds.includes(s.id)) {
                       await db.updateStudent({ ...s, projectId: null });
                   } else if (studentIds.includes(s.id)) {
                       await db.updateStudent({ ...s, projectId: savedProject.id });
                   }
                }
            }
            
            await loadData(); 
            setIsModalOpen(false);
            setEditingProject(null);
        } catch (err: any) { 
            alert("Error al guardar: " + err.message);
        }
    };

    const handleDelete = async () => { 
        if (deletingProject) { 
            await db.deleteProject(deletingProject.id); 
            await loadData(); 
            setDeletingProject(null); 
        } 
    };

    const filteredProjects = useMemo(() => {
        if (!searchTerm.trim()) return projects;
        const term = searchTerm.toLowerCase();
        return projects.filter(p => {
            const titleMatch = p.title.toLowerCase().includes(term);
            const authorsMatch = students
                .filter(s => s.projectId === p.id)
                .some(s => s.name.toLowerCase().includes(term));
            const teachersMatch = projectTeachers
                .filter(pt => pt.projectId === p.id)
                .some(pt => {
                    const teacher = teachers.find(t => t.id === pt.teacherId);
                    return teacher?.name.toLowerCase().includes(term);
                });
            return titleMatch || authorsMatch || teachersMatch;
        });
    }, [projects, searchTerm, students, teachers, projectTeachers]);
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-uninunez-onix font-display uppercase tracking-tight">Banco de Proyectos</h1>
                    <p className="text-uninunez-ash text-sm font-medium">Gestión administrativa del ciclo de grado.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <div className="relative w-full sm:w-72 group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <SearchIcon className="h-4 w-4 text-gray-400 group-focus-within:text-uninunez-orange transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por título o autor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-uninunez-orange/20 focus:border-uninunez-orange transition-all shadow-sm"
                        />
                    </div>
                    {isAdmin && (
                        <button 
                            onClick={() => { setEditingProject(null); setIsModalOpen(true); }} 
                            className="w-full sm:w-auto bg-uninunez-orange text-white px-8 py-3.5 rounded-2xl flex items-center justify-center text-[11px] font-black uppercase tracking-widest shadow-2xl hover:bg-uninunez-orangeLight transition-all active:scale-95 whitespace-nowrap"
                        >
                            <PlusIcon className="h-5 w-5 mr-2"/> Nuevo Registro
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white shadow-sm border border-gray-100 rounded-[2rem] overflow-hidden min-h-[400px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-12 h-12 border-4 border-uninunez-orange border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 border-b border-gray-100">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Proyecto</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Autores</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Nota</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredProjects.length > 0 ? filteredProjects.map(p => (
                                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            {p.filesUrl ? (
                                                <a href={p.filesUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-uninunez-teal hover:text-uninunez-orange transition-colors decoration-dotted underline">{p.title}</a>
                                            ) : (
                                                <div className="text-sm font-bold text-uninunez-onix">{p.title}</div>
                                            )}
                                            <div className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Radicación: {p.presentationDate}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-wrap gap-1">
                                                {students.filter(s => s.projectId === p.id).map(s => (
                                                    <span key={s.id} className="inline-block px-2 py-0.5 bg-gray-100 text-[9px] font-black text-gray-600 rounded uppercase">{s.name}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`px-3 py-1 text-sm font-black rounded-lg ${p.finalGrade && p.finalGrade >= 3.0 ? 'bg-jade/10 text-uninunez-jade' : 'bg-red-50 text-red-600'}`}>{p.finalGrade ? p.finalGrade.toFixed(2) : '---'}</span>
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
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <SearchIcon className="h-10 w-10 text-gray-200" />
                                                <p className="text-gray-400 font-bold text-sm">No se encontraron proyectos que coincidan con tu búsqueda.</p>
                                                <button onClick={() => setSearchTerm('')} className="text-uninunez-orange text-xs font-black uppercase tracking-widest hover:underline mt-2">Limpiar búsqueda</button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProject ? 'Expediente' : 'Nuevo Registro'}>
                {isModalOpen && (
                    <ProjectForm 
                        project={editingProject} 
                        onSave={handleSave} 
                        onClose={() => setIsModalOpen(false)} 
                        statuses={statuses} 
                        formats={formats} 
                        programs={programs}
                        teachers={teachers} 
                        allStudents={students} 
                        roles={roles} 
                        initialAssignments={editingProject ? projectTeachers.filter(pt => pt.projectId === editingProject.id) : []} 
                        initialStudentIds={editingProject ? students.filter(s => s.projectId === editingProject.id).map(s => s.id) : []}
                        canEditDetails={editingProject ? (isAdmin || userPerms[editingProject.id]?.canEdit) : true} 
                        gradeInfo={editingProject ? userPerms[editingProject.id]?.grade : {canGrade: false, reviewerRole: null}} 
                        existingProjects={projects}
                        allProjectTeachers={projectTeachers}
                    />
                )}
            </Modal>
            <ConfirmationDialog isOpen={!!deletingProject} onClose={() => setDeletingProject(null)} onConfirm={handleDelete} title="Borrar" message="¿Confirmas la eliminación permanente?" />
        </div>
    );
};
