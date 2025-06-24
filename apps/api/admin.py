from django.contrib import admin
from rangefilter.filters import DateRangeFilter
from django.db import models
from .models import Shipments, Parameters, PackageTypes, PaymentsTypes, PackagePrices, Orders

@admin.register(PackageTypes)
class PackageTypesAdmin(admin.ModelAdmin):
    pass

@admin.register(PackagePrices)
class PackagePricesAdmin(admin.ModelAdmin):
    pass

@admin.register(PaymentsTypes)
class PaymentsTypesAdmin(admin.ModelAdmin):
    pass

@admin.register(Parameters)
class ParametersAdmin(admin.ModelAdmin):
    pass

@admin.register(Orders)
class OrdersAdmin(admin.ModelAdmin):
    pass

@admin.register(Shipments)
class ShipmentsAdmin(admin.ModelAdmin):
    readonly_fields = ('total_amount', 'tracking_number', 'creation_date', 'update_date', 'payment_type', 'status')
    list_filter = ('status', ('creation_date', DateRangeFilter),)
    search_fields = ('tracking_number', 'sender', 'recipient',)

    ordering = ('-creation_date',)

    actions = ['mark_as_in_home_branch' ,'mark_as_in_transit', 'mark_as_in_destination_ranch', 'mark_as_delivered', 'calculate_total_amounts']

    def mark_as_in_home_branch(self, request, queryset):
        queryset.update(status=StatesList.objects.get(pk=1))
    mark_as_in_home_branch.short_description = "Marcar como en sucursal de origen"

    def mark_as_in_transit(self, request, queryset):
        queryset.update(status=StatesList.objects.get(pk=2))
    mark_as_in_transit.short_description = "Marcar como en tránsito"

    def mark_as_in_destination_ranch(self, request, queryset):
        queryset.update(status=StatesList.objects.get(pk=3))
    mark_as_in_destination_ranch.short_description = "Marcar como en sucursal de destino"

    def mark_as_delivered(self, request, queryset):
        queryset.update(status=StatesList.objects.get(pk=4))
    mark_as_delivered.short_description = "Marcar como entregado"

    def calculate_total_amounts(self, request, queryset):
        total = queryset.aggregate(total_sum=models.Sum('total_amount'))['total_sum'] or 0
        self.message_user(request, f"Total sumado: {total}")
    calculate_total_amounts.short_description = "Calcular total de montos"
