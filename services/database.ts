import { AppDatabase, Project, Student, Teacher, ProjectTeacher, Format, TeacherRole, Status, Program, User } from '../types';

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
        { id: 'teacher-1', name: 'Dr. Eleanor Vance', email: 'eleanor.v@university.edu', cedula: '12345678' },
        { id: 'teacher-2', name: 'Prof. Ben Carter', email: 'ben.c@university.edu', cedula: '87654321' },
        { id: 'teacher-3', name: 'Dra. Olivia Chen', email: 'olivia.c@university.edu', cedula: '11223344' },
    ];
    const programs: Program[] = [
        { id: 'prog-1', name: 'Tecnología en Desarrollo de Sistemas de Información y Software' },
        { id: 'prog-2', name: 'Ingeniería de Sistemas' },
    ];

    const projects: Project[] = [
        { id: 'project-1', title: 'Mantenimiento Predictivo con IA', presentationDate: '2024-12-15', filesUrl: 'https://example.com/project1', statusId: 'status-2', formatId: 'format-3', isApprovedByDirector: false, writtenGradeReviewer1: null, presentationGradeReviewer1: null, writtenGradeReviewer2: null, presentationGradeReviewer2: null },
        { id: 'project-2', title: 'Computación Cuántica para Fármacos', presentationDate: '2025-01-20', filesUrl: 'https://example.com/project2', statusId: 'status-1', formatId: 'format-1', isApprovedByDirector: true, writtenGradeReviewer1: 4.3, presentationGradeReviewer1: 4.5, writtenGradeReviewer2: 4.4, presentationGradeReviewer2: 4.1 },
    ];

    const students: Student[] = [
        { id: 'student-1', name: 'Alice Johnson', email: 'alice.j@student.edu', cedula: '100100100', projectId: 'project-1', programId: 'prog-2' },
        { id: 'student-2', name: 'Bob Williams', email: 'bob.w@student.edu', cedula: '200200200', projectId: 'project-1', programId: 'prog-1' },
        { id: 'student-3', name: 'Charlie Brown', email: 'charlie.b@student.edu', cedula: '300300300', projectId: 'project-2', programId: 'prog-2' },
        { id: 'student-4', name: 'Diana Miller', email: 'diana.m@student.edu', cedula: '400400400', projectId: null, programId: 'prog-1' },
    ];
    
    const projectTeachers: ProjectTeacher[] = [
        {id: 'pt-1', projectId: 'project-1', teacherId: 'teacher-1', roleId: 'role-1'},
        {id: 'pt-2', projectId: 'project-1', teacherId: 'teacher-2', roleId: 'role-3'},
        {id: 'pt-3', projectId: 'project-2', teacherId: 'teacher-2', roleId: 'role-1'},
        {id: 'pt-4', projectId: 'project-2', teacherId: 'teacher-1', roleId: 'role-3'},
        {id: 'pt-5', projectId: 'project-2', teacherId: 'teacher-3', roleId: 'role-4'},
    ];
    
    // Generar usuarios a partir de docentes y estudiantes
    const users: User[] = [
        { id: 'user-admin', username: 'admin', password: 'Ja39362505', role: 'admin', teacherId: null, studentId: null },
        ...teachers.map(t => ({
            id: generateId(),
            username: t.email.split('@')[0],
            password: t.cedula,
            role: 'teacher' as const,
            teacherId: t.id,
            studentId: null,
        })),
        ...students.map(s => ({
            id: generateId(),
            username: s.email.split('@')[0],
            password: s.cedula,
            role: 'student' as const,
            teacherId: null,
            studentId: s.id,
        }))
    ];

    return { users, statuses, formats, teacherRoles, teachers, projects, students, projectTeachers, programs };
};

export const initializeDB = (): void => {
    // Proteger contra el entorno del servidor
    if (typeof window === 'undefined' || !window.localStorage) return;

    if (!localStorage.getItem(DB_KEY)) {
        localStorage.setItem(DB_KEY, JSON.stringify(getSeedData()));
    }
};

const readDB = (): AppDatabase => {
    const seedData = getSeedData();

    // Proteger contra el entorno del servidor
    if (typeof window === 'undefined' || !window.localStorage) {
        return seedData;
    }

    const dbString = localStorage.getItem(DB_KEY);
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
    // Proteger contra el entorno del servidor
    if (typeof window === 'undefined' || !window.localStorage) return;
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
    let items = (db[entityName] as { id: string }[]).filter(item => item.id !== id);
    (db as any)[entityName] = items;
    
    // Lógica de eliminación en cascada
    if (entityName === 'projects') {
        db.students = db.students.map(s => s.projectId === id ? { ...s, projectId: null } : s);
        db.projectTeachers = db.projectTeachers.filter(pt => pt.projectId !== id);
    }
    if (entityName === 'teachers') {
        db.projectTeachers = db.projectTeachers.filter(pt => pt.teacherId !== id);
        // Eliminar usuario asociado
        db.users = db.users.filter(u => u.teacherId !== id);
    }
    if (entityName === 'students') {
        // Eliminar usuario asociado
        db.users = db.users.filter(u => u.studentId !== id);
    }
    if (entityName === 'users') {
        // No permitir eliminar el admin
        const adminUser = getSeedData().users.find(u => u.role === 'admin');
        if (id === adminUser?.id) {
            console.warn('No se puede eliminar el usuario administrador.');
            // Si la eliminación fue cancelada, restaura los elementos
            items = (readDB()[entityName] as { id: string }[]);
            (db as any)[entityName] = items;
        } else {
             const userToDelete = getItemById('users', id);
             if (userToDelete?.teacherId) {
                // Si eliminamos un usuario de profesor, no eliminamos al profesor. Solo el usuario.
             }
        }
    }


    writeDB(db);
};

const replaceAllItems = <K extends EntityName>(entityName: K, newItems: AppDatabase[K]): void => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const db = readDB();
    (db as any)[entityName] = newItems;
    writeDB(db);
};

// --- Funciones CRUD con lógica de usuario acoplada ---

const addTeacher = (teacher: Omit<Teacher, 'id'>) => {
    const dbState = readDB();
    const newTeacher = { ...teacher, id: generateId() };
    dbState.teachers.push(newTeacher);

    // Crear usuario asociado
    const newUser: Omit<User, 'id'> = {
        username: newTeacher.email.split('@')[0],
        password: newTeacher.cedula,
        role: 'teacher',
        teacherId: newTeacher.id,
        studentId: null,
    };
    const newUserId = generateId();
    dbState.users.push({ ...newUser, id: newUserId });

    writeDB(dbState);
    return newTeacher;
};

const updateTeacher = (updatedTeacher: Teacher) => {
    const dbState = readDB();
    
    // Actualizar docente
    const teacherIndex = dbState.teachers.findIndex(t => t.id === updatedTeacher.id);
    if (teacherIndex === -1) return updatedTeacher;
    dbState.teachers[teacherIndex] = updatedTeacher;

    // Actualizar usuario asociado
    const userIndex = dbState.users.findIndex(u => u.teacherId === updatedTeacher.id);
    if (userIndex !== -1) {
        dbState.users[userIndex].username = updatedTeacher.email.split('@')[0];
        dbState.users[userIndex].password = updatedTeacher.cedula;
    }
    
    writeDB(dbState);
    return updatedTeacher;
};

const addStudent = (student: Omit<Student, 'id'>) => {
    const dbState = readDB();
    const newStudent = { ...student, id: generateId() };
    dbState.students.push(newStudent);

    // Crear usuario asociado
    const newUser: Omit<User, 'id'> = {
        username: newStudent.email.split('@')[0],
        password: newStudent.cedula,
        role: 'student',
        teacherId: null,
        studentId: newStudent.id,
    };
    const newUserId = generateId();
    dbState.users.push({ ...newUser, id: newUserId });
    
    writeDB(dbState);
    return newStudent;
};

const updateStudent = (updatedStudent: Student) => {
    const dbState = readDB();

    // Actualizar estudiante
    const studentIndex = dbState.students.findIndex(s => s.id === updatedStudent.id);
    if (studentIndex === -1) return updatedStudent;
    dbState.students[studentIndex] = updatedStudent;

    // Actualizar usuario asociado
    const userIndex = dbState.users.findIndex(u => u.studentId === updatedStudent.id);
    if (userIndex !== -1) {
        dbState.users[userIndex].username = updatedStudent.email.split('@')[0];
        dbState.users[userIndex].password = updatedStudent.cedula;
    }
    
    writeDB(dbState);
    return updatedStudent;
};


// Exportar funciones específicas para cada entidad
export const db = {
    // Usuarios
    getUsers: () => getItems('users'),
    getUserById: (id: string) => getItemById('users', id),
    addUser: (user: Omit<User, 'id'>) => addItem('users', user),
    updateUser: (user: User) => updateItem('users', user),
    deleteUser: (id: string) => deleteItem('users', id),

    // Proyectos
    getProjects: () => getItems('projects'),
    getProjectById: (id: string) => getItemById('projects', id),
    addProject: (project: Omit<Project, 'id'>) => addItem('projects', project),
    updateProject: (project: Project) => updateItem('projects', project),
    deleteProject: (id: string) => deleteItem('projects', id),

    // Programas
    getPrograms: () => getItems('programs'),

    // Estudiantes
    getStudents: () => getItems('students'),
    getStudentById: (id: string) => getItemById('students', id),
    addStudent: addStudent,
    updateStudent: updateStudent,
    deleteStudent: (id: string) => deleteItem('students', id),

    // Docentes
    getTeachers: () => getItems('teachers'),
    getTeacherById: (id: string) => getItemById('teachers', id),
    addTeacher: addTeacher,
    updateTeacher: updateTeacher,
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
    deleteFormat: (id: string) => deleteItem('formats',id),

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

    // Función de reemplazo
    replaceAll: replaceAllItems,
};