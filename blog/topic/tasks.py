import re
import time

from django.core.cache import cache

from blog.celery import app
from django_redis import get_redis_connection
from .models import TopicViewNum, Topic, TopicThumbsUpNum, TopicThumbsUpUser


@app.task
def save_view_num():
    """
    定时将文章浏览量增量写入mysql中
    :return:
    """
    r = get_redis_connection()
    hot_view_key = 'hot_topic_view_num'
    zset = r.zrange(hot_view_key, 0, -1, withscores=True)
    r.delete(hot_view_key)
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
            # 增量更新并从mysql恢复到redis中
            r.set(view_num_key, sum)
            topic_view_num.count = sum
        else:
            view_num = int(view_num)
            if sum < view_num:
                # 从redis备份到mysql中
                topic_view_num.count = view_num
            else:
                # 增量更新并从mysql恢复到redis中
                r.set(view_num_key, sum)
                topic_view_num.count = sum
        topic_view_num.save()


@app.task
def recover_thumbs_up_user(zset_key, topic_id):
    # 从mysql中恢复对应文章的用户点赞状态到redis中
    r = get_redis_connection()
    items = TopicThumbsUpUser.objects.filter(topic_id=topic_id)
    dict = {}
    for item in items:
        dict[item.user.username + '_status_1'] = item.created_time.timestamp()
    r.zadd(zset_key, dict)


def save_thumbs_up_user(topic_id):
    """
    将每篇文章的用户点赞情况增量写入mysql中
    :param topic_id: 文章id
    :return:
    """
    r = get_redis_connection()
    thumbs_up_user_zset_key = 'topic_%s_thumbs_up_user_zset' % (topic_id)
    timestamp = time.time()
    zset = r.zrangebyscore(thumbs_up_user_zset_key, timestamp - 3600 * 2 - 60,
                           timestamp)  # 筛选出指定时间段(2h)内的增量数据，60s是冗余时间来避免忽略一些临近任务执行的数据
    for z in zset:
        z = z.decode()
        groups = re.search('(.+)_status_(\d)', z).groups()
        username = groups[0]
        status = int(groups[1])
        try:
            item = TopicThumbsUpUser.objects.get(user_id=username, topic_id=topic_id)
        except:
            if status:
                # 从redis备份写入mysql
                TopicThumbsUpUser.objects.create(user_id=username, topic_id=topic_id)
            else:
                # 删除zset对应member
                r.zrem(thumbs_up_user_zset_key, z)
        else:
            if not status:
                # 删除zset对应member并删除mysql中记录
                r.zrem(thumbs_up_user_zset_key, z)
                try:
                    item.delete()
                except:
                    pass  # 缺少处理


@app.task
def save_thumbs_up_num():
    """
    定时将文章点赞量增量和文章的用户点赞情况写入mysql中
    :return:
    """
    r = get_redis_connection()
    hot_thumbs_up_key = 'hot_topic_thumbs_up_num'
    zset = r.zrange(hot_thumbs_up_key, 0, -1, withscores=True)
    r.delete(hot_thumbs_up_key)
    for z in zset:
        thumbs_up_num_key = z[0].decode()
        increment = int(z[1])
        topic_id = re.search('topic_([\d]+)_thumbs_up_num', thumbs_up_num_key).groups()[0]
        thumbs_up_num = r.get(thumbs_up_num_key)
        try:
            topic_thumbs_up_num = TopicThumbsUpNum.objects.get(topic_id=topic_id)
        except:
            topic_thumbs_up_num = TopicThumbsUpNum.objects.create(topic_id=topic_id, count=0)
        sum = topic_thumbs_up_num.count + increment
        if thumbs_up_num is None:
            # 增量更新并从mysql恢复到redis中
            r.set(thumbs_up_num_key, sum)
            topic_thumbs_up_num.count = sum
        else:
            thumbs_up_num = int(thumbs_up_num)
            if sum < thumbs_up_num:
                # 从redis备份到mysql中
                topic_thumbs_up_num.count = thumbs_up_num
            else:
                # 增量更新并从mysql恢复到redis中
                r.set(thumbs_up_num_key, sum)
                topic_thumbs_up_num.count = sum
        topic_thumbs_up_num.save()
        save_thumbs_up_user(topic_id)  # 对有更改的文章进行更新点赞用户表的操作


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
