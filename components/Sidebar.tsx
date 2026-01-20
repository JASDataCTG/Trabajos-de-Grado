
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
      className={`flex items-center px-4 py-3 text-sm font-semibold transition-all duration-200 ease-in-out border-l-4 ${
        isActive
          ? 'bg-uninunez-orange text-white border-white'
          : 'text-gray-300 border-transparent hover:bg-uninunez-ash hover:text-white'
      }`}
    >
      <div className={`${isActive ? 'text-white' : 'text-uninunez-orangeLight'}`}>
        {icon}
      </div>
      <span className="ml-4 font-display uppercase tracking-wider text-[11px]">{label}</span>
    </a>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isOpen, setIsOpen }) => {
    const { user } = useAuth();
    const navItems: { page: Page; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
        { page: 'dashboard', label: 'Inicio', icon: <HomeIcon className="h-5 w-5" /> },
        { page: 'projects', label: 'Proyectos', icon: <ProjectIcon className="h-5 w-5" /> },
        { page: 'students', label: 'Estudiantes', icon: <StudentIcon className="h-5 w-5" /> },
        { page: 'teachers', label: 'Docentes', icon: <TeacherIcon className="h-5 w-5" /> },
        { page: 'reports', label: 'Informes', icon: <ReportIcon className="h-5 w-5" /> },
        { page: 'users', label: 'Seguridad', icon: <UserAdminIcon className="h-5 w-5" />, adminOnly: true },
        { page: 'settings', label: 'Maestros', icon: <SettingsIcon className="h-5 w-5" /> },
    ];

  return (
    <>
      <div className={`fixed inset-0 z-20 bg-black bg-opacity-60 transition-opacity md:hidden ${isOpen ? 'block' : 'hidden'}`} onClick={() => setIsOpen(false)}></div>
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-uninunez-onix shadow-2xl transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex md:flex-shrink-0`}>
        <div className="flex flex-col h-full w-full">
           <div className="flex flex-col items-center justify-center p-6 bg-white border-b-4 border-uninunez-orange">
            <img 
              src="https://axis.uninunez.edu.co/images/uninunez/vm/logoqteal.svg" 
              alt="Logo Uninúñez" 
              className="h-20 object-contain"
            />
          </div>
          <nav className="flex-1 mt-4 space-y-1">
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
          <div className="p-4 bg-uninunez-ash bg-opacity-20 border-t border-uninunez-ash">
             <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">
                UNINÚÑEZ v2.0
             </div>
          </div>
        </div>
      </div>
    </>
  );
};
