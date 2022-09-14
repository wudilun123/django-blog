export function loadAuthorCard(username) {
    //根据传入的username加载对应作者的卡片
    const defaultAvatarUrl = "/static/image/测试头像.png";//默认头像
    const authorAvatar = document.querySelector('#author-avatar');
    const authorNickname = document.querySelector('#author-nickname');
    const authorSign = document.querySelector('#author-sign');
    const authorAbout = document.querySelector('#author-about');
    const authorList = document.querySelector('#author-list');
    (async () => {
        const baseUrl = 'http://127.0.0.1:8000';
        const response = await fetch(baseUrl + `/v1/users/info/${username}/`);
        if (response.status != 200) throw new Error();
        const jsonResponse = await response.json();
        if (jsonResponse.code == 200) {
            //只有请求成功才加载数据，其余情况保持默认样式
            const nickname = jsonResponse.data.nickname;
            const avatar = jsonResponse.data.avatar;
            const sign = jsonResponse.data.sign;

            if (avatar) authorAvatar.src = baseUrl + '/media/' + avatar;
            else authorAvatar.src = defaultAvatarUrl;//用户设置了头像就加载对应URL，反之加载默认头像
            authorSign.textContent = '个性签名: ' + sign;
            authorNickname.textContent = nickname;
            authorAbout.onclick = () => window.location.href = `/${username}/info/`;
            authorList.onclick = () => window.location.href = `/${username}/topics/`;
        }
        else throw new Error();
    })().catch(function (error) {
        authorNickname.textContent = '信息获取失败';
        authorNickname.style.color = 'red';
    });

}