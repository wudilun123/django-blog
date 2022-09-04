from django.db import models
import random


def get_default_sign():
    signs = ['待填充', '666']
    return random.choice(signs)


# Create your models here.
class UserProfile(models.Model):
    username = models.CharField(max_length=11, verbose_name='用户名', primary_key=True)
    nickname = models.CharField(max_length=30, verbose_name='昵称', unique=True)
    password = models.CharField(max_length=32)
    email = models.EmailField(verbose_name='邮箱',db_collation='utf8mb4_bin')
    phone = models.CharField(max_length=11, verbose_name='手机号')
    avatar = models.ImageField(upload_to='avatar', null=True)
    sign = models.CharField(max_length=50, verbose_name='个人签名', default=get_default_sign)
    info = models.CharField(max_length=150, verbose_name='个人简介', default='')
    created_time = models.DateTimeField(auto_now_add=True)
    updated_time = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_user_profile'
