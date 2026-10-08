from django.urls import path
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register('predictions', views.PredictionViewSet, basename='prediction')

urlpatterns = [
    path('leaderboard/', views.LeaderboardView.as_view()),
    path('members/<int:pk>/', views.MemberDetailView.as_view()),
    *router.urls,
]
