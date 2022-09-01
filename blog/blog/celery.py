from celery import Celery
from django.conf import settings
import os

# 配置临时环境变量与django项目绑定
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'blog.settings')

# celry配置
app = Celery('blog')
app.conf.update(
    broker_url='redis://:@127.0.0.1:6379/2',
    result_backend='redis://:@127.0.0.1:6379/3'
)

# 在应用目录下寻找加载worker函数
app.autodiscover_tasks(settings.INSTALLED_APPS)
