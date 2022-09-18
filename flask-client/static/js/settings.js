export const blankStrRegexp = /^\s*$/;//纯空白字符串的正则,JS把' '这样的字符串也视为true
// export const baseUrl = 'http://47.94.166.251';
export const baseUrl = 'http://127.0.0.1:8000';
export const defaultAvatarUrl = "/static/image/defaultAvatar.png";//默认头像


export class HttpError extends Error {
    constructor(message, status) {
        super(message);
        this.name = "HttpError";
        this.status = status;
    }
}