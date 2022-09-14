######################################################
#        > File Name: flask_client.py
#      > Author: GuoXiaoNao
 #     > Mail: 250919354@qq.com 
 #     > Created Time: Mon 20 May 2019 11:52:00 AM CST
 ######################################################

from flask import Flask, send_file
import sys


app = Flask(__name__)

@app.route('/index/')
def index():
    #首页
    return send_file('templates/index.html')

@app.route('/login-reg/')
def login_reg():
    #登录/注册
    return send_file('templates/login-reg.html')


@app.route('/<username>/info/')
def info(username):
    #个人信息
    return send_file('templates/about.html')

@app.route('/<username>/change_password/')
def change_password(username):
    #修改密码
    return send_file('templates/change_password.html')

@app.route('/<username>/topic/release/')
def topic_release(username):
    #发表博客
    return send_file('templates/release.html')

@app.route('/<username>/topics/')
def topics(username):
    #个人博客列表
    return send_file('templates/list.html')

@app.route('/<username>/topics/detail/<t_id>/')
def topics_detail(username, t_id):
    #博客内容详情
    return send_file('templates/detail.html')

@app.route('/<username>/topics/update/<t_id>/')
def topics_update(username, t_id):
    #修改博客内容
    return send_file('templates/update.html')

@app.route('/<username>/topics/category/')
def topics_category(username):
    #分类管理
    return send_file('templates/category.html')

@app.route('/test_api/')
def test_api():
    #测试
    return send_file('templates/test_api.html')

if __name__ == '__main__':
    app.run(debug=True)

