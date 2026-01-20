
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, isSupabaseConfigured } from '../services/database';
import { Teacher } from '../types';

interface LoginPageProps {
    onOpenPublicReports: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onOpenPublicReports }) => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [selectedUsername, setSelectedUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [error, setError] = useState('');
    const [dbConnected, setDbConnected] = useState<boolean | null>(null);
    const { login } = useAuth();

    const checkConnection = async () => {
        setIsFetching(true);
        setError('');
        
        if (!isSupabaseConfigured) {
            setError('⚠️ Error: Variables VITE_ no detectadas. Asegúrate de guardarlas en Vercel y hacer REDEPLOY.');
            setIsFetching(false);
            setDbConnected(false);
            return;
        }

        try {
            const connected = await db.checkConnection();
            setDbConnected(connected);
            if (connected) {
                const data = await db.getTeachers();
                setTeachers(data);
            } else {
                setError('❌ Falló la conexión. Revisa tus credenciales en Vercel.');
            }
        } catch (err) {
            setError('Error de red al conectar con Supabase.');
            setDbConnected(false);
        } finally {
            setIsFetching(false);
        }
    };

    useEffect(() => {
        checkConnection();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUsername) {
            setError('Por favor, selecciona tu nombre de la lista.');
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            const userExists = await db.getUserByUsername(selectedUsername);
            
            if (!userExists) {
                if (selectedUsername === 'admin') {
                    setError('El usuario administrador no existe en Supabase. ¿Ya ejecutaste el script SQL para crear las tablas y el admin inicial?');
                } else {
                    setError('Este usuario no está registrado en el sistema.');
                }
            } else {
                const success = await login(selectedUsername, password);
                if (!success) {
                    if (selectedUsername === 'admin') {
                        setError('Clave de administrador incorrecta. Intenta con "admin123" o revisa el valor en la tabla "users" de Supabase.');
                    } else {
                        setError('Contraseña incorrecta (Usa tu número de cédula).');
                    }
                }
            }
        } catch (err) {
            setError('Ocurrió un error al validar tus datos.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2">
                    <div className="flex flex-col items-end gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${dbConnected ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                            {dbConnected === null ? '⏳ Verificando...' : dbConnected ? '🟢 Conectado' : '🔴 Sin Conexión'}
                        </span>
                    </div>
                </div>

                <div className="text-center">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 shadow-sm overflow-hidden">
                        <img 
                            src="https://www.curn.edu.co/images/logo_curn_social.png" 
                            alt="Logo CURN" 
                            className="w-full h-full object-contain p-2"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = '<span class="text-primary-600 font-bold text-2xl">CURN</span>';
                            }}
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">Gestor de Proyectos</h1>
                    <p className="mt-1 text-sm text-gray-500 font-medium italic">Corporación Universitaria Rafael Núñez</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Usuario / Docente</label>
                            <select
                                required
                                value={selectedUsername}
                                onChange={(e) => setSelectedUsername(e.target.value)}
                                disabled={isFetching || dbConnected === false}
                                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-50"
                            >
                                <option value="">-- Seleccione su nombre --</option>
                                <option value="admin">ADMINISTRADOR DEL SISTEMA</option>
                                {teachers.map(t => (
                                    <option key={t.id} value={t.name}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Contraseña</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={dbConnected === false && !error.includes('incorrecta')}
                                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                placeholder={selectedUsername === 'admin' ? "admin123" : "Cédula"}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                            <p className="text-[11px] text-red-700 font-semibold leading-relaxed">{error}</p>
                        </div>
                    )}

                    <div className="space-y-4 pt-2">
                        <button
                            type="submit"
                            disabled={isLoading || isFetching || (dbConnected === false && !error.includes('incorrecta'))}
                            className={`w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white shadow-lg transition-all transform active:scale-95 ${isLoading || (dbConnected === false && !error.includes('incorrecta')) ? 'bg-gray-400' : 'bg-primary-600 hover:bg-primary-700'} uppercase`}
                        >
                            {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                            <div className="relative flex justify-center text-[10px] uppercase font-bold"><span className="bg-white px-2 text-gray-400">Consulta</span></div>
                        </div>

                        <button
                            type="button"
                            onClick={onOpenPublicReports}
                            className="w-full flex justify-center py-2 px-4 border border-gray-200 text-xs font-bold rounded-lg text-gray-500 bg-white hover:bg-gray-50 transition-all uppercase"
                        >
                            Reportes Públicos
                        </button>
                    </div>
                </form>

                <p className="text-center text-[9px] text-gray-400 font-medium">
                    © 2026 CURN - Sistema de Gestión de Trabajos de Grado
                </p>
            </div>
        </div>
    );
};
