# Generated by Django 3.2.9 on 2022-09-12 19:22

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('comment', '0004_auto_20220912_1529'),
    ]

    operations = [
        migrations.AlterField(
            model_name='comment',
            name='content',
            field=models.CharField(max_length=150, verbose_name='评论内容'),
        ),
    ]
