module.exports = {
    get(name, datas = '') {
        if (!datas) {
            return ''
        }
        const reg = new RegExp(`(^| )${name}=([^;]*)(;|$)`)
        let arr = datas.match(reg)
        if (arr && arr[2]) {
            return unescape(arr[2])
        }
        return ''
    }
}