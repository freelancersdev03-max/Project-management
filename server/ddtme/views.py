from rest_framework import viewsets, permissions
from .models import BigTask
from .serializers import BigTaskSerializer

class BigTaskViewSet(viewsets.ModelViewSet):
    serializer_class = BigTaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = BigTask.objects.all()
        project_id = self.request.query_params.get('project_id')
        client_id = self.request.query_params.get('client_id')

        if project_id and project_id != 'undefined':
            try:
                # Ensure project_id is an integer to avoid 500 error
                project_id_int = int(project_id)
                queryset = queryset.filter(project_id=project_id_int)
            except ValueError:
                # If project_id is not a valid integer, return empty or ignore
                return BigTask.objects.none()
        
        if client_id and client_id != 'undefined':
            try:
                client_id_int = int(client_id)
                queryset = queryset.filter(project__client__id=client_id_int)
            except ValueError:
                return BigTask.objects.none()

        # Monthly Filtering
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')

        if month and year:
            try:
                import calendar
                from datetime import date
                m = int(month)
                y = int(year)
                # Last day of the month
                _, last_day = calendar.monthrange(y, m)
                month_start = date(y, m, 1)
                month_end = date(y, m, last_day)

                # DEBUG LOG
                try:
                    with open('debug_view.log', 'a') as f:
                        f.write(f"\n--- Request: m={m}, y={y} ---\n")
                        f.write(f"Filter: Start <= {month_end} AND Target >= {month_start}\n")
                        count_before = queryset.count()
                        f.write(f"Total Tasks Before Filter: {count_before}\n")
                        
                        # Check each task manually for debug
                        for t in queryset:
                            start_cond = t.start_date <= month_end
                            target_cond = t.target_date >= month_start
                            f.write(f"Task {t.id} '{t.title}': {t.start_date} to {t.target_date}. Overlaps? {start_cond and target_cond}\n")

                except Exception as e:
                    pass

                # Filter: Task overlaps with the month
                # Logic: Task Start <= Month End AND Task End >= Month Start
                # Note: target_date is used as end date
                queryset = queryset.filter(
                    start_date__lte=month_end,
                    target_date__gte=month_start
                )
            except (ValueError, TypeError):
                pass # Ignore invalid month/year
        
        return queryset

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            print(f"Error creating BigTask: {e}")
            from rest_framework.response import Response
            from rest_framework import status
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

