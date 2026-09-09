const { getAvailableLanguages } = require('./available-languages');
const DEFAULT_CSV_SEPARATOR = ';';
const SUPPORTED_CSV_SEPARATORS = [';', ','];
const REQUIRED_COLUMNS = ['sanitizedName'];
const GROUP_ROW_HASH = 'group';

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
    const languages = getAvailableLanguages();
    const nameColumns = languages.map(lang => `name_${lang}`);
    const descriptionColumns = languages.map(lang => `description_${lang}`);
    return ['hash', 'sanitizedName', 'name', 'description', ...nameColumns, ...descriptionColumns];
}

function buildVariableRow(variable) {
    const languages = getAvailableLanguages();
    const translatedNames = languages.map(lang =>
        getTranslationValue(variable.translatedName, lang)
    );
    const translatedDescriptions = languages.map(lang =>
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

function buildGroupRow(group) {
    const languages = getAvailableLanguages();
    const translatedNames = languages.map(lang =>
        getTranslationValue(group.translations, lang)
    );
    const emptyDescriptions = languages.map(() => '');

    return [
        GROUP_ROW_HASH,
        group.name ?? '',
        group.name ?? '',
        '',
        ...translatedNames,
        ...emptyDescriptions,
    ];
}

function collectExportGroups(seramiEntry) {
    const metadata = Array.isArray(seramiEntry?.groups) ? seramiEntry.groups : [];
    const variables = Array.isArray(seramiEntry?.data) ? seramiEntry.data : [];
    const groupsByName = new Map();

    for (const group of metadata) {
        if (group?.name) {
            groupsByName.set(group.name, group);
        }
    }

    for (const variable of variables) {
        const groupName = variable?.group;
        if (groupName && !groupsByName.has(groupName)) {
            groupsByName.set(groupName, { name: groupName });
        }
    }

    return [...groupsByName.values()].sort((left, right) => {
        const sortDiff = (left.sort ?? 0) - (right.sort ?? 0);
        if (sortDiff !== 0) {
            return sortDiff;
        }
        return String(left.name).localeCompare(String(right.name));
    });
}

function buildSeramiTranslationsCsv(seramiEntry) {
    const variables = Array.isArray(seramiEntry?.data) ? seramiEntry.data : [];
    const groups = collectExportGroups(seramiEntry);
    const rows = [
        buildHeaderRow(),
        ...variables.map(buildVariableRow),
        ...groups.map(buildGroupRow),
    ];
    const body = rows
        .map(row => row.map(escapeCsvField).join(DEFAULT_CSV_SEPARATOR))
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

function normalizeCsvContent(content) {
    return String(content).replace(/^\ufeff/, '');
}

function hasRequiredHeaders(headers) {
    const trimmedHeaders = headers.map(header => header.trim());
    return REQUIRED_COLUMNS.every(column => trimmedHeaders.includes(column));
}

function parseCsvRows(normalized, separator, maxRows = Infinity) {
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

        if (char === separator) {
            row.push(field);
            field = '';
            continue;
        }

        if (char === '\n') {
            row.push(field);
            if (row.some(cell => cell.length > 0)) {
                rows.push(row);
                if (rows.length >= maxRows) {
                    return rows;
                }
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

    return rows;
}

function detectCsvSeparator(normalized) {
    for (const separator of SUPPORTED_CSV_SEPARATORS) {
        const [headerRow] = parseCsvRows(normalized, separator, 1);
        if (headerRow && hasRequiredHeaders(headerRow)) {
            return separator;
        }
    }

    return null;
}

function parseCsvContent(content) {
    const normalized = normalizeCsvContent(content);
    const separator = detectCsvSeparator(normalized);

    if (!separator) {
        throw new Error(`Missing required CSV column: ${REQUIRED_COLUMNS[0]}`);
    }

    const rows = parseCsvRows(normalized, separator);

    if (rows.length === 0) {
        throw new Error('CSV file is empty');
    }

    const headers = rows[0].map(header => header.trim());

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

    for (const lang of getAvailableLanguages()) {
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

function isGroupRow(row) {
    return (row.hash || '').trim() === GROUP_ROW_HASH;
}

function collectKnownGroupNames(entry) {
    const names = new Set();

    for (const group of entry.groups ?? []) {
        if (group?.name) {
            names.add(group.name);
        }
    }

    for (const variable of entry.data ?? []) {
        if (variable?.group) {
            names.add(variable.group);
        }
    }

    return names;
}

function findOrCreateGroup(entry, groupName) {
    if (!Array.isArray(entry.groups)) {
        entry.groups = [];
    }

    const existing = entry.groups.find(group => group.name === groupName);
    if (existing) {
        return existing;
    }

    const nextSort = Math.max(0, ...entry.groups.map(group => group.sort ?? 0)) + 10;
    const group = { name: groupName, sort: nextSort };
    entry.groups.push(group);
    return group;
}

function applyImportedGroupFields(group, row) {
    const translations = {};

    for (const lang of getAvailableLanguages()) {
        const nameValue = (row[`name_${lang}`] || '').trim();
        if (nameValue) {
            translations[lang] = nameValue;
        }
    }

    group.translations = Object.keys(translations).length > 0 ? translations : undefined;
}

function importSeramiTranslationsFromCsv(sourceEntry, csvContent) {
    const csvRows = parseCsvContent(csvContent);
    const entry = {
        key: sourceEntry.key,
        name: sourceEntry.name,
        data: JSON.parse(JSON.stringify(sourceEntry.data || [])),
        groups: sourceEntry.groups ? JSON.parse(JSON.stringify(sourceEntry.groups)) : null,
    };
    const variablesBySanitizedName = new Map();
    const knownGroupNames = collectKnownGroupNames(entry);

    for (const variable of entry.data) {
        if (variable.sanitizedName) {
            variablesBySanitizedName.set(variable.sanitizedName, variable);
        }
    }

    const skippedCsvRows = [];
    let matched = 0;

    for (const row of csvRows) {
        if (isGroupRow(row)) {
            const groupName = (row.sanitizedName || row.name || '').trim();
            if (!groupName) {
                skippedCsvRows.push({ sanitizedName: '', reason: 'Missing group name' });
                continue;
            }

            if (!knownGroupNames.has(groupName)) {
                skippedCsvRows.push({ sanitizedName: groupName, reason: 'Group not found in configuration' });
                continue;
            }

            const group = findOrCreateGroup(entry, groupName);
            applyImportedGroupFields(group, row);
            matched++;
            continue;
        }

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
        entry,
        matched,
        skippedCsvRows,
        totalCsvRows: csvRows.length,
    };
}

module.exports = {
    buildSeramiTranslationsCsv,
    buildExportFilename,
    importSeramiTranslationsFromCsv,
    parseCsvContent,
};
