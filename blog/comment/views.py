import json
import re

from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import render

# Create your views here.
from django.utils.decorators import method_decorator
from django.views import View
from tools.logging_decorator import logging_check
from topic.models import Topic
from .models import Comment

blank_str_regexp = re.compile("\s*$")  # 空白字符串匹配，包括''和' '


class CommentView(View):

    def get(self, request, topic_id):
        # 获取评论数据
        result = self.return_comment_data(topic_id)
        return JsonResponse(result, json_dumps_params={'ensure_ascii': False})

    @method_decorator(logging_check)
    def post(self, request, topic_id):
        # 发表评论
        result = self.send_comment(request, topic_id)
        return JsonResponse(result, json_dumps_params={'ensure_ascii': False})

    def return_comment_data(self, topic_id):
        try:
            all_comments = Comment.objects.filter(topic=topic_id)
        except:
            return {'code': 11100, 'error': '文章不存在！'}
        comment_list = []
        reply_dict = {}
        comment_count = 0
        try:
            for comment in all_comments:
                if comment.parrent_id == 0:
                    # 评论
                    comment_count += 1
                    comment_list.append({'id': comment.id, 'publisher_username': comment.publisher.username,
                                         'publisher_nickname': comment.publisher.nickname,
                                         'publisher_avatar': str(comment.publisher.avatar),
                                         'content': comment.content, 'created_time': comment.created_time.timestamp(),
                                         'reply': [],
                                         })
                else:
                    # 回复
                    reply_dict.setdefault(comment.parrent_id, [])
                    reply_dict[comment.parrent_id].append(
                        {'id': comment.id, 'publisher_username': comment.publisher.username,
                         'publisher_nickname': comment.publisher.nickname,
                         'publisher_avatar': str(comment.publisher.avatar),
                         'content': comment.content, 'created_time': comment.created_time.timestamp(),
                         })
            for c in comment_list:
                if c['id'] in reply_dict:
                    c['reply'] = reply_dict[c['id']]
        except:
            return {'code': 11101, 'error': '评论数据获取失败！'}
        return {'code': 200, 'data': {'comment_count': comment_count, 'comment_list': comment_list}}

    def send_comment(self, request, topic_id):
        user = request.logging_user
        json_str = request.body
        try:
            json_dict = json.loads(json_str)
        except:
            return {'code': 400, 'error': '数据解析失败！'}
        content = json_dict.get('content', '')
        parrent_id = json_dict.get('parrentId')
        try:
            topic = Topic.objects.get(id=topic_id)
        except:
            return {'code': 11000, 'error': '文章不存在！'}
        if blank_str_regexp.match(content):
            return {'code': 11001, 'error': '评论内容不能为空！'}
        if len(content) > settings.MAX_COMMENT_CONTENT_LENGTH:
            print(len(content))
            return {'code': 11002, 'error': '评论内容超出长度限制！'}
        if parrent_id is None:
            try:
                Comment.objects.create(topic=topic, publisher=user, content=content)
            except:
                return {'code': 11003, 'error': '评论发表失败！'}
            return {'code': 200}
        else:
            try:
                parrent_comment = Comment.objects.get(id=parrent_id)
            except:
                return {'code': 11004, 'error': '评论发表失败！'}
            try:
                Comment.objects.create(topic=topic, publisher=user, content=content, parrent_id=parrent_id)
            except:
                return {'code': 11005, 'error': '评论发表失败！'}
            return {'code': 200}
