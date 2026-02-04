
import { GoogleGenAI } from "@google/genai";
import { Project, Student, Teacher, Status, TeacherRole } from "../types";

// Configuración SMTP lógica (Simulación)
const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  user: 'jairo.acosta@campusuninunez.edu.co',
  pass: 'ja250505',
  from: '"Gestor de Proyectos Uninúñez" <jairo.acosta@campusuninunez.edu.co>'
};

export const notificationService = {
  /**
   * Genera el contenido del correo usando Gemini para que sea profesional y empático.
   */
  async generateEmailContent(action: 'create' | 'update' | 'grade' | 'delete', data: {
    project: Project,
    recipients: string[],
    statusName?: string,
    roleName?: string
  }) {
    // Instanciación protegida siguiendo las guías de la SDK
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Actúa como el sistema de notificaciones de la Corporación Universitaria Rafael Núñez. 
    Escribe un correo electrónico formal y profesional en HTML para informar sobre la siguiente acción: ${action}.
    Proyecto: "${data.project.title}"
    Estado actual: ${data.statusName || 'N/A'}
    Nota final (si aplica): ${data.project.finalGrade || 'Pendiente'}
    
    El correo debe incluir un saludo cordial, los detalles del cambio y un mensaje de ánimo o instrucciones siguientes. 
    Usa los colores de la institución: Naranja (#F07E12) y Turquesa (#249A8C).
    Retorna exclusivamente el código HTML del cuerpo del correo.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      return response.text || "Contenido no disponible.";
    } catch (error) {
      console.error("Error generando contenido con Gemini:", error);
      return `<h3>Actualización de Proyecto</h3><p>Se han realizado cambios en el proyecto: ${data.project.title}</p>`;
    }
  },

  /**
   * Simula el envío de correo. 
   */
  async sendEmail(to: string[], subject: string, html: string) {
    console.log(`%c[SMTP SEND] Destinatarios: ${to.join(', ')}`, 'color: #F07E12; font-weight: bold');
    console.log(`%cAsunto: ${subject}`, 'color: #249A8C');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { success: true, timestamp: new Date().toISOString() };
  },

  /**
   * Notifica a todos los interesados en un proyecto
   */
  async notifyProjectChange(
    action: 'create' | 'update' | 'grade' | 'delete',
    project: Project,
    students: Student[],
    teachers: { teacher: Teacher, role: TeacherRole }[],
    statusName?: string
  ) {
    const studentEmails = students.map(s => s.email).filter(Boolean);
    const teacherEmails = teachers.map(t => t.teacher.email).filter(Boolean);
    const allEmails = [...new Set([...studentEmails, ...teacherEmails])];

    if (allEmails.length === 0) return;

    const subject = `NOTIFICACIÓN: ${action === 'create' ? 'Nuevo Proyecto Radicado' : 'Actualización de Proyecto'} - ${project.title}`;
    const html = await this.generateEmailContent(action, { project, recipients: allEmails, statusName });

    await this.sendEmail(allEmails, subject, html);
    
    return {
        count: allEmails.length,
        recipients: allEmails
    };
  }
};
