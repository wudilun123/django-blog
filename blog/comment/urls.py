from django.urls import path
from . import views

app_name = 'comment'

urlpatterns = [
    path('<int:topic_id>/',views.CommentView.as_view()),
]
