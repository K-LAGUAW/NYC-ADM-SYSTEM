from django.urls import path
from .views import (
    ShipmentsView, CreateShipmentView, SearchShipmentView, PackagesCategoriesView,
    CompleteShipmentView, UpdateShipmentStatusView, OrdersView, CreateOrderView, CompleteOrderView
)

urlpatterns = [
    path('shipments/', ShipmentsView.as_view(), name='shipments'),
    path('orders/', OrdersView.as_view(), name='orders'),
    path('create_order/', CreateOrderView.as_view(), name='create_order'),
    path('complete_order/', CompleteOrderView.as_view(), name='complete_order'),
    path('packages_categories/', PackagesCategoriesView.as_view(), name='packages_categories'),
    path('create_shipment/', CreateShipmentView.as_view(), name='create_shipment'),
    path('search_shipment/<str:tracking_number>/', SearchShipmentView.as_view(), name='search_shipment'),
    path('update_shipment/<str:tracking_number>/', UpdateShipmentStatusView.as_view(), name='update_status'),
    path('complete_shipment/<str:tracking_number>/', CompleteShipmentView.as_view(), name='complete_shipment'),
]