
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
            setError('⚠️ Configuración incompleta. En Vercel: usa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. Luego haz RE-DEPLOY.');
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
                setError('❌ Supabase detectado pero la conexión falló. Verifica que tus llaves sean válidas y que el proyecto en Supabase esté activo.');
            }
        } catch (err) {
            setError('Error crítico de red al intentar conectar.');
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
                    setError('El usuario administrador no existe. ¿Ya ejecutaste el SQL de creación de tablas en Supabase?');
                } else {
                    setError('Este usuario no está registrado en el sistema.');
                }
            } else {
                const success = await login(selectedUsername, password);
                if (!success) {
                    setError(selectedUsername === 'admin' 
                        ? 'Clave de administrador incorrecta (Recuerda que es admin123 por defecto).' 
                        : 'Contraseña incorrecta (Usa tu número de cédula).');
                }
            }
        } catch (err) {
            setError('Ocurrió un error inesperado al intentar iniciar sesión.');
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
                            {dbConnected === null ? '⏳ Verificando...' : dbConnected ? '🟢 Base de Datos OK' : '🔴 Sin Conexión'}
                        </span>
                        {!dbConnected && !isFetching && (
                            <button 
                                onClick={checkConnection}
                                className="text-[9px] text-primary-600 hover:underline font-bold"
                            >
                                Re-intentar conexión
                            </button>
                        )}
                    </div>
                </div>

                <div className="text-center">
                    <img 
                        src="https://i.ibb.co/L8yFz9p/logo.png" 
                        alt="Logo CURN" 
                        className="h-24 mx-auto mb-4 object-contain" 
                        onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/200x100?text=CURN")}
                    />
                    <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">Gestor de Proyectos</h1>
                    <p className="mt-2 text-sm text-gray-600 font-medium">Corporación Universitaria Rafael Núñez</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre de Usuario / Docente</label>
                            <select
                                required
                                value={selectedUsername}
                                onChange={(e) => setSelectedUsername(e.target.value)}
                                disabled={isFetching || dbConnected === false}
                                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-50 transition-colors"
                            >
                                <option value="">-- Seleccione su nombre --</option>
                                <option value="admin">ADMINISTRADOR DEL SISTEMA</option>
                                {teachers.map(t => (
                                    <option key={t.id} value={t.name}>{t.name}</option>
                                ))}
                            </select>
                            {isFetching && !error && <p className="text-[10px] text-gray-500 mt-1 animate-pulse">Sincronizando lista de docentes...</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                {selectedUsername === 'admin' ? 'Contraseña Maestra' : 'Contraseña (Cédula)'}
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={dbConnected === false && !error.includes('VITE_')}
                                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-50 transition-colors"
                                placeholder={selectedUsername === 'admin' ? "admin123" : "Ingrese su identificación"}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200 shadow-sm">
                            <p className="text-xs text-red-700 font-semibold leading-relaxed">{error}</p>
                            {error.includes('VITE_') && (
                                <div className="mt-3 text-[10px] text-red-500 space-y-2 border-t border-red-100 pt-2">
                                    <p>💡 <strong>Solución:</strong></p>
                                    <ul className="list-disc pl-3 space-y-1">
                                        <li>Renombra las variables en Vercel Settings.</li>
                                        <li>Asegúrate de que tengan el prefijo <strong>VITE_</strong>.</li>
                                        <li>Haz clic en <strong>Deployments &rarr; Redeploy</strong>.</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-4">
                        <button
                            type="submit"
                            disabled={isLoading || isFetching || (dbConnected === false && !error.includes('incorrecta'))}
                            className={`w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white shadow-lg transition-all transform active:scale-95 ${isLoading || (dbConnected === false && !error.includes('incorrecta')) ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'} uppercase tracking-wider`}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Procesando...
                                </span>
                            ) : 'Entrar al Gestor'}
                        </button>

                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                            <div className="relative flex justify-center text-[10px] uppercase font-bold"><span className="bg-white px-2 text-gray-400">Acceso Alternativo</span></div>
                        </div>

                        <button
                            type="button"
                            onClick={onOpenPublicReports}
                            className="w-full flex justify-center py-2.5 px-4 border-2 border-gray-200 text-xs font-bold rounded-lg text-gray-600 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all uppercase tracking-wide"
                        >
                            Ver Reportes Públicos
                        </button>
                    </div>
                </form>

                <p className="text-center text-[10px] text-gray-400 font-medium">
                    © {new Date().getFullYear()} CURN - Sistema de Gestión Institucional
                </p>
            </div>
        </div>
    );
};
