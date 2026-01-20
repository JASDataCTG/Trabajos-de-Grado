
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/database';
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
    const { login } = useAuth();

    useEffect(() => {
        const loadTeachers = async () => {
            try {
                const data = await db.getTeachers();
                setTeachers(data);
            } catch (err) {
                console.error("Error al cargar docentes para login:", err);
            } finally {
                setIsFetching(false);
            }
        };
        loadTeachers();
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
            const success = await login(selectedUsername, password);
            if (!success) {
                setError('Contraseña incorrecta (Cédula).');
            }
        } catch (err) {
            setError('Error de conexión con el servidor.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-2xl">
                <div className="text-center">
                    <img src="https://i.ibb.co/L8yFz9p/logo.png" alt="Logo" className="h-20 mx-auto mb-4 object-contain"/>
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
                                disabled={isFetching}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-gray-50"
                            >
                                <option value="">-- Seleccione su nombre --</option>
                                <option value="admin">Administrador del Sistema</option>
                                {teachers.map(t => (
                                    <option key={t.id} value={t.name}>{t.name}</option>
                                ))}
                            </select>
                            {isFetching && <p className="text-xs text-gray-500 mt-1 animate-pulse">Cargando lista de docentes...</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña (Número de Cédula)</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                placeholder="Ingrese su cédula"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 p-2 rounded border border-red-200">
                            <p className="text-xs text-center text-red-600 font-medium">{error}</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            type="submit"
                            disabled={isLoading || isFetching}
                            className={`w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-bold rounded-md text-white shadow-sm transition-all ${isLoading ? 'bg-primary-400' : 'bg-primary-600 hover:bg-primary-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 uppercase`}
                        >
                            {isLoading ? 'Verificando...' : 'Entrar al Gestor'}
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
