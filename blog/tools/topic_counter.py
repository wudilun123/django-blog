from django.core.cache import cache
from django_redis import get_redis_connection


def view_counter(topic_id):
    """
    记录文章总浏览量的同时，记录文章浏览量增量以实现浏览量排行和增量写入mysql
    :param topic_id:
    :return:view_num:文章总浏览量
    """
    r = get_redis_connection()
    view_num_key = 'topic_%s_view_num' % (topic_id)
    hot_view_key = 'hot_topic_view_num'  # 通过zset记录浏览量增量
    r.incr(view_num_key)
    r.zincrby(hot_view_key, 1, view_num_key)
    view_num = int(r.get(view_num_key))
    print(view_num)
    if  view_num > 9999: view_num = '9999+'
    return view_num
