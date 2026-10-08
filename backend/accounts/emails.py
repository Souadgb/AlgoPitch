from django.conf import settings
from django.core.mail import send_mail

from .tokens import make_verification_token


def send_verification_email(user):
    link = f'{settings.FRONTEND_URL}/verification?token={make_verification_token(user)}'
    send_mail(
        subject='AlgoPitch — confirme ton adresse e-mail',
        message=(
            f'Salut {user.display_name},\n\n'
            f'Confirme ton adresse pour activer ton compte AlgoPitch :\n{link}\n\n'
            'Ce lien expire dans 3 jours.'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )
