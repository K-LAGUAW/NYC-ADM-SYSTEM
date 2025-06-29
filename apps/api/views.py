import logging
import requests
import uuid
import random

from .utils import send_whatsapp_message
from .models import Orders, Shipments, Parameters, PackagePrices, PackageTypes, OrdersStatus, ShipmentsStatus

from .serializers import (
    OrderSerializer, OrderCreateSerializer, 
    ShipmentSerializer, ShipmentCreateSerializer,
    ShipmentSearchSerializer
)

from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework import status

from django.shortcuts import get_object_or_404
from django.http import Http404

logger = logging.getLogger(__name__)

class OrdersView(ListAPIView):
    queryset = Orders.objects.filter(status__abbreviation='REC')
    serializer_class = OrderSerializer

class ShipmentsView(ListAPIView):
    queryset = Shipments.objects.filter(status__abbreviation__in=['ESO', 'ECD', 'ESD'])
    serializer_class = ShipmentSerializer

class CreateOrderView(APIView):
    def post(self, request, *args, **kwargs):
        serializer = OrderCreateSerializer(data=request.data)

        if not serializer.is_valid():
            return Response({
                'type': 'warning',
                'title': 'Error de validacion',
                'message': 'Complete los campos marcados.',
                'fields': list(serializer.errors.keys())
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            validated_data = serializer.validated_data
            
            total = 0
            
            if validated_data.get('package_pickup'):
                total += 2500
            
            envelope_amount = int(validated_data.get('envelope_amount') or 0)

            if envelope_amount > 0:
                total += envelope_amount * 0.01


            supplier = validated_data.pop('supplier').upper()
            customer = validated_data.pop('customer').upper()
            
            if validated_data.get('package_pickup'):
                local_address = validated_data.pop('local_address').upper()
                validated_data['local_address'] = local_address

            tracking_number = f"ORD-{uuid.uuid4().hex[:8].upper()}"

            notification_message = send_whatsapp_message(notification_message, order.phone)

            if notification_message[1] != 200:
                return Response({
                    'type': 'error',
                    'title': 'Error de api',
                    'message': 'No se pudo enviar la notificacion a cliente.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            order = Orders.objects.create(
                tracking_number=tracking_number,
                total_amount=total,
                supplier=supplier,
                customer=customer,
                **validated_data
            )

            return Response({
                'type': 'success',
                'title': 'Orden creada',
                'message': 'Operacion realizada con exito.',
                'order': OrderSerializer(order).data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(exc_info=True)
            return Response({
                'type': 'error',
                'message': f'Ocurrió un error interno en el servidor: {e}.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CompleteOrderView(APIView):
    def post(self, request, *args, **kwargs):
        tracking_number = request.data.get('tracking_number')

        if not tracking_number:
            logger.warning("Intento de completar orden sin proporcionar tracking_number en el cuerpo de la peticion.")
            return Response(
                {
                    'type': 'error',
                    'message': 'El parametro "tracking_number" es requerido en el cuerpo de la peticion.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            order = get_object_or_404(Orders, tracking_number=tracking_number)

            if order.status.abbreviation == 'COM':
                logger.warning(f"Intento de completar orden {tracking_number} que ya se encuentra en estado 'COM'.")
                return Response(
                    {
                        'type': 'error',
                        'message': f'La orden {tracking_number} ya se encuentra completada.'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if order.package_pickup:
                try:
                    confirmation_pin = random.randint(1000, 9999)

                    shipment = Shipments.objects.create(
                        tracking_number=order.tracking_number,
                        confirmation_pin=confirmation_pin,
                        status=ShipmentsStatus.objects.get(abbreviation='ESO'),
                        package_type=PackageTypes.objects.get(abbreviation='PAQ'),
                        package_pickup=order.package_pickup,
                        package_amount=package_amount,
                        sender=order.supplier,
                        recipient=order.customer,
                        phone=order.phone,
                        total_amount=order.total_amount,
                    )

                    print(shipment)

                except Exception as e:
                    logger.exception(f"Error al crear el shipment para la orden {order.tracking_number}", exc_info=True)
                    return Response(
                        {
                            'type': 'error',
                            'message': f'Error al completar la orden {tracking_number}: {e}'
                        },
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )

            order.status = OrdersStatus.objects.get(abbreviation='COM')
            order.save()

            response_data = {
                'type': 'success',
                'message': f'Orden {tracking_number} completada con exito.',
            }

            if shipment:
                response_data['shipment'] = ShipmentSerializer(shipment).data

            return Response(response_data, status=status.HTTP_200_OK)

        except Http404:
            logger.warning(f"Orden {tracking_number} no encontrada para completar.", exc_info=True)
            return Response(
                {
                    'type': 'error',
                    'message': f'Error al completar orden {tracking_number}, no encontrada o inexistente.'
                },
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.exception(f"Error interno al completar orden {tracking_number}.", exc_info=True)
            return Response(
                {
                    'type': 'error',
                    'message': f'Ocurrió un error interno en el servidor: {e}.'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CreateShipmentView(APIView):
    serializer_class = ShipmentCreateSerializer

    def post(self, request):
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