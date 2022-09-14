from django.db import models
from user.models import UserProfile
from topic.models import Topic
# Create your models here.

class Comment(models.Model):
    #两级评论设计
    content=models.CharField(max_length=150,verbose_name="评论内容")
    parrent_id=models.IntegerField(verbose_name="回复的评论id",null=True,default=0) #为0代表此条为评论
    created_time = models.DateTimeField(auto_now_add=True)
    publisher=models.ForeignKey(UserProfile,on_delete=models.CASCADE)
    topic=models.ForeignKey(Topic,on_delete=models.CASCADE)