const AVAILABLE_LANGUAGES = ['it', 'en', 'fr'];

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
    const separator = ';';
    const body = rows
        .map(row => row.map(escapeCsvField).join(separator))
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

module.exports = {
    AVAILABLE_LANGUAGES,
    buildSeramiTranslationsCsv,
    buildExportFilename,
};
