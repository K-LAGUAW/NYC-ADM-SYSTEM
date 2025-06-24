import requests
import uuid
import logging
from .models import Orders, Shipments, Parameters, PackagePrices, PackageTypes
from .serializers import OrderCreateSerializer, OrderSerializer, ShipmentSerializer, ShipmentSearchSerializer, ShipmentCreateSerializer, PackagePricesSerializer, PackageTypesSerializer

from rest_framework.views import APIView
from rest_framework.response import Response, Serializer
from rest_framework.generics import ListAPIView

from django.shortcuts import get_object_or_404
from django.http import Http404

logger = logging.getLogger(__name__)

class OrdersView(ListAPIView):
    queryset = Orders.objects.filter(status__in=['REC']).order_by('-creation_date')
    serializer_class = OrderSerializer

class ShipmentsView(ListAPIView):
    queryset = Shipments.objects.all()
    serializer_class = ShipmentSerializer

class CreateOrderView(APIView):
    def post(self, request, *args, **kwargs):
        serializer = OrderCreateSerializer(data=request.data)
        
        if not serializer.is_valid():
            error_fields = list(serializer.errors.keys())

            return Response({
                'type': 'warning',
                'message': 'Complete los campos requeridos',
                'fields': error_fields
            }, status=400)

        try:
            validated_data = serializer.validated_data

            total = 0

            if validated_data.get('package_pickup'):
                total += 2500

            if validated_data.get('envelope_amount'):
                total += validated_data['envelope_amount'] * 0.01
            
            validated_data['supplier'] = validated_data['supplier'].upper()
            validated_data['customer'] = validated_data['customer'].upper()

            if validated_data.get('local_address'):
                validated_data['local_address'] = validated_data['local_address'].upper()

            order = Orders.objects.create(
                tracking_number=f"ORD-{str(uuid.uuid4())[:8].upper()}",
                total_amount=total,
                **validated_data
            )

            return Response({
                'type': 'success',
                'message': 'Orden creada con exito',
                'order': OrderSerializer(order).data
            }, status=201)

        except Exception as e:
            logger.error(f"Ocurrio un error inesperado en la vista", exc_info=True)

            return Response({
                'type': 'error',
                'message': f'Ocurrio un error interno en el servidor: {e}',
            }, status=500)

class CreateShipmentView(APIView):
    serializer_class = ShipmentCreateSerializer

    def post(self, request, *args, **kwargs):
        serializer = ShipmentCreateSerializer(data=request.data)
        if not serializer.is_valid():
                return Response({
                    'message': f'Faltan los campos requeridos',
                }, status=400)

        try:
            validated_data = serializer.validated_data
            total = 0

            if validated_data.get('envelope_amount'):
                total += validated_data['envelope_amount'] * 0.01
            
            if validated_data.get('package_pickup'):
                total += 2500
                
            if validated_data.get('package_amount'):
                total += validated_data['package_amount'].mount

            package_type = validated_data['package_type']
            tracking_number = f"{package_type.abbreviation}-{str(uuid.uuid4())[:8].upper()}"

            shipment = serializer.save(
                tracking_number=tracking_number,
                total_amount=total
            )

            whatsapp_sent = False
            
            try:
                whatsapp_number = validated_data['phone']
                params = {
                    'whatsapp_url': Parameters.objects.get(name="whatsapp_url").value,
                    'message_template': Parameters.objects.get(
                        name="message_tur" if package_type.abbreviation == 'TUR' else "message_paq"
                    ).value
                }
                
                response = requests.post(
                    params['whatsapp_url'],
                    json={
                        "chatId": f"549{whatsapp_number}@c.us",
                        "message": params['message_template'].format(tracking_number=tracking_number)
                    },
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                whatsapp_sent = response.status_code == 200
            except Exception:
                whatsapp_sent = False

            return Response({
                'message': 'Envio creado' + (' pero no se pudo enviar el mensaje de WhatsApp' if not whatsapp_sent else ''),
                'shipment': ShipmentSerializer(shipment).data
            }, status=201)

        except Exception:
            return Response({
                'message': 'Error interno al crear el envío'
            }, status=400)

class SearchShipmentView(APIView):
    def get(self, request, tracking_number):
        shipment = get_object_or_404(Shipments, tracking_number=tracking_number)
        serializer = ShipmentSearchSerializer(shipment)
        return Response(serializer.data)

class PackagesCategoriesView(APIView):
    def get(self, request):
        package_types = PackageTypes.objects.all()
        package_prices = PackagePrices.objects.all()

        return Response({
            'package_types': PackageTypesSerializer(package_types, many=True).data,
            'package_prices': PackagePricesSerializer(package_prices, many=True).data
        })

class UpdateShipmentStatusView(APIView):
    def post(self, request, tracking_number):
        try:
            shipment = get_object_or_404(Shipments, tracking_number=tracking_number)
            status_code = 200
            
            current_status = shipment.status.id
            
            if current_status == 1:
                shipment.status_id = 2
                shipment.save()
                result = f'Paquete {tracking_number} actualizado a estado: {shipment.status.name.lower()}'
            elif current_status == 2:
                shipment.status_id = 3
                shipment.save()
                result = f'Paquete {tracking_number} actualizado a estado: {shipment.status.name.lower()}'
            elif current_status == 3:
                result = f'El paquete {tracking_number} ya se encuentra listo para ser entregado'
                status_code = 400
            
            return Response({
                'message': result}, 
                status=status_code)
        except Http404:
            return Response({
                'message': f'No se encontro ningun paquete con el numero de tracking: {tracking_number}'}, 
                status=404
            )

class CompleteShipmentView(APIView):
    def post(self, request, tracking_number):
        try:
            shipment = get_object_or_404(Shipments, tracking_number=tracking_number)
            status_code = 200

            current_status = shipment.status.id

            if current_status == 3:
                shipment.status_id = 4
                shipment.save()
                result = f'Se completo la entrega del paquete: {tracking_number}'
            else:
                result = f'El paquete {tracking_number} no se encuentra listo para ser entregado'
                status_code = 400

            return Response({
               'message': result},
                status=status_code) 
        except Http404:
            return Response({
               'message': f'No se encontro ningun paquete con el numero de tracking: {tracking_number}'},
                status=404
            )