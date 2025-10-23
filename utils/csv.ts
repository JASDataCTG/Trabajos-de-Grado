// --- CSV Helper Functions ---

/**
 * Convierte un array de objetos a una cadena de texto en formato CSV.
 * Maneja comas, comillas y saltos de línea dentro de los campos.
 * @param data Array de objetos a convertir.
 * @returns Una cadena de texto en formato CSV.
 */
export function arrayToCsv(data: any[]): string {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')]; // Fila de encabezado

    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header];
            if (val === null || val === undefined) return '';
            const strVal = String(val);
            // Si el valor contiene coma, comillas dobles o nueva línea, lo envuelve en comillas dobles
            if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
                // Escapa las comillas dobles duplicándolas
                return `"${strVal.replace(/"/g, '""')}"`;
            }
            return strVal;
        });
        csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
}

/**
 * Convierte una cadena de texto en formato CSV a un array de objetos.
 * @param csv La cadena de texto CSV.
 * @returns Un array de objetos.
 */
export function csvToArray(csv: string): any[] {
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const result = [];
    const regex = /(?:^|,)(\"(?:[^\"]+|\"\")*\"|[^,]*)/g;

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const obj: { [key: string]: any } = {};
        let match;
        let headerIndex = 0;
        regex.lastIndex = 0; // Reiniciar el estado de la regex
        
        while ((match = regex.exec(lines[i]))) {
            if (headerIndex >= headers.length) break;

            let value: any = match[1];
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1).replace(/""/g, '"');
            }
            if (value === 'null') {
                value = null;
            } else if (value === 'true') {
                value = true;
            } else if (value === 'false') {
                value = false;
            }
            obj[headers[headerIndex]] = value;
            headerIndex++;
            if (match.index + match[0].length === lines[i].length) break;
        }
        if (Object.keys(obj).length === headers.length) {
            result.push(obj);
        }
    }
    return result;
}
