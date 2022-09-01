from django.urls import path, include
from . import views

app_name = 'user'

urlpatterns = [
    path('reg/', views.RegView.as_view(), name='reg_url'),
    path('login/',views.LoginView.as_view(),name='login_url'),
    path('info/<str:visited_username>/',views.InfoView.as_view(),name='info_url'),
    path('sms/',views.sms_view,name='sms_url'),
]
