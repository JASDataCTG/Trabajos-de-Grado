import React from 'react';
import { HomeIcon, ProjectIcon, StudentIcon, TeacherIcon, SettingsIcon, ReportIcon, UserAdminIcon } from './Icons';
import { useAuth } from '../contexts/AuthContext';

type Page = 'dashboard' | 'projects' | 'students' | 'teachers' | 'settings' | 'reports' | 'users';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`flex items-center px-4 py-2.5 text-sm font-medium transition-colors duration-200 ease-in-out ${
        isActive
          ? 'bg-primary-500 text-white rounded-md'
          : 'text-gray-200 hover:bg-primary-800 hover:text-white rounded-md'
      }`}
    >
      {icon}
      <span className="ml-4">{label}</span>
    </a>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isOpen, setIsOpen }) => {
    const { user } = useAuth();
    const navItems: { page: Page; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
        { page: 'dashboard', label: 'Panel Principal', icon: <HomeIcon className="h-5 w-5" /> },
        { page: 'projects', label: 'Proyectos', icon: <ProjectIcon className="h-5 w-5" /> },
        { page: 'students', label: 'Estudiantes', icon: <StudentIcon className="h-5 w-5" /> },
        { page: 'teachers', label: 'Docentes', icon: <TeacherIcon className="h-5 w-5" /> },
        { page: 'reports', label: 'Reportes', icon: <ReportIcon className="h-5 w-5" /> },
        { page: 'users', label: 'Usuarios', icon: <UserAdminIcon className="h-5 w-5" />, adminOnly: true },
        { page: 'settings', label: 'Configuración', icon: <SettingsIcon className="h-5 w-5" /> },
    ];

  return (
    <>
      <div className={`fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity md:hidden ${isOpen ? 'block' : 'hidden'}`} onClick={() => setIsOpen(false)}></div>
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-primary-900 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex md:flex-shrink-0`}>
        <div className="flex flex-col h-full">
           <div className="flex items-center justify-center p-4 bg-white" style={{ minHeight: '4rem' }}>
            <img src="https://i.imgur.com/Tf9pG2s.png" alt="Logo Corporación Universitaria Rafael Núñez" className="h-24 object-contain"/>
          </div>
          <nav className="flex-1 px-2 py-4 space-y-2">
            {navItems.map(item => (
                (!item.adminOnly || user?.username === 'admin') && (
                    <NavItem 
                        key={item.page}
                        icon={item.icon}
                        label={item.label}
                        isActive={currentPage === item.page}
                        onClick={() => onNavigate(item.page)}
                    />
                )
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};