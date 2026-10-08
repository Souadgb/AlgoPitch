"""Classement des membres.

- Score : borne basse de l'intervalle de Wilson (95 %) du taux de succès. Elle pénalise
  les petits échantillons : 1/1 donne ~0,21 alors que 19/20 donne ~0,76.
- Départage : à score égal, celui qui a le plus de prédictions clôturées passe devant.
- Étoiles : percentile du score parmi les membres classés, de 0,5 à 5 par demi-étoile.
"""

import math
from dataclasses import dataclass

from django.contrib.auth import get_user_model
from django.db.models import Count, Q

from .models import Prediction

Z_95 = 1.96


def wilson_lower_bound(successes: int, total: int, z: float = Z_95) -> float:
    if total == 0:
        return 0.0
    p = successes / total
    denominator = 1 + z * z / total
    centre = p + z * z / (2 * total)
    margin = z * math.sqrt((p * (1 - p) + z * z / (4 * total)) / total)
    return (centre - margin) / denominator


def percentile_stars(scores: list[float]) -> list[float]:
    """Étoiles par percentile : part des autres membres ayant un score strictement inférieur."""
    n = len(scores)
    if n == 0:
        return []
    if n == 1:
        return [5.0]
    stars = []
    for score in scores:
        below = sum(1 for other in scores if other < score)
        percentile = below / (n - 1)
        stars.append(max(0.5, round(percentile * 10) / 2))
    return stars


@dataclass
class MemberStats:
    user_id: int
    display_name: str
    avatar_color: str
    successes: int
    failures: int
    open_count: int
    rank: int | None = None
    stars: float | None = None

    @property
    def closed(self) -> int:
        return self.successes + self.failures

    @property
    def success_rate(self) -> float | None:
        return self.successes / self.closed if self.closed else None

    @property
    def score(self) -> float:
        return wilson_lower_bound(self.successes, self.closed)

    def as_dict(self) -> dict:
        return {
            'id': self.user_id,
            'display_name': self.display_name,
            'avatar_color': self.avatar_color,
            'rank': self.rank,
            'stars': self.stars,
            'successes': self.successes,
            'failures': self.failures,
            'closed': self.closed,
            'open': self.open_count,
            'success_rate': self.success_rate,
            'score': round(self.score, 4),
        }


def _sort_key(m: MemberStats):
    return (-m.score, -m.closed, m.display_name.lower())


def compute_member_stats() -> dict[int, MemberStats]:
    """Statistiques de tous les membres ayant au moins une prédiction, classés ou non."""
    S = Prediction.Status
    rows = (
        get_user_model()
        .objects.annotate(
            successes=Count('predictions', filter=Q(predictions__status=S.SUCCESS)),
            failures=Count('predictions', filter=Q(predictions__status=S.FAILED)),
            open_count=Count('predictions', filter=Q(predictions__status=S.OPEN)),
        )
        .filter(Q(successes__gt=0) | Q(failures__gt=0) | Q(open_count__gt=0))
        .values('id', 'display_name', 'avatar_color', 'successes', 'failures', 'open_count')
    )
    members = {
        r['id']: MemberStats(
            user_id=r['id'],
            display_name=r['display_name'],
            avatar_color=r['avatar_color'],
            successes=r['successes'],
            failures=r['failures'],
            open_count=r['open_count'],
        )
        for r in rows
    }

    ranked = sorted((m for m in members.values() if m.closed > 0), key=_sort_key)
    for member, stars in zip(ranked, percentile_stars([m.score for m in ranked])):
        member.stars = stars
    # Rang « 1224 » : les ex æquo (même score, même nombre de clôturées) partagent le rang
    for index, member in enumerate(ranked):
        previous = ranked[index - 1] if index else None
        if previous and (previous.score, previous.closed) == (member.score, member.closed):
            member.rank = previous.rank
        else:
            member.rank = index + 1
    return members


def leaderboard() -> dict[str, list[dict]]:
    members = compute_member_stats().values()
    ranked = sorted((m for m in members if m.rank is not None), key=lambda m: (m.rank, _sort_key(m)))
    unranked = sorted((m for m in members if m.rank is None), key=lambda m: m.display_name.lower())
    return {
        'ranked': [m.as_dict() for m in ranked],
        'unranked': [m.as_dict() for m in unranked],
    }
