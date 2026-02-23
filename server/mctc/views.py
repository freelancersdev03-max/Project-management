from rest_framework import permissions, viewsets

from .models import MCTCEntry
from .serializers import MCTCEntrySerializer


class MCTCEntryViewSet(viewsets.ModelViewSet):
    serializer_class = MCTCEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = MCTCEntry.objects.filter(user=self.request.user)

        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')

        if year and month:
            try:
                year_int = int(year)
                month_int = int(month)
                if 1 <= month_int <= 12:
                    queryset = queryset.filter(
                        entry_date__year=year_int,
                        entry_date__month=month_int
                    )
            except (TypeError, ValueError):
                pass

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
