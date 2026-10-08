from django.conf import settings
from django.core import signing

SALT = 'accounts.email-verification'


def make_verification_token(user):
    return signing.dumps({'uid': user.pk, 'email': user.email}, salt=SALT)


def read_verification_token(token):
    """Retourne (uid, email) ou lève signing.BadSignature / signing.SignatureExpired."""
    data = signing.loads(token, salt=SALT, max_age=settings.EMAIL_VERIFICATION_MAX_AGE)
    return data['uid'], data['email']
