
import { GoogleGenAI } from "@google/genai";
import { Project, Student, Teacher, Status, TeacherRole } from "../types";

export const notificationService = {
  /**
   * Obtiene la instancia de la IA de forma segura.
   * Si no hay API KEY, retorna null en lugar de romper la app.
   */
  getAIInstance() {
    const apiKey = (window as any).process?.env?.API_KEY || process.env.API_KEY;
    if (!apiKey) {
      console.warn("⚠️ Advertencia: API_KEY de Gemini no detectada. Las notificaciones inteligentes estarán desactivadas.");
      return null;
    }
    try {
      return new GoogleGenAI({ apiKey });
    } catch (e) {
      console.error("❌ Error inicializando Gemini SDK:", e);
      return null;
    }
  },

  /**
   * Genera el contenido del correo usando Gemini.
   */
  async generateEmailContent(action: 'create' | 'update' | 'grade' | 'delete', data: {
    project: Project,
    recipients: string[],
    statusName?: string,
    roleName?: string
  }) {
    const ai = this.getAIInstance();
    
    // Si no hay IA disponible, usamos un fallback de texto plano profesional
    if (!ai) {
      return `
        <h3>Actualización de Proyecto - CURN</h3>
        <p>Se ha registrado una acción de <strong>${action}</strong> en el proyecto: "${data.project.title}"</p>
        <p>Estado: ${data.statusName || 'N/A'}</p>
        <p>Nota: ${data.project.finalGrade || 'Pendiente'}</p>
      `;
    }

    const prompt = `Actúa como el sistema de notificaciones de la Corporación Universitaria Rafael Núñez. 
    Escribe un correo electrónico formal y profesional en HTML para informar sobre la siguiente acción: ${action}.
    Proyecto: "${data.project.title}"
    Estado actual: ${data.statusName || 'N/A'}
    Nota final (si aplica): ${data.project.finalGrade || 'Pendiente'}
    Usa colores institucionales: Naranja (#F07E12) y Turquesa (#249A8C).
    Retorna exclusivamente el código HTML del cuerpo del correo.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      return response.text || "Contenido generado automáticamente por el sistema de gestión.";
    } catch (error) {
      console.error("Error en Gemini al generar correo:", error);
      return "Se ha actualizado el estado de su proyecto en la plataforma institucional.";
    }
  },

  /**
   * Simula el envío de correo por consola.
   */
  async sendEmail(to: string[], subject: string, html: string) {
    // Aquí podrías integrar un servicio real como SendGrid o EmailJS en el futuro
    console.log(`%c[EMAIL SERVICE] Enviando a: ${to.join(', ')}`, 'color: #F07E12; font-weight: bold; font-size: 12px;');
    console.log(`%cAsunto: ${subject}`, 'color: #249A8C; font-weight: bold;');
    
    await new Promise(resolve => setTimeout(resolve, 800));
    return { success: true };
  },

  /**
   * Método principal para disparar notificaciones.
   */
  async notifyProjectChange(
    action: 'create' | 'update' | 'grade' | 'delete',
    project: Project,
    students: Student[],
    teachers: { teacher: Teacher, role: TeacherRole }[],
    statusName?: string
  ) {
    try {
      const studentEmails = students.map(s => s.email).filter(Boolean);
      const teacherEmails = teachers.map(t => t.teacher.email).filter(Boolean);
      const allEmails = [...new Set([...studentEmails, ...teacherEmails])];

      if (allEmails.length === 0) return;

      const subject = `NOTIFICACIÓN CURN: ${action.toUpperCase()} - ${project.title}`;
      const html = await this.generateEmailContent(action, { project, recipients: allEmails, statusName });

      await this.sendEmail(allEmails, subject, html);
    } catch (e) {
      console.error("Fallo crítico en el servicio de notificaciones:", e);
    }
  }
};
