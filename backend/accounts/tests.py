import re

from django.core import mail
from django.test import TestCase
from rest_framework.test import APIClient

from .models import User

PASSWORD = 'MotDePasse-Solide-42'


class AuthFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def register(self, email='alice@ens.etsmtl.ca', name='Alice'):
        return self.client.post(
            '/api/auth/register/', {'email': email, 'display_name': name, 'password': PASSWORD}, format='json'
        )

    def test_only_school_domain_accepted(self):
        response = self.register(email='alice@gmail.com')
        self.assertEqual(response.status_code, 400)
        self.assertIn('email', response.data)

    def test_register_verify_login(self):
        self.assertEqual(self.register().status_code, 201)
        self.assertEqual(len(mail.outbox), 1)

        login = self.client.post('/api/auth/login/', {'email': 'alice@ens.etsmtl.ca', 'password': PASSWORD})
        self.assertEqual(login.data['code'], 'email_not_verified')

        token = re.search(r'token=(\S+)', mail.outbox[0].body).group(1)
        verify = self.client.post('/api/auth/verify/', {'token': token})
        self.assertEqual(verify.status_code, 200)
        self.assertTrue(User.objects.get(email='alice@ens.etsmtl.ca').email_verified)

        self.assertEqual(self.client.get('/api/auth/me/').data['display_name'], 'Alice')

    def test_invalid_token(self):
        self.assertEqual(self.client.post('/api/auth/verify/', {'token': 'abc'}).status_code, 400)

    def test_display_name_unique_case_insensitive(self):
        self.register()
        response = self.register(email='bob@ens.etsmtl.ca', name='alice')
        self.assertIn('display_name', response.data)
