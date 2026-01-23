
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../services/database';
import { Project, Student, Teacher, TeacherRole, Status, Format, Program } from '../types';
import { arrayToCsv } from '../utils/csv';

// Informa a TypeScript sobre la variable global Chart de la CDN
declare var Chart: any;

// --- Interfaces para los datos de los reportes ---
interface ProjectStatusReport {
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
    'Nombre del Docente': string;
    'Email': string;
    'Proyectos como Director': number;
    'Proyectos como Co-Director': number;
    'Proyectos como Evaluador': number;
    'Total de Proyectos': number;
}

interface UnassignedStudentsReport {
    'Nombre del Estudiante': string;
    'Email': string;
    'Programa': string;
}

interface ReportsPageProps {
    isPublicView?: boolean;
}

// --- Componentes Reutilizables ---

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


export const ReportsPage: React.FC<ReportsPageProps> = ({ isPublicView = false }) => {
    // State para reportes tabulares
    const [projectStatus, setProjectStatus] = useState<ProjectStatusReport[]>([]);
    const [teacherWorkload, setTeacherWorkload] = useState<TeacherWorkloadReport[]>([]);
    const [unassignedStudents, setUnassignedStudents] = useState<UnassignedStudentsReport[]>([]);

    // State para datos de gráficos
    const [projectStatusChartData, setProjectStatusChartData] = useState(null);
    const [studentAssignmentChartData, setStudentAssignmentChartData] = useState(null);
    const [teacherWorkloadChartData, setTeacherWorkloadChartData] = useState(null);
    const [studentsPerProgramChartData, setStudentsPerProgramChartData] = useState(null);
    
    // State for filter values
    const [filters, setFilters] = useState({
        title: '',
        programId: '',
        statusId: '',
        formatId: '',
        teacherId: '',
        startDate: '',
        endDate: '',
    });

    // State for dropdown options
    const [allPrograms, setAllPrograms] = useState<Program[]>([]);
    const [allStatuses, setAllStatuses] = useState<Status[]>([]);
    const [allFormats, setAllFormats] = useState<Format[]>([]);
    const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);

    const loadReportData = useCallback(async (currentFilters: any) => {
        const [allProjects, allStudents, allTeachers, roles, statuses, formats, projectTeachers, programs] = await Promise.all([
            db.getProjects(),
            db.getStudents(),
            db.getTeachers(),
            db.getTeacherRoles(),
            db.getStatuses(),
            db.getFormats(),
            db.getProjectTeachers(),
            db.getPrograms()
        ]);

        // --- Filtering Logic ---
        let filteredProjects = allProjects;

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
            // El programa ahora reside en Project según types.ts actualizado previamente
            // Pero verificamos tanto en proyecto como en estudiantes para mayor precisión
            const studentProjectIds = allStudents
                .filter(s => s.programId === currentFilters.programId && s.projectId)
                .map(s => s.projectId);
            
            filteredProjects = filteredProjects.filter(p => p.programId === currentFilters.programId || studentProjectIds.includes(p.id));
        }

        const filteredProjectIds = new Set(filteredProjects.map(p => p.id));
        
        let filteredTeachersForWorkload = allTeachers;
        if (currentFilters.teacherId) {
            filteredTeachersForWorkload = allTeachers.filter(t => t.id === currentFilters.teacherId);
        }

        // --- Report Generation (using filtered data) ---
        const projectStatusData = filteredProjects.map(p => {
            const assignedStudents = allStudents.filter(s => s.projectId === p.id);
            const studentNames = assignedStudents.map(s => s.name).join(', ');
            const studentPrograms = [...new Set(assignedStudents.map(s => programs.find(prog => prog.id === (s.programId || p.programId))?.name || 'N/A'))].join(', ');
            
            // Mapeo detallado de Docentes y sus Roles específicos
            const assignedTeachers = projectTeachers
                .filter(pt => pt.projectId === p.id)
                .map(pt => {
                    const t = allTeachers.find(teach => teach.id === pt.teacherId);
                    const r = roles.find(rol => rol.id === pt.roleId);
                    return `${t?.name || 'N/A'} [${r?.name || 'N/A'}]`;
                })
                .join('; ');
            
            return {
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

        const workloadData = filteredTeachersForWorkload.map(teacher => {
            const assignments = projectTeachers.filter(pt => pt.teacherId === teacher.id && filteredProjectIds.has(pt.projectId));
            let directorCount = 0, coDirectorCount = 0, evaluatorCount = 0;
            assignments.forEach(assignment => {
                const roleName = roles.find(r => r.id === assignment.roleId)?.name.toLowerCase() || '';
                if (roleName.includes('director') && !roleName.includes('co-director')) directorCount++;
                else if (roleName.includes('co-director')) coDirectorCount++;
                else if (roleName.includes('evaluador')) evaluatorCount++;
            });
            return {
                'Nombre del Docente': teacher.name, 'Email': teacher.email, 'Proyectos como Director': directorCount,
                'Proyectos como Co-Director': coDirectorCount, 'Proyectos como Evaluador': evaluatorCount, 'Total de Proyectos': assignments.length,
            };
        });
        setTeacherWorkload(workloadData);
        
        let unassignedStudentsDataFiltered = allStudents.filter(s => !s.projectId);
        if (currentFilters.programId) {
            unassignedStudentsDataFiltered = unassignedStudentsDataFiltered.filter(s => s.programId === currentFilters.programId);
        }
        setUnassignedStudents(unassignedStudentsDataFiltered.map(s => ({ 
                'Nombre del Estudiante': s.name, 
                'Email': s.email, 
                'Programa': programs.find(p => p.id === s.programId)?.name || 'N/A' 
        })));

        // --- Chart data generation ---
        const uninunezColors = ['#F07E12', '#249A8C', '#3C3C3B', '#F39200', '#14AA9F', '#2FAC66', '#575756'];
        
        const statusCounts = statuses.map(status => ({ name: status.name, count: filteredProjects.filter(p => p.statusId === status.id).length }));
        setProjectStatusChartData({
            labels: statusCounts.map(s => s.name),
            datasets: [{ label: 'Proyectos', data: statusCounts.map(s => s.count), backgroundColor: uninunezColors, borderColor: '#ffffff', borderWidth: 2 }]
        });
        
        // Estatus estudiantes (Calculado sobre el universo filtrado por programa si aplica)
        const studentUniverse = currentFilters.programId ? allStudents.filter(s => s.programId === currentFilters.programId) : allStudents;
        const currentUnassigned = unassignedStudentsDataFiltered.length;
        const currentAssigned = studentUniverse.length - currentUnassigned;

        setStudentAssignmentChartData({
            labels: ['Vinculados', 'Sin Proyecto'],
            datasets: [{ data: [currentAssigned, currentUnassigned], backgroundColor: ['#249A8C', '#E5E7EB'], borderColor: '#ffffff', borderWidth: 2 }]
        });

        const studentsPerProgramCounts = programs.map(program => ({
            name: program.name,
            count: allStudents.filter(s => s.programId === program.id).length
        }));
        setStudentsPerProgramChartData({
            labels: studentsPerProgramCounts.map(p => p.name),
            datasets: [{ label: 'Estudiantes', data: studentsPerProgramCounts.map(p => p.count), backgroundColor: uninunezColors, borderColor: '#ffffff', borderWidth: 2 }]
        });

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
            const [pr, st, fo, te] = await Promise.all([
                db.getPrograms(),
                db.getStatuses(),
                db.getFormats(),
                db.getTeachers()
            ]);
            setAllPrograms(pr);
            setAllStatuses(st);
            setAllFormats(fo);
            setAllTeachers(te);
            loadReportData({
                title: '', programId: '', statusId: '',
                formatId: '', teacherId: '', startDate: '', endDate: '',
            });
        };
        initData();
    }, [loadReportData]);

    const handleExport = (data: any[], filename: string) => {
        if (data.length === 0) {
            alert('No hay datos para exportar.');
            return;
        }
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
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleApplyFilters = () => {
        loadReportData(filters);
    };

    const handleClearFilters = () => {
        const cleared = {
            title: '', programId: '', statusId: '',
            formatId: '', teacherId: '', startDate: '', endDate: '',
        };
        setFilters(cleared);
        loadReportData(cleared);
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
                    <img src="https://axis.uninunez.edu.co/images/uninunez/vm/logoqteal.svg" alt="Uninúñez" className="h-14 hidden md:block opacity-50"/>
                </div>
            </div>

            {/* --- Filter Panel --- */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                <div className="flex items-center gap-2 mb-8 text-uninunez-teal border-b pb-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] font-display">Parámetros de Filtrado</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <label className="block text-[9px] font-black text-uninunez-ash uppercase tracking-widest mb-2 ml-1">Título / Clave</label>
                        <input type="text" name="title" value={filters.title} onChange={handleFilterChange} placeholder="Buscar por título..." className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-bold bg-gray-50 focus:ring-uninunez-orange focus:border-uninunez-orange outline-none transition-all" />
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
                    <div>
                        <label className="block text-[9px] font-black text-uninunez-ash uppercase tracking-widest mb-2 ml-1">Desde (Fecha)</label>
                        <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-bold bg-gray-50 outline-none" />
                    </div>
                    <div>
                        <label className="block text-[9px] font-black text-uninunez-ash uppercase tracking-widest mb-2 ml-1">Hasta (Fecha)</label>
                        <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-bold bg-gray-50 outline-none" />
                    </div>
                </div>
                <div className="flex justify-end items-center gap-4 mt-10 pt-6 border-t border-gray-100">
                    <button onClick={handleClearFilters} className="text-[10px] font-black text-gray-400 hover:text-uninunez-onix px-4 uppercase tracking-[0.2em] transition-colors">Limpiar</button>
                    <button onClick={handleApplyFilters} className="bg-uninunez-onix text-white px-10 py-3 rounded-xl text-[10px] font-black shadow-xl hover:bg-black transition-all uppercase tracking-[0.2em]">Ejecutar Análisis</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {projectStatusChartData && <ChartCard title="Distribución por Estado" type="pie" data={projectStatusChartData} />}
                {studentAssignmentChartData && <ChartCard title="Estatus de Integración" type="doughnut" data={studentAssignmentChartData} />}
                {studentsPerProgramChartData && <ChartCard title="Población por Programa" type="pie" data={studentsPerProgramChartData} />}
            </div>
            
            {teacherWorkloadChartData && (
                <ChartCard 
                    title="Carga Académica Docente (Top 10)" 
                    type="bar" 
                    data={teacherWorkloadChartData} 
                    heightClass="h-96"
                    options={{ scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } }}
                />
            )}

            <div className="space-y-10 pt-4">
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
                                {projectStatus.length > 0 && Object.keys(projectStatus[0]).map(key => (
                                    <th key={key} className="px-6 py-5 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{key}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {projectStatus.map((row, index) => (
                                <tr key={index} className="hover:bg-uninunez-teal/5 transition-colors group">
                                    {Object.entries(row).map(([key, val], i) => (
                                        <td key={i} className={`px-6 py-5 text-[11px] leading-tight ${key === 'Título del Proyecto' ? 'font-bold text-uninunez-onix group-hover:text-uninunez-teal' : 'text-uninunez-ash'}`}>
                                            {key === 'Enlace a Archivos' && val !== 'Sin enlace' ? (
                                                <a href={String(val)} target="_blank" rel="noopener noreferrer" className="text-uninunez-teal font-black hover:underline">VER ARCHIVOS</a>
                                            ) : (
                                                String(val)
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {projectStatus.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center py-24 text-uninunez-ash font-medium italic">No se hallaron registros bajo los parámetros actuales.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </ReportTableCard>
                
                {!isPublicView && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10">
                        <ReportTableCard
                            title="Productividad Docente"
                            description="Conteo acumulado de participaciones académicas."
                            onExport={() => handleExport(teacherWorkload, 'productividad_docente')}
                            hasData={teacherWorkload.length > 0}
                        >
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Docente</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Asignaciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {teacherWorkload.slice(0, 10).map((row, index) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 text-xs font-bold text-uninunez-onix">{row['Nombre del Docente']}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="bg-uninunez-orange text-white text-[10px] font-black px-3 py-1 rounded-lg">{row['Total de Proyectos']}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </ReportTableCard>

                        <ReportTableCard
                            title="Pendientes por Vincular"
                            description="Estudiantes sin proyecto de grado radicado."
                            onExport={() => handleExport(unassignedStudents, 'estudiantes_pendientes')}
                            hasData={unassignedStudents.length > 0}
                        >
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Estudiante</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Programa</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {unassignedStudents.slice(0, 10).map((row, index) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 text-xs font-bold text-uninunez-onix">{row['Nombre del Estudiante']}</td>
                                            <td className="px-6 py-4 text-[10px] font-black text-uninunez-teal uppercase">{row['Programa']}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </ReportTableCard>
                    </div>
                )}
            </div>
        </div>
    );
};
