import base64
import datetime
import hashlib
import json

import requests


class SMS():
    # 基于云通讯平台https://doc.yuntongxun.com/pe/5a533de33b8496dd00dce07c
    base_url = 'https://app.cloopen.com:8883'

    def __init__(self, accountSid, accountToken, appId, templateId):
        self.accountSid = accountSid
        self.accountToken = accountToken
        self.appId = appId
        self.templateId = templateId

    def get_request_url(self, sig):
        self.url = self.base_url + '/2013-12-26/Accounts/%s/SMS/TemplateSMS?sig=%s' % (self.accountSid, sig)
        return self.url

    def get_timestamp(self):
        return datetime.datetime.now().strftime('%Y%m%d%H%M%S')

    def get_sig(self, timestamp):
        s = self.accountSid + self.accountToken + timestamp
        m = hashlib.md5()
        m.update(s.encode())
        return m.hexdigest().upper()

    def get_request_header(self, timestamp):
        s = self.accountSid + ':' + timestamp
        auth = base64.b64encode(s.encode()).decode()
        return {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': auth,
        }

    def get_request_body(self, phone, code):
        return {
            'to': phone,
            'appId': self.appId,
            'templateId': self.templateId,
            'datas': [code, '1'],
        }

    def request_api(self, url, header, body):
        resp = requests.post(url, headers=header, data=body)
        return resp.text

    def run(self, phone, code):
        #发送短信并以json对象的形式返回响应体
        timestamp = self.get_timestamp()
        sig = self.get_sig(timestamp)
        url = self.get_request_url(sig)
        header = self.get_request_header(timestamp)
        body = self.get_request_body(phone, code)
        resp = self.request_api(url, header, json.dumps(body))
        return json.loads(resp)


if __name__ == '__main__':
    config = {
        'accountSid': '8a216da882d55db10182ef30e0dc0544',
        'accountToken': '048e14950ea14fc192f22b7d36a6c4a7',
        'appId': '8a216da882d55db10182ef30e1e2054b',
        'templateId':'1',
    }
    test=SMS(**config)
    print(test.run('13269907099','666666'))
