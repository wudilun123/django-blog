export class MyConfirm {
    showConfirm(text, confirmCallback = null, cancelCallback = null) {
        //text是输出到屏幕上的文本,限制字符数量为100,confirmCallback是可选的回调函数用于执行点击确定后的工作,点击取消或×可执行可选的cancelCallback函数
        this.confirmContainer = document.createElement('div');
        this.confirmMessage = document.createElement('div');
        this.closeButtonContainer = document.createElement('div');
        this.closeButton = document.createElement('span');
        this.textContainer = document.createElement('div');
        this.confirmText = document.createElement('div');
        this.buttonContainer = document.createElement('div');
        this.confirmButton = document.createElement('button');
        this.calcelButton = document.createElement('button');

        document.body.append(this.confirmContainer);
        this.confirmContainer.append(this.confirmMessage);
        this.confirmMessage.append(this.closeButtonContainer);
        this.confirmMessage.append(this.textContainer);
        this.confirmMessage.append(this.buttonContainer);
        this.closeButtonContainer.append(this.closeButton)
        this.textContainer.append(this.confirmText);
        this.buttonContainer.append(this.confirmButton);
        this.buttonContainer.append(this.calcelButton);

        this.confirmText.textContent = text.slice(0, 100);
        this.closeButton.textContent = '×';
        this.confirmButton.textContent = '确认';
        this.calcelButton.textContent = '取消';

        this.confirmCallback = confirmCallback;
        this.cancelCallback = cancelCallback;

        this.confirmContainer.style.cssText = `    
        position: fixed;
        top:0;
        left: 0;
        z-index: 9999;
        width: 100%;
        height: 100%;
        background-color: rgba(255,255,255,0.3);
        `;
        this.confirmMessage.style.cssText = `
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
        this.confirmText.style.cssText = `
        width: 100%;
        font-size: 18px;
        cursor: default;
        text-align: center;
        word-wrap: break-word;
        white-space:pre-wrap;
        `;
        this.buttonContainer.style.cssText = `
        width: 100%;
        height: 19%;
        display: flex;
        justify-self: center;
        align-items: flex-start;
        justify-content: center;
        gap: 50px;
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
        box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
        `;
        this.calcelButton.style.cssText = `
        width: 70px;
        height: 30px;
        background-color: white;
        border-radius: 5px;
        border: 1px solid black;
        font-size: 15px;
        font-weight: 500;
        color: #FF8066;
        cursor: pointer;
        box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.3);
        `;
        this.confirmContainer.onselectstart = () => false;
        this.confirmContainer.addEventListener('click', this.clearConfirm);
        document.body.style.overflowY = 'hidden';//阻止页面滚动
    }
    clearConfirm = (event) => {
        //使用类字段防止this丢失
        if (event.target == this.confirmButton) {
            this.confirmContainer.onselectstart = null;
            this.confirmContainer.removeEventListener('click', this.clearconfirm);
            this.confirmContainer.remove();
            document.body.style.overflowY = '';
            if (this.confirmCallback) setTimeout(this.confirmCallback, 0);//放到下一个宏任务以便先进行页面渲染
        } else if (event.target == this.closeButton || event.target == this.calcelButton) {
            this.confirmContainer.onselectstart = null;
            this.confirmContainer.removeEventListener('click', this.clearconfirm);
            this.confirmContainer.remove();
            document.body.style.overflowY = '';
            if (this.cancelCallback) setTimeout(this.cancelCallback, 0);
        }
    }
}