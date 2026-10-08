from django.core.mail.backends.console import EmailBackend


class ReadableConsoleEmailBackend(EmailBackend):
    """Affiche les e-mails en clair dans la console (le backend standard les encode,
    ce qui casse les liens de vérification à copier-coller en développement)."""

    def write_message(self, message):
        self.stream.write(
            f"\n{'=' * 79}\n"
            f'À      : {", ".join(message.to)}\n'
            f'Sujet  : {message.subject}\n'
            f"{'-' * 79}\n"
            f'{message.body}\n'
            f"{'=' * 79}\n"
        )
