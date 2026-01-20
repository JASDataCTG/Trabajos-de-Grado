
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
            setError('⚠️ Error Crítico: Las variables de entorno no están llegando a la aplicación. Asegúrate de haber hecho RE-DEPLOY en Vercel después de guardarlas.');
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
                setError('❌ Configuración detectada pero falló la conexión. Verifica que las credenciales en Vercel coincidan exactamente con tu proyecto en Supabase.');
            }
        } catch (err) {
            setError('Error de red al intentar contactar con Supabase.');
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
                    setError('El usuario administrador no existe. ¿Ejecutaste el script SQL en Supabase?');
                } else {
                    setError('Este usuario no está registrado.');
                }
            } else {
                const success = await login(selectedUsername, password);
                if (!success) {
                    setError(selectedUsername === 'admin' 
                        ? 'Clave de administrador incorrecta.' 
                        : 'Contraseña incorrecta (Recuerda que es tu cédula).');
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
                    <div className="bg-primary-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary-200 shadow-inner">
                        <img 
                            src="https://www.curn.edu.co/images/logo_curn_social.png" 
                            alt="Logo CURN" 
                            className="h-16 w-16 object-contain"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = '<span class="text-primary-600 font-bold text-2xl">CURN</span>';
                            }}
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">Gestor de Proyectos</h1>
                    <p className="mt-2 text-sm text-gray-600 font-medium italic">Corporación Universitaria Rafael Núñez</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Usuario / Docente</label>
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
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Contraseña</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={dbConnected === false && !error.includes('RE-DEPLOY')}
                                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                placeholder="Cédula o Clave Admin"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <p className="text-xs text-red-700 font-semibold leading-relaxed">{error}</p>
                            {error.includes('RE-DEPLOY') && (
                                <button 
                                    type="button"
                                    onClick={() => window.location.reload()}
                                    className="mt-2 text-[10px] text-red-600 underline font-bold uppercase"
                                >
                                    Refrescar página después de hacer redeploy
                                </button>
                            )}
                        </div>
                    )}

                    <div className="space-y-4">
                        <button
                            type="submit"
                            disabled={isLoading || isFetching || (dbConnected === false && !error.includes('incorrecta'))}
                            className={`w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white shadow-lg transition-all ${isLoading || (dbConnected === false && !error.includes('incorrecta')) ? 'bg-gray-400' : 'bg-primary-600 hover:bg-primary-700'} uppercase`}
                        >
                            {isLoading ? 'Accediendo...' : 'Iniciar Sesión'}
                        </button>

                        <button
                            type="button"
                            onClick={onOpenPublicReports}
                            className="w-full flex justify-center py-2.5 px-4 border-2 border-gray-200 text-xs font-bold rounded-lg text-gray-600 bg-white hover:bg-gray-50 transition-all uppercase"
                        >
                            Ver Reportes Públicos
                        </button>
                    </div>
                </form>

                <p className="text-center text-[10px] text-gray-400 font-medium">
                    © {new Date().getFullYear()} CURN - Control de Trabajos de Grado
                </p>
            </div>
        </div>
    );
};
