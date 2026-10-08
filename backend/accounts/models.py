import random

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

AVATAR_COLORS = [
    '#A855F7',  # violet
    '#38BDF8',  # bleu ciel
    '#EAB308',  # jaune
    '#F97316',  # orange
    '#22C55E',  # vert
    '#EF4444',  # rouge
    '#EC4899',  # rose
    '#14B8A6',  # turquoise
    '#6366F1',  # indigo
    '#84CC16',  # lime
]


def random_avatar_color():
    return random.choice(AVATAR_COLORS)


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("L'adresse e-mail est obligatoire.")
        user = self.model(email=self.normalize_email(email).lower(), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('email_verified', True)
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    username = None
    first_name = None
    last_name = None

    email = models.EmailField('adresse e-mail', unique=True)
    display_name = models.CharField('pseudo', max_length=30, unique=True)
    avatar_color = models.CharField('couleur avatar', max_length=7, default=random_avatar_color)
    email_verified = models.BooleanField('e-mail vérifié', default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['display_name']

    objects = UserManager()

    class Meta:
        verbose_name = 'membre'
        verbose_name_plural = 'membres'

    def __str__(self):
        return self.display_name
