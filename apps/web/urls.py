from django.urls import path
from .views import shipments, orders

urlpatterns = [
    path('shipments/', shipments, name='shipments'),
    path('orders/', orders, name='orders'),
]