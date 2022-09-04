import os.path
import random
from django.core.cache import cache
from django.http import JsonResponse, HttpResponse
from django.utils.decorators import method_decorator
from django.views import View
from .models import UserProfile
from django.conf import settings
import hashlib, jwt
import magic
import json, time, re
from tools.logging_decorator import logging_check
from .tasks import send_sms
from topic.models import Category

# 校验用到的正则式
username_regexp = re.compile("[0-9a-zA-Z]{6,11}$")
password_regexp = re.compile("[0-9a-zA-Z@#*\-+=,.]{6,16}$")
email_regexp = re.compile("^[a-zA-Z0-9_.-]+@[a-zA-Z0-9-]+(\\.[a-zA-Z0-9-]+)*\.[a-zA-Z0-9]{2,6}$")
phone_regexp = re.compile("[\d]{11}$")
sms_num_regexp = re.compile("[\d]{6}$")
nickname_regexp = re.compile(".{1,11}$")
sign_regexp = re.compile(".{0,50}$")
info_regexp = re.compile(".{0,150}$")


def make_token(username, expire=settings.JWT_EXPIRE_TIME):
    key = settings.JWT_TOKEN_KEY
    time_now = time.time()
    payload_data = {'username': username, 'exp': expire + time_now}
    return jwt.encode(payload_data, key, algorithm='HS256')


def handle_reg_data(json_dict):
    username = json_dict.get('username', '')
    password = json_dict.get('password', '')
    password_re = json_dict.get('passwordRe', '')
    email = json_dict.get('email', '')
    phone = json_dict.get('phone', '')
    sms_num = json_dict.get('smsNum', '')
    if not username:
        return {'code': 10100, 'error': '用户名不能为空！'}
    if not password:
        return {'code': 10101, 'error': '密码不能为空！'}
    if not password_re:
        return {'code': 10102, 'error': '再次输入的密码不能为空！'}
    if not email:
        return {'code': 10103, 'error': '邮箱不能为空！'}
    if not phone:
        return {'code': 10104, 'error': '手机号不能为空！'}
    if not sms_num:
        return {'code': 10105, 'error': '验证码不能为空！'}
    if not username_regexp.match(username):
        return {'code': 10106, 'error': '用户名格式不正确！'}
    if not password_regexp.match(password):
        return {'code': 10107, 'error': '密码格式不正确！'}
    if not password_regexp.match(password_re):
        return {'code': 10108, 'error': '再次输入的密码格式不正确！'}
    if not email_regexp.match(email):
        return {'code': 10109, 'error': '邮箱格式不正确！'}
    if not phone_regexp.match(phone):
        return {'code': 10110, 'error': '手机号格式不正确！'}
    if not sms_num_regexp.match(sms_num):
        return {'code': 10111, 'error': '验证码格式不正确！'}
    # 验证码校验
    cache_key = 'sms_%s' % (phone)
    if (int(sms_num) != cache.get(cache_key)):
        return {'code': 10112, 'error': '验证码输入有误！'}
    if (password != password_re):
        return {'code': 10120, 'error': '两次输入的密码不一致！'}
    if (UserProfile.objects.filter(username=username)):
        return {'code': 10130, 'error': '用户名已存在！'}
    p_m = hashlib.md5()
    p_m.update(password.encode())
    try:
        user = UserProfile.objects.create(username=username, nickname=username, password=p_m.hexdigest(), email=email,
                                          phone=phone)
    except (Exception) as e:
        return {'code': 10140, 'error': '用户创建失败，请重试！'}
    cache.delete(cache_key)  # 注册账号的同时删除验证码
    Category.objects.create(user=user)  # 为每个账号创建一个默认分类
    token = make_token(username)
    return {'code': 200, 'username': username, 'data': {'token': token}}


def handle_login_data(json_dict):
    username = json_dict.get('username')
    password = json_dict.get('password')
    if not username:
        return {'code': 10200, 'error': '用户名不能为空！'}
    if not password:
        return {'code': 10201, 'error': '密码不能为空！'}
    if not username_regexp.match(username):
        return {'code': 10202, 'error': '用户名格式不正确！'}
    if not password_regexp.match(password):
        return {'code': 10203, 'error': '密码格式不正确！'}
    try:
        user = UserProfile.objects.get(username=username)
    except(Exception) as e:
        return {'code': 10210, 'error': '用户名不存在！'}
    p_m = hashlib.md5()
    p_m.update(password.encode())
    if (p_m.hexdigest() != user.password):
        return {'code': 10220, 'error': '用户密码错误！'}
    token = make_token(username)
    return {'code': 200, 'username': username, 'data': {'token': token}}


def handle_change_info(request, visited_username):
    user = request.logging_user
    if (user.username != visited_username):
        # 修改的不是当前登录用户的资料
        return {'code': 10400, 'error': '无修改权限！'}
    avatar = request.FILES.get('avatar')
    nickname = request.POST.get('nickname')
    sign = request.POST.get('sign')
    info = request.POST.get('info')
    if (avatar is not None):
        if (avatar.size > settings.AVATAR_MAX_SIZE):
            # 限制上传文件大小
            return {'code': 10401, 'error': '文件大小超过限制:200KB！'}
        # 将内存文件(默认小于2.5M的上传文件保存在内存中)读入临时目录下的avatar文件中以便使用magic库
        filename = os.path.join(settings.MEDIA_ROOT, 'temp', 'avatar')
        with open(filename, mode='wb') as f:
            f.write(avatar.read())
            if not (magic.from_file(filename, mime=True).startswith('image/')):
                return {'code': 10402, 'error': '文件类型不是图片！'}
        user.avatar = avatar  # 校验通过才保存头像
    if (nickname is not None):
        if not nickname_regexp.match(nickname):
            return {'code': 10403, 'error': '昵称长度不符合要求！'}
        if (UserProfile.objects.filter(nickname=nickname)):
            # nickname为唯一字段
            return {'code': 10404, 'error': '昵称已被占用！'}
        user.nickname = nickname
    if (sign is not None):
        if not sign_regexp.match(sign):
            return {'code': 10405, 'error': '个性签名长度不符合要求！'}
        user.sign = sign
    if (info is not None):
        if not info_regexp.match(info):
            return {'code': 10406, 'error': '个人简介长度不符合要求！'}
        user.info = info
    try:
        user.save()
    except(Exception) as e:
        return {'code': 10420, 'error': '修改资料失败！'}
    return {'code': 200}


# 改用celery实现，避免阻塞
# def send_sms(phone, code):
#     sms = SMS(**settings.SMS_CONFIG)
#     res = sms.run(phone, code)
#     return res


# FBV
def sms_view(request):
    if request.method != 'POST':
        return HttpResponse(content='', content_type='text/html', status=405)
    json_str = request.body
    json_dict = json.loads(json_str)
    phone = json_dict.get('phone', '')
    if not phone:
        result = {'code': 10500, 'error': '手机号不能为空！'}
        return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
    if not phone_regexp.match(phone):
        result = {'code': 10501, 'error': '手机号格式不正确！'}
        return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
    # 生成验证码
    code = random.randrange(100000, 1000000)
    cache_key = 'sms_%s' % (phone)
    # 检查是否有未过期的验证码
    if (cache.get(cache_key)):
        result = {'code': 10502, 'error': '有未过期的验证码，请稍候再试！'}
        return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
    # 存入redis缓存
    cache.set(cache_key, code, 60)
    # 发送短信
    # res = send_sms(phone, code)
    send_sms.delay(phone, code)  # 放入celery队列中
    # if (res['statusCode'] != '000000'):
    #     result = {'code': 10503, 'error': '短信服务暂不可用，请稍候再试！'}
    #     return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
    result = {'code': 200}
    return JsonResponse(result, json_dumps_params={'ensure_ascii': False})


# CBV，可继承，对未定义的方法返回405
class RegView(View):
    def post(self, request):
        json_str = request.body
        json_dict = json.loads(json_str)
        result = handle_reg_data(json_dict)
        return JsonResponse(result, json_dumps_params={'ensure_ascii': False})


class LoginView(View):
    def post(self, request):
        json_str = request.body
        json_dict = json.loads(json_str)
        result = handle_login_data(json_dict)
        return JsonResponse(result, json_dumps_params={'ensure_ascii': False})


class InfoView(View):
    def get(self, request, visited_username):
        # 加载用户数据
        try:
            visited_user = UserProfile.objects.get(username=visited_username)
        except(Exception) as e:
            result = {'code': 10300, 'error': '用户名不存在！'}
            return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
        result = {'code': 200,
                  'data': {'info': visited_user.info, 'sign': visited_user.sign, 'nickname': visited_user.nickname,
                           'avatar': str(visited_user.avatar)}}
        return JsonResponse(result, json_dumps_params={'ensure_ascii': False})

    @method_decorator(logging_check)
    def post(self, request, visited_username):
        # 修改用户数据
        result = handle_change_info(request, visited_username)
        return JsonResponse(result, json_dumps_params={'ensure_ascii': False})
