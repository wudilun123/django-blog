import re

from django.core.cache import cache

from blog.celery import app
from django_redis import get_redis_connection
from .models import TopicViewNum, Topic


# 用于定时执行的任务
@app.task
def save_view_num():
    """
    定时将文章浏览量增量写入mysql中
    :return:
    """
    r = get_redis_connection()
    hot_view_key = 'hot_topic_view_num'
    zset = r.zrange(hot_view_key, 0, -1, withscores=True)
    for z in zset:
        view_num_key = z[0].decode()
        increment = int(z[1])
        topic_id = re.search('topic_([\d]+)_view_num', view_num_key).groups()[0]
        view_num = r.get(view_num_key)
        try:
            topic_view_num = TopicViewNum.objects.get(topic_id=topic_id)
        except:
            topic_view_num = TopicViewNum.objects.create(topic_id=topic_id, count=0)
        sum = topic_view_num.count + increment
        if view_num is None:
            # 从mysql恢复到redis中
            r.set(view_num_key, sum)
            topic_view_num.count = sum
        else:
            view_num = int(view_num)
            if sum < view_num:
                # 从redis备份到mysql中
                topic_view_num.count = view_num
            else:
                # 从mysql恢复到redis中
                r.set(view_num_key, sum)
                topic_view_num.count = sum
            topic_view_num.save()
    r.delete(hot_view_key)


@app.task
def make_view_top5_list():
    """
    定时生成浏览量前五的榜单并存入缓存
    :return:存入缓存的数据，格式[{'title':xx,'topic_id':xx},]
    """
    r = get_redis_connection()
    hot_view_key = 'hot_topic_view_num'
    zset = r.zrevrange(hot_view_key, 0, 10, withscores=True)  # 权限为私有的文章不显示在榜单上，因而多取一部分
    top5_list = []
    for t in zset:
        view_num_key = t[0].decode()
        topic_id = re.search('topic_([\d]+)_view_num', view_num_key).groups()[0]
        try:
            topic = Topic.objects.get(id=topic_id, limit=True)
        except:
            continue
        top5_list.append({'title': topic.title, 'author': topic.user.username, 'topic_id': topic_id})
        if len(top5_list) == 5: break
    cache.set('view_top5_list', top5_list)
    return cache.get('view_top5_list')


@app.task
def make_last5_list():
    """
    定时生成最新的5篇文章列表并存入缓存
    :return:存入缓存的数据，格式[{'title':xx,'topic_id':xx},]
    """
    last5_set = Topic.objects.filter(limit=True).order_by('-created_time')[0:5]
    last5_list = []
    for topic in last5_set:
        last5_list.append({'title': topic.title, 'author': topic.user.username, 'topic_id': topic.id})
    cache.set('last5_list', last5_list)
    return cache.get('last5_list')
