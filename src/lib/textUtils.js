export const normalizeText = (str) => {
    if (!str) return ''
    return str
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
}
