from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Prediction
from .ranking import compute_member_stats, leaderboard
from .serializers import PredictionCreateSerializer, PredictionSerializer


class PredictionViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """Les prédictions sont figées : ni modification ni suppression via l'API."""

    serializer_class = PredictionSerializer

    def get_queryset(self):
        qs = Prediction.objects.select_related('user', 'ticker')
        params = self.request.query_params
        if symbol := params.get('ticker'):
            qs = qs.filter(ticker__symbol=symbol.strip().upper())
        if user_id := params.get('user'):
            qs = qs.filter(user_id=user_id) if user_id.isdigit() else qs.none()
        if status_ := params.get('status'):
            qs = qs.filter(status=status_)
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['member_stats'] = compute_member_stats()
        return context

    def create(self, request, *args, **kwargs):
        serializer = PredictionCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        prediction = serializer.save()
        output = PredictionSerializer(prediction, context=self.get_serializer_context())
        return Response(output.data, status=status.HTTP_201_CREATED)


class LeaderboardView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(leaderboard())


class MemberDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        user = get_object_or_404(get_user_model(), pk=pk, email_verified=True)
        all_stats = compute_member_stats()
        stats = all_stats.get(user.pk)
        ranked_count = sum(1 for s in all_stats.values() if s.rank is not None)
        data = {
            'id': user.pk,
            'display_name': user.display_name,
            'avatar_color': user.avatar_color,
            'date_joined': user.date_joined,
            'ranked_count': ranked_count,
            'rank': None, 'stars': None, 'successes': 0, 'failures': 0,
            'closed': 0, 'open': 0, 'success_rate': None, 'score': 0.0,
        }
        if stats:
            data.update({k: v for k, v in stats.as_dict().items() if k not in ('id', 'display_name', 'avatar_color')})
        return Response(data)
