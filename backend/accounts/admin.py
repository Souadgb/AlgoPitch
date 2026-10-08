from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ['display_name']
    list_display = ['display_name', 'email', 'email_verified', 'is_staff', 'date_joined']
    list_filter = ['email_verified', 'is_staff', 'is_active']
    search_fields = ['display_name', 'email']
    fieldsets = [
        (None, {'fields': ['email', 'password']}),
        ('Profil', {'fields': ['display_name', 'avatar_color', 'email_verified']}),
        ('Permissions', {'fields': ['is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions']}),
        ('Dates', {'fields': ['last_login', 'date_joined']}),
    ]
    add_fieldsets = [
        (None, {'classes': ['wide'], 'fields': ['email', 'display_name', 'password1', 'password2']}),
    ]
