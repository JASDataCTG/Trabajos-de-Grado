# MANUAL DE USUARIO
### SISTEMA DE GESTIÓN DE PROYECTOS DE GRADO (GESTOR UNINÚÑEZ)

---

## 1. INTRODUCCIÓN Y PROPÓSITO DEL SISTEMA

El **Sistema de Gestión de Proyectos de Grado (Gestor UniNúñez)** es una plataforma digital full-stack integrada, diseñada a la medida de la **Corporación Universitaria Rafael Núñez**. Su propósito fundamental es automatizar, centralizar e instrumentar el seguimiento, la evaluación y la fiscalización del ciclo de vida completo de los proyectos y tesis de grado, desde su radicación inicial hasta la sustentación y calificación definitiva.

La plataforma aborda la complejidad institucional de la administración académica permitiendo:
* El seguimiento por fases mediante formatos estandarizados (desde el Anteproyecto hasta el Artículo Final).
* La gestión de cargas académicas de docentes asignados en diversos roles consultores.
* El modelado minucioso de relaciones estudiante-proyecto.
* La generación autónoma de analíticas para juntas de currículo y coordinaciones de investigación.

---

## 2. ARQUITECTURA DE ROLES DE USUARIO

El control de acceso e interacción de la plataforma está estrictamente estipulado bajo un esquema jerárquico y de privilegios según la identidad académica del usuario:

| Rol de Usuario | Permisos y Atribuciones Académicas | Acceso en el Menú Lateral |
|:---|:---|:---|
| **Administrador / Coordinador** | Control absoluto. Puede configurar catálogos maestros, redefinir formatos, parametrizar programas académicos, crear/actualizar datos de estudiantes, docentes y usuarios del sistema, y gestionar proyectos sin restricciones de lectura/escritura. | Panel Principal, Proyectos, Estudiantes, Docentes, Reportes, Usuarios, Configuración. |
| **Docente (Tutor, Cotutor, Revisor/Jurado)** | Acceso orientado a consulta de su carga académica y asignaciones vigentes. Puede evaluar, retroalimentar y asignar calificaciones cualitativas o cuantitativas a los proyectos bajo su asignación específica cuando el formato de trabajo así lo habilite (Formato 115). | Panel Principal, Proyectos, Reportes (Vista restringida), Mi Perfil. |
| **Estudiante** | Acceso a una interfaz dedicada y simplificada de autogestión. No accede a la administración global. Su pantalla principal es su propio proyecto activo, donde puede registrar avances históricos, verificar comentarios de jurados externos y descargar/cargar la documentación de sus formatos. | Mi Proyecto, Mi Perfil. |

---

## 3. SECCIÓN I: INICIO DE SESIÓN Y ACCESO AL SISTEMA

### 3.1 Portal de Autenticación
El ingreso se efectúa mediante el portal web unificado, provisto de los siguientes elementos visuales:
1. **Logotipo Institucional**: Identificación de la Corporación Universitaria Rafael Núñez.
2. **Formulario de Credenciales**: Campos obligatorios para *Correo Electrónico* y *Contraseña*.
3. **Acceso de Roles**: Menú de ingreso adaptativo.
4. **Acceso Directo a Reportes Públicos**: Un botón diseñado especialmente en la base que permite a entes reguladores, auditores externos o estudiantes sin credenciales ingresar directamente a la **Visualización de Reportes Analíticos**.

> 💡 **Sugerencia Visual (Diseño de la Interfaz de Login)**:
> Esta pantalla presenta un diseño centrado con fondo minimalista en tono gris claro (`#F3F4F6`), estructurada sobre una tarjeta flotante de bordes redondeados amplios (`rounded-3xl`) de base blanca nítida, decorada en sus bordes superiores por una sutil línea divisora en color naranja encendido (`#F58220`, naranja UniNúñez). El botón de ingreso sobresale en color verde oliva/azul cerceta (`#008080`, verde UniNúñez), provocando un alto contraste idóneo para la legibilidad.

### 3.2 Reportes Públicos (Sin Credenciales)
Si un usuario presiona **"Ver Reportes Públicos"**, la aplicación despliega la pantalla de reportes analíticos de manera segura. Se bloquean e invisibilizan todas las bases de datos de perfiles y configuraciones del menú lateral, permitiendo al veedor interactuar únicamente con los gráficos consolidados y los filtros autorizados de proyectos presentados.

---

## 4. SECCIÓN II: MÓDULO DE PROYECTOS (CENTRO DE OPERACIONES)

El catálogo de **Proyectos** (`/pages/ProjectsPage.tsx`) es el motor transaccional del sistema.

### 4.1 Pantalla Principal de Proyectos
Consta de una grilla reactiva que enlista los proyectos correspondientes de grado. Ofrece:
* **Filtro de búsqueda por palabras clave** en tiempo real.
* **Información resumida en la tarjeta**: Título, código del proyecto, estudiantes asociados, formato vigente y estado del trámite en etiquetas de color contrastante.
* **Botón de Creación**: Disponible para perfiles de administración con un modal flotante guiado paso a paso.

---

### 4.2 Edición de Detalles y Datos Maestros
Al interactuar con el botón **"Editar"** o seleccionar un proyecto en particular, el sistema abre la vista detallada dividida en bloques semánticos:

#### A. Información Básica del Proyecto
Campos de entrada para el *Título del Proyecto* (en tipografía destacada), *Línea de Investigación*, *Sublínea*, y *Lugar de Desarrollo*.

#### B. Programa y Formato de Entrada
Asociación directa al programa de grado respectivo (ej. Enfermería, Derecho, Ingeniería de Sistemas) y selección del **Formato de Trabajo** sobre el cual concurre el estado actual.

#### C. Gestión del Equipo Académico (Socio-Docentes)
En este bloque se administran de forma modular:
1. **Estudiantes Vinculados**: Posibilidad de adjuntar o revocar alumnos al proyecto en tiempo real.
2. **Docentes y Roles**: Sección altamente parametrizada para añadir investigadores y profesores encargados. Cada docente es asociado a una de las siguientes opciones jerárquicas:
   * **Director / Tutor**: Responsable directo del contenido metodológico.
   * **Codirector / Cotutor**: Co-responsable de apoyo técnico o temático.
   * **Evaluador / Revisor / Jurado 1**: Evaluador par de la institución para dictamen escrito y de sustentación.
   * **Evaluador / Revisor / Jurado 2**: Segundo jurado calificador de la terna.

---

### 4.3 Gestión Integral del Historial de Formatos (Avances Académicos)
Una de las funcionalidades críticas integradas es el **Historial de Formatos**. Esta sección se halla en la base del formulario detallado y documenta de forma estricta todos los avances realizados:

#### A. Flujo de Radicación e Historial
* Cada vez que los estudiantes presentan un avance en su proceso, se agrega una entrada nueva al historial detallando la **Fecha de Radicación (Calendario)**, el **Formato Académico presentado**, el **Estado de Aprobación de la terna**, y los **Enlaces o URLs a los archivos de evidencia cargados** en nubes públicas o institucionales.

#### B. Registro y Modificación Interactiva del Historial
Para solventar necesidades operativas de rectificación, el sistema permite realizar las siguientes acciones en caliente:
1. **Crear Avance**: Presionar el botón `+ Agregar Avance` para instanciar un nuevo formato.
2. **Editar Registro Guardado**: Al presionar el botón del lápiz (`EditIcon`), el sistema extrae el registro de historial, lo carga directamente en el formulario dinámico respectivo de avances y permite modificar la radicación completa (Formato, Estado, Fecha y Archivo).
3. **Casilla de Sincronización de Estado (Sync Toggle)**:
   Al crear o editar un registro en el historial, el administrador tiene a su disposición una casilla de verificación interactiva que señala:
   > 🔘 **"Sincronizar y actualizar también el estado actual del proyecto"**
   
   Si esta casilla se marca activa al guardar, el sistema automáticamente reajustará el formulario superior del proyecto para sincronizar de inmediato el *Formato General*, la *Fecha de Presentación* y el *Estado Global del Proyecto* con el paso histórico recién modificado. Esto evita la doble carga manual de información y evita inconsistencias de datos.
4. **Eliminar Registro**: El icono de papelera (`TrashIcon`) elimina el avance del historial histórico de forma permanente, previa confirmación de seguridad.

---

### 4.4 Sistema de Bloqueo de Evaluación y Calificaciones (Regla del Formato 115)
El sistema resguarda estrictamente las calificaciones cuantitativas. 

> ⚠️ **Regla de Negocio Imperativa**:
> La evaluación cuantitativa y la asignación de notas definitivas están **estrictamente bloqueadas** en el sistema. Dichas opciones de edición solo se habilitarán cuando el proyecto o su registro en el historial cuenten formalmente con la transición al **Formato 115 (Artículo Final)**. En caso contrario, se mostrará el siguiente banner informativo de prevención:
>
> `⚠️ La evaluación y asignación de calificaciones están bloqueadas. Solo se activan cuando el proyecto o su historial reflejan el Formato 115 (Artículo Final).`

Una vez alcanzada la transición metodológica para el Artículo Final (Formato 115), el sistema de forma dinámica desbloquea los inputs numéricos permitiendo registrar:
* Calificación Documento Escrito (Jurado 1 y Jurado 2).
* Calificación Sustentación Oral (Jurado 1 y Jurado 2).
* Cálculo automatizado del **Promedio Definitivo** ponderado para la asignación de su estado como **Aprobado con Distinción / Distinguido / Aprobado / Reprobado**.

---

### 4.5 Bandeja de Entrada de Evaluaciones Rápidas (Página de Inicio / Dashboard)

Para optimizar el flujo de trabajo de los docentes y agilizar el proceso de calificación de trabajos de grado de ciclo de vida final, se ha implementado un componente reactivo exclusivo para el perfil de **Docentes** directamente en la página de inicio (**Panel de Control**):

#### A. Identificación Temprana de Asignaciones
* Tan pronto como un docente ingresa a la plataforma, si tiene proyectos asignados que se encuentren bajo el **Formato 115 (Artículo Final)**, el sistema hace destellar un indicador visual interactivo color naranja indicando el número exacto de proyectos pendientes por evaluar.
* Esta sección recopila la información para que el evaluador no requiera buscar manualmente el proyecto dentro del catálogo general, proporcionando un canal de calificación expedito de un solo clic.

#### B. Componente y Formulario de Calificación Integrado (Inline)
Cada proyecto en esta grilla de inicio cuenta con un desplegable interactivo (**"Evaluar" / "Ocultar"**):
1. **Detección Dinámica de Rol**: El sistema calcula de manera exacta el índice del evaluador (`Reviewer Index 1 o 2`) asignado a su perfil docente actual para ese proyecto específico.
2. **Estudiantes e Integrantes**: Despliega inmediatamente los nombres e identificaciones de los autores del manuscrito.
3. **Formulario de Notas Directo**: El docente podrá registrar o rectificar directamente en esta sección la **Nota de Documento Escrito** y la **Nota de Sustentación Oral**, validadas estrictamente dentro de la escala numérica de `0.0` a `5.0`.
4. **Sincronización Multicapa Asíncrona**: Al pulsar **"Guardar Calificaciones"**, el componente ejecuta tres sincronizaciones simultáneas:
   - Actualiza de inmediato las notas individuales del registro principal del proyecto.
   - Recalcula de forma transparente el **Promedio Final** de la investigación.
   - Sincroniza y reescribe de manera automática la entrada correspondiente en el **Historial de Avance de Formatos** para mantener la consistencia histórica inalterada.
   - Refresca de manera reactiva todos los indicadores y métricas del panel de control de manera instantánea.

---

## 5. SECCIÓN III: MÓDULO DE REPORTES Y ANALÍTICAS GENERALES

La sección de **Reportes** (`/pages/ReportsPage.tsx`) ofrece capacidades de analítica empresarial diseñadas para juntas directivas y coordinaciones de investigación.

### 5.1 Estructura del Panel de Control Analítico
La interfaz de reportes consolida información integral en cuatro bloques:
1. **Tarjetas de Estadísticas Clave**: Resumen con indicadores dinámicos (Total de Proyectos, Proyectos Evaluados, Total Estudiantes en Registro, Proyectos Aprobados, Tasa de Aprobación).
2. **Gráfico de Formatos de Trabajo (Barras)**: Distribución de volúmenes de proyectos de grado en curso en cada etapa del protocolo metodológico.
3. **Gráfico de Distribución del Programa (Anillo)**: Proporciones de participación según las carreras universitarias en la sede.
4. **Resúmenes en Tablas Cruzadas**: Desglose pormenorizado por Docentes, Rol Asignado, Cantidad de Tutorías vigentes y su correspondiente balance académico en el ciclo activo.

---

### 5.2 Uso del Panel Multifiltros Avanzado
En la sección superior de reportes, el usuario administrador o docente dispone de un moderno motor de filtrado concurrente que le permite acotar los universos de datos para auditoría:

```
+---------------------------------------------------------------------------------------------------------+
|                                    MOTOR DE FILTROS AVANZADOS                                           |
+------------------------------------+------------------------------------+-------------------------------+
|  1. Título / Clave (Texto Libre)   |  2. Programa Académico (Select)    |  3. Estado de Avance (Select) |
+------------------------------------+------------------------------------+-------------------------------+
|  4. Formato de Trabajo (Select)    |  5. Docente Asignado (Select)      |  6. Rol del Docente (Select)  |
+------------------------------------+------------------------------------+-------------------------------+
|  7. Fecha Radicación Desde (Date)  |  8. Fecha Radicación Hasta (Date)   |  [Limpiar]   [Ejecutar]       |
+------------------------------------+------------------------------------+-------------------------------+
```

A través de estos filtros es posible realizar búsquedas cruzadas de alta complejidad:
* **Filtro por Rol de Docentes (Recién Implementado)**: Permite segmentar las visualizaciones de reportes para ver de manera aislada única y exclusivamente aquellos proyectos donde los profesores funjan bajo un rol específico. Por ejemplo, al seleccionar el rol **"Revisor"**, el sistema recalculará la participación consolidada y la tabla detallada de *"Proyectos a Cargo por Docente y Rol"*, ocultando los proyectos donde actúe puramente como "Tutor" para evitar sesgos y facilitar las auditorías de jurados asignados.
* **Filtros por Fecha de Radicación (Desde / Hasta)**: Acote temporal muy preciso que permite delimitar la visualización a proyectos o avances presentados únicamente dentro de una ventana temporal (por ejemplo, el presente mes, un semestre académico o periodos anuales de licenciamiento institucional).

Al pulsar **"Ejecutar Análisis"**, el panel actualiza de forma instantánea todos los gráficos y tablas en pantalla. Para reiniciar y volver a la vista global, el sistema dispone del botón adyacente **"Limpiar Filtros"**.

---

### 5.3 Exportación de Datos a Formato Universal (CSV)
Todas las tablas de información consolidadas (incluyendo las planillas de proyectos calificados, la grilla de docentes adscritos y el consolidado general de proyectos a cargo) disponen de un botón dedicado de **"Descargar CSV"** en su borde superior derecho. Al hacer clic, se produce la descarga asíncrona de un archivo estructurado con codificación UTF-8 listo para su procesamiento e importación en suites como Microsoft Excel, Google Sheets o PowerBI.

---

## 6. SECCIÓN IV: MÓDULOS DE CONFIGURACIÓN Y MANTENIMIENTO MAESTRO

Para garantizar la autonomía administrativa, la plataforma posee paneles específicos de mantenimiento de software:

### 6.1 Módulo de Configuración de Tablas Auxiliares (`/pages/SettingsPage.tsx`)
Un módulo robusto que gestiona las nomenclaturas y catálogos globales de la base de datos de manera intuitiva mediante secciones de listados editables:
1. **Formatos de Trabajo**: El administrador puede modificar las denominaciones operativas o añadir códigos nuevos según el surgimiento de nuevos formatos en el plan curricular (ej., Formato 111, Formato 112, Formato 115).
2. **Programas y Facultades**: Alta y baja de carreras universitarias, asignándolas de forma visual a sus respectivas comisiones y facultades (ej. Medicina, Odontología, Tecnología).
3. **Estados del Proyecto**: Estipula las etiquetas y las lógicas de color que usarán los proyectos del sistema (ej., Presentado, Corrección Urgente, Aprobado Definitivamente).

### 6.2 Administración de Seguridad, Usuarios y Perfil (`/pages/UsersPage.tsx` y `/pages/ProfilePage.tsx`)
* **Control de Usuarios**: Permite registrar las credenciales de nuevos tutores, jurados u oficiales de investigación que ingresen a laborar a la corporación, definiendo sus tipos de usuario (Admin, Docente, Estudiante).
* **Cambio Obligatorio de Clave**: Una medida de ciberseguridad que permite a cualquier usuario registrado (especialmente a estudiantes asignados en su primer acceso) ingresar al apartado de **"Mi Perfil"** y modificar de manera inmediata su contraseña personal con el fin de contrarrestar el acceso no autorizado de terceros.

---

## 7. RESOLUCIÓN DE PREGUNTAS FRECUENTES (FAQ) Y DIAGNÓSTICO DE ACCIONES

#### 1. ¿Por qué no se muestran las cajas para ingresar las notas de sustentación y jurado de un proyecto?
**Respuesta:** El proyecto se encuentra actualmente bajo un formato intermedio (como por ejemplo el *Formato 111 - Anteproyecto*). La asignación de calificaciones numéricas se encuentra restringida bajo mecanismos de negocio y solo se habilitará para su edición una vez se registre que el proyecto ha evolucionado exitosamente al **Formato 115 - Artículo Final** mediante su historial general de formatos.

#### 2. Al ejecutar un filtro por rol "Revisor/Jurado", sigo viendo nombres de directores académicos en la tabla general, ¿por qué?
**Respuesta:** Las relaciones de proyectos permiten asignar múltiples docentes a un mismo trabajo científico. Al filtrar por el rol de "Revisor", la aplicación filtra de manera rigurosa la tabla detallada de *"Proyectos a Cargo por Docente y Rol"*, aislando la carga del docente y mostrando únicamente los proyectos donde cumpla específicamente la función de evaluador o jurado en dicha relación, descartando proyectos bajo su tutela como tutor para garantizar métricas puras.

#### 3. ¿El sistema funciona sin conexión a internet o de modo offline-first?
**Respuesta:** Sí. El motor del sistema cuenta con un sistema híbrido de persistencia de datos. Si el servicio de nube centralizado presenta interrupciones de tráfico, el sistema continuará operando y almacenando los datos en la memoria persistente del navegador (`localStorage`) de manera local. Una vez recuperado el canal tecnológico, los deltas se sincronizan para asegurar la redundancia física y digital de la investigación de grado.
