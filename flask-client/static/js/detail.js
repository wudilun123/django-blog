'use strict'

import { MyAlert } from './myAlert.js'
import { loadAuthorCard } from './author-card.js'

const blankStrRegexp = /^\s*$/;
const baseUrl = 'http://127.0.0.1:8000';
const username = localStorage.getItem('username');//当前登录用户
const token = localStorage.getItem('blogToken');
const myAlert = new MyAlert();
const visitedUsername = window.location.href.match(/\/([^\/]+)\/topics\/detail/)[1];//当前页面所属用户
const topicId = window.location.href.match(/\/*\/topics\/detail\/([^\/]+)/)[1];//页面对应文章id
const E = window.wangEditor;
const commentUrl = new URL(baseUrl + `/v1/comments/${topicId}/`);
const topicUrl = new URL(baseUrl + `/v1/topics/${visitedUsername}/`);
const defaultAvatarUrl = "/static/image/测试头像.png";//默认头像

topicUrl.searchParams.set('topic_id', topicId);

class HttpError extends Error {
    constructor(message, status) {
        super(message);
        this.name = "HttpError";
        this.status = status;
    }
}

// 标题 DOM 容器
const headerContainer = document.getElementById('header-container');
headerContainer.addEventListener('click', event => {
    if (event.target.tagName !== 'LI') return;
    event.preventDefault();
    const id = event.target.dataset.id;
    // editor.scrollToElem(id);// 滚动到标题
    //用自己实现的scroll代替
    const textArea = document.querySelector('#editor-text-area');
    const top = textArea.querySelector(`#${id}`).getBoundingClientRect().top + window.pageYOffset
        - document.documentElement.offsetHeight * 0.10 - 30; //元素的滚动高度-导航栏高度-30px
    window.scrollTo({ top: top, behavior: 'smooth' });
})

//以只读方式创建文章的富文本编辑器
const editorConfig = {
    onChange(editor) {
        //实现菜单
        const headers = editor.getElemsByTypePrefix('header');
        headerContainer.innerHTML = headers.map(header => {
            const text = window.wangEditor.SlateNode.string(header);
            const { id, type } = header;
            return `<li data-id="${id}" type="${type}">${text}</li>`;
        }).join('');
    },
    MENU_CONF: {},
    maxLength: 10000,
    readOnly: true,
}
const editor = E.createEditor({
    selector: '#editor-text-area',
    config: editorConfig,
    mode: 'default', // or 'simple'
})

//回到页面顶部
const arrowUp = document.querySelector('.fa-arrow-circle-o-up');
arrowUp.onclick = function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
};
window.addEventListener('scroll', function () {
    if (pageYOffset > document.documentElement.clientHeight) {
        arrowUp.style.display = 'inline';
    } else {
        arrowUp.style.display = 'none';
    }
});

document.addEventListener('selectstart', function (event) {
    //禁止选择
    const elem = event.target;
    const editorTextContainers = document.querySelectorAll('.w-e-text-container')
    if (elem.tagName == 'INPUT') return;
    if (Array.from(editorTextContainers).find(e => e.contains(elem))) return;
    event.preventDefault();
});

loadPage();

function loadPage() {
    (async () => {
        const response = await fetch(topicUrl, {
            headers: {
                authorization: token
            },
        });
        if (response.status != 200) throw new HttpError("Http error", response.status);
        const jsonResponse = await response.json();
        switch (jsonResponse.code) {
            case 200:
                loadTopic(jsonResponse);
                loadAuthorCard(visitedUsername);
                loadCommentArea();
                break;
            default:
                myAlert.showAlert(jsonResponse.error);
        }
    })().catch(function (error) {
        console.log(error);
        if (error instanceof TypeError) {
            myAlert.showAlert("您的网络出了一些问题，请求未成功发送！");
        } else if (error instanceof HttpError) {
            myAlert.showAlert(`请求错误，响应码：${error.status}`)
        } else {
            myAlert.showAlert(`出现了一些未知问题！${error}`);
        }
    });

}

function loadTopic(jsonResponse) {
    //加载文章数据填充页面
    const isSameUser = jsonResponse.data.is_same_user;
    const author = jsonResponse.data.author;
    const title = jsonResponse.data.title;
    const limit = jsonResponse.data.limit;
    const category = jsonResponse.data.category;
    const createdTime = jsonResponse.data.created_time;
    const updatedTime = jsonResponse.data.updated_time;
    const viewNum = jsonResponse.data.view_num;
    const content = jsonResponse.data.content;

    const topicAuthor = document.querySelector('.topic-author-info')
    const topicLimit = document.querySelector('.topic-limit-info');
    const topicCategory = document.querySelector('.topic-category-info');
    const topicCreatedTime = document.querySelector('.topic-created-time-info');
    const topicUpdatedTime = document.querySelector('.topic-updated-time-info');
    const topicViewCount = document.querySelector('.topic-view-count');
    const topicThumbsUpCount = document.querySelector('.topic-thumbs-up-count');

    if (isSameUser) {
        //作者本人访问增加一个修改文章的导航按钮
        const updateButton = document.querySelector('#update-button');
        updateButton.hidden = false;
        updateButton.onclick = () => window.location.href = `/${username}/topics/update/${topicId}/`;
    }

    document.querySelector('#info-container h1').textContent = title;
    topicAuthor.innerHTML = `<i class="fa fa-user-o" aria-hidden="true"></i> `;//i标签后边跟着的空格保证生成一个文本节点
    topicAuthor.lastChild.data = ` 作者:${author}`; //安全插入文本
    topicLimit.innerHTML = `<i class="fa fa-unlock-alt" aria-hidden="true"></i> `;
    topicLimit.lastChild.data = ` 权限:${limit}`;
    topicCategory.innerHTML = `<i class="fa fa-tag"aria-hidden="true"></i> `;
    topicCategory.lastChild.data = ` 分类:${category}`;

    const createdDate = new Date(createdTime * 1000); //python时间戳是秒为单位，换算成毫秒
    topicCreatedTime.innerHTML = `<i class="fa fa-calendar"aria-hidden="true">
            </i> 发表于:${createdDate.getFullYear()}/${createdDate.getMonth() + 1}/${createdDate.getDate()}
             ${createdDate.getHours()}:${createdDate.getMinutes()}`;
    const updatedDate = new Date(updatedTime * 1000); //python时间戳是秒为单位，换算成毫秒
    topicUpdatedTime.innerHTML = `<i class="fa fa-clock-o" aria-hidden="true"></i> 修改于:${updatedDate.getFullYear()}/${updatedDate.getMonth() + 1}/${updatedDate.getDate()}
             ${updatedDate.getHours()}:${updatedDate.getMinutes()}`;
    topicViewCount.innerHTML = `<i class="fa fa-eye" aria-hidden="true"></i> 浏览量:${viewNum}`;

    //过滤敏感标签
    const xssOption = {
        //使用默认标签白名单
        onTag: function (tag, html, options) {
            //禁止使用视频元素
            if (tag === 'video') return '';
        },
        onIgnoreTagAttr: function (tag, name, value, isWhiteAttr) {
            //对不在默认属性白名单的属性进行过滤
            if (name.substr(0, 5) === "data-") {
                if (value !== 'video') {
                    //删除wangEditor自带的视频元素
                    return name + '="' + filterXSS.escapeAttrValue(value) + '"';
                }
            } else if (name === 'class' || name === 'style') {
                //允许使用class和style属性
                return name + '="' + filterXSS.escapeAttrValue(value) + '"';
            }
        },
        //style属性使用默认css白名单即可
        // css: false,
        stripIgnoreTagBody: ['script', 'iframe', 'source'],//对这些标签直接删除
    }
    const myXss = new filterXSS.FilterXSS(xssOption);
    editor.setHtml(myXss.process(content));
}

function loadCommentArea() {

    const commentList = document.querySelector('#comment-list');
    const commentTextarea = document.querySelector('#comment-textarea');
    const commentSend = document.querySelector('#comment-send');
    const commentBanned = document.querySelector('#comment-banned');

    //评论的富文本编辑器配置
    const commentEditorConfig = {
        maxLength: 100,
        // readOnly: true,
        placeholder: '在此输入，不超过100个字符(过多换行符可能导致超出长度限制)',
        autoFocus: false,
    }
    const commentToolbarConfig = {};
    commentToolbarConfig.toolbarKeys = [
        'emotion',
    ]
    let commentEditor;
    let commentToolbar;

    //回复的富文本编辑器配置
    const replyEditorConfig = {
        maxLength: 100,
        placeholder: '在此输入，不超过100个字符(过多换行符可能导致超出长度限制)',
    }
    const replyToolbarConfig = {};
    replyToolbarConfig.toolbarKeys = [
        'emotion',
    ]
    let replyEditor;
    let replyToolbar;

    if (!token) {
        //未登录则不显示评论区富文本编辑器
        localStorage.removeItem('username');
        commentBanned.style.display = 'flex';
        commentBanned.querySelector('a').href = `/login-reg/?next=${window.location.href}`;
    }
    else {
        //加载评论区富文本编辑器,为评论发送按钮添加事件
        commentSend.hidden = false;

        commentEditor = E.createEditor({
            selector: '#comment-textarea',
            config: commentEditorConfig,
            mode: 'simple',
        })
        commentToolbar = E.createToolbar({
            editor: commentEditor,
            selector: '#comment-emoji',
            config: commentToolbarConfig,
            mode: 'simple',
        })

        const commentSendButton = document.querySelector('#comment-send-button');
        commentSendButton.onclick = () => {
            commentSendButton.disabled = true;
            sendComment().catch(function (error) {
                console.log(error);
                myAlert.showAlert('评论发表失败！');
            }).then(() => commentSendButton.disabled = false);
        }
    }

    loadCommentData();

    commentList.addEventListener('click', function (event) {
        const elem = event.target;
        if (elem.matches('.onoff-reply-send')) {
            //点击回复创建/销毁回复的富文本编辑器
            if (!token) {
                localStorage.removeItem('username');
                myAlert.showAlert('请先登录后再进行评论！', () => window.location.href = `/login-reg/?next=${window.location.href}`);
                return;
            }
            const commentItem = elem.closest('.comment-item');
            const replyList = commentItem.querySelector('.reply-list');
            let replySend = document.querySelector('#reply-send');
            if (replySend) {
                //对应节点和富文本编辑器已经被创建出来
                if (replyList.contains(replySend)) {
                    //再次点击回复则取消富文本编辑器的显示
                    replySend.remove();
                } else {
                    replyList.prepend(replySend);
                    replyEditor.setHtml('');
                    replyEditor.focus();
                }
            } else {
                //创建对应节点
                replySend = document.createElement('div');
                replySend.id = 'reply-send';
                replySend.innerHTML = `
                <div id="reply-textarea"></div>
                <div id="reply-emoji"></div>
                <button id="reply-send-button">发送</button>
                `
                replyList.prepend(replySend);

                //创建回复的富文本编辑器
                replyEditor = E.createEditor({
                    selector: '#reply-textarea',
                    config: replyEditorConfig,
                    mode: 'simple',
                })
                replyToolbar = E.createToolbar({
                    editor: replyEditor,
                    selector: '#reply-emoji',
                    config: replyToolbarConfig,
                    mode: 'simple',
                })
            }

        } else if (elem.matches('#reply-send-button')) {
            elem.disabled = true;
            //在回复所属的评论项中拿到parrentId
            const parrentId = elem.closest('.comment-item').dataset.commentId;
            sendComment(parrentId).catch(function (error) {
                console.log(error);
                myAlert.showAlert('评论发表失败！');
            }).then(() => elem.disabled = false);
        }
    })

    async function sendComment(parrentId = null) {
        //带有参数parrentId为回复，否则为评论
        const data = {};
        if (parrentId) {
            data.parrentId = parrentId;
            data.content = replyEditor.getText();
        } else {
            data.content = commentEditor.getText();
        }
        if (blankStrRegexp.test(data.content)) {
            //检查空白评论
            myAlert.showAlert('评论内容不能为空！');
            return;
        }
        const response = await fetch(commentUrl, {
            method: 'POST',
            headers: {
                authorization: token,
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(data),
        });
        if (response.status != 200) throw new HttpError("Http error", response.status);
        const jsonResponse = await response.json();
        switch (jsonResponse.code) {
            case 200:
                //及时加载评论
                myAlert.showAlert('评论发表成功！', () => window.location.href = window.location.href);
                break;
            case 403:
                myAlert.showAlert('请登录！', () => {
                    localStorage.removeItem('blogToken');
                    localStorage.removeItem('username');
                    window.location.href = `/login-reg/?next=${window.location.href}`
                });
                break;
            default:
                myAlert.showAlert(jsonResponse.error);
        }
    }

}

function loadCommentData() {
    //加载评论区数据
    (async () => {
        const response = await fetch(commentUrl);
        if (response.status != 200) throw new HttpError("Http error", response.status);
        const jsonResponse = await response.json();
        switch (jsonResponse.code) {
            case 200:
                handleCommentData(jsonResponse);
                break;
            default:
                throw new Error(jsonResponse.error);
        }
    })().catch(function (error) {
        console.log(error);
        myAlert.showAlert('评论加载失败！');
    });

    function handleCommentData(jsonResponse) {
        const commentArray = jsonResponse.data.comment_list;
        const commentCount = document.querySelector('#comment-count');
        commentCount.textContent = `共计 ${jsonResponse.data.comment_count} 条评论`;
        let count = 1;
        for (let comment of commentArray) {
            let commentItem = document.createElement('div');
            commentItem.classList.add('comment-item');
            commentItem.setAttribute('data-comment-id', comment.id);//用特性存储评论id
            commentItem.innerHTML = `
            <img class="comment-user-avatar"></img>
            <div class="comment-user"><a target="_blank"></a><span class="onoff-reply-send">回复</span> </div>
            <div class="comment-info"></div>
            <p class="comment-content"></p>
            <div class="reply-list"></div>
            `
            commentCount.after(commentItem)
            //加载头像
            if (comment.publisher_avatar) commentItem.querySelector('.comment-user-avatar').src = baseUrl + '/media/' + comment.publisher_avatar;
            else commentItem.querySelector('.comment-user-avatar').src = defaultAvatarUrl;
            //加载用户名和对应超链接
            const a = commentItem.querySelector('.comment-user a');
            a.href = `/${comment.publisher_username}/info/`;
            a.textContent = `${comment.publisher_nickname}`;
            //加载评论信息(创建时间,次序等)
            const createdDate = new Date(comment.created_time * 1000)
            commentItem.querySelector('.comment-info').textContent = `#${count++} 发表于: ${createdDate.getFullYear()}/${createdDate.getMonth() + 1}/${createdDate.getDate()}
            ${createdDate.getHours()}:${createdDate.getMinutes()}`;
            //加载评论内容
            commentItem.querySelector('.comment-content').textContent = comment.content;
            //加载回复
            for (let reply of comment.reply) {
                const replyList = commentItem.querySelector('.reply-list');
                let replyItem = document.createElement('div');
                replyItem.classList.add('reply-item');
                replyItem.setAttribute('data-reply-id', reply.id);//用特性存储评论id
                replyItem.innerHTML = `
                <img class="reply-user-avatar"></img>
                <div class="reply-user"><a target="_blank"></a></div>
                <div class="reply-info"></div>
                <p class="reply-content"></p>
                `
                replyList.append(replyItem);
                //加载头像
                if (reply.publisher_avatar) replyItem.querySelector('.reply-user-avatar').src = baseUrl + '/media/' + reply.publisher_avatar;
                else replyItem.querySelector('.reply-user-avatar').src = defaultAvatarUrl;
                //加载用户名和对应超链接
                const a = replyItem.querySelector('.reply-user a');
                a.href = `/${reply.publisher_username}/info/`;
                a.textContent = `${reply.publisher_nickname}`;
                //加载评论信息(创建时间,次序等)
                const createdDate = new Date(reply.created_time * 1000)
                replyItem.querySelector('.reply-info').textContent = `回复于: ${createdDate.getFullYear()}/${createdDate.getMonth() + 1}/${createdDate.getDate()}
                ${createdDate.getHours()}:${createdDate.getMinutes()}`;
                //加载评论内容
                replyItem.querySelector('.reply-content').textContent = reply.content;
            }
        }
    }
}

