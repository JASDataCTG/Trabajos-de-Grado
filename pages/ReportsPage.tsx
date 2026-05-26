
import { useEffect, useState, useCallback, useRef } from 'react';
import React from 'react';
import { db } from '../services/database';
import { Project, Student, Teacher, Status, Format, Program, ProjectFormatHistory } from '../types';
import { arrayToCsv } from '../utils/csv';

// Informa a TypeScript sobre la variable global Chart de la CDN
declare var Chart: any;

import { Modal } from '../components/Modal';

interface ProjectStatusReport {
    'id': string;
    'Título del Proyecto': string;
    'Estado': string;
    'Formato': string;
    'Fecha de Presentación': string;
    'Estudiantes Asignados': string;
    'Programas de Estudiantes': string;
    'Docentes / Roles': string;
    'Enlace a Archivos': string;
}

interface TeacherWorkloadReport {
    'id': string;
    'Nombre del Docente': string;
    'Email': string;
    'Proyectos como Director': number;
    'Proyectos como Co-Director': number;
    'Proyectos como Evaluador': number;
    'Total de Proyectos': number;
}

interface ProgramSummaryReport {
    'id': string;
    'Programa': string;
    'Total Proyectos': number;
    'Estudiantes Vinculados': number;
    'Estudiantes Sin Proyecto': number;
}

interface UnassignedStudentsReport {
    'id': string;
    'Nombre del Estudiante': string;
    'Email': string;
    'Programa': string;
}

interface TeacherProgramWorkloadReport {
    'id': string;
    'Docente': string;
    'Programa': string;
    'Director': number;
    'Co-Director': number;
    'Evaluador': number;
    'Total': number;
}

interface TeacherProjectsDetailReport {
    'id': string;
    'Nombre del Docente': string;
    'Email del Docente': string;
    'Título del Proyecto': string;
    'Rol Asignado': string;
    'Estado del Proyecto': string;
    'Formato del Proyecto': string;
    'Fecha de Radicación': string;
}

interface ReportsPageProps {
    isPublicView?: boolean;
}

const ReportTableCard: React.FC<{ title: string; description: string; children: React.ReactNode; onExport: () => void; hasData: boolean; showExport?: boolean }> = ({ title, description, children, onExport, hasData, showExport = true }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b bg-gray-50/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-uninunez-onix font-display uppercase tracking-tight">{title}</h3>
                    <p className="text-sm text-uninunez-ash mt-1">{description}</p>
                </div>
                {showExport && (
                    <button
                        onClick={onExport}
                        disabled={!hasData}
                        className="flex items-center gap-2 bg-uninunez-teal text-white px-5 py-2.5 rounded-lg hover:bg-uninunez-tealLight text-xs font-black shadow-lg transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed uppercase tracking-wider"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Descargar CSV
                    </button>
                )}
            </div>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
            {children}
        </div>
    </div>
);

const ChartCard: React.FC<{ title: string; type: 'pie' | 'doughnut' | 'bar'; data: any; options?: any; heightClass?: string }> = ({ title, type, data, options = {}, heightClass = 'h-80' }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    useEffect(() => {
        // Validación de carga de la librería Chart.js
        if (typeof Chart === 'undefined') {
            console.warn('Esperando carga de Chart.js...');
            return;
        }

        if (chartRef.current && data) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
            const ctx = chartRef.current.getContext('2d');
            chartInstance.current = new Chart(ctx, {
                type: type,
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: type === 'bar' ? 'top' : 'right',
                            labels: {
                                font: { size: 10, weight: '700', family: 'Montserrat' },
                                boxWidth: 12
                            }
                        },
                    },
                    ...options,
                },
            });
        }
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data, type, options]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
            <h3 className="text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-6 text-center border-b pb-2">{title}</h3>
            <div className={`relative flex-grow ${heightClass}`}>
                <canvas ref={chartRef}></canvas>
            </div>
        </div>
    );
};

const KpiCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center gap-4">
        <div className={`p-4 rounded-lg ${color} text-white shadow-lg`}>
            {icon}
        </div>
        <div>
            <p className="text-[10px] font-black text-uninunez-ash uppercase tracking-widest">{title}</p>
            <p className="text-3xl font-black text-uninunez-onix mt-1">{value}</p>
        </div>
    </div>
);

export const ReportsPage: React.FC<ReportsPageProps> = ({ isPublicView = false }) => {
    const [projectStatus, setProjectStatus] = useState<ProjectStatusReport[]>([]);
    const [teacherWorkload, setTeacherWorkload] = useState<TeacherWorkloadReport[]>([]);
    const [teacherProgramWorkload, setTeacherProgramWorkload] = useState<TeacherProgramWorkloadReport[]>([]);
    const [teacherProjectsDetail, setTeacherProjectsDetail] = useState<TeacherProjectsDetailReport[]>([]);
    const [programSummary, setProgramSummary] = useState<ProgramSummaryReport[]>([]);
    const [unassignedStudents, setUnassignedStudents] = useState<UnassignedStudentsReport[]>([]);
    const [kpis, setKpis] = useState({ totalProjects: 0, totalTeachers: 0, totalStudents: 0, totalPrograms: 0 });

    const [projectStatusChartData, setProjectStatusChartData] = useState<any>(null);
    const [studentAssignmentChartData, setStudentAssignmentChartData] = useState<any>(null);
    const [teacherWorkloadChartData, setTeacherWorkloadChartData] = useState<any>(null);
    const [studentsPerProgramChartData, setStudentsPerProgramChartData] = useState<any>(null);
    const [projectsPerProgramChartData, setProjectsPerProgramChartData] = useState<any>(null);

    const [filters, setFilters] = useState({
        title: '',
        programId: '',
        statusId: '',
        formatId: '',
        teacherId: '',
        startDate: '',
        endDate: '',
    });

    const [allPrograms, setAllPrograms] = useState<Program[]>([]);
    const [allStatuses, setAllStatuses] = useState<Status[]>([]);
    const [allFormats, setAllFormats] = useState<Format[]>([]);
    const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [allProjectTeachers, setAllProjectTeachers] = useState<any[]>([]);
    const [allRoles, setAllRoles] = useState<any[]>([]);

    const [detailModal, setDetailModal] = useState<{
        type: 'project' | 'teacher' | 'program' | 'student';
        id: string;
        title: string;
    } | null>(null);

    const [selectedProjectHistory, setSelectedProjectHistory] = useState<ProjectFormatHistory[]>([]);
    const [activeTab, setActiveTab] = useState<'visual' | 'projects' | 'teachers-roles' | 'programs' | 'workload' | 'unassigned'>('visual');

    useEffect(() => {
        if (detailModal && detailModal.type === 'project') {
            db.getProjectFormatHistory(detailModal.id).then(setSelectedProjectHistory);
        } else {
            setSelectedProjectHistory([]);
        }
    }, [detailModal]);

    const loadReportData = useCallback(async (currentFilters: any) => {
        const [projects, students, teachers, roles, statuses, formats, projectTeachers, programs] = await Promise.all([
            db.getProjects(),
            db.getStudents(),
            db.getTeachers(),
            db.getTeacherRoles(),
            db.getStatuses(),
            db.getFormats(),
            db.getProjectTeachers(),
            db.getPrograms()
        ]);

        setAllProjects(projects);
        setAllStudents(students);
        setAllTeachers(teachers);
        setAllPrograms(programs);
        setAllStatuses(statuses);
        setAllFormats(formats);
        setAllProjectTeachers(projectTeachers);
        setAllRoles(roles);

        let filteredProjects = projects;

        if (currentFilters.title) {
            filteredProjects = filteredProjects.filter(p => p.title.toLowerCase().includes(currentFilters.title.toLowerCase()));
        }
        if (currentFilters.statusId) {
            filteredProjects = filteredProjects.filter(p => p.statusId === currentFilters.statusId);
        }
        if (currentFilters.formatId) {
            filteredProjects = filteredProjects.filter(p => p.formatId === currentFilters.formatId);
        }
        if (currentFilters.startDate) {
            filteredProjects = filteredProjects.filter(p => new Date(p.presentationDate) >= new Date(currentFilters.startDate));
        }
        if (currentFilters.endDate) {
            filteredProjects = filteredProjects.filter(p => new Date(p.presentationDate) <= new Date(currentFilters.endDate));
        }
        if (currentFilters.teacherId) {
            const projectIdsForTeacher = projectTeachers
                .filter(pt => pt.teacherId === currentFilters.teacherId)
                .map(pt => pt.projectId);
            filteredProjects = filteredProjects.filter(p => projectIdsForTeacher.includes(p.id));
        }
        if (currentFilters.programId) {
            const studentProjectIds = students
                .filter(s => s.programId === currentFilters.programId && s.projectId)
                .map(s => s.projectId);
            filteredProjects = filteredProjects.filter(p => p.programId === currentFilters.programId || studentProjectIds.includes(p.id));
        }

        const filteredProjectIds = new Set(filteredProjects.map(p => p.id));
        
        // KPI Data
        setKpis({
            totalProjects: filteredProjects.length,
            totalTeachers: teachers.length,
            totalStudents: students.length,
            totalPrograms: programs.length
        });

        const projectStatusData: ProjectStatusReport[] = filteredProjects.map(p => {
            const assignedStudents = students.filter(s => s.projectId === p.id);
            const studentNames = assignedStudents.map(s => s.name).join(', ');
            const studentPrograms = [...new Set(assignedStudents.map(s => programs.find(prog => prog.id === (s.programId || p.programId))?.name || 'N/A'))].join(', ');
            
            const assignedTeachers = projectTeachers
                .filter(pt => pt.projectId === p.id)
                .map(pt => {
                    const t = teachers.find(teach => teach.id === pt.teacherId);
                    const r = roles.find(rol => rol.id === pt.roleId);
                    return `${t?.name || 'N/A'} [${r?.name || 'N/A'}]`;
                })
                .join('; ');
            
            return {
                'id': p.id,
                'Título del Proyecto': p.title, 
                'Estado': statuses.find(s => s.id === p.statusId)?.name || 'N/A', 
                'Formato': formats.find(f => f.id === p.formatId)?.name || 'N/A',
                'Fecha de Presentación': p.presentationDate, 
                'Estudiantes Asignados': studentNames || 'Ninguno',
                'Programas de Estudiantes': studentPrograms || 'N/A',
                'Docentes / Roles': assignedTeachers || 'Ninguno',
                'Enlace a Archivos': p.filesUrl || 'Sin enlace'
            };
        });
        setProjectStatus(projectStatusData);

        const workloadData: TeacherWorkloadReport[] = teachers.filter(t => !currentFilters.teacherId || t.id === currentFilters.teacherId).map(teacher => {
            const assignments = projectTeachers.filter(pt => pt.teacherId === teacher.id && filteredProjectIds.has(pt.projectId));
            let directorCount = 0, coDirectorCount = 0, evaluatorCount = 0;
            assignments.forEach(assignment => {
                const roleName = roles.find(r => r.id === assignment.roleId)?.name.toLowerCase() || '';
                
                // Clasificación precisa basada en los roles del sistema
                const isCoDirector = roleName.includes('co-director') || roleName.includes('codirector') || roleName.includes('coasesor') || roleName.includes('cotutor');
                const isDirector = (roleName.includes('director') || roleName.includes('asesor') || roleName.includes('tutor')) && !isCoDirector;
                const isEvaluator = roleName.includes('evaluador') || roleName.includes('jurado') || roleName.includes('revisor') || roleName.includes('lector');

                if (isDirector) directorCount++;
                else if (isCoDirector) coDirectorCount++;
                else if (isEvaluator) evaluatorCount++;
                else evaluatorCount++; 
            });
            return {
                'id': teacher.id,
                'Nombre del Docente': teacher.name, 'Email': teacher.email, 'Proyectos como Director': directorCount,
                'Proyectos como Co-Director': coDirectorCount, 'Proyectos como Evaluador': evaluatorCount, 'Total de Proyectos': assignments.length,
            };
        }).filter(t => t['Total de Proyectos'] > 0).sort((a, b) => b['Total de Proyectos'] - a['Total de Proyectos']);
        setTeacherWorkload(workloadData);

        // New Report: Projects per Teacher and Program
        const teacherProgramData: TeacherProgramWorkloadReport[] = [];
        teachers.filter(t => !currentFilters.teacherId || t.id === currentFilters.teacherId).forEach(teacher => {
            const teacherAssignments = projectTeachers.filter(pt => pt.teacherId === teacher.id && filteredProjectIds.has(pt.projectId));
            
            // Group assignments by program
            const programGroups: { [programId: string]: { director: number, coDirector: number, evaluator: number, total: number } } = {};
            
            teacherAssignments.forEach(assignment => {
                const project = projects.find(p => p.id === assignment.projectId);
                if (!project) return;
                
                const programId = project.programId;
                if (!programGroups[programId]) {
                    programGroups[programId] = { director: 0, coDirector: 0, evaluator: 0, total: 0 };
                }
                
                const roleName = roles.find(r => r.id === assignment.roleId)?.name.toLowerCase() || '';
                
                const isCoDirector = roleName.includes('co-director') || roleName.includes('codirector') || roleName.includes('coasesor') || roleName.includes('cotutor');
                const isDirector = (roleName.includes('director') || roleName.includes('asesor') || roleName.includes('tutor')) && !isCoDirector;

                if (isDirector) {
                    programGroups[programId].director++;
                } else if (isCoDirector) {
                    programGroups[programId].coDirector++;
                } else {
                    programGroups[programId].evaluator++;
                }
                programGroups[programId].total++;
            });
            
            Object.entries(programGroups).forEach(([programId, counts]) => {
                const program = programs.find(pr => pr.id === programId);
                teacherProgramData.push({
                    'id': `${teacher.id}_${programId}`,
                    'Docente': teacher.name,
                    'Programa': program?.name || 'N/A',
                    'Director': counts.director,
                    'Co-Director': counts.coDirector,
                    'Evaluador': counts.evaluator,
                    'Total': counts.total
                });
            });
        });
        setTeacherProgramWorkload(teacherProgramData.sort((a, b) => a.Docente.localeCompare(b.Docente)));

        const programSummaryData: ProgramSummaryReport[] = programs.map(p => {
            const projectsInProgram = filteredProjects.filter(proj => proj.programId === p.id);
            const studentsInProgram = students.filter(s => s.programId === p.id);
            const linkedStudents = studentsInProgram.filter(s => s.projectId && filteredProjectIds.has(s.projectId));
            return {
                'id': p.id,
                'Programa': p.name,
                'Total Proyectos': projectsInProgram.length,
                'Estudiantes Vinculados': linkedStudents.length,
                'Estudiantes Sin Proyecto': studentsInProgram.length - linkedStudents.length
            };
        }).filter(p => p['Total Proyectos'] > 0 || p['Estudiantes Vinculados'] > 0).sort((a, b) => b['Total Proyectos'] - a['Total Proyectos']);
        setProgramSummary(programSummaryData);
        
        const unassignedStudentsList = students.filter(s => !s.projectId && (!currentFilters.programId || s.programId === currentFilters.programId));
        setUnassignedStudents(unassignedStudentsList.map(s => ({ 
                'id': s.id,
                'Nombre del Estudiante': s.name, 
                'Email': s.email, 
                'Programa': programs.find(p => p.id === s.programId)?.name || 'N/A' 
        })));

        const uninunezColors = ['#F07E12', '#249A8C', '#3C3C3B', '#F39200', '#14AA9F', '#2FAC66', '#575756'];
        const statusCounts = statuses.map(status => ({ name: status.name, count: filteredProjects.filter(p => p.statusId === status.id).length }));
        setProjectStatusChartData({
            labels: statusCounts.map(s => s.name),
            datasets: [{ label: 'Proyectos', data: statusCounts.map(s => s.count), backgroundColor: uninunezColors, borderColor: '#ffffff', borderWidth: 2 }]
        });
        
        const studentUniverse = currentFilters.programId ? students.filter(s => s.programId === currentFilters.programId) : students;
        setStudentAssignmentChartData({
            labels: ['Vinculados', 'Sin Proyecto'],
            datasets: [{ data: [studentUniverse.length - unassignedStudentsList.length, unassignedStudentsList.length], backgroundColor: ['#249A8C', '#E5E7EB'], borderColor: '#ffffff', borderWidth: 2 }]
        });

        const studentsPerProgramCounts = programs.map(program => ({
            name: program.name,
            count: students.filter(s => s.programId === program.id).length
        }));
        setStudentsPerProgramChartData({
            labels: studentsPerProgramCounts.map(p => p.name),
            datasets: [{ label: 'Estudiantes', data: studentsPerProgramCounts.map(p => p.count), backgroundColor: uninunezColors, borderColor: '#ffffff', borderWidth: 2 }]
        });

        const projectsPerProgramCounts = programs.map(program => ({
            name: program.name,
            count: projects.filter(p => p.programId === program.id).length
        }));
        setProjectsPerProgramChartData({
            labels: projectsPerProgramCounts.map(p => p.name),
            datasets: [{ label: 'Proyectos', data: projectsPerProgramCounts.map(p => p.count), backgroundColor: uninunezColors, borderColor: '#ffffff', borderWidth: 2 }]
        });

        // Compile detailed assignments list of teachers and projects (Tutor, Co-tutor, Reviewer etc.)
        const teacherProjectsDetailData: TeacherProjectsDetailReport[] = [];
        projectTeachers.forEach(ptEntry => {
            // Must belong to a filtered project
            if (!filteredProjectIds.has(ptEntry.projectId)) return;
            
            // If teacherId filter is active, must match
            if (currentFilters.teacherId && ptEntry.teacherId !== currentFilters.teacherId) return;

            const teacher = teachers.find(t => t.id === ptEntry.teacherId);
            const project = projects.find(p => p.id === ptEntry.projectId);
            const role = roles.find(r => r.id === ptEntry.roleId);
            
            if (teacher && project) {
                const statusName = statuses.find(s => s.id === project.statusId)?.name || 'N/A';
                const formatName = formats.find(f => f.id === project.formatId)?.name || 'N/A';
                
                teacherProjectsDetailData.push({
                    'id': `${project.id}_${teacher.id}`,
                    'Nombre del Docente': teacher.name,
                    'Email del Docente': teacher.email || 'N/A',
                    'Título del Proyecto': project.title,
                    'Rol Asignado': role?.name || 'N/A',
                    'Estado del Proyecto': statusName,
                    'Formato del Proyecto': formatName,
                    'Fecha de Radicación': project.presentationDate || 'N/A'
                });
            }
        });

        teacherProjectsDetailData.sort((a, b) => {
            const cmpTeacher = a['Nombre del Docente'].localeCompare(b['Nombre del Docente']);
            if (cmpTeacher !== 0) return cmpTeacher;
            return a['Rol Asignado'].localeCompare(b['Rol Asignado']);
        });

        setTeacherProjectsDetail(teacherProjectsDetailData);

        setTeacherWorkloadChartData({
            labels: workloadData.slice(0, 10).map(w => w['Nombre del Docente']),
            datasets: [
                { label: 'Director', data: workloadData.slice(0, 10).map(w => w['Proyectos como Director']), backgroundColor: '#F07E12' },
                { label: 'Co-Director', data: workloadData.slice(0, 10).map(w => w['Proyectos como Co-Director']), backgroundColor: '#F39200' },
                { label: 'Evaluador', data: workloadData.slice(0, 10).map(w => w['Proyectos como Evaluador']), backgroundColor: '#249A8C' },
            ]
        });
    }, []);

    useEffect(() => {
        const initData = async () => {
            const [pr, st, te, fo] = await Promise.all([
                db.getPrograms(),
                db.getStatuses(),
                db.getTeachers(),
                db.getFormats()
            ]);
            setAllPrograms(pr);
            setAllStatuses(st);
            setAllTeachers(te);
            setAllFormats(fo);
            loadReportData({
                title: '', programId: '', statusId: '',
                formatId: '', teacherId: '', startDate: '', endDate: '',
            });
        };
        initData();
    }, [loadReportData]);

    const handleExport = (data: any[], filename: string) => {
        if (data.length === 0) return;
        const csv = arrayToCsv(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const newFilters = { ...filters, [name]: value };
        setFilters(newFilters);
        loadReportData(newFilters);
    };

    const showRelatedInfo = (type: 'project' | 'teacher' | 'program' | 'student', id: string, title: string) => {
        setDetailModal({ type, id, title });
    };

    const renderRelatedInfo = () => {
        if (!detailModal) return null;

        const { type, id } = detailModal;

        if (type === 'project') {
            const project = allProjects.find(p => p.id === id);
            if (!project) return <p>Proyecto no encontrado.</p>;
            const projectStudents = allStudents.filter(s => s.projectId === id);
            const projectTeachers = allProjectTeachers.filter(rel => rel.projectId === id);
            const status = allStatuses.find(s => s.id === project.statusId)?.name || 'N/A';
            const format = allFormats.find(f => f.id === project.formatId)?.name || 'N/A';
            const program = allPrograms.find(p => p.id === project.programId)?.name || 'N/A';

            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-2xl">
                            <p className="text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1">Estado</p>
                            <p className="text-sm font-bold text-uninunez-onix">{status}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl">
                            <p className="text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1">Formato</p>
                            <p className="text-sm font-bold text-uninunez-onix">{format}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl col-span-2">
                            <p className="text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1">Programa Principal</p>
                            <p className="text-sm font-bold text-uninunez-teal">{program}</p>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-3 ml-1">Estudiantes Vinculados</h4>
                        <div className="space-y-2">
                            {projectStudents.map(s => (
                                <div key={s.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                    <span className="text-sm font-bold text-uninunez-onix">{s.name}</span>
                                    <span className="text-[10px] font-black text-uninunez-teal uppercase">{allPrograms.find(p => p.id === s.programId)?.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-3 ml-1">Equipo de Docentes</h4>
                        <div className="space-y-2">
                            {projectTeachers.map(rel => {
                                const t = allTeachers.find(teach => teach.id === rel.teacherId);
                                const r = allRoles.find(role => role.id === rel.roleId);
                                return (
                                    <div key={rel.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                        <span className="text-sm font-bold text-uninunez-onix">{t?.name}</span>
                                        <span className="text-[10px] font-black text-uninunez-orange uppercase">{r?.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-uninunez-teal/5 p-5 rounded-2xl border border-uninunez-teal/10">
                        <h4 className="text-[10px] font-black text-uninunez-teal uppercase tracking-widest mb-3">Calificaciones</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[9px] font-bold text-uninunez-ash uppercase mb-1">Evaluador 1</p>
                                <p className="text-xs font-black">Escrito: {project.writtenGradeReviewer1 || '-'} | Sust: {project.presentationGradeReviewer1 || '-'}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-bold text-uninunez-ash uppercase mb-1">Evaluador 2</p>
                                <p className="text-xs font-black">Escrito: {project.writtenGradeReviewer2 || '-'} | Sust: {project.presentationGradeReviewer2 || '-'}</p>
                            </div>
                            <div className="col-span-2 pt-2 border-t border-uninunez-teal/20">
                                <p className="text-[10px] font-black text-uninunez-teal uppercase">Nota Final: {project.finalGrade?.toFixed(2) || '0.00'}</p>
                            </div>
                        </div>
                    </div>

                    {/* HISTORIAL Y LÍNEA DE TIEMPO DE AVANCES */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-200">
                        <h4 className="text-[10px] font-black text-uninunez-onix uppercase tracking-widest mb-4">Línea de Tiempo de Avances (Formatos)</h4>
                        {(() => {
                            const combined = [...selectedProjectHistory];
                            if (project) {
                                const hasCurrentInHistory = combined.some(h => h.formatId === project.formatId);
                                if (!hasCurrentInHistory) {
                                    combined.push({
                                        id: 'current_active',
                                        projectId: project.id,
                                        formatId: project.formatId,
                                        statusId: project.statusId,
                                        presentationDate: project.presentationDate,
                                        filesUrl: project.filesUrl || '',
                                        writtenGradeReviewer1: project.writtenGradeReviewer1,
                                        presentationGradeReviewer1: project.presentationGradeReviewer1,
                                        writtenGradeReviewer2: project.writtenGradeReviewer2,
                                        presentationGradeReviewer2: project.presentationGradeReviewer2,
                                        finalGrade: project.finalGrade,
                                        createdAt: new Date().toISOString()
                                    });
                                }
                            }
                            const projectHistoryTimeline = combined.sort((a, b) => new Date(a.presentationDate).getTime() - new Date(b.presentationDate).getTime());

                            if (projectHistoryTimeline.length === 0) {
                                return <p className="text-xs text-uninunez-ash italic font-medium py-2">Ningún registro de avance previo en el historial.</p>;
                            }

                            return (
                                <div className="relative pl-6 border-l border-uninunez-orange/30 space-y-5">
                                    {projectHistoryTimeline.map((entry, idx) => {
                                        const entryFormat = allFormats.find(f => f.id === entry.formatId)?.name || 'N/A';
                                        const entryStatus = allStatuses.find(s => s.id === entry.statusId)?.name || 'N/A';
                                        const isApproved = entryStatus.toLowerCase().includes('aprobado');
                                        const isRejected = entryStatus.toLowerCase().includes('rechazado');

                                        return (
                                            <div key={entry.id} className="relative animate-fadeIn">
                                                {/* Circulo de Conexión de Línea */}
                                                <div className="absolute -left-[31px] top-1 w-[11px] h-[11px] rounded-full bg-uninunez-orange border-2 border-white ring-2 ring-uninunez-orange/20"></div>
                                                
                                                <div className="bg-gray-50 border border-gray-100 p-3.5 rounded-xl space-y-1.5 shadow-sm">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <span className="text-[9px] font-black font-mono text-uninunez-ash">{entry.presentationDate || 'S/D'}</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                                            isApproved ? 'bg-green-100 text-green-800' :
                                                            isRejected ? 'bg-red-100 text-red-800' :
                                                            'bg-amber-100 text-amber-800'
                                                        }`}>
                                                            {entryStatus}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-bold text-uninunez-onix">
                                                        {entryFormat}
                                                        {entry.id === 'current_active' && (
                                                            <span className="ml-2 text-[8px] font-black text-uninunez-orange uppercase bg-uninunez-orange/10 px-1.5 py-0.5 rounded">Estado Activo</span>
                                                        )}
                                                    </p>
                                                    
                                                    {entry.filesUrl && (
                                                        <div className="pt-0.5">
                                                            <a 
                                                                href={entry.filesUrl} 
                                                                target="_blank" 
                                                                rel="referrerPolicy='no-referrer' noopener noreferrer" 
                                                                className="inline-flex items-center gap-1 text-[9px] font-black text-uninunez-teal hover:underline uppercase tracking-wider"
                                                            >
                                                                📂 Ver Archivos de esta Entrega
                                                            </a>
                                                        </div>
                                                    )}

                                                    {entry.finalGrade !== null && entry.finalGrade !== undefined && (
                                                        <div className="pt-1.5 border-t border-gray-100 text-[9px]">
                                                            <span className="font-bold text-uninunez-ash uppercase">Nota Evaluada:</span> <span className="font-black text-uninunez-orange">{entry.finalGrade.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            );
        }

        if (type === 'teacher') {
            const teacherProjects = allProjectTeachers.filter(rel => rel.teacherId === id);
            return (
                <div className="space-y-4">
                    <p className="text-sm text-uninunez-ash mb-4">Proyectos en los que participa este docente:</p>
                    {teacherProjects.length > 0 ? teacherProjects.map(rel => {
                        const p = allProjects.find(proj => proj.id === rel.projectId);
                        const r = allRoles.find(role => role.id === rel.roleId);
                        return (
                            <div key={rel.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-uninunez-teal transition-all">
                                <p className="text-sm font-bold text-uninunez-onix mb-1">{p?.title}</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-uninunez-orange uppercase">{r?.name}</span>
                                    <span className="text-[10px] font-black text-uninunez-teal uppercase">{allStatuses.find(s => s.id === p?.statusId)?.name}</span>
                                </div>
                            </div>
                        );
                    }) : <p className="text-center py-10 italic text-gray-400">No hay proyectos asociados.</p>}
                </div>
            );
        }

        if (type === 'program') {
            const projectsInProgram = allProjects.filter(p => p.programId === id);
            const studentsInProgram = allStudents.filter(s => s.programId === id);
            return (
                <div className="space-y-6">
                    <div>
                        <h4 className="text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-3 ml-1">Proyectos del Programa ({projectsInProgram.length})</h4>
                        <div className="space-y-2">
                            {projectsInProgram.map(p => (
                                <div key={p.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                    <p className="text-xs font-bold text-uninunez-onix">{p.title}</p>
                                    <p className="text-[9px] font-black text-uninunez-teal uppercase mt-1">{allStatuses.find(s => s.id === p.statusId)?.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-3 ml-1">Estudiantes del Programa ({studentsInProgram.length})</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {studentsInProgram.map(s => (
                                <div key={s.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <p className="text-xs font-bold text-uninunez-onix">{s.name}</p>
                                    <p className="text-[9px] font-medium text-uninunez-ash">{s.projectId ? 'VINCULADO' : 'SIN PROYECTO'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        if (type === 'student') {
            const student = allStudents.find(s => s.id === id);
            const project = allProjects.find(p => p.id === student?.projectId);
            return (
                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-1">Programa</p>
                        <p className="text-sm font-bold text-uninunez-onix">{allPrograms.find(p => p.id === student?.programId)?.name}</p>
                    </div>
                    {project ? (
                        <div className="bg-uninunez-teal/5 p-5 rounded-2xl border border-uninunez-teal/10">
                            <p className="text-[10px] font-black text-uninunez-teal uppercase mb-2">Proyecto Vinculado</p>
                            <p className="text-sm font-bold text-uninunez-onix mb-2">{project.title}</p>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black text-uninunez-ash uppercase">Estado: {allStatuses.find(s => s.id === project.statusId)?.name}</span>
                                <span className="text-[10px] font-black text-uninunez-orange uppercase">Nota: {project.finalGrade?.toFixed(2) || '0.00'}</span>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center py-10 italic text-gray-400 bg-gray-50 rounded-2xl">Este estudiante no tiene un proyecto vinculado actualmente.</p>
                    )}
                </div>
            );
        }

        return null;
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-2 md:px-0 animate-fadeIn">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-uninunez-onix font-display uppercase tracking-tight">
                            {isPublicView ? 'Banco de Proyectos' : 'Analítica Académica'}
                        </h1>
                        <p className="mt-2 text-uninunez-ash font-medium">Consolidado institucional para el seguimiento de trabajos de grado.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <label className="block text-[9px] font-black text-uninunez-ash uppercase tracking-widest mb-2 ml-1">Título / Clave</label>
                        <input type="text" name="title" value={filters.title} onChange={handleFilterChange} className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-bold bg-gray-50 focus:ring-uninunez-orange outline-none" />
                    </div>
                     <div>
                        <label className="block text-[9px] font-black text-uninunez-ash uppercase tracking-widest mb-2 ml-1">Programa Académico</label>
                        <select name="programId" value={filters.programId} onChange={handleFilterChange} className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-bold bg-gray-50 outline-none">
                            <option value="">TODOS LOS PROGRAMAS</option>
                            {allPrograms.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[9px] font-black text-uninunez-ash uppercase tracking-widest mb-2 ml-1">Estado de Avance</label>
                        <select name="statusId" value={filters.statusId} onChange={handleFilterChange} className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-bold bg-gray-50 outline-none">
                            <option value="">TODOS LOS ESTADOS</option>
                            {allStatuses.map(s => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[9px] font-black text-uninunez-ash uppercase tracking-widest mb-2 ml-1">Formato de Trabajo</label>
                        <select name="formatId" value={filters.formatId} onChange={handleFilterChange} className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-bold bg-gray-50 outline-none">
                            <option value="">TODOS LOS FORMATOS</option>
                            {allFormats.map(f => <option key={f.id} value={f.id}>{f.name.toUpperCase()}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[9px] font-black text-uninunez-ash uppercase tracking-widest mb-2 ml-1">Docente Responsable</label>
                        <select name="teacherId" value={filters.teacherId} onChange={handleFilterChange} className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-bold bg-gray-50 outline-none">
                            <option value="">TODOS LOS DOCENTES</option>
                            {allTeachers.map(t => <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex justify-end items-center gap-4 mt-10 pt-6 border-t border-gray-100">
                    <button onClick={() => loadReportData(filters)} className="bg-uninunez-onix text-white px-10 py-3 rounded-xl text-[10px] font-black shadow-xl hover:bg-black transition-all uppercase tracking-[0.2em]">Ejecutar Análisis</button>
                </div>
            </div>

            {/* Elegant Submenu Tab Selector */}
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex gap-2 overflow-x-auto scrollbar-none md:flex-wrap lg:flex-nowrap">
                {[
                    { id: 'visual', label: 'Estadísticas y KPIs', icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" strokeWidth="2.5" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" strokeWidth="2.5" />
                        </svg>
                    )},
                    { id: 'projects', label: 'Matriz de Seguimiento', icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                    )},
                    { id: 'teachers-roles', label: 'Proyectos a Cargo', icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    )},
                    { id: 'programs', label: 'Resumen por Programa', icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    )},
                    { id: 'workload', label: 'Carga Académica', icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    )},
                    { id: 'unassigned', label: 'Estudiantes sin Asignar', icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    )}
                ].map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id as any);
                                // Forzar el recalculo de gráficos pasandole tiempo de react con timeout
                                setTimeout(() => {
                                    window.dispatchEvent(new Event('resize'));
                                }, 50);
                            }}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${
                                isActive 
                                ? 'bg-uninunez-teal text-white shadow-md shadow-uninunez-teal/20' 
                                : 'bg-gray-50 text-uninunez-ash hover:bg-gray-100 hover:text-uninunez-onix'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* TAB: VISUALIZACIONES & KPIS */}
            {activeTab === 'visual' && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KpiCard 
                            title="Total Proyectos" 
                            value={kpis.totalProjects} 
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                            color="bg-uninunez-orange"
                        />
                        <KpiCard 
                            title="Docentes Vinculados" 
                            value={kpis.totalTeachers} 
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                            color="bg-uninunez-teal"
                        />
                        <KpiCard 
                            title="Estudiantes Activos" 
                            value={kpis.totalStudents} 
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>}
                            color="bg-uninunez-jade"
                        />
                        <KpiCard 
                            title="Programas Académicos" 
                            value={kpis.totalPrograms} 
                            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                            color="bg-uninunez-onix"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {projectStatusChartData && <ChartCard title="Distribución por Estado" type="pie" data={projectStatusChartData} />}
                        {projectsPerProgramChartData && <ChartCard title="Proyectos por Programa" type="pie" data={projectsPerProgramChartData} />}
                        {studentAssignmentChartData && <ChartCard title="Estatus de Integración" type="doughnut" data={studentAssignmentChartData} />}
                        {studentsPerProgramChartData && <ChartCard title="Población por Programa" type="pie" data={studentsPerProgramChartData} />}
                    </div>
                </div>
            )}

            {/* TAB: MATRIZ DE SEGUIMIENTO */}
            {activeTab === 'projects' && (
                <div className="space-y-6 animate-fadeIn">
                    <ReportTableCard 
                        title="Matriz de Seguimiento de Proyectos" 
                        description="Visión consolidada con estados, formatos y roles docentes asignados."
                        onExport={() => handleExport(projectStatus, 'seguimiento_proyectos_curn')}
                        hasData={projectStatus.length > 0}
                        showExport={!isPublicView}
                    >
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/80 border-b border-gray-100">
                                <tr>
                                    {projectStatus.length > 0 && Object.keys(projectStatus[0]).filter(k => k !== 'id').map(key => (
                                        <th key={key} className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{key}</th>
                                    ))}
                                    <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {projectStatus.map((row, index) => (
                                    <tr key={index} className="hover:bg-uninunez-teal/5 transition-colors group">
                                        {Object.entries(row).filter(([k]) => k !== 'id').map(([key, val], i) => (
                                            <td key={i} className="px-6 py-5 text-[11px] leading-tight text-uninunez-ash">
                                                {key === 'Enlace a Archivos' && val !== 'Sin enlace' ? (
                                                    <a href={String(val)} target="_blank" rel="noopener noreferrer" className="text-uninunez-teal font-black hover:underline">VER ARCHIVOS</a>
                                                ) : (
                                                    String(val)
                                                )}
                                            </td>
                                        ))}
                                        <td className="px-6 py-5 text-[11px] leading-tight text-uninunez-ash">
                                            <button onClick={() => showRelatedInfo('project', row.id, row['Título del Proyecto'])} className="text-uninunez-teal font-black hover:underline text-[9px] uppercase tracking-widest">Ver Relacionados</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ReportTableCard>
                </div>
            )}

            {/* TAB: PROYECTOS A CARGO */}
            {activeTab === 'teachers-roles' && (
                <div className="space-y-6 animate-fadeIn">
                    <ReportTableCard 
                        title="Proyectos a Cargo por Docente y Rol" 
                        description="Relación detallada de proyectos asignados a cada docente (Tutores, Cotutores y Revisores/Evaluadores/Jurados)."
                        onExport={() => handleExport(teacherProjectsDetail, 'proyectos_a_cargo_docentes')}
                        hasData={teacherProjectsDetail.length > 0}
                        showExport={!isPublicView}
                    >
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/80 border-b border-gray-100">
                                <tr>
                                    {teacherProjectsDetail.length > 0 && Object.keys(teacherProjectsDetail[0]).filter(k => k !== 'id').map(key => (
                                        <th key={key} className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{key}</th>
                                    ))}
                                    <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {teacherProjectsDetail.map((row, index) => (
                                    <tr key={index} className="hover:bg-uninunez-teal/5 transition-colors group">
                                        {Object.entries(row).filter(([k]) => k !== 'id').map(([key, val], i) => (
                                            <td key={i} className="px-6 py-5 text-[11px] leading-tight text-uninunez-ash">
                                                {String(val)}
                                            </td>
                                        ))}
                                        <td className="px-6 py-5 text-[11px] leading-tight text-uninunez-ash whitespace-nowrap">
                                            <div className="flex gap-4">
                                                <button 
                                                    onClick={() => showRelatedInfo('project', row.id.split('_')[0], row['Título del Proyecto'])} 
                                                    className="text-uninunez-teal font-black hover:underline text-[9px] uppercase tracking-widest"
                                                >
                                                    Ver Proyecto
                                                </button>
                                                <button 
                                                    onClick={() => showRelatedInfo('teacher', row.id.split('_')[1], row['Nombre del Docente'])} 
                                                    className="text-uninunez-orange font-black hover:underline text-[9px] uppercase tracking-widest"
                                                >
                                                    Ver Docente
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ReportTableCard>
                </div>
            )}

            {/* TAB: RESUMEN POR PROGRAMA */}
            {activeTab === 'programs' && (
                <div className="space-y-6 animate-fadeIn">
                    <ReportTableCard 
                        title="Resumen de Proyectos por Programa" 
                        description="Consolidado de proyectos y vinculación estudiantil por cada programa académico."
                        onExport={() => handleExport(programSummary, 'resumen_programas')}
                        hasData={programSummary.length > 0}
                    >
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/80 border-b border-gray-100">
                                <tr>
                                    {programSummary.length > 0 && Object.keys(programSummary[0]).filter(k => k !== 'id').map(key => (
                                        <th key={key} className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{key}</th>
                                    ))}
                                    <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {programSummary.map((row, index) => (
                                    <tr key={index} className="hover:bg-uninunez-teal/5 transition-colors group">
                                        {Object.entries(row).filter(([k]) => k !== 'id').map(([key, val], i) => (
                                            <td key={i} className="px-6 py-5 text-[11px] leading-tight text-uninunez-ash font-bold">
                                                {val}
                                            </td>
                                        ))}
                                        <td className="px-6 py-5 text-[11px] leading-tight text-uninunez-ash">
                                            <button onClick={() => showRelatedInfo('program', row.id, row['Programa'])} className="text-uninunez-teal font-black hover:underline text-[9px] uppercase tracking-widest">Ver Relacionados</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ReportTableCard>
                </div>
            )}

            {/* TAB: CARGA ACADÉMICA */}
            {activeTab === 'workload' && (
                <div className="space-y-8 animate-fadeIn">
                    <ChartCard title="Carga Académica (Top 10 Docentes)" type="bar" data={teacherWorkloadChartData} />

                    <ReportTableCard 
                        title="Carga Académica por Docente" 
                        description="Distribución de roles (Director, Co-Director, Evaluador) por docente."
                        onExport={() => handleExport(teacherWorkload, 'carga_docentes')}
                        hasData={teacherWorkload.length > 0}
                    >
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/80 border-b border-gray-100">
                                <tr>
                                    {teacherWorkload.length > 0 && Object.keys(teacherWorkload[0]).filter(k => k !== 'id').map(key => (
                                        <th key={key} className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{key}</th>
                                    ))}
                                    <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {teacherWorkload.map((row, index) => (
                                    <tr key={index} className="hover:bg-uninunez-teal/5 transition-colors group">
                                        {Object.entries(row).filter(([k]) => k !== 'id').map(([key, val], i) => (
                                            <td key={i} className="px-6 py-5 text-[11px] leading-tight text-uninunez-ash">
                                                {val}
                                            </td>
                                        ))}
                                        <td className="px-6 py-5 text-[11px] leading-tight text-uninunez-ash">
                                            <button onClick={() => showRelatedInfo('teacher', row.id, row['Nombre del Docente'])} className="text-uninunez-teal font-black hover:underline text-[9px] uppercase tracking-widest">Ver Relacionados</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ReportTableCard>

                    <ReportTableCard 
                        title="Proyectos por Docente y Programa" 
                        description="Desglose detallado de la participación docente por cada programa académico."
                        onExport={() => handleExport(teacherProgramWorkload, 'docentes_por_programa')}
                        hasData={teacherProgramWorkload.length > 0}
                    >
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/80 border-b border-gray-100">
                                <tr>
                                    {teacherProgramWorkload.length > 0 && Object.keys(teacherProgramWorkload[0]).filter(k => k !== 'id').map(key => (
                                        <th key={key} className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{key}</th>
                                    ))}
                                    <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {teacherProgramWorkload.map((row, index) => (
                                    <tr key={index} className="hover:bg-uninunez-teal/5 transition-colors group">
                                        {Object.entries(row).filter(([k]) => k !== 'id').map(([key, val], i) => (
                                            <td key={i} className="px-6 py-5 text-[11px] leading-tight text-uninunez-ash">
                                                {val}
                                            </td>
                                        ))}
                                        <td className="px-6 py-5 text-[11px] leading-tight text-uninunez-ash">
                                            <button onClick={() => showRelatedInfo('teacher', row.id.split('_')[0], row['Docente'])} className="text-uninunez-teal font-black hover:underline text-[9px] uppercase tracking-widest">Ver Relacionados</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ReportTableCard>
                </div>
            )}

            {/* TAB: ESTUDIANTES SIN ASIGNAR */}
            {activeTab === 'unassigned' && (
                <div className="space-y-6 animate-fadeIn">
                    <ReportTableCard 
                        title="Estudiantes sin Proyecto Vinculado" 
                        description="Listado de estudiantes que aún no han sido asignados a un trabajo de grado."
                        onExport={() => handleExport(unassignedStudents, 'estudiantes_sin_proyecto')}
                        hasData={unassignedStudents.length > 0}
                    >
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/80 border-b border-gray-100">
                                <tr>
                                    {unassignedStudents.length > 0 && Object.keys(unassignedStudents[0]).filter(k => k !== 'id').map(key => (
                                        <th key={key} className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{key}</th>
                                    ))}
                                    <th className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {unassignedStudents.map((row, index) => (
                                    <tr key={index} className="hover:bg-uninunez-teal/5 transition-colors group">
                                        {Object.entries(row).filter(([k]) => k !== 'id').map(([key, val], i) => (
                                            <td key={i} className="px-6 py-5 text-[11px] leading-tight text-uninunez-ash">
                                                {val}
                                            </td>
                                        ))}
                                        <td className="px-6 py-5 text-[11px] leading-tight text-uninunez-ash">
                                            <button onClick={() => showRelatedInfo('student', row.id, row['Nombre del Estudiante'])} className="text-uninunez-teal font-black hover:underline text-[9px] uppercase tracking-widest">Ver Relacionados</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </ReportTableCard>
                </div>
            )}

            <Modal 
                isOpen={!!detailModal} 
                onClose={() => setDetailModal(null)} 
                title={detailModal?.title || 'Información Relacionada'}
            >
                {renderRelatedInfo()}
            </Modal>
        </div>
    );
};
