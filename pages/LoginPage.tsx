
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
        if (!isSupabaseConfigured) {
            setError('Error de Configuración: No se detectan las variables de entorno de Supabase.');
            setDbConnected(false);
            setIsFetching(false);
            return;
        }

        setIsFetching(true);
        setError('');
        
        try {
            const connected = await db.checkConnection();
            setDbConnected(connected);
            
            if (connected) {
                const data = await db.getTeachers();
                setTeachers(data);
            } else {
                setError('No se pudo establecer conexión con el clúster de base de datos.');
            }
        } catch (err) {
            setError('Fallo en la comunicación con el servidor remoto.');
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
        if (!dbConnected) {
            setError('El sistema está fuera de línea o sin configurar.');
            return;
        }
        if (!selectedUsername) {
            setError('Por favor, selecciona tu nombre de la lista.');
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            const success = await login(selectedUsername, password);
            if (!success) {
                setError('Credenciales no válidas para el perfil seleccionado.');
            }
        } catch (err) {
            setError('Excepción en el módulo de autenticación.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isSupabaseConfigured) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-uninunez-onix p-6">
                <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-lg w-full text-center border-t-8 border-uninunez-orange">
                    <img src="https://axis.uninunez.edu.co/images/uninunez/vm/logoqteal.svg" className="h-16 mx-auto mb-6" alt="Uninunez" />
                    <h2 className="text-xl font-black text-uninunez-onix uppercase mb-4">Configuración Requerida</h2>
                    <p className="text-sm text-uninunez-ash mb-6">Para habilitar el almacenamiento en la nube, debes configurar las variables de entorno en tu panel de Vercel o en tu archivo .env:</p>
                    <div className="bg-gray-100 p-4 rounded-xl text-left space-y-2 mb-6">
                        <code className="text-[10px] block font-bold text-uninunez-teal">VITE_SUPABASE_URL=tu_url_aqui</code>
                        <code className="text-[10px] block font-bold text-uninunez-teal">VITE_SUPABASE_ANON_KEY=tu_key_aqui</code>
                    </div>
                    <p className="text-[10px] text-uninunez-orange font-bold uppercase tracking-widest">El sistema no puede operar en modo local por directiva de seguridad.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4 font-sans relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-uninunez-orange"></div>
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-uninunez-teal rounded-full opacity-10"></div>
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-uninunez-orange rounded-full opacity-10"></div>

            <div className="w-full max-w-md space-y-6 bg-white p-10 rounded-2xl shadow-2xl relative z-10 border border-gray-100">
                <div className="absolute top-4 right-6">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${dbConnected ? 'bg-uninunez-teal text-white' : 'bg-red-500 text-white animate-pulse'}`}>
                        {dbConnected === null ? 'CONECTANDO...' : dbConnected ? 'REMOTE SYNC' : 'OFFLINE'}
                    </span>
                </div>

                <div className="text-center">
                    <img 
                        src="https://axis.uninunez.edu.co/images/uninunez/vm/logoqteal.svg" 
                        alt="Logo Uninúñez" 
                        className="h-24 mx-auto mb-6 object-contain"
                    />
                    <h1 className="text-2xl font-extrabold text-uninunez-onix font-display uppercase tracking-tight">Gestor de Proyectos</h1>
                    <div className="w-12 h-1 bg-uninunez-orange mx-auto mt-2"></div>
                </div>

                <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-uninunez-ash uppercase tracking-widest mb-1.5 ml-1">Usuario Institucional</label>
                            <select
                                required
                                value={selectedUsername}
                                onChange={(e) => setSelectedUsername(e.target.value)}
                                disabled={isFetching || !dbConnected}
                                className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-uninunez-orange focus:border-uninunez-orange sm:text-sm bg-gray-50 transition-all font-medium disabled:opacity-50"
                            >
                                <option value="">-- Selecciona tu nombre --</option>
                                <option value="admin">ADMINISTRADOR (Root)</option>
                                {teachers.map(t => (
                                    <option key={t.id} value={t.name}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-uninunez-ash uppercase tracking-widest mb-1.5 ml-1">Clave Acceso</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={!dbConnected}
                                className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-uninunez-orange focus:border-uninunez-orange sm:text-sm bg-gray-50 transition-all font-medium disabled:opacity-50"
                                placeholder="Cédula"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                            <p className="text-xs text-red-600 font-bold leading-tight">{error}</p>
                        </div>
                    )}

                    <div className="space-y-4 pt-4">
                        <button
                            type="submit"
                            disabled={isLoading || isFetching || !dbConnected}
                            className={`w-full flex justify-center py-4 px-4 border border-transparent text-xs font-extrabold rounded-xl text-white shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 ${isLoading || !dbConnected ? 'bg-gray-400' : 'bg-uninunez-orange hover:bg-uninunez-orangeLight'} uppercase tracking-widest font-display`}
                        >
                            {isLoading ? 'VALIDANDO...' : 'ENTRAR AL GESTOR'}
                        </button>

                        <button
                            type="button"
                            onClick={onOpenPublicReports}
                            className="w-full flex justify-center py-3 px-4 border-2 border-uninunez-teal text-xs font-bold rounded-xl text-uninunez-teal bg-transparent hover:bg-uninunez-teal hover:text-white transition-all uppercase tracking-widest font-display"
                        >
                            Ver Proyectos Públicos
                        </button>
                    </div>
                </form>

                <div className="mt-8 text-center border-t pt-4">
                    <p className="text-[10px] text-uninunez-ash font-bold uppercase tracking-widest">
                        Infraestructura Cloud Uninúñez
                    </p>
                </div>
            </div>
        </div>
    );
};
