
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/database';
import { Teacher, Student } from '../types';

export const ProfilePage: React.FC = () => {
    const { user, isTeacher, isStudent } = useAuth();
    const [profile, setProfile] = useState<Teacher | Student | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        const loadProfile = async () => {
            if (isTeacher && user?.teacherId) {
                const data = await db.getTeacherById(user.teacherId);
                setProfile(data);
            } else if (isStudent && user?.studentId) {
                const data = await db.getStudentById(user.studentId);
                setProfile(data);
            }
        };
        loadProfile();
    }, [user, isTeacher, isStudent]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (newPassword.length < 4) {
            setMessage({ text: 'La contraseña debe tener al menos 4 caracteres.', type: 'error' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setMessage({ text: 'Las contraseñas no coinciden.', type: 'error' });
            return;
        }

        setIsLoading(true);
        try {
            if (isTeacher && user?.teacherId) {
                await db.updateTeacherPassword(user.teacherId, newPassword);
            } else if (isStudent && user?.studentId) {
                await db.updateStudentPassword(user.studentId, newPassword);
            }
            setMessage({ text: 'Contraseña actualizada correctamente. Se aplicará en tu próximo inicio de sesión.', type: 'success' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            setMessage({ text: 'Error al actualizar la contraseña.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center gap-6 mb-8 border-b pb-6">
                    <div className="w-20 h-20 bg-uninunez-orange/10 rounded-full flex items-center justify-center text-uninunez-orange">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-uninunez-onix font-display uppercase tracking-tight">Mi Perfil Académico</h1>
                        <p className="text-uninunez-ash text-sm font-medium">{profile?.name || 'Cargando...'}</p>
                        <span className="inline-block mt-2 px-3 py-1 bg-uninunez-teal/10 text-uninunez-teal text-[10px] font-black rounded-lg uppercase tracking-widest">
                            {isTeacher ? 'Cuerpo Docente' : 'Estudiante'}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <h3 className="text-[10px] font-black text-uninunez-ash uppercase tracking-widest mb-4">Información de Contacto</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Cédula / Identificación</label>
                                <p className="text-sm font-bold text-uninunez-onix">{profile?.cedula || '---'}</p>
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Correo Institucional</label>
                                <p className="text-sm font-bold text-uninunez-teal">{profile?.email || '---'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 shadow-inner">
                        <h3 className="text-[10px] font-black text-uninunez-orange uppercase tracking-widest mb-6 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            Seguridad de la Cuenta
                        </h3>
                        
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div>
                                <label className="block text-[9px] font-black text-uninunez-ash uppercase tracking-widest mb-1.5 ml-1">Nueva Contraseña</label>
                                <input 
                                    type="password" 
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Mínimo 4 caracteres"
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-uninunez-orange outline-none transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-uninunez-ash uppercase tracking-widest mb-1.5 ml-1">Confirmar Contraseña</label>
                                <input 
                                    type="password" 
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Repite la contraseña"
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-uninunez-orange outline-none transition-all"
                                    required
                                />
                            </div>

                            {message && (
                                <div className={`p-3 rounded-xl text-[10px] font-bold uppercase tracking-widest ${message.type === 'success' ? 'bg-jade/10 text-uninunez-jade' : 'bg-red-50 text-red-500'}`}>
                                    {message.text}
                                </div>
                            )}

                            <button 
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-uninunez-onix text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all disabled:bg-gray-300"
                            >
                                {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            
            <div className="bg-uninunez-orange/5 p-6 rounded-3xl border border-uninunez-orange/20 text-center">
                <p className="text-[10px] font-bold text-uninunez-ash uppercase tracking-widest leading-relaxed">
                    Recuerda que tu nombre de usuario sigue siendo tu <span className="text-uninunez-orange">Nombre Completo</span> tal como figura en el sistema institucional.
                </p>
            </div>
        </div>
    );
};
