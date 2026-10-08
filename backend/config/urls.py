from django.contrib import admin
from django.urls import include, path

admin.site.site_header = 'AlgoPitch — administration'

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/tickers/', include('markets.urls')),
    path('api/', include('predictions.urls')),
]
