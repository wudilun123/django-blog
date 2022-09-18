from django.core.cache import cache
from .topic_counter import view_counter


def cache_set(expire):
    def _cache_set(func):
        def wrapper(request, *args, **kwargs):
            # 文章列表和详情页的缓存装饰器
            user = request.logging_user
            visited_username = kwargs['visited_username']
            full_path = request.get_full_path()
            topic_id = request.GET.get('topic_id')
            if topic_id is not None:
                # 文章详情的缓存
                if user is None:
                    # 保证博主自身和其它用户的缓存不同
                    cache_key = 'detail_%s_%s_limited' % (topic_id, full_path)
                elif visited_username != user.username:
                    cache_key = 'detail_%s_%s_limited' % (topic_id, full_path)
                else:
                    cache_key = 'detail_%s_%s_unlimited' % (topic_id, full_path)
            else:
                if user is None:
                    cache_key = 'list_%s_limited' % (full_path)
                elif visited_username != user.username:
                    cache_key = 'list_%s_limited' % (full_path)
                else:
                    cache_key = 'list_%s_unlimited' % (full_path)
            # 检查缓存是否存在，如果有缓存则直接返回缓存结果
            response = cache.get(cache_key)
            if response:
                if topic_id is not None:
                    view_counter(topic_id)  # 有一点小问题，如果在缓存中没有权限访问文章也会增加浏览量
                print('cache in')
                return response
            # 执行视图
            response = func(request, *args, **kwargs)
            # 存储缓存
            cache.set(cache_key, response, expire)
            print('view in')
            return response

        return wrapper

    return _cache_set
