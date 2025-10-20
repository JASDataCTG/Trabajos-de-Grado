import React, { useEffect, useState } from 'react';
import { db } from '../services/database';
import { Project, Student, Teacher } from '../types';
import { ProjectIcon, StudentIcon, TeacherIcon } from '../components/Icons';

interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: number;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, color }) => (
    <div className="bg-white rounded-lg shadow p-6 flex items-center">
        <div className={`p-3 rounded-full mr-4 ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);


export const DashboardPage: React.FC = () => {
    const [stats, setStats] = useState({
        projects: 0,
        students: 0,
        teachers: 0,
        unassignedStudents: 0
    });
    const [recentProjects, setRecentProjects] = useState<Project[]>([]);

    useEffect(() => {
        const projects = db.getProjects();
        const students = db.getStudents();
        const teachers = db.getTeachers();

        setStats({
            projects: projects.length,
            students: students.length,
            teachers: teachers.length,
            unassignedStudents: students.filter(s => !s.projectId).length
        });
        
        setRecentProjects(
            [...projects]
                .sort((a, b) => new Date(b.presentationDate).getTime() - new Date(a.presentationDate).getTime())
                .slice(0, 5)
        );
    }, []);

    const statuses = db.getStatuses();
    const getStatusName = (id: string) => statuses.find(s => s.id === id)?.name || 'Desconocido';

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Panel Principal</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    icon={<ProjectIcon className="h-6 w-6 text-white" />} 
                    title="Proyectos Totales" 
                    value={stats.projects}
                    color="bg-blue-500"
                />
                <StatCard 
                    icon={<StudentIcon className="h-6 w-6 text-white" />} 
                    title="Estudiantes Totales" 
                    value={stats.students}
                    color="bg-green-500"
                />
                <StatCard 
                    icon={<TeacherIcon className="h-6 w-6 text-white" />} 
                    title="Docentes Totales" 
                    value={stats.teachers}
                    color="bg-purple-500"
                />
                 <StatCard 
                    icon={<StudentIcon className="h-6 w-6 text-white" />} 
                    title="Estudiantes sin Asignar" 
                    value={stats.unassignedStudents}
                    color="bg-yellow-500"
                />
            </div>

            <div className="bg-white rounded-lg shadow">
                <h2 className="text-xl font-semibold text-gray-700 p-6 border-b">Proyectos Recientes</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de Presentación</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {recentProjects.map(project => (
                                <tr key={project.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{project.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{project.presentationDate}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {getStatusName(project.statusId)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                             {recentProjects.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="text-center py-10 text-gray-500">No se encontraron proyectos recientes.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};