import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { StudentsPage } from './pages/StudentsPage';
import { TeachersPage } from './pages/TeachersPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/UsersPage';
import { MenuIcon, XIcon } from './components/Icons';
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { StudentProjectViewPage } from './pages/StudentProjectViewPage';

type Page = 'dashboard' | 'projects' | 'students' | 'teachers' | 'settings' | 'reports' | 'users';

const pageLabels: Record<Page, string> = {
    dashboard: 'Panel Principal',
    projects: 'Proyectos',
    students: 'Estudiantes',
    teachers: 'Docentes',
    settings: 'Configuración',
    reports: 'Reportes',
    users: 'Usuarios',
};

const App: React.FC = () => {
  const { isAuthenticated, logout, isStudent, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-xl font-semibold text-gray-700">Cargando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }
  
  if (isStudent) {
    return <StudentProjectViewPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'projects':
        return <ProjectsPage />;
      case 'students':
        return <StudentsPage />;
      case 'teachers':
        return <TeachersPage />;
      case 'settings':
        return <SettingsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'users':
        return <UsersPage />;
      default:
        return <DashboardPage />;
    }
  };

  const handlePageChange = (page: Page) => {
    setCurrentPage(page);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={handlePageChange}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex justify-between items-center p-4 bg-white border-b">
           <div className="flex items-center">
             <button 
                className="md:hidden mr-4 text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                {isSidebarOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
              </button>
              <div className="text-xl font-semibold text-gray-700">
                {pageLabels[currentPage]}
              </div>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
          >
            Cerrar Sesión
          </button>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default App;