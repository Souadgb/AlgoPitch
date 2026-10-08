from django.conf import settings
from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import User


class PublicUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'display_name', 'avatar_color']


class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'display_name', 'avatar_color', 'is_staff']


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    display_name = serializers.RegexField(
        r'^[\w.\- ]{3,30}$',
        error_messages={'invalid': 'Entre 3 et 30 caractères (lettres, chiffres, espaces, . _ -).'},
    )
    password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        value = value.strip().lower()
        domain = settings.ALLOWED_EMAIL_DOMAIN
        if not value.endswith('@' + domain):
            raise serializers.ValidationError(f'Seules les adresses @{domain} sont acceptées.')
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Un compte existe déjà avec cette adresse.')
        return value

    def validate_display_name(self, value):
        value = value.strip()
        if User.objects.filter(display_name__iexact=value).exists():
            raise serializers.ValidationError('Ce pseudo est déjà pris.')
        return value

    def validate(self, attrs):
        candidate = User(email=attrs['email'], display_name=attrs['display_name'])
        try:
            password_validation.validate_password(attrs['password'], candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class TokenSerializer(serializers.Serializer):
    token = serializers.CharField()


class EmailSerializer(serializers.Serializer):
    email = serializers.EmailField()
