import time

from django.core.cache import cache
from django_redis import get_redis_connection

from topic.models import TopicThumbsUpUser
from topic.tasks import recover_thumbs_up_user


def view_counter(topic_id):
    """
    记录文章总浏览量的同时，记录文章浏览量增量以实现浏览量排行和增量写入mysql
    :param topic_id:文章id
    :return:view_num:文章总浏览量
    """
    r = get_redis_connection()
    view_num_key = 'topic_%s_view_num' % (topic_id)
    hot_view_key = 'hot_topic_view_num'  # 通过zset记录浏览量增量
    r.incr(view_num_key)
    r.zincrby(hot_view_key, 1, view_num_key)
    view_num = int(r.get(view_num_key))
    if view_num > 9999:
        view_num = '9999+'
    return view_num


def return_thumbs_up_count(topic_id):
    r = get_redis_connection()
    thumbs_up_num_key = 'topic_%s_thumbs_up_num' % (topic_id)
    thumbs_up_num = r.get(thumbs_up_num_key)
    thumbs_up_num = 0 if thumbs_up_num is None else int(thumbs_up_num)
    print(thumbs_up_num)
    if thumbs_up_num > 9999:
        thumbs_up_num = '9999+'
    return thumbs_up_num


def return_is_thumbed(topic_id, username):
    r = get_redis_connection()
    thumbs_up_user_zset_key = 'topic_%s_thumbs_up_user_zset' % (topic_id)  # 通过zset记录每篇文章的点赞用户及时间戳以实现增量写入mysql
    if r.zrank(thumbs_up_user_zset_key, username + '_status_1') is not None:
        return True
    return False


def thumbs_up_counter(topic_id, username):
    """
    记录文章总点赞量，点赞量增量和文章对应的点赞用户情况
    :param topic_id:文章id
    :param username:点赞用户名
    :return is_thumbed:用户进行点赞操作前的点赞情况,True代表用户已点赞，此次操作是取消点赞
    """
    r = get_redis_connection()
    lock_key = 'lock_%s_thumbs_up' % (username)  # 对每个用户的点赞操作加锁
    thumbs_up_num_key = 'topic_%s_thumbs_up_num' % (topic_id)
    hot_thumbs_up_key = 'hot_topic_thumbs_up_num'  # 通过zset记录浏览量增量
    thumbs_up_user_zset_key = 'topic_%s_thumbs_up_user_zset' % (topic_id)  # 通过zset记录每篇文章的点赞用户及时间戳以实现增量写入mysql
    is_thumbed = False
    while True:
        # 循环获取锁，设置锁的ttl为1秒，锁可用返回True,不可用返回None
        if r.set(lock_key, 1, nx=True, ex=1):
            # 获取到锁
            if not r.exists(thumbs_up_user_zset_key):
                items = TopicThumbsUpUser.objects.filter(topic_id=topic_id)
                if not items:
                    # 第一次点赞
                    r.zadd(thumbs_up_user_zset_key, {username + '_status_1': time.time()})
                    r.incr(thumbs_up_num_key)
                    r.zincrby(hot_thumbs_up_key, 1, thumbs_up_num_key)
                else:
                    recover_thumbs_up_user.delay(thumbs_up_user_zset_key, topic_id)  # 从mysql中恢复
            else:
                if r.zrank(thumbs_up_user_zset_key, username + '_status_1') is not None:
                    # 用户已点赞
                    r.zrem(thumbs_up_user_zset_key, username + '_status_1')
                    r.zadd(thumbs_up_user_zset_key, {username + '_status_0': time.time()})
                    r.decr(thumbs_up_num_key)
                    r.zincrby(hot_thumbs_up_key, -1, thumbs_up_num_key)
                    is_thumbed = True
                else:
                    # 用户未点赞
                    r.zrem(thumbs_up_user_zset_key, username + '_status_0')
                    r.zadd(thumbs_up_user_zset_key, {username + '_status_1': time.time()})
                    r.incr(thumbs_up_num_key)
                    r.zincrby(hot_thumbs_up_key, 1, thumbs_up_num_key)
            r.delete(lock_key)  # 释放锁
            break
        else:
            # 休眠50毫秒后再尝试获取锁
            time.sleep(0.05)
    return is_thumbed
