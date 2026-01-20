
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../services/database';
import { Project, Student, Teacher, TeacherRole, Status, Format, ProjectTeacher, Program } from '../types';
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


// --- Componentes Reutilizables ---

const ReportTableCard: React.FC<{ title: string; description: string; children: React.ReactNode; onExport: () => void; hasData: boolean; }> = ({ title, description, children, onExport, hasData }) => (
    <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{description}</p>
                </div>
                <button
                    onClick={onExport}
                    disabled={!hasData}
                    className="bg-primary-100 text-primary-700 px-4 py-2 rounded-md hover:bg-primary-200 text-sm font-medium disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                    Exportar a CSV
                </button>
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
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">{title}</h3>
            <div className={`relative ${heightClass}`}>
                <canvas ref={chartRef}></canvas>
            </div>
        </div>
    );
};


export const ReportsPage: React.FC = () => {
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

    // Fix: Made loadReportData async and use Promise.all to await all database results to resolve type Promise<any> errors
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
        const chartColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#6366f1', '#ec4899'];
        
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
            datasets: [{ data: [assignedCount, unassignedCount], backgroundColor: ['#3b82f6', '#f59e0b'], borderColor: '#ffffff', borderWidth: 2 }]
        });

        const studentsPerProgramCounts = programs.map(program => ({
            name: program.name,
            count: allStudents.filter(s => s.programId === program.id).length
        }));
        setStudentsPerProgramChartData({
            labels: studentsPerProgramCounts.map(p => p.name),
            datasets: [{ label: 'Estudiantes', data: studentsPerProgramCounts.map(p => p.count), backgroundColor: ['#1d4ed8', '#9333ea'], borderColor: '#ffffff', borderWidth: 2 }]
        });

        setTeacherWorkloadChartData({
            labels: workloadData.map(w => w['Nombre del Docente']),
            datasets: [
                { label: 'Director', data: workloadData.map(w => w['Proyectos como Director']), backgroundColor: '#1d4ed8' },
                { label: 'Co-Director', data: workloadData.map(w => w['Proyectos como Co-Director']), backgroundColor: '#3b82f6' },
                { label: 'Evaluador', data: workloadData.map(w => w['Proyectos como Evaluador']), backgroundColor: '#93c5fd' },
            ]
        });

    }, []);

    useEffect(() => {
        // Fix: Use an async function within useEffect to resolve the async loadReportData
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
        link.setAttribute("download", `${filename}.csv`);
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
        <div className="space-y-10">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Módulo de Reportes</h1>
                <p className="mt-2 text-gray-600">Visualice y exporte informes clave para el seguimiento de los proyectos de grado.</p>
            </div>

            {/* --- Filter Panel --- */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Filtros de Reportes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Buscar por Título</label>
                        <input type="text" name="title" id="title" value={filters.title} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                     <div>
                        <label htmlFor="programId" className="block text-sm font-medium text-gray-700">Programa Académico</label>
                        <select name="programId" id="programId" value={filters.programId} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                            <option value="">Todos</option>
                            {allPrograms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="statusId" className="block text-sm font-medium text-gray-700">Estado del Proyecto</label>
                        <select name="statusId" id="statusId" value={filters.statusId} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                            <option value="">Todos</option>
                            {allStatuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="formatId" className="block text-sm font-medium text-gray-700">Formato del Proyecto</label>
                        <select name="formatId" id="formatId" value={filters.formatId} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                            <option value="">Todos</option>
                            {allFormats.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700">Docente</label>
                        <select name="teacherId" id="teacherId" value={filters.teacherId} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                            <option value="">Todos</option>
                            {allTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Fecha Desde</label>
                            <input type="date" name="startDate" id="startDate" value={filters.startDate} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Fecha Hasta</label>
                            <input type="date" name="endDate" id="endDate" value={filters.endDate} onChange={handleFilterChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                        </div>
                    </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6 border-t pt-4">
                    <button onClick={handleClearFilters} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 text-sm font-medium">Limpiar Filtros</button>
                    <button onClick={handleApplyFilters} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 text-sm font-medium">Aplicar Filtros</button>
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-gray-700 mb-6">Visualizaciones Gráficas</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {projectStatusChartData && <ChartCard title="Distribución de Proyectos por Estado" type="pie" data={projectStatusChartData} />}
                    {studentAssignmentChartData && <ChartCard title="Distribución de Estudiantes" type="doughnut" data={studentAssignmentChartData} />}
                    {studentsPerProgramChartData && <ChartCard title="Estudiantes por Programa" type="pie" data={studentsPerProgramChartData} />}
                </div>
                {teacherWorkloadChartData && (
                    <ChartCard 
                        title="Carga de Trabajo por Docente" 
                        type="bar" 
                        data={teacherWorkloadChartData} 
                        heightClass="h-96"
                        options={{ scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } }}
                    />
                )}
            </div>

            <div>
                <h2 className="text-2xl font-bold text-gray-700 mb-6">Reportes Detallados</h2>
                <div className="space-y-8">
                    <ReportTableCard 
                        title="Estado General de Proyectos" 
                        description="Vista completa de todos los proyectos con sus detalles y personas asignadas."
                        onExport={() => handleExport(projectStatus, 'estado_general_proyectos')}
                        hasData={projectStatus.length > 0}
                    >
                        <table className="w-full text-left">
                            <thead className="bg-gray-50"><tr>{projectStatus.length > 0 && Object.keys(projectStatus[0]).map(key => (<th key={key} className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{key}</th>))}</tr></thead>
                            <tbody className="divide-y divide-gray-200">{projectStatus.map((row, index) => (<tr key={index}>{Object.values(row).map((val, i) => (<td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{String(val)}</td>))}</tr>))}{projectStatus.length === 0 && (<tr><td colSpan={7} className="text-center py-10 text-gray-500">No hay proyectos que coincidan con los filtros.</td></tr>)}</tbody>
                        </table>
                    </ReportTableCard>
                    
                    <ReportTableCard
                        title="Carga de Trabajo de Docentes"
                        description="Análisis de la cantidad de proyectos y roles asignados a cada docente."
                        onExport={() => handleExport(teacherWorkload, 'carga_trabajo_docentes')}
                        hasData={teacherWorkload.length > 0}
                    >
                        <table className="w-full text-left">
                            <thead className="bg-gray-50"><tr>{teacherWorkload.length > 0 && Object.keys(teacherWorkload[0]).map(key => (<th key={key} className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{key}</th>))}</tr></thead>
                            <tbody className="divide-y divide-gray-200">{teacherWorkload.map((row, index) => (<tr key={index}>{Object.values(row).map((val, i) => (<td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{String(val)}</td>))}</tr>))}{teacherWorkload.length === 0 && (<tr><td colSpan={6} className="text-center py-10 text-gray-500">No hay docentes que coincidan con los filtros.</td></tr>)}</tbody>
                        </table>
                    </ReportTableCard>
                    
                    <ReportTableCard
                        title="Estudiantes sin Asignar"
                        description="Lista de todos los estudiantes que no están vinculados a ningún proyecto."
                        onExport={() => handleExport(unassignedStudents, 'estudiantes_sin_asignar')}
                        hasData={unassignedStudents.length > 0}
                    >
                        <table className="w-full text-left">
                            <thead className="bg-gray-50"><tr>{unassignedStudents.length > 0 && Object.keys(unassignedStudents[0]).map(key => (<th key={key} className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">{key}</th>))}</tr></thead>
                            <tbody className="divide-y divide-gray-200">{unassignedStudents.map((row, index) => (<tr key={index}>{Object.values(row).map((val, i) => (<td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{String(val)}</td>))}</tr>))}{unassignedStudents.length === 0 && (<tr><td colSpan={3} className="text-center py-10 text-gray-500">No hay estudiantes sin asignar que coincidan con los filtros.</td></tr>)}</tbody>
                        </table>
                    </ReportTableCard>
                </div>
            </div>
        </div>
    );
};
