import { AppDatabase, Project, Student, Teacher, ProjectTeacher, Format, TeacherRole, Status, Program, User } from '../types';

const DB_KEY = 'degreeProjectsDB';

const generateId = (): string => Date.now().toString(36) + Math.random().toString(36).substring(2);

// Para actualizar los datos de inicio, reemplace el contenido de la función getSeedData() en services/database.ts con el siguiente código:

const getSeedData = (): AppDatabase => {
  // Código generado el 27/10/2025, 12:43:54
  return {
  "users": [
    {
      "id": "user-admin",
      "username": "admin",
      "password": "Ja39362505",
      "role": "admin",
      "teacherId": null,
      "studentId": null
    },
    {
      "username": "jairo.acosta",
      "password": "73136401",
      "role": "teacher",
      "teacherId": "mh99w7qdec9c0t35kz",
      "studentId": null,
      "id": "mh99w7qdm6uot11mmxj"
    },
    {
      "username": "prueba",
      "password": "12345678",
      "role": "teacher",
      "teacherId": "mh9a4xk656gxvqcpr1r",
      "studentId": null,
      "id": "mh9a4xk6qr6s77m995"
    },
    {
      "username": "carlos.garzon",
      "password": "3806942",
      "role": "teacher",
      "teacherId": "mh9armquebqtqj00pm",
      "studentId": null,
      "id": "mh9armquet3scc9e70l"
    }
  ],
  "statuses": [
    {
      "id": "status-1",
      "name": "Propuesto"
    },
    {
      "id": "status-2",
      "name": "En Progreso"
    },
    {
      "id": "status-3",
      "name": "En Revisión"
    },
    {
      "id": "status-4",
      "name": "Aprobado"
    },
    {
      "id": "status-5",
      "name": "Rechazado"
    }
  ],
  "formats": [
    {
      "name": "Anteproyecto",
      "id": "mh3j9b1d1hizzgfah8n"
    },
    {
      "name": "Proyecto",
      "id": "mh3j9g7i6szt030uwvl"
    },
    {
      "name": "Informe final",
      "id": "mh3j9knavrk8y5qx9r8"
    },
    {
      "name": "Carta ART REV",
      "id": "mh3j9yj2xrxizjyrdbp"
    },
    {
      "name": "ART REV",
      "id": "mh3ja6hqpvhc3pciqs"
    }
  ],
  "teacherRoles": [
    {
      "id": "role-1",
      "name": "Director"
    },
    {
      "id": "role-2",
      "name": "Co-Director"
    },
    {
      "id": "role-3",
      "name": "Evaluador 1"
    },
    {
      "id": "role-4",
      "name": "Evaluador 2"
    }
  ],
  "teachers": [
    {
      "name": "Jairo Acosta Solano",
      "email": "jairo.acosta@campusuninunez.edu.co",
      "id": "mh3j11xz0yt13uxsz6"
    },
    {
      "name": "Maybelline Sharick Castro Pérez",
      "email": "maybelline.castro@campusuninunez.edu.co",
      "id": "mh3j383jwdv0bqu5tec"
    },
    {
      "name": "Jairo Acosta Solano",
      "email": "jairo.acosta@campusuninunez.edu.co",
      "cedula": "73136401",
      "id": "mh99w7qdec9c0t35kz"
    },
    {
      "name": "prueba",
      "email": "prueba@campusuninunez.edu.co",
      "cedula": "12345678",
      "id": "mh9a4xk656gxvqcpr1r"
    },
    {
      "name": "Carlos Garzón Mercado",
      "email": "carlos.garzon@campusuninunez.edu.co",
      "cedula": "3806942",
      "id": "mh9armquebqtqj00pm"
    }
  ],
  "projects": [
    {
      "title": "Desarrollo de una plataforma web de análisis territorial mediante mapa de concentración para la priorización y toma de decisiones públicas",
      "presentationDate": "2025-09-09",
      "filesUrl": "https://drive.google.com/drive/folders/1k0yDND578q5mK2g6wjC902VZf9RmrIuk?usp=drive_link",
      "statusId": "status-3",
      "formatId": "mh3j9g7i6szt030uwvl",
      "id": "mh3jba5bpcafwsf6is"
    }
  ],
  "students": [
    {
      "name": "José Luis Cuadro Rivera",
      "email": "jcuadror21@campusuninunez.edu.co",
      "projectId": "mh3jba5bpcafwsf6is",
      "programId": "prog-2",
      "id": "mh3j4z6mc2v78v2725j"
    }
  ],
  "projectTeachers": [
    {
      "projectId": "mh3jba5bpcafwsf6is",
      "teacherId": "mh3j383jwdv0bqu5tec",
      "roleId": "role-1",
      "id": "mh3kbag8ynl5zxci4ff"
    }
  ],
  "programs": [
    {
      "id": "prog-1",
      "name": "Tecnología en Desarrollo de Sistemas de Información y Software"
    },
    {
      "id": "prog-2",
      "name": "Ingeniería de Sistemas"
    }
  ]
};
};

export const initializeDB = (): void => {
    if (typeof window === 'undefined' || !window.localStorage) return;

    if (!localStorage.getItem(DB_KEY)) {
        localStorage.setItem(DB_KEY, JSON.stringify(getSeedData()));
    }
};

const readDB = (): AppDatabase => {
    if (typeof window === 'undefined' || !window.localStorage) {
        return getSeedData();
    }

    const dbString = localStorage.getItem(DB_KEY);
    if (!dbString) {
        initializeDB();
        const fallbackString = localStorage.getItem(DB_KEY);
        if(fallbackString) return JSON.parse(fallbackString);
        return getSeedData();
    }

    try {
        const db = JSON.parse(dbString);
        if (typeof db === 'object' && db !== null && Array.isArray(db.users)) {
            return db as AppDatabase;
        }
        throw new Error("Invalid DB format");
    } catch (error) {
        console.error("Failed to parse DB from localStorage, resetting to default seed.", error);
        const seedData = getSeedData();
        localStorage.setItem(DB_KEY, JSON.stringify(seedData));
        return seedData;
    }
};


const writeDB = (db: AppDatabase): void => {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.setItem(DB_KEY, JSON.stringify(db));
};

type EntityName = keyof AppDatabase;

const getItems = <K extends EntityName>(entityName: K): AppDatabase[K] => {
    const db = readDB();
    return db[entityName] || [];
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
    if (!Array.isArray(db[entityName])) {
        (db as any)[entityName] = [];
    }
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
    
    if (entityName === 'projects') {
        db.students = db.students.map(s => s.projectId === id ? { ...s, projectId: null } : s);
        db.projectTeachers = db.projectTeachers.filter(pt => pt.projectId !== id);
    }
    if (entityName === 'teachers') {
        db.projectTeachers = db.projectTeachers.filter(pt => pt.teacherId !== id);
        db.users = db.users.filter(u => u.teacherId !== id);
    }
    if (entityName === 'students') {
        db.users = db.users.filter(u => u.studentId !== id);
    }
    if (entityName === 'users') {
        const adminUser = getSeedData().users.find(u => u.role === 'admin');
        if (id === adminUser?.id) return; // Prevent admin deletion
    }

    writeDB(db);
};

const addTeacher = (teacher: Omit<Teacher, 'id'>) => {
    const dbState = readDB();
    const newTeacher = { ...teacher, id: generateId() };
    dbState.teachers.push(newTeacher);

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
    
    const teacherIndex = dbState.teachers.findIndex(t => t.id === updatedTeacher.id);
    if (teacherIndex === -1) return updatedTeacher;
    dbState.teachers[teacherIndex] = updatedTeacher;

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

    const studentIndex = dbState.students.findIndex(s => s.id === updatedStudent.id);
    if (studentIndex === -1) return updatedStudent;
    dbState.students[studentIndex] = updatedStudent;

    const userIndex = dbState.users.findIndex(u => u.studentId === updatedStudent.id);
    if (userIndex !== -1) {
        dbState.users[userIndex].username = updatedStudent.email.split('@')[0];
        dbState.users[userIndex].password = updatedStudent.cedula;
    }
    
    writeDB(dbState);
    return updatedStudent;
};

export const db = {
    getCurrentDB: readDB,
    getUsers: () => getItems('users'),
    getUserById: (id: string) => getItemById('users', id),
    addUser: (user: Omit<User, 'id'>) => addItem('users', user),
    updateUser: (user: User) => updateItem('users', user),
    deleteUser: (id: string) => deleteItem('users', id),
    getProjects: () => getItems('projects'),
    getProjectById: (id: string) => getItemById('projects', id),
    addProject: (project: Omit<Project, 'id'>) => addItem('projects', project),
    updateProject: (project: Project) => updateItem('projects', project),
    deleteProject: (id: string) => deleteItem('projects', id),
    getPrograms: () => getItems('programs'),
    getStudents: () => getItems('students'),
    getStudentById: (id: string) => getItemById('students', id),
    addStudent: addStudent,
    updateStudent: updateStudent,
    deleteStudent: (id: string) => deleteItem('students', id),
    getTeachers: () => getItems('teachers'),
    getTeacherById: (id: string) => getItemById('teachers', id),
    addTeacher: addTeacher,
    updateTeacher: updateTeacher,
    deleteTeacher: (id: string) => deleteItem('teachers', id),
    getProjectTeachers: () => getItems('projectTeachers'),
    addProjectTeacher: (pt: Omit<ProjectTeacher, 'id'>) => addItem('projectTeachers', pt),
    updateProjectTeacher: (pt: ProjectTeacher) => updateItem('projectTeachers', pt),
    deleteProjectTeacher: (id: string) => deleteItem('projectTeachers', id),
    getFormats: () => getItems('formats'),
    addFormat: (format: Omit<Format, 'id'>) => addItem('formats', format),
    updateFormat: (format: Format) => updateItem('formats', format),
    deleteFormat: (id: string) => deleteItem('formats',id),
    getTeacherRoles: () => getItems('teacherRoles'),
    addTeacherRole: (role: Omit<TeacherRole, 'id'>) => addItem('teacherRoles', role),
    updateTeacherRole: (role: TeacherRole) => updateItem('teacherRoles', role),
    deleteTeacherRole: (id: string) => deleteItem('teacherRoles', id),
    getStatuses: () => getItems('statuses'),
    addStatus: (status: Omit<Status, 'id'>) => addItem('statuses', status),
    updateStatus: (status: Status) => updateItem('statuses', status),
    deleteStatus: (id: string) => deleteItem('statuses', id),
};
