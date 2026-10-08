from django.urls import path

from . import views

urlpatterns = [
    path('me/', views.MeView.as_view()),
    path('register/', views.RegisterView.as_view()),
    path('verify/', views.VerifyEmailView.as_view()),
    path('resend-verification/', views.ResendVerificationView.as_view()),
    path('login/', views.LoginView.as_view()),
    path('logout/', views.LogoutView.as_view()),
]
