# Generated by Django 3.2.9 on 2022-09-12 15:28

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('comment', '0002_rename_parrent_comment_comment_parrent_id'),
    ]

    operations = [
        migrations.AlterField(
            model_name='comment',
            name='parrent_id',
            field=models.IntegerField(default=0, null=True, verbose_name='回复的留言id'),
        ),
    ]
