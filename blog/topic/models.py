from django.db import models
from user.models import UserProfile


# Create your models here.

class Category(models.Model):
    category = models.CharField(max_length=15, default='default', verbose_name='文章分类')
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    created_time = models.DateTimeField(auto_now_add=True)
    updated_time = models.DateTimeField(auto_now=True)


class Topic(models.Model):
    title = models.CharField(max_length=20, verbose_name='文章标题')
    category = models.ForeignKey(Category,null=True, on_delete=models.SET_NULL)
    limit = models.BooleanField(verbose_name="文章权限") #true为公共，false为私有
    introduce = models.CharField(max_length=30, verbose_name='文章简介')
    content = models.TextField(verbose_name="文章内容'")
    created_time = models.DateTimeField(auto_now_add=True)
    updated_time = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
