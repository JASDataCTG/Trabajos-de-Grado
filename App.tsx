import React, { useState, useEffect } from 'react';
import { initializeDB } from './services/database';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { StudentsPage } from './pages/StudentsPage';
import { TeachersPage } from './pages/TeachersPage';
import { SettingsPage } from './pages/SettingsPage';
import { MenuIcon, XIcon } from './components/Icons';

type Page = 'dashboard' | 'projects' | 'students' | 'teachers' | 'settings';

const pageLabels: Record<Page, string> = {
    dashboard: 'Panel Principal',
    projects: 'Proyectos',
    students: 'Estudiantes',
    teachers: 'Docentes',
    settings: 'Configuración',
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    initializeDB();
  }, []);

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
        <header className="flex justify-between md:justify-end items-center p-4 bg-white border-b">
          <button 
            className="md:hidden text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
          </button>
          <div className="text-xl font-semibold text-gray-700">
            {pageLabels[currentPage]}
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default App;