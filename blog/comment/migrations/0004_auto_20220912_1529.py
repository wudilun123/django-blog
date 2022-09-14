# Generated by Django 3.2.9 on 2022-09-12 15:29

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('comment', '0003_alter_comment_parrent_id'),
    ]

    operations = [
        migrations.AlterField(
            model_name='comment',
            name='content',
            field=models.CharField(max_length=100, verbose_name='评论内容'),
        ),
        migrations.AlterField(
            model_name='comment',
            name='parrent_id',
            field=models.IntegerField(default=0, null=True, verbose_name='回复的评论id'),
        ),
    ]