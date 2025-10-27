import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/database';
import { User, Teacher, Student } from '../types';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { TrashIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

export const UsersPage: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);

    const loadData = useCallback(() => {
        setUsers(db.getUsers());
        setTeachers(db.getTeachers());
        setStudents(db.getStudents());
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleDelete = () => {
        if (deletingUser) {
            db.deleteUser(deletingUser.id);
            loadData();
            setDeletingUser(null);
        }
    };
    
    const getLinkedEntityName = (user: User) => {
        if (user.role === 'teacher' && user.teacherId) {
            return teachers.find(t => t.id === user.teacherId)?.name || 'Docente no encontrado';
        }
        if (user.role === 'student' && user.studentId) {
            return students.find(s => s.id === user.studentId)?.name || 'Estudiante no encontrado';
        }
        return <span className="text-gray-400 italic">N/A</span>;
    };
    
    const getRoleName = (role: 'admin' | 'teacher' | 'student') => {
        switch(role) {
            case 'admin': return 'Administrador';
            case 'teacher': return 'Docente';
            case 'student': return 'Estudiante';
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Cuentas de Usuario</h1>
            </div>
            <p className="text-gray-600">
                Esta es una lista de todas las cuentas de usuario en el sistema. Las cuentas de docentes y estudiantes se crean y actualizan automáticamente cuando se gestionan sus perfiles en sus respectivas secciones.
            </p>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perfil Vinculado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getRoleName(user.role)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getLinkedEntityName(user)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        {user.id !== currentUser?.id && user.role !== 'admin' && (
                                            <button onClick={() => setDeletingUser(user)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5" /></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                             {users.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-10 text-gray-500">No se encontraron usuarios.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <ConfirmationDialog 
                isOpen={!!deletingUser}
                onClose={() => setDeletingUser(null)}
                onConfirm={handleDelete}
                title="Eliminar Usuario"
                message={`¿Estás seguro de que quieres eliminar al usuario ${deletingUser?.username}? El perfil de docente o estudiante asociado NO será eliminado. Esta acción no se puede deshacer.`}
            />
        </div>
    );
};