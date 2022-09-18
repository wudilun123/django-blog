from django.urls import path
from . import views

app_name = 'topic'

urlpatterns = [
    path('category/<str:visited_username>/', views.CategoryView.as_view()),
    path('<str:visited_username>/', views.TopicView.as_view()),
    path('ranking/hot5/', views.get_hot5_view),
    path('ranking/last5/', views.get_last5_view),
]
