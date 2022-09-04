from django.conf import settings
from django.http import JsonResponse
import jwt
from user.models import UserProfile


def logging_check(func):
    def wrapper(request, *args, **kwargs):
        # 检验登录状态，已登录则将当前用户对象传入request中
        token = request.META.get('HTTP_AUTHORIZATION')
        if not token:
            result = {'code': 403, 'error': '请登录！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        try:
            res = jwt.decode(token, settings.JWT_TOKEN_KEY,algorithms='HS256')
        except Exception as e:
            result = {'code': 403, 'error': '请登录！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        username = res['username']
        request.logging_user = UserProfile.objects.get(username=username)
        return func(request, *args, **kwargs)
    return wrapper
