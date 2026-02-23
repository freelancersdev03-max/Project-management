from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include, re_path # Added re_path
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Routes
    path('api/', include('accounts.urls')),
    path('api/', include('projects.urls')),
    path('api/clients/', include('clients.urls')),
    path('api/sgm/', include('sgm.urls')),
    path('api/employees/', include('employees.urls')),
    path('api/tasks/', include('tasks.urls')),
    path('api/ddtme/', include('ddtme.urls')),
    path('api/mctc/', include('mctc.urls')),
    path('api/visit-agenda/', include('visit_agenda.urls')),

    # 1. This serves the React "index.html" for the root URL
    path("", TemplateView.as_view(template_name="index.html")),

    # 2. Catch-all: Any URL that doesn't match the API or Admin above 
    # will be sent to React to handle via React Router.
    re_path(r'^.*$', TemplateView.as_view(template_name='index.html')),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)