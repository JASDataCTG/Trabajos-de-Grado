import { AppDatabase, Project, Student, Teacher, ProjectTeacher, Format, TeacherRole, Status } from '../types';

const DB_KEY = 'degreeProjectsDB';

const generateId = (): string => Date.now().toString(36) + Math.random().toString(36).substring(2);

const getSeedData = (): AppDatabase => {
    const statuses: Status[] = [
        { id: 'status-1', name: 'Propuesto' },
        { id: 'status-2', name: 'En Progreso' },
        { id: 'status-3', name: 'En Revisión' },
        { id: 'status-4', name: 'Aprobado' },
        { id: 'status-5', name: 'Rechazado' },
    ];
    const formats: Format[] = [
        { id: 'format-1', name: 'Tesis Estándar' },
        { id: 'format-2', name: 'Artículo de Investigación' },
        { id: 'format-3', name: 'Proyecto de Software' },
    ];
    const teacherRoles: TeacherRole[] = [
        { id: 'role-1', name: 'Director' },
        { id: 'role-2', name: 'Co-Director' },
        { id: 'role-3', name: 'Evaluador 1' },
        { id: 'role-4', name: 'Evaluador 2' },
    ];
    const teachers: Teacher[] = [
        { id: 'teacher-1', name: 'Dr. Eleanor Vance', email: 'eleanor.v@university.edu' },
        { id: 'teacher-2', name: 'Prof. Ben Carter', email: 'ben.c@university.edu' },
        { id: 'teacher-3', name: 'Dra. Olivia Chen', email: 'olivia.c@university.edu' },
    ];
    const projects: Project[] = [
        { id: 'project-1', title: 'Mantenimiento Predictivo con IA', presentationDate: '2024-12-15', filesUrl: 'https://example.com/project1', statusId: 'status-2', formatId: 'format-3' },
        { id: 'project-2', title: 'Computación Cuántica para Fármacos', presentationDate: '2025-01-20', filesUrl: 'https://example.com/project2', statusId: 'status-1', formatId: 'format-1' },
    ];
    const students: Student[] = [
        { id: 'student-1', name: 'Alice Johnson', email: 'alice.j@student.edu', projectId: 'project-1' },
        { id: 'student-2', name: 'Bob Williams', email: 'bob.w@student.edu', projectId: 'project-1' },
        { id: 'student-3', name: 'Charlie Brown', email: 'charlie.b@student.edu', projectId: 'project-2' },
        { id: 'student-4', name: 'Diana Miller', email: 'diana.m@student.edu', projectId: null },
    ];
    const projectTeachers: ProjectTeacher[] = [
        {id: 'pt-1', projectId: 'project-1', teacherId: 'teacher-1', roleId: 'role-1'},
        {id: 'pt-2', projectId: 'project-1', teacherId: 'teacher-2', roleId: 'role-3'},
    ];

    return { statuses, formats, teacherRoles, teachers, projects, students, projectTeachers };
};

export const initializeDB = (): void => {
    if (!localStorage.getItem(DB_KEY)) {
        localStorage.setItem(DB_KEY, JSON.stringify(getSeedData()));
    }
};

const readDB = (): AppDatabase => {
    const dbString = localStorage.getItem(DB_KEY);
    const seedData = getSeedData();
    if (!dbString) {
        localStorage.setItem(DB_KEY, JSON.stringify(seedData));
        return seedData;
    }
    try {
        const storedDb = JSON.parse(dbString) as Partial<AppDatabase>;
        // Fusiona los datos almacenados con los datos iniciales para garantizar que todas las claves existan.
        const validatedDb: AppDatabase = {
            ...seedData,
            ...storedDb,
        };
        // Asegúrate de que cada clave tenga un valor de array, incluso si localStorage tiene null/undefined.
        for (const key of Object.keys(seedData) as Array<keyof AppDatabase>) {
             if (!Array.isArray(validatedDb[key])) {
                 // FIX: Cast validatedDb to `any` to work around a TypeScript limitation with indexed access types.
                 // This is safe because `key` is guaranteed to be a key of both `validatedDb` and `seedData`, ensuring type consistency at runtime.
                 (validatedDb as any)[key] = seedData[key];
             }
        }
        return validatedDb;
    } catch (error) {
        console.error("No se pudo analizar la BD desde localStorage, volviendo a los datos iniciales.", error);
        localStorage.setItem(DB_KEY, JSON.stringify(seedData));
        return seedData;
    }
};


const writeDB = (db: AppDatabase): void => {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
};

// Funciones CRUD genéricas y seguras en tipos
type EntityName = keyof AppDatabase;

const getItems = <K extends EntityName>(entityName: K): AppDatabase[K] => {
    const db = readDB();
    return db[entityName];
};

const getItemById = <K extends EntityName>(entityName: K, id: string): AppDatabase[K][number] | undefined => {
    const items = getItems(entityName);
    return items.find((item: { id: string }) => item.id === id);
};

const addItem = <K extends EntityName>(
    entityName: K,
    item: Omit<AppDatabase[K][number], 'id'>
): AppDatabase[K][number] => {
    const db = readDB();
    const newItem = { ...item, id: generateId() } as AppDatabase[K][number];
    (db[entityName] as AppDatabase[K][number][]).push(newItem);
    writeDB(db);
    return newItem;
};

const updateItem = <K extends EntityName>(
    entityName: K,
    updatedItem: AppDatabase[K][number]
): AppDatabase[K][number] => {
    const db = readDB();
    const items = db[entityName] as AppDatabase[K][number][];
    const index = items.findIndex(item => item.id === updatedItem.id);
    if (index !== -1) {
        items[index] = updatedItem;
        writeDB(db);
    }
    return updatedItem;
};

const deleteItem = (entityName: EntityName, id: string): void => {
    const db = readDB();
    const items = (db[entityName] as { id: string }[]).filter(item => item.id !== id);
    (db as any)[entityName] = items;
    
    // Lógica de eliminación en cascada
    if (entityName === 'projects') {
        db.students = db.students.map(s => s.projectId === id ? { ...s, projectId: null } : s);
        db.projectTeachers = db.projectTeachers.filter(pt => pt.projectId !== id);
    }
    if (entityName === 'teachers') {
        db.projectTeachers = db.projectTeachers.filter(pt => pt.teacherId !== id);
    }

    writeDB(db);
};

// Exportar funciones específicas para cada entidad
export const db = {
    // Proyectos
    getProjects: () => getItems('projects'),
    getProjectById: (id: string) => getItemById('projects', id),
    addProject: (project: Omit<Project, 'id'>) => addItem('projects', project),
    updateProject: (project: Project) => updateItem('projects', project),
    deleteProject: (id: string) => deleteItem('projects', id),

    // Estudiantes
    getStudents: () => getItems('students'),
    getStudentById: (id: string) => getItemById('students', id),
    addStudent: (student: Omit<Student, 'id'>) => addItem('students', student),
    updateStudent: (student: Student) => updateItem('students', student),
    deleteStudent: (id: string) => deleteItem('students', id),

    // Docentes
    getTeachers: () => getItems('teachers'),
    getTeacherById: (id: string) => getItemById('teachers', id),
    addTeacher: (teacher: Omit<Teacher, 'id'>) => addItem('teachers', teacher),
    updateTeacher: (teacher: Teacher) => updateItem('teachers', teacher),
    deleteTeacher: (id: string) => deleteItem('teachers', id),

    // ProjectTeachers
    getProjectTeachers: () => getItems('projectTeachers'),
    addProjectTeacher: (pt: Omit<ProjectTeacher, 'id'>) => addItem('projectTeachers', pt),
    updateProjectTeacher: (pt: ProjectTeacher) => updateItem('projectTeachers', pt),
    deleteProjectTeacher: (id: string) => deleteItem('projectTeachers', id),

    // Formatos
    getFormats: () => getItems('formats'),
    addFormat: (format: Omit<Format, 'id'>) => addItem('formats', format),
    updateFormat: (format: Format) => updateItem('formats', format),
    deleteFormat: (id: string) => deleteItem('formats', id),

    // TeacherRoles
    getTeacherRoles: () => getItems('teacherRoles'),
    addTeacherRole: (role: Omit<TeacherRole, 'id'>) => addItem('teacherRoles', role),
    updateTeacherRole: (role: TeacherRole) => updateItem('teacherRoles', role),
    deleteTeacherRole: (id: string) => deleteItem('teacherRoles', id),
    
    // Statuses
    getStatuses: () => getItems('statuses'),
    addStatus: (status: Omit<Status, 'id'>) => addItem('statuses', status),
    updateStatus: (status: Status) => updateItem('statuses', status),
    deleteStatus: (id: string) => deleteItem('statuses', id),
};