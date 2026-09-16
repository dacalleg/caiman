const LANGUAGE_CODE_PATTERN = /^[a-z]{2}$/;

function getAvailableLanguages() {
    const raw = process.env.AVAILABLE_LANGUAGES;
    if (raw == null || String(raw).trim() === '') {
        return [];
    }

    return String(raw)
        .split(',')
        .map(lang => lang.trim().toLowerCase())
        .filter(lang => lang !== '' && LANGUAGE_CODE_PATTERN.test(lang));
}

module.exports = {
    getAvailableLanguages,
};
