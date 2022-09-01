from django.conf import settings
from blog.celery import app
from tools.sms import SMS
from django.core.cache import cache


@app.task
def send_sms(phone, code):
    sms = SMS(**settings.SMS_CONFIG)
    res = sms.run(phone, code)
    return res
