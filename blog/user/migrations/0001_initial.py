# Generated by Django 3.2.9 on 2022-08-18 21:28

from django.db import migrations, models
import user.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='UserProfile',
            fields=[
                ('username', models.CharField(max_length=11, primary_key=True, serialize=False, verbose_name='用户名')),
                ('nickname', models.CharField(max_length=30, unique=True, verbose_name='昵称')),
                ('password', models.CharField(max_length=32)),
                ('email', models.EmailField(max_length=254, verbose_name='邮箱')),
                ('phone', models.CharField(max_length=11, verbose_name='手机号')),
                ('avatar', models.ImageField(null=True, upload_to='avatar')),
                ('sign', models.CharField(default=user.models.get_default_sign, max_length=50, verbose_name='个人签名')),
                ('info', models.CharField(default='', max_length=150, verbose_name='个人简介')),
                ('created_time', models.DateTimeField(auto_now_add=True)),
                ('updated_time', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'user_user_profile',
            },
        ),
    ]