from django.core.cache import cache


def view_counter(author_username,topic_id):
    # 文章浏览量计数,返回当前浏览量
    view_num_key = 'topic_%s_%s_view_num' % (author_username,topic_id)
    if cache.get(view_num_key) is None: return None #键不存在则不做处理
    cache.incr(view_num_key)
    view_num = cache.get(view_num_key)
    if view_num>9999: view_num='9999+'
    return view_num
