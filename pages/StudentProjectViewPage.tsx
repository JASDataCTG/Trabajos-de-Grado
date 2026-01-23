
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/database';
import { Student, Project, Status, ProjectTeacher, Teacher, TeacherRole } from '../types';
import { ProjectIcon } from '../components/Icons';

export const StudentProjectViewPage: React.FC = () => {
    const { user, logout } = useAuth();
    const [student, setStudent] = useState<Student | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [status, setStatus] = useState<Status | null>(null);
    const [directors, setDirectors] = useState<Teacher[]>([]);

    useEffect(() => {
        // Fix: Created an async wrapper function within useEffect to handle asynchronous database calls and resolve Promise<any> errors
        const loadViewData = async () => {
            if (user?.studentId) {
                const studentData = await db.getStudentById(user.studentId);
                setStudent(studentData || null);

                if (studentData?.projectId) {
                    const projectData = await db.getProjectById(studentData.projectId);
                    setProject(projectData || null);

                    if (projectData) {
                        const allStatuses = await db.getStatuses();
                        const statusData = allStatuses.find(s => s.id === projectData.statusId);
                        setStatus(statusData || null);

                        const allProjectTeachers = await db.getProjectTeachers();
                        const projectTeachers = allProjectTeachers.filter(pt => pt.projectId === projectData.id);
                        const allTeachers = await db.getTeachers();
                        const allRoles = await db.getTeacherRoles();
                        const directorRoles = allRoles.filter(r => r.name.toLowerCase().includes('director')).map(r => r.id);
                        
                        const assignedDirectors = projectTeachers
                            .filter(pt => directorRoles.includes(pt.roleId))
                            .map(pt => allTeachers.find(t => t.id === pt.teacherId))
                            .filter((t): t is Teacher => !!t);

                        setDirectors(assignedDirectors);
                    }
                }
            }
        };
        
        loadViewData();
    }, [user]);

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <header className="flex justify-between items-center p-6 bg-white shadow-sm border-b-2 border-uninunez-orange">
                <div className="flex items-center">
                    <img src="https://axis.uninunez.edu.co/images/uninunez/vm/logoqteal.svg" alt="Logo Uninúñez" className="h-10 mr-4"/>
                    <h1 className="text-lg font-black text-uninunez-onix font-display uppercase tracking-tight">Estado Académico</h1>
                </div>
                <button
                    onClick={logout}
                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-gray-100 text-uninunez-ash rounded-xl hover:bg-uninunez-orange hover:text-white transition-all shadow-sm"
                >
                    Cerrar Sesión
                </button>
            </header>
            <main className="p-4 md:p-8 animate-fadeIn">
                <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="p-8 md:p-12 text-center bg-gray-50 border-b border-gray-100">
                        <div className="inline-block p-4 bg-uninunez-teal/10 rounded-full mb-4">
                            <ProjectIcon className="h-10 w-10 text-uninunez-teal" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-uninunez-onix font-display uppercase">Hola, {student?.name?.split(' ')[0] || 'Estudiante'}</h2>
                        <p className="text-uninunez-ash text-sm font-medium mt-2">Consulta el progreso institucional de tu proyecto de grado.</p>
                    </div>

                    {project ? (
                        <div className="p-8 md:p-12 space-y-10">
                            <div>
                                <h3 className="text-[10px] font-black text-uninunez-ash uppercase tracking-[0.2em] mb-3">Título Radicado</h3>
                                <p className="text-xl md:text-2xl font-black text-uninunez-onix font-display leading-tight">{project.title}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div>
                                    <h3 className="text-[10px] font-black text-uninunez-ash uppercase tracking-[0.2em] mb-3">Estado del Proceso</h3>
                                    {status && (
                                        <span className="inline-flex items-center px-4 py-2 text-sm font-black rounded-xl bg-uninunez-teal/10 text-uninunez-teal uppercase tracking-widest">
                                            {status.name}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-[10px] font-black text-uninunez-ash uppercase tracking-[0.2em] mb-3">Dirección Académica</h3>
                                    {directors.length > 0 ? (
                                        <ul className="space-y-2">
                                        {directors.map(d => (
                                            <li key={d.id} className="text-sm font-bold text-uninunez-onix flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-uninunez-orange"></div>
                                                {d.name}
                                            </li>
                                        ))}
                                        </ul>
                                    ) : (
                                         <p className="text-sm text-gray-400 italic">No se han asignado directores todavía.</p>
                                    )}
                                </div>
                            </div>

                            {project.filesUrl && (
                                <div className="pt-8 border-t border-gray-100">
                                    <div className="bg-uninunez-teal/5 border-2 border-dashed border-uninunez-teal/20 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="text-center md:text-left">
                                            <h4 className="text-sm font-black text-uninunez-teal uppercase">Expediente Digital</h4>
                                            <p className="text-xs text-uninunez-ash font-medium mt-1">Accede a los archivos y documentación cargada en el repositorio.</p>
                                        </div>
                                        <a 
                                            href={project.filesUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="bg-uninunez-teal text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-uninunez-tealLight transition-all active:scale-95"
                                        >
                                            Ver Documentación
                                        </a>
                                    </div>
                                </div>
                            )}

                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                <h3 className="text-[10px] font-black text-uninunez-ash uppercase tracking-[0.2em] mb-4">Resumen de Calificaciones</h3>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-black text-uninunez-onix font-display">{project.finalGrade?.toFixed(2) || '0.00'}</span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Nota Definitiva</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <div className="bg-red-50 p-8 rounded-3xl border border-red-100 inline-block">
                                <p className="text-lg text-red-600 font-bold">Aún no tienes un proyecto de grado vinculado.</p>
                                <p className="text-sm text-red-500 mt-2">Por favor, contacta a tu director de programa para radicar tu propuesta.</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
