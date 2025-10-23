import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../services/database';
import { Project, Student, Teacher, TeacherRole, Status, Format, ProjectTeacher } from '../types';
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

    const loadReportData = useCallback(() => {
        const projects = db.getProjects();
        const students = db.getStudents();
        const teachers = db.getTeachers();
        const roles = db.getTeacherRoles();
        const statuses = db.getStatuses();
        const formats = db.getFormats();
        const projectTeachers = db.getProjectTeachers();

        // --- Lógica para reportes tabulares ---
        const projectStatusData = projects.map(p => {
            const assignedStudents = students.filter(s => s.projectId === p.id).map(s => s.name).join(', ');
            const assignedTeachers = projectTeachers.filter(pt => pt.projectId === p.id).map(pt => `${teachers.find(t => t.id === pt.teacherId)?.name || 'N/A'} (${roles.find(r => r.id === pt.roleId)?.name || 'N/A'})`).join('; ');
            return {
                'Título del Proyecto': p.title, 'Estado': statuses.find(s => s.id === p.statusId)?.name || 'N/A', 'Formato': formats.find(f => f.id === p.formatId)?.name || 'N/A',
                'Fecha de Presentación': p.presentationDate, 'Estudiantes Asignados': assignedStudents || 'Ninguno', 'Docentes Asignados': assignedTeachers || 'Ninguno',
            };
        });
        setProjectStatus(projectStatusData);

        const workloadData = teachers.map(teacher => {
            const assignments = projectTeachers.filter(pt => pt.teacherId === teacher.id);
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
        
        const unassignedStudentsData = students.filter(s => !s.projectId).map(s => ({ 'Nombre del Estudiante': s.name, 'Email': s.email }));
        setUnassignedStudents(unassignedStudentsData);

        // --- Lógica para datos de gráficos ---
        const chartColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#6366f1', '#ec4899'];
        
        const statusCounts = statuses.map(status => ({ name: status.name, count: projects.filter(p => p.statusId === status.id).length }));
        setProjectStatusChartData({
            labels: statusCounts.map(s => s.name),
            datasets: [{ label: 'Proyectos', data: statusCounts.map(s => s.count), backgroundColor: chartColors, borderColor: '#ffffff', borderWidth: 2 }]
        });

        const unassignedCount = unassignedStudentsData.length;
        const assignedCount = students.length - unassignedCount;
        setStudentAssignmentChartData({
            labels: ['Asignados', 'Sin Asignar'],
            datasets: [{ data: [assignedCount, unassignedCount], backgroundColor: ['#3b82f6', '#f59e0b'], borderColor: '#ffffff', borderWidth: 2 }]
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
        loadReportData();
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

    return (
        <div className="space-y-10">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Módulo de Reportes</h1>
                <p className="mt-2 text-gray-600">Visualice y exporte informes clave para el seguimiento de los proyectos de grado.</p>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-gray-700 mb-6">Visualizaciones Gráficas</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {projectStatusChartData && <ChartCard title="Distribución de Proyectos por Estado" type="pie" data={projectStatusChartData} />}
                    {studentAssignmentChartData && <ChartCard title="Distribución de Estudiantes" type="doughnut" data={studentAssignmentChartData} />}
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
                            <tbody className="divide-y divide-gray-200">{projectStatus.map((row, index) => (<tr key={index}>{Object.values(row).map((val, i) => (<td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{String(val)}</td>))}</tr>))}{projectStatus.length === 0 && (<tr><td colSpan={6} className="text-center py-10 text-gray-500">No hay proyectos para mostrar.</td></tr>)}</tbody>
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
                            <tbody className="divide-y divide-gray-200">{teacherWorkload.map((row, index) => (<tr key={index}>{Object.values(row).map((val, i) => (<td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{String(val)}</td>))}</tr>))}{teacherWorkload.length === 0 && (<tr><td colSpan={6} className="text-center py-10 text-gray-500">No hay docentes para mostrar.</td></tr>)}</tbody>
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
                            <tbody className="divide-y divide-gray-200">{unassignedStudents.map((row, index) => (<tr key={index}>{Object.values(row).map((val, i) => (<td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{String(val)}</td>))}</tr>))}{unassignedStudents.length === 0 && (<tr><td colSpan={2} className="text-center py-10 text-gray-500">Todos los estudiantes están asignados a un proyecto.</td></tr>)}</tbody>
                        </table>
                    </ReportTableCard>
                </div>
            </div>
        </div>
    );
};