
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
        
        // Verificamos conexión (Supabase o LocalStorage)
        try {
            const connected = await db.checkConnection();
            setDbConnected(connected);
            const data = await db.getTeachers();
            setTeachers(data);
        } catch (err) {
            setError('Error al conectar con la base de datos institucional.');
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
            setError('Por favor, selecciona tu nombre de la lista oficial.');
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            const success = await login(selectedUsername, password);
            if (!success) {
                if (selectedUsername === 'admin') {
                    setError('Clave de administrador incorrecta. Intenta con las credenciales de sistemas.');
                } else {
                    setError('Credenciales incorrectas. La contraseña es su número de documento.');
                }
            }
        } catch (err) {
            setError('Ocurrió un error en el protocolo de autenticación.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4 font-sans relative overflow-hidden">
            {/* Elementos decorativos de marca */}
            <div className="absolute top-0 left-0 w-full h-2 bg-uninunez-orange"></div>
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-uninunez-teal rounded-full opacity-10"></div>
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-uninunez-orange rounded-full opacity-10"></div>

            <div className="w-full max-w-md space-y-6 bg-white p-10 rounded-2xl shadow-2xl relative z-10 border border-gray-100">
                <div className="absolute top-4 right-6">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${dbConnected ? 'bg-uninunez-teal text-white' : 'bg-red-500 text-white'}`}>
                        {dbConnected === null ? 'Verificando...' : dbConnected ? (isSupabaseConfigured ? 'CLOUD SYNC' : 'LOCAL DB') : 'OFFLINE'}
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
                            <label className="block text-[10px] font-bold text-uninunez-ash uppercase tracking-widest mb-1.5 ml-1">Identificación de Usuario</label>
                            <select
                                required
                                value={selectedUsername}
                                onChange={(e) => setSelectedUsername(e.target.value)}
                                disabled={isFetching}
                                className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-uninunez-orange focus:border-uninunez-orange sm:text-sm bg-gray-50 transition-all font-medium"
                            >
                                <option value="">-- Seleccione su nombre --</option>
                                <option value="admin">ADMINISTRADOR DEL SISTEMA</option>
                                {teachers.map(t => (
                                    <option key={t.id} value={t.name}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-uninunez-ash uppercase tracking-widest mb-1.5 ml-1">Contraseña Institucional</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-uninunez-orange focus:border-uninunez-orange sm:text-sm bg-gray-50 transition-all font-medium"
                                placeholder="Cédula"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 animate-pulse">
                            <p className="text-xs text-red-600 font-bold leading-tight">{error}</p>
                        </div>
                    )}

                    <div className="space-y-4 pt-4">
                        <button
                            type="submit"
                            disabled={isLoading || isFetching}
                            className={`w-full flex justify-center py-4 px-4 border border-transparent text-xs font-extrabold rounded-xl text-white shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 ${isLoading ? 'bg-gray-400' : 'bg-uninunez-orange hover:bg-uninunez-orangeLight'} uppercase tracking-widest font-display`}
                        >
                            {isLoading ? 'AUTENTICANDO...' : 'INGRESAR AL SISTEMA'}
                        </button>

                        <button
                            type="button"
                            onClick={onOpenPublicReports}
                            className="w-full flex justify-center py-3 px-4 border-2 border-uninunez-teal text-xs font-bold rounded-xl text-uninunez-teal bg-transparent hover:bg-uninunez-teal hover:text-white transition-all uppercase tracking-widest font-display"
                        >
                            Consultar Reportes Públicos
                        </button>
                    </div>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-[10px] text-uninunez-ash font-bold uppercase tracking-widest leading-relaxed">
                        Corporación Universitaria Rafael Núñez<br/>
                        <span className="text-gray-400 font-medium normal-case">Vigilada Mineducación</span>
                    </p>
                </div>
            </div>
        </div>
    );
};
