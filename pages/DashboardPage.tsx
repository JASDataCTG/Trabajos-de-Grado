
import React, { useEffect, useState } from 'react';
import { db } from '../services/database';
import { Project, Status } from '../types';
import { ProjectIcon, StudentIcon, TeacherIcon } from '../components/Icons';

interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: number;
    color: string;
    accent: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, color, accent }) => (
    <div className={`bg-white rounded-2xl shadow-sm border-b-4 ${accent} p-6 flex items-center transition-transform hover:scale-[1.02]`}>
        <div className={`p-4 rounded-xl mr-5 ${color} shadow-lg`}>
            {icon}
        </div>
        <div>
            <p className="text-[10px] font-extrabold text-uninunez-ash uppercase tracking-widest mb-1">{title}</p>
            <p className="text-3xl font-black text-uninunez-onix font-display">{value}</p>
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
    const [statuses, setStatuses] = useState<Status[]>([]);

    useEffect(() => {
        const loadData = async () => {
            const [projects, students, teachers, allStatuses] = await Promise.all([
                db.getProjects(),
                db.getStudents(),
                db.getTeachers(),
                db.getStatuses()
            ]);

            setStatuses(allStatuses);
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
        };
        loadData();
    }, []);

    const getStatusName = (id: string) => statuses.find(s => s.id === id)?.name || 'Pendiente';

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-uninunez-onix font-display uppercase tracking-tight">Panel de Control</h1>
                    <p className="text-uninunez-ash text-sm font-medium">Resumen ejecutivo del ciclo de vida académico.</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-uninunez-orange uppercase tracking-widest">Periodo Académico</p>
                    <p className="text-lg font-bold text-uninunez-onix">2024 - Ciclo 2</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    icon={<ProjectIcon className="h-6 w-6 text-white" />} 
                    title="Proyectos" 
                    value={stats.projects}
                    color="bg-uninunez-orange"
                    accent="border-uninunez-orange"
                />
                <StatCard 
                    icon={<StudentIcon className="h-6 w-6 text-white" />} 
                    title="Estudiantes" 
                    value={stats.students}
                    color="bg-uninunez-teal"
                    accent="border-uninunez-teal"
                />
                <StatCard 
                    icon={<TeacherIcon className="h-6 w-6 text-white" />} 
                    title="Docentes" 
                    value={stats.teachers}
                    color="bg-uninunez-onix"
                    accent="border-uninunez-onix"
                />
                 <StatCard 
                    icon={<StudentIcon className="h-6 w-6 text-white" />} 
                    title="Sin Vínculo" 
                    value={stats.unassignedStudents}
                    color="bg-uninunez-orangeLight"
                    accent="border-uninunez-orangeLight"
                />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xs font-black text-uninunez-ash uppercase tracking-[0.2em] font-display">Actividad Reciente</h2>
                    <span className="bg-uninunez-teal/10 text-uninunez-teal text-[9px] font-bold px-3 py-1 rounded-full uppercase">Últimos 5 Proyectos</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white">
                            <tr>
                                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Título del Proyecto</th>
                                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Radicación</th>
                                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estado Actual</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {recentProjects.map(project => (
                                <tr key={project.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-8 py-5 text-sm font-bold text-uninunez-onix group-hover:text-uninunez-orange transition-colors">{project.title}</td>
                                    <td className="px-8 py-5 text-sm text-uninunez-ash font-medium">{project.presentationDate}</td>
                                    <td className="px-8 py-5">
                                        <span className="px-3 py-1.5 inline-flex text-[10px] leading-4 font-extrabold rounded-lg bg-uninunez-teal/10 text-uninunez-teal uppercase tracking-wider">
                                            {getStatusName(project.statusId)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                             {recentProjects.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="text-center py-20 text-uninunez-ash italic text-sm">No hay registros de proyectos recientes en la base de datos institucional.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
