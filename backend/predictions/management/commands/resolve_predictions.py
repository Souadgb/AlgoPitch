from datetime import date

from django.core.management.base import BaseCommand

from predictions.resolution import resolve_open_predictions


class Command(BaseCommand):
    help = 'Clôture les prédictions dont la cible a été touchée ou dont la date limite est passée.'

    def add_arguments(self, parser):
        parser.add_argument('--date', type=date.fromisoformat, help="Date du jour à simuler (AAAA-MM-JJ)")

    def handle(self, *args, **options):
        counts = resolve_open_predictions(today=options['date'])
        self.stdout.write(self.style.SUCCESS(
            f"{counts['checked']} prédiction(s) vérifiée(s) : {counts['success']} réussie(s), "
            f"{counts['failed']} échouée(s), {counts['skipped']} ignorée(s) faute de données."
        ))
