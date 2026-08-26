const AVAILABLE_LANGUAGES = ['it', 'en', 'fr'];
const CSV_SEPARATOR = ';';
const REQUIRED_COLUMNS = ['sanitizedName'];

function escapeCsvField(value) {
    const text = value == null ? '' : String(value);
    if (/[",;\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function getTranslationValue(map, lang) {
    if (!map || map[lang] == null) {
        return '';
    }
    return map[lang];
}

function buildHeaderRow() {
    const nameColumns = AVAILABLE_LANGUAGES.map(lang => `name_${lang}`);
    const descriptionColumns = AVAILABLE_LANGUAGES.map(lang => `description_${lang}`);
    return ['hash', 'sanitizedName', 'name', 'description', ...nameColumns, ...descriptionColumns];
}

function buildVariableRow(variable) {
    const translatedNames = AVAILABLE_LANGUAGES.map(lang =>
        getTranslationValue(variable.translatedName, lang)
    );
    const translatedDescriptions = AVAILABLE_LANGUAGES.map(lang =>
        getTranslationValue(variable.translatedDescription, lang)
    );

    return [
        variable.hash ?? '',
        variable.sanitizedName ?? '',
        variable.name ?? '',
        variable.description ?? '',
        ...translatedNames,
        ...translatedDescriptions,
    ];
}

function buildSeramiTranslationsCsv(seramiEntry) {
    const variables = Array.isArray(seramiEntry?.data) ? seramiEntry.data : [];
    const rows = [buildHeaderRow(), ...variables.map(buildVariableRow)];
    const body = rows
        .map(row => row.map(escapeCsvField).join(CSV_SEPARATOR))
        .join('\r\n');
    return `\ufeff${body}`;
}

function buildExportFilename(seramiEntry) {
    const baseName = (seramiEntry?.name || 'serami')
        .trim()
        .replace(/[^\w\-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '') || 'serami';
    return `${baseName}_translations.csv`;
}

function parseCsvContent(content) {
    const normalized = String(content).replace(/^\ufeff/, '');
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let index = 0; index < normalized.length; index++) {
        const char = normalized[index];

        if (inQuotes) {
            if (char === '"') {
                if (normalized[index + 1] === '"') {
                    field += '"';
                    index++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            inQuotes = true;
            continue;
        }

        if (char === CSV_SEPARATOR) {
            row.push(field);
            field = '';
            continue;
        }

        if (char === '\n') {
            row.push(field);
            if (row.some(cell => cell.length > 0)) {
                rows.push(row);
            }
            row = [];
            field = '';
            if (normalized[index - 1] === '\r') {
                continue;
            }
            continue;
        }

        if (char === '\r') {
            continue;
        }

        field += char;
    }

    row.push(field);
    if (row.some(cell => cell.length > 0)) {
        rows.push(row);
    }

    if (rows.length === 0) {
        throw new Error('CSV file is empty');
    }

    const headers = rows[0].map(header => header.trim());
    for (const column of REQUIRED_COLUMNS) {
        if (!headers.includes(column)) {
            throw new Error(`Missing required CSV column: ${column}`);
        }
    }

    return rows.slice(1).map(cells => {
        const record = {};
        headers.forEach((header, headerIndex) => {
            record[header] = cells[headerIndex] == null ? '' : cells[headerIndex];
        });
        return record;
    });
}

function buildTranslationMaps(row) {
    const translatedName = {};
    const translatedDescription = {};

    for (const lang of AVAILABLE_LANGUAGES) {
        const nameValue = (row[`name_${lang}`] || '').trim();
        const descriptionValue = (row[`description_${lang}`] || '').trim();
        if (nameValue) {
            translatedName[lang] = nameValue;
        }
        if (descriptionValue) {
            translatedDescription[lang] = descriptionValue;
        }
    }

    return {
        translatedName: Object.keys(translatedName).length > 0 ? translatedName : undefined,
        translatedDescription: Object.keys(translatedDescription).length > 0 ? translatedDescription : undefined,
    };
}

function applyImportedVariableFields(variable, row) {
    variable.name = (row.name || '').trim();
    variable.description = (row.description || '').trim();

    const translations = buildTranslationMaps(row);
    variable.translatedName = translations.translatedName;
    variable.translatedDescription = translations.translatedDescription;
}

function cloneSeramiEntry(sourceEntry) {
    return {
        name: `${sourceEntry.name} (traduzioni importate)`,
        data: JSON.parse(JSON.stringify(sourceEntry.data || [])),
        groups: sourceEntry.groups ? JSON.parse(JSON.stringify(sourceEntry.groups)) : null,
    };
}

function importSeramiTranslationsFromCsv(sourceEntry, csvContent) {
    const csvRows = parseCsvContent(csvContent);
    const copy = cloneSeramiEntry(sourceEntry);
    const variablesBySanitizedName = new Map();

    for (const variable of copy.data) {
        if (variable.sanitizedName) {
            variablesBySanitizedName.set(variable.sanitizedName, variable);
        }
    }

    const skippedCsvRows = [];
    let matched = 0;

    for (const row of csvRows) {
        const sanitizedName = (row.sanitizedName || '').trim();
        if (!sanitizedName) {
            skippedCsvRows.push({ sanitizedName: '', reason: 'Missing sanitizedName' });
            continue;
        }

        const variable = variablesBySanitizedName.get(sanitizedName);
        if (!variable) {
            skippedCsvRows.push({ sanitizedName, reason: 'Variable not found in configuration' });
            continue;
        }

        applyImportedVariableFields(variable, row);
        matched++;
    }

    return {
        entry: copy,
        matched,
        skippedCsvRows,
        totalCsvRows: csvRows.length,
    };
}

module.exports = {
    AVAILABLE_LANGUAGES,
    buildSeramiTranslationsCsv,
    buildExportFilename,
    importSeramiTranslationsFromCsv,
    parseCsvContent,
};
