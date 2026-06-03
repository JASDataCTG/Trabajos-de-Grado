
import React, { useEffect, useState } from 'react';
import { db } from '../services/database';
import { Project, Status, Format } from '../types';
import { ProjectIcon, StudentIcon, TeacherIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: number;
    color: string;
    accent: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, color, accent }) => (
    <div className={`bg-white rounded-2xl shadow-sm border-b-4 ${accent} p-5 flex items-center transition-transform hover:scale-[1.02]`}>
        <div className={`p-3 md:p-4 rounded-xl mr-4 md:mr-5 ${color} shadow-lg`}>
            {icon}
        </div>
        <div>
            <p className="text-[9px] md:text-[10px] font-extrabold text-uninunez-ash uppercase tracking-widest mb-1">{title}</p>
            <p className="text-2xl md:text-3xl font-black text-uninunez-onix font-display leading-none">{value}</p>
        </div>
    </div>
);

export const DashboardPage: React.FC = () => {
    const { user, isTeacher, isAdmin } = useAuth();
    const [stats, setStats] = useState({
        projects: 0,
        students: 0,
        teachers: 0,
        unassignedStudents: 0
    });
    const [recentProjects, setRecentProjects] = useState<Project[]>([]);
    const [statuses, setStatuses] = useState<Status[]>([]);
    
    // Evaluation state for Format 115
    const [evaluations, setEvaluations] = useState<Project[]>([]);
    const [myProjectTeachers, setMyProjectTeachers] = useState<any[]>([]);
    const [formats, setFormats] = useState<Format[]>([]);
    const [roles, setRoles] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
    const [evalForm, setEvalForm] = useState<Record<string, {
        writtenGrade: string;
        presentationGrade: string;
    }>>({});
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

    const getUserReviewerIndexForProject = (projectId: string, projectTeachers: any[], roles: any[], teacherId: string) => {
        const projectAssignments = projectTeachers.filter(pt => pt.projectId === projectId);
        
        const evaluatorAssignments = projectAssignments.filter(pt => {
            const roleName = roles.find(rol => rol.id === pt.roleId)?.name || '';
            return roleName && (
                roleName.toLowerCase().includes('evaluador') || 
                roleName.toLowerCase().includes('jurado') || 
                roleName.toLowerCase().includes('revisor')
            );
        });
        
        const userSpecificAssignments = evaluatorAssignments.filter(ea => ea.teacherId === teacherId);
        if (userSpecificAssignments.length === 0) return null;
        
        const hasRol1 = userSpecificAssignments.some(ea => {
            const rName = roles.find(rol => rol.id === ea.roleId)?.name || '';
            return rName.includes('1');
        });
        const hasRol2 = userSpecificAssignments.some(ea => {
            const rName = roles.find(rol => rol.id === ea.roleId)?.name || '';
            return rName.includes('2');
        });
        
        if (hasRol1) return 1;
        if (hasRol2) return 2;
        
        const sortedEvaluators = [...evaluatorAssignments].sort((a, b) => a.teacherId.localeCompare(b.teacherId));
        const userIndex = sortedEvaluators.findIndex(ea => ea.teacherId === teacherId);
        if (userIndex !== -1) {
            return userIndex + 1;
        }
        return null;
    };

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

    const loadData = async () => {
        const [projects, allStudents, teachers, allStatuses, projectTeachers, allFormats, allRoles] = await Promise.all([
            db.getProjects(),
            db.getStudents(),
            db.getTeachers(),
            db.getStatuses(),
            db.getProjectTeachers(),
            db.getFormats(),
            db.getTeacherRoles()
        ]);

        setStatuses(allStatuses);
        setFormats(allFormats);
        setRoles(allRoles);
        setStudents(allStudents);
        setMyProjectTeachers(projectTeachers);

        setStats({
            projects: projects.length,
            students: allStudents.length,
            teachers: teachers.length,
            unassignedStudents: allStudents.filter(s => !s.projectId).length
        });
        
        setRecentProjects(
            [...projects]
                .sort((a, b) => new Date(b.presentationDate).getTime() - new Date(a.presentationDate).getTime())
                .slice(0, 5)
        );

        // Filter Formato 111 (Anteproyecto) and Formato 115 (Artículo Final) projects assigned to teacher
        const isEvaluableFormat = (formatId: string) => {
            const f = allFormats.find(fmt => fmt.id === formatId);
            if (!f) return false;
            const fn = f.name.toUpperCase();
            return fn.includes('111') || fn.includes('115') || fn.includes('ARTÍCULO') || fn.includes('ARTICULO') || fn.includes('ANTEPROYECTO');
        };

        if (isTeacher && user?.teacherId) {
            const tutorId = user.teacherId;
            const assignedProjectIds = new Set(
                projectTeachers.filter(pt => pt.teacherId === tutorId).map(pt => pt.projectId)
            );
            const projects115ForTutor = projects.filter(p => assignedProjectIds.has(p.id) && isEvaluableFormat(p.formatId));
            setEvaluations(projects115ForTutor);

            // Pre-populate forms
            const initialForm: typeof evalForm = {};
            projects115ForTutor.forEach(p => {
                const idx = getUserReviewerIndexForProject(p.id, projectTeachers, allRoles, tutorId);
                if (idx === 1) {
                    initialForm[p.id] = {
                        writtenGrade: p.writtenGradeReviewer1 !== null ? String(p.writtenGradeReviewer1) : '',
                        presentationGrade: p.presentationGradeReviewer1 !== null ? String(p.presentationGradeReviewer1) : '',
                    };
                } else if (idx === 2) {
                    initialForm[p.id] = {
                        writtenGrade: p.writtenGradeReviewer2 !== null ? String(p.writtenGradeReviewer2) : '',
                        presentationGrade: p.presentationGradeReviewer2 !== null ? String(p.presentationGradeReviewer2) : '',
                    };
                } else {
                    initialForm[p.id] = {
                        writtenGrade: '',
                        presentationGrade: '',
                    };
                }
            });
            setEvalForm(initialForm);
        }
    };

    useEffect(() => {
        loadData();
    }, [user, isTeacher]);

    const handleSaveGrades = async (projectId: string) => {
        try {
            const proj = evaluations.find(p => p.id === projectId);
            if (!proj) return;
            
            const tutorId = user?.teacherId;
            if (!tutorId) return;

            const idx = getUserReviewerIndexForProject(projectId, myProjectTeachers, roles, tutorId);
            if (idx === null) {
                alert("Como tutor no tienes permisos de evaluación directa de calificaciones cuantitativas en este proyecto.");
                return;
            }

            const formDataForProject = evalForm[projectId];
            if (!formDataForProject) return;

            const wG = formDataForProject.writtenGrade.trim() === '' ? null : Number(formDataForProject.writtenGrade);
            const pG = formDataForProject.presentationGrade.trim() === '' ? null : Number(formDataForProject.presentationGrade);

            if (wG !== null && (wG < 0 || wG > 5.0)) {
                alert("La nota escrita debe estar entre 0.0 y 5.0");
                return;
            }
            if (pG !== null && (pG < 0 || pG > 5.0)) {
                alert("La nota de sustentación debe estar entre 0.0 y 5.0");
                return;
            }

            // Build updated project data
            const updatedProject: Project = { ...proj };
            if (idx === 1) {
                updatedProject.writtenGradeReviewer1 = wG;
                updatedProject.presentationGradeReviewer1 = pG;
            } else if (idx === 2) {
                updatedProject.writtenGradeReviewer2 = wG;
                updatedProject.presentationGradeReviewer2 = pG;
            }

            // Calculate overall final grade average
            updatedProject.finalGrade = calculateFinalAverage(updatedProject);

            // Save to DB
            await db.updateProject(updatedProject);

            // Keep format history record for Formato 115 in sync
            const existingHistory = await db.getProjectFormatHistory(projectId);
            const foundHistory = existingHistory.find(h => h.formatId === updatedProject.formatId);
            const hId = foundHistory ? foundHistory.id : (Date.now().toString(36) + Math.random().toString(36).substring(2));

            await db.saveProjectFormatHistoryEntry({
                id: hId,
                projectId: updatedProject.id,
                formatId: updatedProject.formatId,
                statusId: updatedProject.statusId,
                presentationDate: updatedProject.presentationDate,
                filesUrl: updatedProject.filesUrl,
                writtenGradeReviewer1: updatedProject.writtenGradeReviewer1,
                presentationGradeReviewer1: updatedProject.presentationGradeReviewer1,
                writtenGradeReviewer2: updatedProject.writtenGradeReviewer2,
                presentationGradeReviewer2: updatedProject.presentationGradeReviewer2,
                finalGrade: updatedProject.finalGrade,
                createdAt: foundHistory ? foundHistory.createdAt : new Date().toISOString()
            });

            // Refresh state
            await loadData();

            setNotification({ message: '¡Calificaciones actualizadas y sincronizadas con el historial de forma exitosa!', type: 'success' });
            setTimeout(() => setNotification(null), 4000);
        } catch (e: any) {
            console.error(e);
            alert("Error al guardar calificaciones: " + e.message);
        }
    };

    const handleFormChange = (projectId: string, field: 'writtenGrade' | 'presentationGrade', value: string) => {
        setEvalForm(prev => ({
            ...prev,
            [projectId]: {
                ...prev[projectId],
                [field]: value
            }
        }));
    };

    const getStatusName = (id: string) => statuses.find(s => s.id === id)?.name || 'Pendiente';

    // Cálculo dinámico del periodo académico
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    const periodLabel = currentMonth < 6 ? 'IP' : 'IIP';
    const dynamicPeriod = `${periodLabel}-${currentYear}`;

    return (
        <div className="space-y-6 md:space-y-8 animate-fadeIn px-2 md:px-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-uninunez-onix font-display uppercase tracking-tight">Panel de Control</h1>
                    <p className="text-uninunez-ash text-xs md:text-sm font-medium">Resumen ejecutivo del ciclo de vida académico.</p>
                </div>
                <div className="text-left md:text-right bg-white p-3 rounded-xl border border-gray-100 md:bg-transparent md:p-0 md:border-0">
                    <p className="text-[9px] md:text-[10px] font-bold text-uninunez-orange uppercase tracking-widest">Periodo Académico</p>
                    <p className="text-base md:text-lg font-bold text-uninunez-onix">{dynamicPeriod}</p>
                </div>
            </div>

            {notification && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-xs font-bold shadow-sm animate-fadeIn flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        {notification.message}
                    </span>
                    <button onClick={() => setNotification(null)} className="text-emerald-500 hover:text-emerald-700 font-bold">×</button>
                </div>
            )}
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard 
                    icon={<ProjectIcon className="h-5 w-5 md:h-6 md:w-6 text-white" />} 
                    title="Proyectos" 
                    value={stats.projects}
                    color="bg-uninunez-orange"
                    accent="border-uninunez-orange"
                />
                <StatCard 
                    icon={<StudentIcon className="h-5 w-5 md:h-6 md:w-6 text-white" />} 
                    title="Estudiantes" 
                    value={stats.students}
                    color="bg-uninunez-teal"
                    accent="border-uninunez-teal"
                />
                <StatCard 
                    icon={<TeacherIcon className="h-5 w-5 md:h-6 md:w-6 text-white" />} 
                    title="Docentes" 
                    value={stats.teachers}
                    color="bg-uninunez-onix"
                    accent="border-uninunez-onix"
                />
                 <StatCard 
                    icon={<StudentIcon className="h-5 w-5 md:h-6 md:w-6 text-white" />} 
                    title="Sin Vínculo" 
                    value={stats.unassignedStudents}
                    color="bg-uninunez-orangeLight"
                    accent="border-uninunez-orangeLight"
                />
            </div>

            {/* TARGET SECTOR: Formato 111 / 115 Pending Evaluation widget for Teachers */}
            {isTeacher && evaluations.length > 0 && (
                <div className="bg-gradient-to-br from-uninunez-teal/5 to-white rounded-3xl shadow-sm border border-uninunez-teal/20 overflow-hidden animate-fadeIn">
                    <div className="p-5 md:p-6 border-b border-uninunez-teal/10 flex justify-between items-center bg-white/60">
                        <div className="flex items-center gap-2.5">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-uninunez-orange opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-uninunez-orange"></span>
                            </span>
                            <div>
                                <h2 className="text-sm font-black text-uninunez-onix uppercase tracking-wider font-display">
                                    Proyectos Pendientes de Evaluación (Formatos 111 y 115)
                                </h2>
                                <p className="text-[10px] text-uninunez-ash font-medium mt-0.5">Usted ha sido asignado en estos proyectos que se encuentran en etapa de Anteproyecto o Artículo Final.</p>
                            </div>
                        </div>
                        <span className="bg-uninunez-orange/10 text-uninunez-orange text-[9px] font-black px-3 py-1 rounded-full uppercase">
                            {evaluations.length} {evaluations.length === 1 ? 'Pendiente' : 'Pendientes'}
                        </span>
                    </div>

                    <div className="p-4 md:p-6 divide-y divide-gray-100">
                        {evaluations.map(project => {
                            const isExpanded = expandedProjectId === project.id;
                            const studentsOfProject = students.filter(s => s.projectId === project.id);
                            const tutorId = user?.teacherId || '';
                            const reviewerIndex = getUserReviewerIndexForProject(project.id, myProjectTeachers, roles, tutorId);
                            
                            // Determine display role name
                            const currentTeacherAssignment = myProjectTeachers.find(pt => pt.projectId === project.id && pt.teacherId === tutorId);
                            const roleName = roles.find(r => r.id === currentTeacherAssignment?.roleId)?.name || 'Asignado';

                            const writtenGradeVal = evalForm[project.id]?.writtenGrade ?? '';
                            const presentationGradeVal = evalForm[project.id]?.presentationGrade ?? '';

                            return (
                                <div key={project.id} className="py-4 first:pt-0 last:pb-0 transition-all">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div>
                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-uninunez-teal/10 text-uninunez-teal mb-2">
                                                {roleName}
                                            </span>
                                            <h3 className="text-xs md:text-sm font-bold text-uninunez-onix leading-snug max-w-2xl">{project.title}</h3>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-[10px] text-uninunez-ash">
                                                <span className="font-bold uppercase text-[9px] tracking-tight">
                                                    Integrantes:{' '}
                                                    <span className="text-uninunez-onix font-medium normal-case">
                                                        {studentsOfProject.length > 0 
                                                            ? studentsOfProject.map(s => s.name).join(', ') 
                                                            : 'Sin registrar'}
                                                    </span>
                                                </span>
                                                <span className="hidden md:inline text-gray-300">|</span>
                                                <span>Radicación: {project.presentationDate}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0 justify-between md:justify-end">
                                            <div className="text-right">
                                                <p className="text-[8px] font-black text-uninunez-ash uppercase tracking-wider">Promedio Actual</p>
                                                <p className={`text-base font-black font-display ${project.finalGrade !== null ? 'text-uninunez-teal' : 'text-uninunez-orange'}`}>
                                                    {project.finalGrade?.toFixed(2) || '---'}
                                                </p>
                                            </div>

                                            <button 
                                                onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                                                className={`px-4 py-2 border rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${
                                                    isExpanded 
                                                        ? 'bg-uninunez-onix text-white border-uninunez-onix' 
                                                        : 'bg-white text-uninunez-teal border-uninunez-teal/30 hover:bg-uninunez-teal/5'
                                                }`}
                                            >
                                                {isExpanded ? 'Ocultar' : 'Evaluar'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Evaluation Sub-Form Panel */}
                                    {isExpanded && (
                                        <div className="mt-4 p-5 rounded-2xl bg-white border border-gray-100 shadow-inner animate-fadeIn space-y-4">
                                            {reviewerIndex === null ? (
                                                <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-[10px] font-bold leading-relaxed">
                                                    ⚠️ Su rol en este proyecto es <span className="font-black">{roleName.toUpperCase()}</span>. El ingreso directo de calificaciones está reservado para los evaluadores/jurados asignados. Puede visualizar el consolidado actual:
                                                </div>
                                            ) : (
                                                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-3 text-[10px] font-bold leading-relaxed">
                                                    ✨ Usted tiene rol de <span className="font-black">{roleName.toUpperCase()}</span> (Evaluador {reviewerIndex}). Sus notas alimentan de forma reactiva el promedio institucional definitivo.
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Evaluator 1 Grid Block */}
                                                <div className={`p-4 rounded-xl border ${reviewerIndex === 1 ? 'border-uninunez-orange/40 bg-uninunez-orange/[0.02]' : 'border-gray-100 bg-gray-50/50 opacity-80'}`}>
                                                    <p className="text-[10px] font-black text-uninunez-orange uppercase mb-3 flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-uninunez-orange"></span> Evaluador 1 {reviewerIndex === 1 && '(Usted)'}
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <div>
                                                            <label className="text-[8px] font-bold text-uninunez-ash uppercase block mb-1">Nota Escrita</label>
                                                            <input 
                                                                type="number" 
                                                                step="0.1" 
                                                                min="0.0" 
                                                                max="5.0"
                                                                disabled={reviewerIndex !== 1}
                                                                value={reviewerIndex === 1 ? writtenGradeVal : (project.writtenGradeReviewer1 ?? '')}
                                                                onChange={(e) => handleFormChange(project.id, 'writtenGrade', e.target.value)}
                                                                placeholder="0.00" 
                                                                className="w-full text-xs font-bold border border-gray-200 rounded-lg p-2 bg-white"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[8px] font-bold text-uninunez-ash uppercase block mb-1">Nota Sustentación</label>
                                                            <input 
                                                                type="number" 
                                                                step="0.1" 
                                                                min="0.0" 
                                                                max="5.0"
                                                                disabled={reviewerIndex !== 1}
                                                                value={reviewerIndex === 1 ? presentationGradeVal : (project.presentationGradeReviewer1 ?? '')}
                                                                onChange={(e) => handleFormChange(project.id, 'presentationGrade', e.target.value)}
                                                                placeholder="0.00" 
                                                                className="w-full text-xs font-bold border border-gray-200 rounded-lg p-2 bg-white"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Evaluator 2 Grid Block */}
                                                <div className={`p-4 rounded-xl border ${reviewerIndex === 2 ? 'border-uninunez-orange/40 bg-uninunez-orange/[0.02]' : 'border-gray-100 bg-gray-50/50 opacity-80'}`}>
                                                    <p className="text-[10px] font-black text-uninunez-orange uppercase mb-3 flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-uninunez-orange"></span> Evaluador 2 {reviewerIndex === 2 && '(Usted)'}
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <div>
                                                            <label className="text-[8px] font-bold text-uninunez-ash uppercase block mb-1">Nota Escrita</label>
                                                            <input 
                                                                type="number" 
                                                                step="0.1" 
                                                                min="0.0" 
                                                                max="5.0"
                                                                disabled={reviewerIndex !== 2}
                                                                value={reviewerIndex === 2 ? writtenGradeVal : (project.writtenGradeReviewer2 ?? '')}
                                                                onChange={(e) => handleFormChange(project.id, 'writtenGrade', e.target.value)}
                                                                placeholder="0.00" 
                                                                className="w-full text-xs font-bold border border-gray-200 rounded-lg p-2 bg-white"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[8px] font-bold text-uninunez-ash uppercase block mb-1">Nota Sustentación</label>
                                                            <input 
                                                                type="number" 
                                                                step="0.1" 
                                                                min="0.0" 
                                                                max="5.0"
                                                                disabled={reviewerIndex !== 2}
                                                                value={reviewerIndex === 2 ? presentationGradeVal : (project.presentationGradeReviewer2 ?? '')}
                                                                onChange={(e) => handleFormChange(project.id, 'presentationGrade', e.target.value)}
                                                                placeholder="0.00" 
                                                                className="w-full text-xs font-bold border border-gray-200 rounded-lg p-2 bg-white"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {reviewerIndex !== null && (
                                                <div className="flex justify-end pt-3">
                                                    <button 
                                                        onClick={() => handleSaveGrades(project.id)}
                                                        className="bg-uninunez-teal hover:bg-teal-700 text-white font-black px-6 py-2.5 rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95"
                                                    >
                                                        Guardar Calificaciones
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 md:p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-[10px] font-black text-uninunez-ash uppercase tracking-[0.2em] font-display">Actividad Reciente</h2>
                    <span className="bg-uninunez-teal/10 text-uninunez-teal text-[8px] md:text-[9px] font-bold px-3 py-1 rounded-full uppercase">Top 5</span>
                </div>
                <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="bg-white">
                            <tr>
                                <th className="px-8 py-4 text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Proyecto</th>
                                <th className="px-8 py-4 text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fecha</th>
                                <th className="px-8 py-4 text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {recentProjects.map(project => (
                                <tr key={project.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-8 py-4 text-xs md:text-sm font-bold text-uninunez-onix group-hover:text-uninunez-orange transition-colors">{project.title}</td>
                                    <td className="px-8 py-4 text-xs md:text-sm text-uninunez-ash font-medium">{project.presentationDate}</td>
                                    <td className="px-8 py-4">
                                        <span className="px-2.5 py-1 inline-flex text-[9px] font-extrabold rounded bg-uninunez-teal/10 text-uninunez-teal uppercase">
                                            {getStatusName(project.statusId)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Indicador de scroll para móviles */}
                <div className="md:hidden p-3 text-center border-t border-gray-50">
                    <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Desliza para ver más →</p>
                </div>
            </div>
        </div>
    );
};
