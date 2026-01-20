
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

    useEffect(() => {
        const init = async () => {
            if (!isSupabaseConfigured) {
                setError('⚠️ Variables no detectadas. En Vercel, asegúrate de usar los nombres VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY. Luego, haz un RE-DEPLOY del proyecto.');
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
                    setError('❌ Error de Conexión: Las variables existen pero Supabase rechaza la conexión. Verifica que los valores sean correctos.');
                }
            } catch (err) {
                setError('Error crítico al conectar con el servidor.');
                setDbConnected(false);
            } finally {
                setIsFetching(false);
            }
        };
        init();
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
                    setError('El usuario administrador no existe. Asegúrate de haber ejecutado el SQL en Supabase.');
                } else {
                    setError('Usuario no encontrado.');
                }
            } else {
                const success = await login(selectedUsername, password);
                if (!success) {
                    setError(selectedUsername === 'admin' 
                        ? 'Clave de administrador incorrecta (Usa la del script SQL).' 
                        : 'Contraseña incorrecta (Usa tu número de cédula).');
                }
            }
        } catch (err) {
            setError('Error durante el inicio de sesión.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${dbConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {dbConnected === null ? 'Conectando...' : dbConnected ? 'Conectado a Supabase' : 'Error de Conexión'}
                    </span>
                </div>

                <div className="text-center">
                    <img src="https://i.ibb.co/L8yFz9p/logo.png" alt="Logo" className="h-20 mx-auto mb-4 object-contain" onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/150?text=CURN")}/>
                    <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">Gestor de Proyectos</h1>
                    <p className="mt-2 text-sm text-gray-600">Corporación Universitaria Rafael Núñez</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Seleccione su Nombre</label>
                            <select
                                required
                                value={selectedUsername}
                                onChange={(e) => setSelectedUsername(e.target.value)}
                                disabled={isFetching || dbConnected === false}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-50"
                            >
                                <option value="">-- Seleccione su nombre --</option>
                                <option value="admin">Administrador del Sistema</option>
                                {teachers.map(t => (
                                    <option key={t.id} value={t.name}>{t.name}</option>
                                ))}
                            </select>
                            {isFetching && !error && <p className="text-xs text-gray-500 mt-1 animate-pulse">Cargando docentes...</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {selectedUsername === 'admin' ? 'Contraseña Maestra' : 'Contraseña (Cédula)'}
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={dbConnected === false && !error.includes('Variables')}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-50"
                                placeholder={selectedUsername === 'admin' ? "admin123" : "Tu cédula"}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <p className="text-xs text-red-600 font-semibold leading-relaxed">{error}</p>
                            {error.includes('VITE_') && (
                                <div className="mt-2 text-[10px] text-red-500 space-y-1">
                                    <p>1. Ve a Vercel -> Settings -> Environment Variables.</p>
                                    <p>2. Renombra tus variables agregando <strong>VITE_</strong> al inicio.</p>
                                    <p>3. Ve a la pestaña <strong>Deployments</strong>, haz clic en los 3 puntos del último despliegue y selecciona <strong>Redeploy</strong>.</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            type="submit"
                            disabled={isLoading || isFetching || (dbConnected === false && !error.includes('incorrecta'))}
                            className={`w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-bold rounded-md text-white shadow-sm transition-all ${isLoading || (dbConnected === false && !error.includes('incorrecta')) ? 'bg-gray-400' : 'bg-primary-600 hover:bg-primary-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 uppercase`}
                        >
                            {isLoading ? 'Conectando...' : 'Entrar al Gestor'}
                        </button>

                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">O accede sin cuenta</span></div>
                        </div>

                        <button
                            type="button"
                            onClick={onOpenPublicReports}
                            className="w-full flex justify-center py-2.5 px-4 border border-gray-300 text-sm font-bold rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-all uppercase"
                        >
                            Ver Reportes Públicos
                        </button>
                    </div>
                </form>

                <p className="text-center text-xs text-gray-400">
                    &copy; {new Date().getFullYear()} CURN - Todos los derechos reservados
                </p>
            </div>
        </div>
    );
};
