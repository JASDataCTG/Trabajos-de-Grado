
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
    'Docentes Asignados': string;
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
                    <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{description}</p>
                </div>
                {showExport && (
                    <button
                        onClick={onExport}
                        disabled={!hasData}
                        className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-lg hover:bg-primary-700 text-sm font-bold shadow-sm transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed uppercase tracking-wider"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Exportar CSV
                    </button>
                )}
            </div>
        </div>
        <div className="overflow-x-auto">
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
                                font: { size: 10, weight: '600' },
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6 text-center">{title}</h3>
            <div className={`relative ${heightClass}`}>
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
            const projectIdsForProgram = [...new Set(allStudents
                .filter(s => s.programId === currentFilters.programId && s.projectId)
                .map(s => s.projectId))];
            filteredProjects = filteredProjects.filter(p => projectIdsForProgram.includes(p.id as any));
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
            const studentPrograms = [...new Set(assignedStudents.map(s => programs.find(prog => prog.id === s.programId)?.name || 'N/A'))].join(', ');
            const assignedTeachers = projectTeachers.filter(pt => pt.projectId === p.id).map(pt => `${allTeachers.find(t => t.id === pt.teacherId)?.name || 'N/A'} (${roles.find(r => r.id === pt.roleId)?.name || 'N/A'})`).join('; ');
            
            return {
                'Título del Proyecto': p.title, 
                'Estado': statuses.find(s => s.id === p.statusId)?.name || 'N/A', 
                'Formato': formats.find(f => f.id === p.formatId)?.name || 'N/A',
                'Fecha de Presentación': p.presentationDate, 
                'Estudiantes Asignados': studentNames || 'Ninguno',
                'Programas de Estudiantes': studentPrograms || 'N/A',
                'Docentes Asignados': assignedTeachers || 'Ninguno',
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
        const chartColors = ['#ff9500', '#e68600', '#bf7000', '#995a00', '#7d4900', '#422600', '#f59e0b'];
        
        const statusCounts = statuses.map(status => ({ name: status.name, count: filteredProjects.filter(p => p.statusId === status.id).length }));
        setProjectStatusChartData({
            labels: statusCounts.map(s => s.name),
            datasets: [{ label: 'Proyectos', data: statusCounts.map(s => s.count), backgroundColor: chartColors, borderColor: '#ffffff', borderWidth: 2 }]
        });
        
        const totalStudents = currentFilters.programId ? allStudents.filter(s => s.programId === currentFilters.programId) : allStudents;
        const unassignedCount = unassignedStudentsDataFiltered.length;
        const assignedCount = totalStudents.length - unassignedCount;

        setStudentAssignmentChartData({
            labels: ['Asignados', 'Sin Asignar'],
            datasets: [{ data: [assignedCount, unassignedCount], backgroundColor: ['#ff9500', '#cbd5e1'], borderColor: '#ffffff', borderWidth: 2 }]
        });

        const studentsPerProgramCounts = programs.map(program => ({
            name: program.name,
            count: allStudents.filter(s => s.programId === program.id).length
        }));
        setStudentsPerProgramChartData({
            labels: studentsPerProgramCounts.map(p => p.name),
            datasets: [{ label: 'Estudiantes', data: studentsPerProgramCounts.map(p => p.count), backgroundColor: chartColors, borderColor: '#ffffff', borderWidth: 2 }]
        });

        setTeacherWorkloadChartData({
            labels: workloadData.map(w => w['Nombre del Docente']),
            datasets: [
                { label: 'Director', data: workloadData.map(w => w['Proyectos como Director']), backgroundColor: '#ff9500' },
                { label: 'Co-Director', data: workloadData.map(w => w['Proyectos como Co-Director']), backgroundColor: '#e68600' },
                { label: 'Evaluador', data: workloadData.map(w => w['Proyectos como Evaluador']), backgroundColor: '#ffd399' },
            ]
        });

    }, []);

    useEffect(() => {
        const initData = async () => {
            setAllPrograms(await db.getPrograms());
            setAllStatuses(await db.getStatuses());
            setAllFormats(await db.getFormats());
            setAllTeachers(await db.getTeachers());
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
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                <h1 className="text-3xl font-bold text-gray-900 uppercase tracking-tight">
                    {isPublicView ? 'Reportes Públicos' : 'Módulo de Analítica'}
                </h1>
                <p className="mt-2 text-gray-500 font-medium">Información consolidada para el seguimiento de trabajos de grado.</p>
            </div>

            {/* --- Filter Panel --- */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-6 text-primary-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                    <h3 className="text-lg font-bold uppercase tracking-wider">Filtros Inteligentes</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <label htmlFor="title" className="block text-xs font-bold text-gray-500 uppercase mb-2">Título / Palabra Clave</label>
                        <input type="text" name="title" id="title" value={filters.title} onChange={handleFilterChange} placeholder="Buscar..." className="block w-full border border-gray-200 rounded-lg py-2.5 px-3 text-sm focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                     <div>
                        <label htmlFor="programId" className="block text-xs font-bold text-gray-500 uppercase mb-2">Programa</label>
                        <select name="programId" id="programId" value={filters.programId} onChange={handleFilterChange} className="block w-full border border-gray-200 rounded-lg py-2.5 px-3 text-sm">
                            <option value="">Todos los programas</option>
                            {allPrograms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="statusId" className="block text-xs font-bold text-gray-500 uppercase mb-2">Estado</label>
                        <select name="statusId" id="statusId" value={filters.statusId} onChange={handleFilterChange} className="block w-full border border-gray-200 rounded-lg py-2.5 px-3 text-sm">
                            <option value="">Cualquier estado</option>
                            {allStatuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="teacherId" className="block text-xs font-bold text-gray-500 uppercase mb-2">Docente Responsable</label>
                        <select name="teacherId" id="teacherId" value={filters.teacherId} onChange={handleFilterChange} className="block w-full border border-gray-200 rounded-lg py-2.5 px-3 text-sm">
                            <option value="">Todos los docentes</option>
                            {allTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex justify-end items-center gap-3 mt-8 border-t pt-6">
                    <button onClick={handleClearFilters} className="text-sm font-bold text-gray-400 hover:text-gray-600 px-4 uppercase tracking-widest">Reiniciar</button>
                    <button onClick={handleApplyFilters} className="bg-gray-900 text-white px-8 py-2.5 rounded-lg hover:bg-black text-sm font-bold shadow-md transition-all uppercase tracking-widest">Filtrar Reportes</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {projectStatusChartData && <ChartCard title="Distribución por Estado" type="pie" data={projectStatusChartData} />}
                {studentAssignmentChartData && <ChartCard title="Estatus Estudiantes" type="doughnut" data={studentAssignmentChartData} />}
                {studentsPerProgramChartData && <ChartCard title="Estudiantes por Programa" type="pie" data={studentsPerProgramChartData} />}
            </div>
            
            {teacherWorkloadChartData && (
                <ChartCard 
                    title="Asignaciones por Docente (Carga de Trabajo)" 
                    type="bar" 
                    data={teacherWorkloadChartData} 
                    heightClass="h-96"
                    options={{ scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } }}
                />
            )}

            <div className="space-y-10 pt-4">
                <ReportTableCard 
                    title="Detalle Maestro de Proyectos" 
                    description="Reporte consolidado con metadatos de proyectos, estudiantes y evaluadores."
                    onExport={() => handleExport(projectStatus, 'maestro_proyectos')}
                    hasData={projectStatus.length > 0}
                    showExport={!isPublicView}
                >
                    <table className="w-full text-left text-xs">
                        <thead className="bg-gray-100/80 border-b">
                            <tr>
                                {projectStatus.length > 0 && Object.keys(projectStatus[0]).map(key => (
                                    <th key={key} className="px-6 py-4 font-bold text-gray-600 uppercase tracking-tighter">{key}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {projectStatus.map((row, index) => (
                                <tr key={index} className="hover:bg-primary-50/30 transition-colors">
                                    {Object.values(row).map((val, i) => (
                                        <td key={i} className="px-6 py-4 text-gray-700 font-medium leading-tight">{String(val)}</td>
                                    ))}
                                </tr>
                            ))}
                            {projectStatus.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-16 text-gray-400 italic font-medium">No se encontraron proyectos con los criterios seleccionados.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </ReportTableCard>
                
                {!isPublicView && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <ReportTableCard
                            title="Desempeño Docente"
                            description="Conteo de roles asignados por docente."
                            onExport={() => handleExport(teacherWorkload, 'desempeno_docente')}
                            hasData={teacherWorkload.length > 0}
                        >
                            <table className="w-full text-left text-[10px]">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 font-bold text-gray-600 uppercase">Docente</th>
                                        <th className="px-4 py-3 font-bold text-gray-600 uppercase text-center">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {teacherWorkload.slice(0, 10).map((row, index) => (
                                        <tr key={index}>
                                            <td className="px-4 py-3 text-gray-700 font-bold">{row['Nombre del Docente']}</td>
                                            <td className="px-4 py-3 text-center font-black text-primary-700">{row['Total de Proyectos']}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </ReportTableCard>

                        <ReportTableCard
                            title="Estudiantes sin Asignar"
                            description="Lista de estudiantes pendientes por vinculación."
                            onExport={() => handleExport(unassignedStudents, 'estudiantes_pendientes')}
                            hasData={unassignedStudents.length > 0}
                        >
                            <table className="w-full text-left text-[10px]">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 font-bold text-gray-600 uppercase">Estudiante</th>
                                        <th className="px-4 py-3 font-bold text-gray-600 uppercase">Programa</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {unassignedStudents.slice(0, 10).map((row, index) => (
                                        <tr key={index}>
                                            <td className="px-4 py-3 text-gray-700 font-bold">{row['Nombre del Estudiante']}</td>
                                            <td className="px-4 py-3 text-gray-500">{row['Programa']}</td>
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
