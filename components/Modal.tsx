
import React from 'react';
import { XIcon } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-uninunez-onix/80 backdrop-blur-sm z-[100] flex justify-center items-end md:items-center p-0 md:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-[2.5rem] md:rounded-3xl shadow-2xl w-full max-w-2xl transform transition-all max-h-[92vh] flex flex-col animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 md:p-8 border-b border-gray-50">
          <div>
            <h3 className="text-xl md:text-2xl font-black text-uninunez-onix font-display uppercase tracking-tight">{title}</h3>
            <div className="w-10 h-1 bg-uninunez-orange mt-1"></div>
          </div>
          <button 
            onClick={onClose}
            className="bg-gray-100 text-gray-400 hover:text-uninunez-orange hover:bg-gray-200 focus:outline-none rounded-full p-2 transition-all"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 md:p-8 overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};
