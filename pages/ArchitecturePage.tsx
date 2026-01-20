import React from 'react';

const EntityCard: React.FC<{
    title: string;
    description: string;
    attributes: string[];
    relations: Array<{ name: string; type: string; target: string; }>;
}> = ({ title, description, attributes, relations }) => (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 flex flex-col h-full">
        <div className="p-4 bg-primary-900 text-white rounded-t-lg">
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="text-sm text-primary-200">{description}</p>
        </div>
        <div className="p-4 flex-grow">
            <h4 className="font-semibold text-gray-700 mb-2">Atributos</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {attributes.map(attr => <li key={attr}><code className="bg-gray-200 text-gray-800 rounded px-1 py-0.5 text-xs">{attr}</code></li>)}
            </ul>
        </div>
        {relations.length > 0 && (
            <div className="p-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-2">Relaciones</h4>
                <div className="space-y-2">
                {relations.map(rel => (
                    <div key={rel.name} className="text-sm">
                        <code className="bg-gray-200 text-gray-800 rounded px-1 py-0.5 text-xs">{rel.name}</code>
                        <span className="text-gray-500 mx-1">→</span>
                        <span className="font-medium text-primary-700">{rel.target}</span>
                        <span className="text-xs text-gray-500 ml-2 italic">({rel.type})</span>
                    </div>
                ))}
                </div>
            </div>
        )}
    </div>
);

const entities = [
    {
        title: 'User',
        description: 'Gestiona el acceso y los permisos.',
        attributes: ['id', 'username', 'password', 'role'],
        relations: [
            { name: 'teacherId', type: '1 a 1 (Opcional)', target: 'Teacher' },
            { name: 'studentId', type: '1 a 1 (Opcional)', target: 'Student' },
        ],
    },
    {
        title: 'Project',
        description: 'El proyecto de grado central.',
        attributes: ['id', 'title', 'presentationDate', 'filesUrl', 'isApprovedByDirector', 'writtenGradeReviewer1', 'presentationGradeReviewer1', 'writtenGradeReviewer2', 'presentationGradeReviewer2'],
        relations: [
            { name: 'statusId', type: 'Muchos a 1', target: 'Status' },
            { name: 'formatId', type: 'Muchos a 1', target: 'Format' },
        ],
    },
    {
        title: 'Student',
        description: 'Representa a un estudiante.',
        attributes: ['id', 'name', 'email', 'cedula'],
        relations: [
            { name: 'projectId', type: 'Muchos a 1 (Opcional)', target: 'Project' },
            { name: 'programId', type: 'Muchos a 1', target: 'Program' },
        ],
    },
    {
        title: 'Teacher',
        description: 'Representa a un docente.',
        attributes: ['id', 'name', 'email', 'cedula'],
        relations: [],
    },
    {
        title: 'ProjectTeacher',
        description: 'Tabla de unión entre Proyectos y Docentes.',
        attributes: ['id'],
        relations: [
            { name: 'projectId', type: 'Muchos a 1', target: 'Project' },
            { name: 'teacherId', type: 'Muchos a 1', target: 'Teacher' },
            { name: 'roleId', type: 'Muchos a 1', target: 'TeacherRole' },
        ],
    },
    {
        title: 'Program',
        description: 'Programa académico (e.g., Ing. de Sistemas).',
        attributes: ['id', 'name'],
        relations: [],
    },
    {
        title: 'Status',
        description: 'Estado del proyecto (e.g., Aprobado).',
        attributes: ['id', 'name'],
        relations: [],
    },
    {
        title: 'Format',
        description: 'Formato del proyecto (e.g., Anteproyecto).',
        attributes: ['id', 'name'],
        relations: [],
    },
    {
        title: 'TeacherRole',
        description: 'Rol de un docente en un proyecto (e.g., Director).',
        attributes: ['id', 'name'],
        relations: [],
    },
];

export const ArchitecturePage: React.FC = () => {
    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800">Arquitectura y Modelo de Datos</h1>
                <p className="mt-2 text-gray-600">
                    Este es un diagrama conceptual del modelo de datos de la aplicación. Muestra las principales entidades,
                    sus atributos y las relaciones que existen entre ellas. Toda la información se almacena localmente en su navegador
                    utilizando Local Storage.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
                {entities.map(entity => (
                    <EntityCard 
                        key={entity.title}
                        title={entity.title}
                        description={entity.description}
                        attributes={entity.attributes}
                        relations={entity.relations}
                    />
                ))}
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Flujo de Datos y Lógica de Negocio</h2>
                <div className="space-y-4 text-gray-700">
                    <p>La aplicación sigue una lógica de negocio específica para la creación y gestión de usuarios y sus roles:</p>
                    <ul className="list-disc list-inside space-y-2 pl-4">
                        <li><strong>Creación de Docentes:</strong> Cuando un administrador crea un nuevo <span className="font-semibold text-primary-700">Docente</span>, el sistema crea automáticamente una cuenta de <span className="font-semibold text-primary-700">Usuario</span> asociada. El nombre de usuario se genera a partir del email y la contraseña se establece con la cédula del docente.</li>
                        <li><strong>Creación de Estudiantes:</strong> De forma similar, al crear un nuevo <span className="font-semibold text-primary-700">Estudiante</span>, se genera una cuenta de <span className="font-semibold text-primary-700">Usuario</span> vinculada con su email y cédula.</li>
                        <li><strong>Eliminación:</strong> La eliminación de un <span className="font-semibold text-primary-700">Docente</span> o <span className="font-semibold text-primary-700">Estudiante</span> también provoca la eliminación de su cuenta de <span className="font-semibold text-primary-700">Usuario</span> y cualquier asignación en la tabla <span className="font-semibold text-primary-700">ProjectTeacher</span>.</li>
                        <li><strong>Permisos:</strong> Los permisos son manejados por el <code className="text-xs">role</code> en la entidad <span className="font-semibold text-primary-700">User</span>. El rol de 'admin' tiene acceso total, mientras que los 'teacher' tienen permisos condicionales (por ejemplo, solo pueden editar proyectos donde son directores o calificar donde son evaluadores).</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
