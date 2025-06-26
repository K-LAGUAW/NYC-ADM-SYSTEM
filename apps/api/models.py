from django.db import models

class OrdersStatus(models.Model):
    name = models.CharField(max_length=50, verbose_name="Nombre")
    abbreviation = models.CharField(max_length=5, verbose_name="Abreviatura")

    class Meta:
        verbose_name = "estado de orden"
        verbose_name_plural = "estados de ordenes"

    def __str__(self):
        return f"{self.name} - {self.abbreviation}"

class PackagePrices(models.Model):
    name = models.CharField(max_length=50, verbose_name="Nombre")
    mount = models.PositiveIntegerField(verbose_name="Monto")
    abbreviation = models.CharField(max_length=255, verbose_name="Abreviatura")

    class Meta:
        verbose_name = "monto de paquete"
        verbose_name_plural = "montos de paquetes"

    def __str__(self):
        return f"{self.name} - {self.mount} - {self.abbreviation}"

class PackageTypes(models.Model):
    name = models.CharField(max_length=50, verbose_name="Nombre")
    abbreviation = models.CharField(max_length=5, verbose_name="Abreviatura")

    class Meta:
        verbose_name = "tipo de paquete"
        verbose_name_plural = "tipos de paquetes"

    def __str__(self):
        return f"{self.name} - {self.abbreviation}"

class Parameters(models.Model):
    name = models.CharField(max_length=50, unique=True, verbose_name="Nombre")
    value = models.TextField(verbose_name="Valor")
    description = models.CharField(max_length=255, blank=True, null=True, verbose_name="Descripcion")

    class Meta:
        verbose_name = "parametro"
        verbose_name_plural = "parametros"

    def __str__(self):
        return f"{self.name} | Descripcion: {self.description} "

class PaymentsTypes(models.Model):
    name = models.CharField(max_length=50, verbose_name="Nombre")
    abbreviation = models.CharField(max_length=5, verbose_name="Abreviatura")

    class Meta:
        verbose_name = "tipo de pago"
        verbose_name_plural = "tipos de pagos"

    def __str__(self):
        return f"{self.name} - {self.abbreviation}"

class ShipmentsStatus(models.Model):
    name = models.CharField(max_length=50, verbose_name="Nombre")
    abbreviation = models.CharField(max_length=5, verbose_name="Abreviatura")

    class Meta:
        verbose_name = "estado de envio"
        verbose_name_plural = "estados de envios"

    def __str__(self):
        return f"{self.name} - {self.abbreviation}"

class Orders(models.Model):
    tracking_number = models.CharField(max_length=11, primary_key=True, editable=False, verbose_name="Número de seguimiento")
    creation_date = models.DateTimeField(auto_now_add=True, editable=False, verbose_name="Fecha de creación")
    update_date = models.DateTimeField(auto_now=True, verbose_name="Fecha de actualización")
    status = models.ForeignKey('OrdersStatus', default=1, on_delete=models.PROTECT, verbose_name="Estado de la orden")
    supplier = models.CharField(max_length=50, verbose_name="Proveedor")
    customer = models.CharField(max_length=50, verbose_name="Cliente")
    phone = models.CharField(max_length=11, verbose_name="Teléfono")
    local_address = models.CharField(max_length=50, blank=True, null=True, verbose_name="Dirección local")
    province = models.CharField(max_length=50, verbose_name="Provincia")
    locality = models.CharField(max_length=50, verbose_name="Localidad")
    envelope_amount = models.PositiveIntegerField(blank=True, null=True, verbose_name="Importe de sobre")
    supplier_payment = models.BooleanField(verbose_name="Pago del proveedor")
    package_pickup = models.BooleanField(verbose_name="Recogida de paquete")
    payment_type = models.ForeignKey('PaymentsTypes', on_delete=models.CASCADE, blank=True, null=True, verbose_name="Tipo de pago")

    class Meta:
        verbose_name = "orden"
        verbose_name_plural = "órdenes"
        ordering = ['-creation_date']

    def __str__(self):
        status_abbr = getattr(self.status, 'abbreviation', 'N/A')
        formatted_date = self.update_date.strftime("%Y-%m-%d %H:%M")
        return f"{self.tracking_number} - {status_abbr} | Actualizado: {formatted_date}"

class Shipments(models.Model):
    tracking_number = models.CharField(max_length=11, primary_key=True, editable=False, verbose_name="Número de seguimiento")
    confirmation_pin = models.PositiveIntegerField(verbose_name="Pin de confirmación")
    creation_date = models.DateTimeField(auto_now_add=True, editable=False, verbose_name="Fecha de creación")
    update_date = models.DateTimeField(auto_now=True, verbose_name="Fecha de actualización")
    status = models.ForeignKey('ShipmentsStatus', default=1, on_delete=models.PROTECT, verbose_name="Estado actual del envío")
    package_type = models.ForeignKey('PackageTypes', on_delete=models.CASCADE, verbose_name="Tipo de paquete")
    package_pickup = models.BooleanField(verbose_name="Recogida de paquete")
    package_amount = models.ForeignKey('PackagePrices', on_delete=models.CASCADE, verbose_name="Importe de paquete")
    total_amount = models.PositiveIntegerField(null=True, blank=True, verbose_name="Importe total")
    sender = models.CharField(max_length=50, verbose_name="Remitente")
    recipient = models.CharField(max_length=50, verbose_name="Destinatario")
    phone = models.CharField(max_length=10, verbose_name="Teléfono")
    province = models.CharField(max_length=50, verbose_name="Provincia")
    locality = models.CharField(max_length=50, verbose_name="Localidad")
    payment_type = models.ForeignKey('PaymentsTypes', on_delete=models.CASCADE, blank=True, null=True, verbose_name="Tipo de pago")

    class Meta:
        verbose_name = "envío"
        verbose_name_plural = "envíos"
        ordering = ['-creation_date']

    def __str__(self):
        status_abbr = getattr(self.status, 'abbreviation', 'N/A')
        formatted_date = self.update_date.strftime("%Y-%m-%d %H:%M")
        return f"{self.tracking_number} - {status_abbr} | Actualizado: {formatted_date}"