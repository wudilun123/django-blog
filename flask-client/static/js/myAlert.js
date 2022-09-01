export class MyAlert {
    showAlert(text, callback = null) {
        //text是输出到屏幕上的文本,限制字符数量为100,callback是可选的回调函数用于执行点击确定后的工作
        this.alertContainer = document.createElement('div');
        this.alertMessage = document.createElement('div');
        this.closeButtonContainer = document.createElement('div');
        this.closeButton = document.createElement('span');
        this.textContainer = document.createElement('div');
        this.alertText = document.createElement('div');
        this.confirmButtonContainer = document.createElement('div');
        this.confirmButton = document.createElement('button');

        document.body.append(this.alertContainer);
        this.alertContainer.append(this.alertMessage);
        this.alertMessage.append(this.closeButtonContainer);
        this.alertMessage.append(this.textContainer);
        this.alertMessage.append(this.confirmButtonContainer);
        this.closeButtonContainer.append(this.closeButton)
        this.textContainer.append(this.alertText);
        this.confirmButtonContainer.append(this.confirmButton);
        this.alertText.textContent = text.slice(0, 100);
        this.closeButton.textContent = '×';
        this.confirmButton.textContent = '确认';

        this.callback = callback;

        this.alertContainer.style.cssText = `    
        position: fixed;
        top:0;
        left: 0;
        z-index: 9999;
        width: 100%;
        height: 100%;
        background-color: rgba(255,255,255,0.3);
        `;
        this.alertMessage.style.cssText = `
        width: 350px;
        height: 250px;
        border: 1px solid rgba(0,0,0,0.2);
        border-radius: 10px;    
        position: absolute;
        top:50%;
        left: 50%;
        transform: translate(-50%,-50%);
        background-color: white;
        box-shadow: 5px 5px 10px rgba(0,0,0,0.7);
        `;
        this.closeButtonContainer.style.cssText = `
        width: 100%;
        height: 16%;
        `;
        this.closeButton.style.cssText = `
        position: absolute;
        right: 8px;
        font-size: 30px;
        cursor: pointer;
        color:rgb(0,0,0);
        `;
        this.textContainer.style.cssText = `
        display: flex;
        width: 100%;
        height: 65%;
        justify-content: center;
        align-items: center;
        overflow: hidden;
        `;
        this.alertText.style.cssText = `
        width: 100%;
        font-size: 18px;
        cursor: default;
        text-align: center;
        word-wrap: break-word;
        `;
        this.confirmButtonContainer.style.cssText = `
        width: 100%;
        height: 19%;
        display: flex;
        justify-self:center;
        align-items: flex-start;
        `;
        this.confirmButton.style.cssText = `
        width: 70px;
        height: 30px;
        background-color:#FF8066;
        border-radius: 5px;
        border: 1px solid black;
        font-size: 15px;
        font-weight: 500;
        color:white;
        cursor: pointer;
        margin-left: 140px;
        box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
        `;
        this.alertContainer.onselectstart = () => false;
        this.alertContainer.addEventListener('click', this.clearAlert);
        document.body.style.overflowY = 'hidden';//阻止页面滚动
    }
    clearAlert = (event) => {
        //使用类字段防止this丢失
        if (event.target == this.closeButton || event.target == this.confirmButton) {
            this.alertContainer.onselectstart = null;
            this.alertContainer.removeEventListener('click', this.clearAlert);
            this.alertContainer.remove();
            document.body.style.overflowY = '';
            if (this.callback) setTimeout(this.callback, 0);//放到下一个宏任务以便先进行页面渲染
        }
    }
}