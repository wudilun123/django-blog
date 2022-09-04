import json
import re

from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from django.utils.decorators import method_decorator
from django.views import View
from .models import Category, Topic

from tools.logging_decorator import logging_check

blank_str_regexp = re.compile("\s*$")  # 空白字符串匹配，包括''和' '


# Create your views here.
def handle_topic_data(json_dict, user):
    title = json_dict.get('title')
    category = json_dict.get('category')
    limit = json_dict.get('limit')
    introduce = json_dict.get('introduce')
    content = json_dict.get('content')
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
    if len(content) > settings.MAX_CONTENT_LENGTH:
        return {'code': 10707, 'error': '文章长度超出最大限制！'}
    try:
        topic = Topic.objects.create(title=title, category=category, limit=limit, introduce=introduce, content=content,
                                     user=user)
    except(Exception) as e:
        return {'code': 10708, 'error': '文章发表失败！'}
    return {'code': 200, 'data': {'id': topic.id}}


class CategoryView(View):
    # 增删改查分类信息

    @method_decorator(logging_check)
    def get(self, request, visited_username):
        # 获取对应用户的文章分类信息
        user = request.logging_user
        if (user.username != visited_username):
            result = {'code': 10600, 'error': '无权限访问！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        queryset = user.category_set.values('category')
        category = []
        for q in queryset:
            category.append(q['category'])
        result = {'code': 200, 'data': {'category': category}}
        return JsonResponse(result, json_dumps_params={'ensure_ascii': False})

    @method_decorator(logging_check)
    def post(self, request, visited_username):
        # 添加文章分类信息
        user = request.logging_user
        if (user.username != visited_username):
            result = {'code': 10601, 'error': '无权限访问！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        json_str = request.body
        json_dict = json.loads(json_str)
        category = json_dict.get('category')
        if blank_str_regexp.match(category) :
            result = {'code': 10602, 'error': '分类名不能为空！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        if len(Category.objects.filter(user=user, category=category)) != 0:
            # 保证每个用户的分类名不重复
            result = {'code': 10603, 'error': '分类名不可重复！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        try:
            Category.objects.create(category=category, user=user)
        except(Exception) as e:
            result = {'code': 10604, 'error': '分类名创建失败！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        result = {'code': 200}
        return JsonResponse(result, json_dumps_params={'ensure_ascii': False})


class TopicView(View):

    @method_decorator(logging_check)
    def post(self, request, visited_username):
        user = request.logging_user
        if (user.username != visited_username):
            result = {'code': 10700, 'error': '无权限访问！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        json_str = request.body
        json_dict = json.loads(json_str)
        result = handle_topic_data(json_dict, user)
        return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
