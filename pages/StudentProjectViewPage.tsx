import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/database';
import { Student, Project, Status, Teacher, TeacherRole } from '../types';
import { ProjectIcon } from '../components/Icons';

export const StudentProjectViewPage: React.FC = () => {
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState<Student | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [status, setStatus] = useState<Status | null>(null);
    const [directors, setDirectors] = useState<Teacher[]>([]);

    const loadData = useCallback(async () => {
        if (!user?.studentId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const studentData = await db.getStudentById(user.studentId);
            setStudent(studentData || null);

            if (studentData?.projectId) {
                const projectData = await db.getProjectById(studentData.projectId);
                setProject(projectData || null);

                if (projectData) {
                    const allStatuses = await db.getStatuses();
                    const statusData = allStatuses.find(s => s.id === projectData.statusId);
                    setStatus(statusData || null);

                    const projectTeachers = (await db.getProjectTeachers()).filter(pt => pt.projectId === projectData.id);
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
        } catch (error) {
            console.error("Error loading student project data:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <header className="flex justify-between items-center p-4 bg-white shadow-md">
                <div className="flex items-center">
                    <ProjectIcon className="h-8 w-8 text-primary-600" />
                    <h1 className="text-xl font-bold text-gray-800 ml-3">Estado de Mi Proyecto</h1>
                </div>
                <button
                    onClick={logout}
                    className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                >
                    Cerrar Sesión
                </button>
            </header>
            <main className="p-4 md:p-8">
                <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6 md:p-8">
                    {loading ? (
                        <div className="text-center py-10">Cargando información...</div>
                    ) : (
                    <>
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-semibold text-gray-700">Bienvenido, {student?.name || 'Estudiante'}</h2>
                        <p className="text-gray-500 mt-1">Aquí puedes consultar la información actual de tu proyecto de grado.</p>
                    </div>

                    {project ? (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Título del Proyecto</h3>
                                <p className="text-xl text-gray-800 mt-1">{project.title}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Estado Actual</h3>
                                    {status && (
                                        <span className="mt-2 inline-flex items-center px-3 py-1 text-base font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {status.name}
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Director(es) Asignados</h3>
                                    {directors.length > 0 ? (
                                        <ul className="mt-1 space-y-1">
                                        {directors.map(d => (
                                            <li key={d.id} className="text-lg text-gray-800">{d.name}</li>
                                        ))}
                                        </ul>
                                    ) : (
                                         <p className="text-lg text-gray-500 italic mt-1">No asignados</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-lg text-gray-600">Aún no tienes un proyecto de grado asignado.</p>
                            <p className="text-sm text-gray-500 mt-2">Por favor, contacta a tu director de programa para más información.</p>
                        </div>
                    )}
                    </>
                    )}
                </div>
            </main>
        </div>
    );
};