from django.contrib.auth import authenticate, login, logout
from django.core import signing
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .emails import send_verification_email
from .models import User
from .serializers import (
    EmailSerializer,
    LoginSerializer,
    MeSerializer,
    RegisterSerializer,
    TokenSerializer,
)
from .tokens import read_verification_token


class AuthThrottle(AnonRateThrottle):
    rate = '20/hour'


@method_decorator(ensure_csrf_cookie, name='get')
class MeView(APIView):
    """Utilisateur connecté (ou null). Pose aussi le cookie CSRF pour le frontend."""

    permission_classes = [AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response(None)
        return Response(MeSerializer(request.user).data)


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        send_verification_email(user)
        return Response(
            {'detail': 'Compte créé. Vérifie ta boîte mail pour activer ton compte.'},
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            uid, email = read_verification_token(serializer.validated_data['token'])
        except signing.SignatureExpired:
            return Response({'detail': 'Ce lien a expiré. Demande un nouveau lien.'}, status=400)
        except signing.BadSignature:
            return Response({'detail': 'Lien de vérification invalide.'}, status=400)

        user = User.objects.filter(pk=uid, email=email).first()
        if user is None:
            return Response({'detail': 'Lien de vérification invalide.'}, status=400)
        if not user.email_verified:
            user.email_verified = True
            user.save(update_fields=['email_verified'])
        login(request, user)
        return Response(MeSerializer(user).data)


class ResendVerificationView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        serializer = EmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email=serializer.validated_data['email'].lower()).first()
        if user and not user.email_verified:
            send_verification_email(user)
        # Réponse identique dans tous les cas pour ne pas révéler quels comptes existent
        return Response({'detail': 'Si un compte non vérifié existe, un nouveau lien a été envoyé.'})


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            email=serializer.validated_data['email'].lower(),
            password=serializer.validated_data['password'],
        )
        if user is None:
            return Response({'detail': 'E-mail ou mot de passe incorrect.'}, status=400)
        if not user.email_verified:
            return Response(
                {'detail': "Ton adresse e-mail n'est pas encore vérifiée.", 'code': 'email_not_verified'},
                status=400,
            )
        login(request, user)
        return Response(MeSerializer(user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)
