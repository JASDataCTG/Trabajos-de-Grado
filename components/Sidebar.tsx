
import React from 'react';
import { HomeIcon, ProjectIcon, StudentIcon, TeacherIcon, SettingsIcon, ReportIcon, UserAdminIcon, XIcon } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { Page } from '../types';

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
      className={`flex items-center px-6 py-4 text-sm font-semibold transition-all duration-200 ease-in-out border-l-4 ${
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
    const { user, isStudent } = useAuth();
    
    // Items base para todos
    const baseItems: { page: Page; label: string; icon: React.ReactNode }[] = [
        { page: 'profile', label: 'Mi Cuenta', icon: <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> }
    ];

    // Items administrativos
    const adminItems: { page: Page; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
        { page: 'dashboard', label: 'Inicio', icon: <HomeIcon className="h-5 w-5" /> },
        { page: 'projects', label: 'Proyectos', icon: <ProjectIcon className="h-5 w-5" /> },
        { page: 'students', label: 'Estudiantes', icon: <StudentIcon className="h-5 w-5" /> },
        { page: 'teachers', label: 'Docentes', icon: <TeacherIcon className="h-5 w-5" /> },
        { page: 'reports', label: 'Informes', icon: <ReportIcon className="h-5 w-5" /> },
        { page: 'users', label: 'Seguridad', icon: <UserAdminIcon className="h-5 w-5" />, adminOnly: true },
        { page: 'settings', label: 'Maestros', icon: <SettingsIcon className="h-5 w-5" /> },
    ];

    const navItems = isStudent ? [
        { page: 'dashboard', label: 'Mi Proyecto', icon: <ProjectIcon className="h-5 w-5" /> },
        ...baseItems
    ] : [
        ...adminItems,
        ...baseItems
    ];

  return (
    <>
      <div 
        className={`fixed inset-0 z-40 bg-uninunez-onix/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsOpen(false)}
      ></div>

      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-uninunez-onix shadow-2xl transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex md:flex-shrink-0`}>
        <div className="flex flex-col h-full w-full">
           <div className="flex flex-col items-center justify-center p-8 bg-white border-b-4 border-uninunez-orange relative">
            <button 
              className="absolute top-4 right-4 md:hidden text-uninunez-onix p-2"
              onClick={() => setIsOpen(false)}
            >
              <XIcon className="h-6 w-6" />
            </button>
            <img 
              src="https://axis.uninunez.edu.co/images/uninunez/vm/logoqteal.svg" 
              alt="Logo Uninúñez" 
              className="h-16 md:h-20 object-contain"
            />
          </div>
          <nav className="flex-1 mt-4 space-y-1 overflow-y-auto scrollbar-hide">
            {navItems.map(item => (
                // @ts-ignore
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
          <div className="p-6 bg-uninunez-ash/10 border-t border-white/5">
             <div className="text-[9px] text-gray-400 font-black uppercase tracking-[0.3em] text-center">
                Corporación Universitaria<br/> Rafael Núñez
             </div>
          </div>
        </div>
      </div>
    </>
  );
};
