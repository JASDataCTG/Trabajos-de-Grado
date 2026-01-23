
import React, { useState } from 'react';

export const IntegrationsPage: React.FC = () => {
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'TU_URL_DE_SUPABASE';
    const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'TU_KEY_DE_SUPABASE';

    const [copied, setCopied] = useState(false);

    const scriptCode = `
/**
 * Script para conectar Google Forms con el Gestor de Proyectos Uninúñez
 * Pega este código en Extensiones > Apps Script de tu Hoja de Cálculo
 */
function onFormSubmit(e) {
  const SUPABASE_URL = "${supabaseUrl}";
  const SUPABASE_KEY = "${supabaseKey}";
  
  // Mapeo de columnas de tu Google Sheet
  // El índice comienza en 0 (Columna A)
  const data = {
    title: e.values[1],              // Columna B: Título
    presentation_date: new Date().toISOString().split('T')[0],
    program_id: "1",                 // ID por defecto o mapeado de una columna
    status_id: "1",                  // ID de 'En Proceso'
    format_id: "1",                  // ID de 'Anteproyecto'
    is_approved_by_director: false
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'return=representation'
    },
    payload: JSON.stringify(data)
  };

  try {
    const response = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/projects', options);
    Logger.log('Proyecto registrado: ' + response.getContentText());
  } catch (err) {
    Logger.log('Error en sincronización: ' + err.toString());
  }
}

function setupTrigger() {
  const sheet = SpreadsheetApp.getActive();
  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(sheet)
    .onFormSubmit()
    .create();
}
    `.trim();

    const handleCopy = () => {
        navigator.clipboard.writeText(scriptCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                    <div className="bg-uninunez-orange/10 p-3 rounded-2xl">
                        <svg className="w-8 h-8 text-uninunez-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-uninunez-onix font-display uppercase tracking-tight">Puente Google Forms</h1>
                        <p className="text-uninunez-ash text-sm">Automatiza la recepción de proyectos externos directamente a la base de datos.</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 className="text-[10px] font-black text-uninunez-teal uppercase tracking-widest mb-4">Instrucciones de Setup</h3>
                        <ol className="space-y-4 text-xs font-medium text-uninunez-ash list-decimal list-inside">
                            <li>Crea tu Google Form institucional.</li>
                            <li>Abre la Hoja de Cálculo vinculada.</li>
                            <li>Ve a <span className="text-uninunez-onix font-bold">Extensiones &gt; Apps Script</span>.</li>
                            <li>Pega el código que aparece a la derecha.</li>
                            <li>Ejecuta la función <span className="text-uninunez-orange font-bold">setupTrigger</span> una vez para activar el enlace.</li>
                            <li>¡Listo! Cada envío del formulario se guardará en la App.</li>
                        </ol>
                    </div>
                    
                    <div className="bg-uninunez-onix text-white p-6 rounded-2xl shadow-xl">
                        <h3 className="text-[10px] font-black text-uninunez-orange uppercase tracking-widest mb-2">Variables del Sistema</h3>
                        <div className="space-y-3">
                            <div>
                                <p className="text-[9px] text-gray-400 uppercase">Endpoint Supabase</p>
                                <p className="text-[10px] font-mono break-all opacity-80">{supabaseUrl}</p>
                            </div>
                            <div className="pt-2 border-t border-white/10">
                                <p className="text-[9px] text-gray-400 uppercase">Estado Conexión</p>
                                <p className="text-[10px] text-jade font-bold flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-jade animate-pulse"></span> ACTIVO Y SEGURO
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
                        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                            <span className="text-[10px] font-black text-uninunez-ash uppercase tracking-widest">Código: bridge.gs</span>
                            <button 
                                onClick={handleCopy}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${copied ? 'bg-jade text-white' : 'bg-uninunez-teal text-white hover:bg-uninunez-tealLight'}`}
                            >
                                {copied ? '¡Copiado!' : 'Copiar Código'}
                            </button>
                        </div>
                        <div className="p-0 flex-grow bg-gray-900 overflow-auto scrollbar-thin">
                            <pre className="p-6 text-xs font-mono text-jade/80 leading-relaxed">
                                {scriptCode}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-uninunez-orange/5 border-2 border-dashed border-uninunez-orange/20 p-8 rounded-3xl text-center">
                <h4 className="text-sm font-black text-uninunez-orange uppercase tracking-widest mb-2">Seguridad de la Información</h4>
                <p className="text-xs text-uninunez-ash max-w-2xl mx-auto leading-relaxed">
                    Este puente utiliza la clave anónima de Supabase. Asegúrate de configurar correctamente las políticas de RLS (Row Level Security) en tu panel de Supabase para permitir solo inserciones desde este origen si deseas una seguridad de grado militar.
                </p>
            </div>
        </div>
    );
};
