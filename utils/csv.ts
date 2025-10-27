// Fix: Implement the arrayToCsv function to correctly convert an array of objects to a CSV string.
export const arrayToCsv = (data: Record<string, any>[]): string => {
    if (!data || data.length === 0) {
        return '';
    }

    const headers = Object.keys(data[0]);
    const csvRows: string[] = [];

    // Add header row, escaping quotes
    csvRows.push(headers.map(header => `"${header.replace(/"/g, '""')}"`).join(','));

    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            const stringValue = value === null || value === undefined ? '' : String(value);
            // Escape double quotes by doubling them, and wrap in double quotes
            const escaped = stringValue.replace(/"/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
};
