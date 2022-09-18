import json
import re
import time

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from django.utils.decorators import method_decorator
from django.views import View

from tools.cache_decorator import cache_set
from .models import Category, Topic, TopicViewNum, TopicThumbsUpNum
from user.models import UserProfile
from tools.topic_counter import view_counter
from tools.logging_decorator import logging_check, get_logging_user

blank_str_regexp = re.compile("\s*$")  # 空白字符串匹配，包括''和' '


# Create your views here.

def get_hot5_view(request):
    # 返回浏览量前五的相应数据
    if request.method != 'GET':
        return HttpResponse(content='', content_type='text/html', status=405)
    data = cache.get('view_top5_list')
    result = {'code': 200, 'data': data}
    return JsonResponse(result, json_dumps_params={'ensure_ascii': False})


def get_last5_view(request):
    # 返回最新五篇文章的相应数据
    if request.method != 'GET':
        return HttpResponse(content='', content_type='text/html', status=405)
    data = cache.get('last5_list')
    result = {'code': 200, 'data': data}
    return JsonResponse(result, json_dumps_params={'ensure_ascii': False})


class CategoryView(View):
    # 增删改查分类信息

    @method_decorator(logging_check)
    def get(self, request, visited_username):
        # 获取对应用户的文章分类信息
        user = request.logging_user
        if (user.username != visited_username):
            result = {'code': 10600, 'error': '无权限访问！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        try:
            queryset = user.category_set.values('category')
            category = []
            for q in queryset:
                category.append(q['category'])
        except:
            result = {'code': 10601, 'error': '获取分类信息失败！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        result = {'code': 200, 'data': {'category': category}}
        return JsonResponse(result, json_dumps_params={'ensure_ascii': False})

    @method_decorator(logging_check)
    def post(self, request, visited_username):
        # 添加文章分类信息
        user = request.logging_user
        if (user.username != visited_username):
            result = {'code': 10602, 'error': '无权限访问！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        json_str = request.body
        try:
            json_dict = json.loads(json_str)
        except:
            result = {'code': 400, 'error': '数据解析失败！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        category = json_dict.get('category', '')
        if blank_str_regexp.match(category):
            result = {'code': 10603, 'error': '分类名不能为空！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        if len(Category.objects.filter(user=user, category=category)) != 0:
            # 保证每个用户的分类名不重复
            result = {'code': 10604, 'error': '分类名不可重复！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        try:
            Category.objects.create(category=category, user=user)
        except(Exception) as e:
            result = {'code': 10605, 'error': '分类名创建失败！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        result = {'code': 200}
        return JsonResponse(result, json_dumps_params={'ensure_ascii': False})

    @method_decorator(logging_check)
    def put(self, request, visited_username):
        # 更新分类信息
        user = request.logging_user
        if (user.username != visited_username):
            result = {'code': 10620, 'error': '无权限访问！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        json_str = request.body
        try:
            json_dict = json.loads(json_str)
        except:
            result = {'code': 400, 'error': '数据解析失败！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        origin_category = json_dict.get('origin-category', '')
        new_category = json_dict.get('new-category', '')
        if blank_str_regexp.match(origin_category):
            result = {'code': 10621, 'error': '分类名不能为空！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        if (origin_category == 'default'):
            result = {'code': 10622, 'error': '默认分类无法修改！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        try:
            category = Category.objects.get(user=user, category=origin_category)
        except:
            result = {'code': 10623, 'error': '分类名不存在！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        if blank_str_regexp.match(new_category):
            result = {'code': 10624, 'error': '分类名不能为空！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        if len(Category.objects.filter(user=user, category=new_category)) != 0:
            # 保证每个用户的分类名不重复
            result = {'code': 10625, 'error': '分类名不可重复！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        try:
            category.category = new_category
            category.save()
        except(Exception) as e:
            result = {'code': 10626, 'error': '分类名更新失败！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        result = {'code': 200}
        return JsonResponse(result, json_dumps_params={'ensure_ascii': False})

    @method_decorator(logging_check)
    def delete(self, request, visited_username):
        user = request.logging_user
        if (user.username != visited_username):
            result = {'code': 10630, 'error': '无权限访问！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        category = request.GET.get('category', '')
        if blank_str_regexp.match(category):
            result = {'code': 10631, 'error': '分类名不能为空！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        if (category == 'default'):
            result = {'code': 10632, 'error': '默认分类无法修改！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        try:
            category = Category.objects.get(user=user, category=category)
        except:
            result = {'code': 10633, 'error': '分类名不存在！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        try:
            with transaction.atomic():
                # 删除分类的同时把其下文章归为默认分类下
                default_category = Category.objects.get(user=user, category='default')
                category.topic_set.all().update(category=default_category)
                category.delete()
        except:
            result = {'code': 10634, 'error': '分类删除失败！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        result = {'code': 200}
        return JsonResponse(result, json_dumps_params={'ensure_ascii': False})


class TopicView(View):
    # 增删改查文章信息
    @method_decorator(get_logging_user)
    @method_decorator(cache_set(30))
    def get(self, request, visited_username):
        topic_id = request.GET.get('topic_id')
        if topic_id is not None:
            # 返回文章具体内容数据
            result = self.return_topic_content(request, visited_username)
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        else:
            # 返回文章列表数据
            result = self.return_topic_list(request, visited_username)
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})

    @method_decorator(logging_check)
    def post(self, request, visited_username):
        # 提交文章
        result = self.handle_topic_data(request, visited_username)
        return JsonResponse(result, json_dumps_params={'ensure_ascii': False})

    @method_decorator(logging_check)
    def put(self, request, visited_username):
        # 更新文章
        result = self.handle_update_data(request, visited_username)
        return JsonResponse(result, json_dumps_params={'ensure_ascii': False})

    @method_decorator(logging_check)
    def delete(self, request, visited_username):
        # 删除文章
        topic_id = request.GET.get('topic_id')
        user = request.logging_user
        if (user.username != visited_username):
            result = {'code': 10750, 'error': '无权限访问！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        try:
            topic = Topic.objects.get(id=topic_id, user=user)
        except:
            result = {'code': 10751, 'error': '文章不存在！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        try:
            topic.delete()
        except:
            result = {'code': 10752, 'error': '删除文章失败！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        # 清理缓存
        self.clear_topic_caches(request)
        # 删除redis存储的浏览量和点赞数
        view_num_key = 'topic_%s_%s_view_num' % (user.username, topic.id)
        thumbs_up_num_key = 'topic_%s_%s_thumbs_up_num' % (user.username, topic.id)
        cache.delete(view_num_key)
        cache.delete(thumbs_up_num_key)
        result = {'code': 200}
        return JsonResponse(result, json_dumps_params={'ensure_ascii': False})

    def clear_topic_caches(self, request):
        # 使用redis通配符删除文章缓存数据
        path = request.path_info  # 不包含参数的url
        topic_id = request.GET.get('topic_id')
        if topic_id is not None:
            # 删除列表缓存和对应文章的缓存,对应文章的更新和删除
            cache.delete_pattern('list_%s*' % (path))
            cache.delete_pattern('detail_%s_%s*' % (topic_id, path))
        else:
            # 只删除列表缓存
            cache.delete_pattern('list_%s*' % (path))

    def handle_topic_data(self, request, visited_username):
        user = request.logging_user
        if (user.username != visited_username):
            return {'code': 10700, 'error': '无权限访问！'}
        json_str = request.body
        try:
            json_dict = json.loads(json_str)
        except:
            return {'code': 400, 'error': '数据解析失败！'}
        title = json_dict.get('title', '')
        category = json_dict.get('category', '')
        limit = json_dict.get('limit', '')
        introduce = json_dict.get('introduce', '')
        content = json_dict.get('content', '')
        if blank_str_regexp.match(title):
            return {'code': 10701, 'error': '文章标题不能为空！'}
        if blank_str_regexp.match(category):
            return {'code': 10702, 'error': '文章分类不能为空！'}
        if blank_str_regexp.match(limit):
            return {'code': 10703, 'error': '文章权限不能为空！'}
        if blank_str_regexp.match(introduce):
            return {'code': 10704, 'error': '文章简介不能为空！'}
        if blank_str_regexp.match(content):
            return {'code': 10705, 'error': '文章内容不能为空！'}
        try:
            category = Category.objects.get(user=user, category=category)
        except(Exception) as e:
            return {'code': 10706, 'error': '文章分类不存在！'}
        limit = False if limit == 'private' else True
        if len(content) > settings.MAX_TOPIC_CONTENT_LENGTH:
            return {'code': 10707, 'error': '文章长度超出最大限制！'}
        try:
            with transaction.atomic():
                topic = Topic.objects.create(title=title, category=category, limit=limit, introduce=introduce,
                                             content=content,
                                             user=user)
                TopicViewNum.objects.create(topic=topic, count=0)
                TopicThumbsUpNum.objects.create(topic=topic, count=0)
        except(Exception) as e:
            return {'code': 10708, 'error': '文章发表失败！'}
        # 清理缓存
        self.clear_topic_caches(request)
        # 使用redis存储浏览量和点赞数
        view_counter(topic.id)
        # view_num_key = 'topic_%s_view_num' % (user.username, topic.id)
        # thumbs_up_num_key = 'topic_%s_thumbs_up_num' % (user.username, topic.id)
        # cache.set(view_num_key, 0, None)
        # cache.set(thumbs_up_num_key, 0, None)
        return {'code': 200, 'data': {'id': topic.id}}

    def handle_update_data(self, request, visited_username):
        topic_id = request.GET.get('topic_id')
        user = request.logging_user
        if (user.username != visited_username):
            return {'code': 10730, 'error': '无权限访问！'}
        try:
            topic = Topic.objects.get(id=topic_id, user=user)
        except:
            return {'code': 10731, 'error': '文章不存在！'}
        json_str = request.body
        try:
            json_dict = json.loads(json_str)
        except:
            return {'code': 400, 'error': '数据解析失败！'}
        title = json_dict.get('title', '')
        category = json_dict.get('category', '')
        limit = json_dict.get('limit', '')
        introduce = json_dict.get('introduce', '')
        content = json_dict.get('content', '')
        if blank_str_regexp.match(title):
            return {'code': 10732, 'error': '文章标题不能为空！'}
        if blank_str_regexp.match(category):
            return {'code': 10733, 'error': '文章分类不能为空！'}
        if blank_str_regexp.match(limit):
            return {'code': 10734, 'error': '文章权限不能为空！'}
        if blank_str_regexp.match(introduce):
            return {'code': 10735, 'error': '文章简介不能为空！'}
        if blank_str_regexp.match(content):
            return {'code': 10736, 'error': '文章内容不能为空！'}
        try:
            category = Category.objects.get(user=user, category=category)
        except(Exception) as e:
            return {'code': 10737, 'error': '文章分类不存在！'}
        limit = False if limit == 'private' else True
        if len(content) > settings.MAX_TOPIC_CONTENT_LENGTH:
            return {'code': 10738, 'error': '文章长度超出最大限制！'}
        try:
            topic.title = title
            topic.category = category
            topic.limit = limit
            topic.introduce = introduce
            topic.content = content
            topic.save()
        except(Exception) as e:
            return {'code': 10739, 'error': '文章更新失败！'}
        # 清理缓存
        self.clear_topic_caches(request)
        return {'code': 200}

    def return_topic_list(self, request, visited_username):
        user = request.logging_user
        page = request.GET.get('page')
        page_topic_num = request.GET.get('page_topic_num')
        limit = request.GET.get('limit')
        category = request.GET.get('category')
        order = request.GET.get('order')
        try:
            visited_user = UserProfile.objects.get(username=visited_username)
        except:
            return {'code': 10800, 'error': '用户不存在！'}
        topics = visited_user.topic_set.all()
        # 处理权限
        if limit is None:
            limit = 'public' if (user != visited_user) else 'all'
        if limit == 'all':
            if (user != visited_user):
                return {'code': 10801, 'error': '无权限查看！'}
        elif limit == 'public':
            topics = topics.filter(limit=True)
        elif limit == 'private':
            if (user != visited_user):
                return {'code': 10801, 'error': '无权限查看！'}
            topics = topics.filter(limit=False)
        else:
            return {'code': 10802, 'error': '参数格式错误！'}
        # 处理分类
        if category is None: category = 'all'
        if (category == 'all'):
            pass
        else:
            try:
                category = visited_user.category_set.get(category=category)
                topics = topics.filter(category=category)
            except:
                return {'code': 10803, 'error': '参数格式错误！'}
        # 处理排序
        if order is None: order = 'default'
        if (order == 'created_desc' or order == 'default'):
            topics = topics.order_by('-created_time')
        elif (order == 'created'):
            topics = topics.order_by('created_time')
        elif (order == 'updated'):
            topics = topics.order_by('updated_time')
        elif (order == 'updated_desc'):
            topics = topics.order_by('-updated_time')
        else:
            return {'code': 10804, 'error': '参数格式错误！'}
        try:
            data = {}
            data['topic_num'] = len(topics)  # 在切片前保存文章总数
        except:
            return {'code': 10805, 'error': '获取文章列表失败！'}
        if page is None: page = 1
        try:
            # 处理分页,切片需要在最后执行
            page = int(page)
            page_topic_num = int(page_topic_num)
            start = (page - 1) * page_topic_num
            end = start + page_topic_num
            topics = topics[start:end]
        except:
            return {'code': 10806, 'error': '参数格式错误！'}
        # data['nickname'] = visited_user.nickname
        # data['avatar'] = str(visited_user.avatar)
        # data['sign']=visited_user.sign
        try:
            data['is_same_user'] = True if (user == visited_user) else False
            data['category'] = []
            for c in Category.objects.filter(user=visited_user):
                data['category'].append(c.category)
            data['topics'] = []
            for t in topics:
                _ = {}
                _['id'] = t.id
                _['title'] = t.title
                _['limit'] = '公开' if t.limit == True else '私有'
                _['category'] = t.category.category
                _['created_time'] = t.created_time.timestamp()  # 返回时间戳
                _['introduce'] = t.introduce
                _['author'] = t.user.nickname
                data['topics'].append(_)
        except:
            return {'code': 10807, 'error': '获取文章列表失败！'}
        return {'code': 200, 'data': data}

    def return_topic_content(self, request, visited_username):
        # 返回博客具体内容
        user = request.logging_user
        topic_id = request.GET.get('topic_id')
        try:
            visited_user = UserProfile.objects.get(username=visited_username)
        except:
            return {'code': 10900, 'error': '用户不存在！'}
        try:
            topic = Topic.objects.get(id=topic_id, user=visited_user)
        except:
            return {'code': 10901, 'error': '文章不存在！'}
        if user != visited_user:
            if not topic.limit:
                # 文章权限为私有
                return {'code': 10902, 'error': '无权限访问！'}
        view_num = view_counter(topic_id)
        try:
            data = {}
            data['is_same_user'] = True if (user == visited_user) else False
            data['author'] = visited_user.nickname
            data['title'] = topic.title
            data['limit'] = '公开' if topic.limit == True else '私有'
            data['category'] = topic.category.category
            data['created_time'] = topic.created_time.timestamp()
            data['updated_time'] = topic.updated_time.timestamp()
            data['view_num'] = view_num if topic.limit == True else '---'  # 私有则不显示浏览量
            data['content'] = topic.content
        except:
            return {'code': 10903, 'error': '获取文章数据失败！'}
        # 点赞数待做
        return {'code': 200, 'data': data}
