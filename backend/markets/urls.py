from django.urls import path

from . import views

urlpatterns = [
    path('search/', views.TickerSearchView.as_view()),
    path('popular/', views.PopularTickersView.as_view()),
    path('<str:symbol>/', views.TickerDetailView.as_view()),
]
