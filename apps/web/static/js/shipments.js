// ============= Variables Globales =============
let scanner;
let table;

// ============= Elementos del DOM =============
// Botones principales
const showConfig = document.getElementById('showConfig');
const scanQr = document.getElementById('scanQr');
const showShipment = document.getElementById('showShipment');

// Elementos del formulario
const typeSelect = document.getElementById('typeSelect');
const priceSelect = document.getElementById('priceSelect');

// Elementos del paquete
const packageContainer = document.getElementById('packageContainer');
const packageCheckbox = document.getElementById('packageCheckbox');

// Elementos del remitente
const senderContainer = document.getElementById('senderContainer');
const senderInput = document.getElementById('senderInput');

// Elementos del sobre
const envelopeContainer = document.getElementById('envelopeContainer');
const envelopeInput = document.getElementById('envelopeInput');

// Elementos del modal shipment
const shipmentModal = new bootstrap.Modal(document.getElementById('shipmentModal'));
const shipmentForm = document.getElementById('shipmentForm');
const shipmentButton = document.getElementById('shipmentButton');
const shipmentSpinner = document.getElementById('shipmentSpinner');

// Elementos del modal qr
const qrModal = new bootstrap.Modal(document.getElementById('qrModal'));
const qrSpinner = document.getElementById('qrSpinner');

// Elementos del modal config
const configModal = new bootstrap.Modal(document.getElementById('configModal'));
const printerSelect = document.getElementById('printerSelect');
const printerButton = document.getElementById('printerButton');

// ============= Funciones Utilitarias =============
function getCookie(cookieName) {
    const name = cookieName + '=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');

    for (let cookie of cookieArray) {
        cookie = cookie.trim();
        if (cookie.indexOf(name) === 0) {
            return cookie.substring(name.length, cookie.length);
        }
    }
    return null;
}

function showNotification(type, title, message, time = 3000) {
    Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: time,
        timerProgressBar: true
    }).fire({
        icon: type,
        title: title,
        text: message
    });
}


async function completeShipment(tracking_number) {
    try {
        const response = await fetch(`/api/v1/complete_shipment/${tracking_number}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        const data = await response.json();

        if (!response.ok) {
            showNotification('error', data.message);
            return;
        }

        showNotification('success', data.message);
        table.ajax.reload();
    } catch (error) {
        showNotification('error', 'Error al completar la entrega del envío');
    }
}

// ============= Funciones de Tabla =============
function initializeTable() {
    if (table) {
        table.destroy();
        $('#shipmentsTable').empty();
    }

    table = new DataTable('#shipmentsTable', {
        ajax: {
            url: '/api/v1/shipments/',
            type: 'GET',
            dataSrc: ''
        },
        columnDefs: [
            {
                targets: '_all',
                className: 'text-center align-middle'
            }
        ],
        columns: [
            {
                className: 'dt-control',
                orderable: false,
                data: null,
                defaultContent: '<i class="ti ti-id fs-4"></i>'
            },
            { data: 'tracking_number' },
            { data: 'sender' },
            { data: 'recipient' }
        ],
        order: [1],
        processing: true,
        responsive: true,
        scrollY: '67vh',
        scrollCollapse: true,
        paging: false,
        info: false,
        language: {
            url: '/static/json/es.json'
        }
    });

    table.on('click', 'td.dt-control', (e) => {
        let tr = e.target.closest('tr');
        let row = table.row(tr);

        if (row.child.isShown()) {
            row.child.hide();
        }
        else {
            row.child(showDetails(row.data())).show();
        }
    });
}

function showDetails(data) {
    const dataParse = 'ASD'

    return (
        `
        <div class="d-flex flex-column my-2">
            <div class="text-center mb-3">
                <h2 class="text-decoration-underline link-offset-1 fs-4">Detalles del envio</h2>
            </div>
            <div class="d-flex flex-column flex-lg-row align-items-center justify-content-center justify-content-md-around mb-3">
                <div class="shipment-details text-center">
                    <p><strong>Fecha de envio:</strong> ${data.creation_date}</p>
                    <p><strong>Numero de seguimiento:</strong> ${data.tracking_number}</p>
                    <p><strong>Remitente:</strong> ${data.sender}</p>
                    <p><strong>Destinatario:</strong> ${data.recipient}</p>
                </div>
                <div class="shipment-status text-center">
                    <p><strong>Fecha de actualizacion:</strong> ${data.update_date}</p>
                    <p><strong>Numero de telefono:</strong> ${data.phone}</p>
                    <p><strong>Estado:</strong> ${data.status.name}</p>
                    <div class="d-flex gap-2 align-items-center justify-content-center">
                        <p class="text-decoration-underline link-offset-1 fs-4 m-1">Total:</p>
                        <p class="fs-4 bg-success rounded-pill d-inline-block px-3 text-white m-0">$ ${data.total_amount}</p>
                    </div>
                </div>
            </div>
            <div class="d-flex flex-wrap justify-content-center align-items-center gap-2">
                ${data.status.id === 1 ? `<button class="btn btn-warning fw-medium" onclick="printQR('${dataParse}')">Reimprimir ticket</button>` : ''}
                ${data.status.id === 3 ? `<button class="btn btn-success fw-medium" onclick="completeShipment('${data.tracking_number}')">Confirmar entrega</button>` : ''}
            </div>
        </div>
        `
    );
}

// ============= Funciones de Impresión =============
async function printQR(data) {
    const payload = {
        nombreImpresora: getCookie('selectedPrinter'),
        serial: "YTAwODkxYjhfXzIwMjUtMDUtMTVfXzIwMjUtMDYtMTQjIyNZWkJRNTVZdko3bGJncWVJRXpUNCtxa0VTc1Y0Y1lhbXdhZVJscUI2OVNqME5tOVBNaVppcFdHRjVVVVNKTmQ2OXVoMTZzbHIxY05GMzBDRFVTUnRabC9BRUxqMTdOclNhSngxVjI1bzh2akE3bWRrc3FKdlhTRXB6blZ1NW1xVmN2WWJGZDRFSU1ZSXc1djQ0MU9OU3ROYURtbnMxQXdtRitKN29LOVEvdkQ0aTcrTGZUNTR6d3NlMWlhSk1iMXBUSFpPQ3lsZE9YU0dQME0yV1M1VmdpejJCRGNFemY0dldBOG5sZzlFaWtDVnd0RkMwUThCUVYrTjJtWlVGUUgyampFS1JUTkUvSG16NTgxTWxLK200NXVEWXdKa09RZjVZM0FuMC9TUFN2WGx6ZXl5WjBDSFpIUHp1T2M4WE50ZmlFOHpzcTg2Q0NpUE9Nam9QQjdYeUY0OUwzMWhNQi9xbHFGM0dUT0F5ZGpoa1VIWEozMjAyNkxDQ2djTFNyT0o4ZitPRjRsTlJjSTl1ZFBrNU44emNTcXJFVGVGYzdiQ0ZtRlMxSVRXb25FcUJXKzVHaTJuMWIxWUlVZVBwYkpEbkJmMVR3OXhTMTg4RU81a0JyL1dyYVB1Z1VKelUzYjZFdUpwTW11Z01XU053WmdMM2IwVVR6SXVnQmJ2NnBSaGdlamZWYmEybmozMEVMSVJZN3c1aXB6bjdaN3ZvUXc3VlJLcXVqcmMwV2VrMVV2emRjMjVZdXZhaU0zeU9lUXJ0U3JFWS9ic3hOd1hkcjhKYkdkdStZZHZSSVdQSm5wUzlKcEtBWUNubkhZWnNRc3FTTnFRN2VYWlRXaDljYWt2ai9oOU83SVV1YVkwZmJmQ1NCSXlxSkdwaGdHWHpHbSs5aWZNb21TNnczMD0=",
        operaciones: [
            { nombre: "Iniciar", argumentos: [] },
            { nombre: "EstablecerAlineacion", argumentos: [1] },
            { nombre: "DescargarImagenDeInternetEImprimir", argumentos: ["https://i.postimg.cc/02PKCgMG/nyc-logo.png", 283, 0, false] },
            { nombre: "Iniciar", argumentos: [] },
            { nombre: "Feed", argumentos: [2] },
            { nombre: "EstablecerTamañoFuente", argumentos: [3, 3] },
            { nombre: "EstablecerEnfatizado", argumentos: [false] },
            { nombre: "EstablecerAlineacion", argumentos: [1] },
            { nombre: "EstablecerSubrayado", argumentos: [false] },
            { nombre: "EstablecerImpresionAlReves", argumentos: [false] },
            { nombre: "EstablecerImpresionBlancoYNegroInversa", argumentos: [false] },
            { nombre: "EstablecerRotacionDe90Grados", argumentos: [false] },
            { nombre: "EscribirTexto", argumentos: [data.tracking_number] },
            { nombre: "Feed", argumentos: [1] },
            { nombre: "Feed", argumentos: [1] },
            { nombre: "Iniciar", argumentos: [] },
            { nombre: "EstablecerAlineacion", argumentos: [1] },
            { nombre: "ImprimirCodigoQr", argumentos: [data.tracking_number, 302, 1, 0] },
            { nombre: "Iniciar", argumentos: [] },
            { nombre: "Feed", argumentos: [1] },
            { nombre: "EstablecerTamañoFuente", argumentos: [2, 2] },
            { nombre: "EstablecerEnfatizado", argumentos: [false] },
            { nombre: "EstablecerAlineacion", argumentos: [1] },
            { nombre: "EstablecerSubrayado", argumentos: [true] },
            { nombre: "EstablecerImpresionAlReves", argumentos: [false] },
            { nombre: "EstablecerImpresionBlancoYNegroInversa", argumentos: [false] },
            { nombre: "EstablecerRotacionDe90Grados", argumentos: [false] },
            { nombre: "EscribirTexto", argumentos: ["REMITENTE:"] },
            { nombre: "Feed", argumentos: [1] },
            { nombre: "Feed", argumentos: [1] },
            { nombre: "EstablecerTamañoFuente", argumentos: [2, 2] },
            { nombre: "EstablecerEnfatizado", argumentos: [false] },
            { nombre: "EstablecerAlineacion", argumentos: [1] },
            { nombre: "EstablecerSubrayado", argumentos: [false] },
            { nombre: "EstablecerImpresionAlReves", argumentos: [false] },
            { nombre: "EstablecerImpresionBlancoYNegroInversa", argumentos: [false] },
            { nombre: "EstablecerRotacionDe90Grados", argumentos: [false] },
            { nombre: "EscribirTexto", argumentos: [data.sender] },
            { nombre: "Feed", argumentos: [1] },
            { nombre: "Feed", argumentos: [1] },
            { nombre: "EstablecerTamañoFuente", argumentos: [2, 2] },
            { nombre: "EstablecerEnfatizado", argumentos: [false] },
            { nombre: "EstablecerAlineacion", argumentos: [1] },
            { nombre: "EstablecerSubrayado", argumentos: [true] },
            { nombre: "EstablecerImpresionAlReves", argumentos: [false] },
            { nombre: "EstablecerImpresionBlancoYNegroInversa", argumentos: [false] },
            { nombre: "EstablecerRotacionDe90Grados", argumentos: [false] },
            { nombre: "EscribirTexto", argumentos: ["DESTINATARIO:"] },
            { nombre: "Feed", argumentos: [1] },
            { nombre: "Feed", argumentos: [1] },
            { nombre: "EstablecerTamañoFuente", argumentos: [2, 2] },
            { nombre: "EstablecerEnfatizado", argumentos: [false] },
            { nombre: "EstablecerAlineacion", argumentos: [1] },
            { nombre: "EstablecerSubrayado", argumentos: [false] },
            { nombre: "EstablecerImpresionAlReves", argumentos: [false] },
            { nombre: "EstablecerImpresionBlancoYNegroInversa", argumentos: [false] },
            { nombre: "EstablecerRotacionDe90Grados", argumentos: [false] },
            { nombre: "EscribirTexto", argumentos: [data.recipient] },
            { nombre: "Feed", argumentos: [1] },
            { nombre: "Feed", argumentos: [7] },
            { nombre: "CorteParcial", argumentos: [] }
        ]
    };

    try {
        const response = await fetch("http://localhost:2811/imprimir", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (result.ok === true) {
            return true;
        } else {
            showNotification('error', 'Error al imprimir el ticket, compruebe la impresora y reimprima manualmente');
            return false;
        }
    } catch (error) {
        showNotification('error', 'El servicio de impresión no esta disponible, reimprima manualmente');
    }
}

// ============= Funciones de Escaneo QR =============
async function qrScanSuccess(decodedText) {
    await scanner.clear();

    qrSpinner.classList.remove('d-none');

    try {
        const response = await fetch(`/api/v1/update_shipment/${decodedText}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        const data = await response.json();

        if (response.ok) {
            showNotification('success', data.message);
            qrModal.hide();
            table.ajax.reload();
        } else {
            showNotification('error', data.message);
        }
    } catch (error) {
        showNotification('error', 'Error al actualizar el estado del envío');
    } finally {
        qrSpinner.classList.add('d-none');
        qrModal.hide();
    }
}

// ============= Event Listeners =============
// Inicialización
document.addEventListener('DOMContentLoaded', function () {
    initializeTable();
});

// Event Listeners - Modal de Envíos
showShipment.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/v1/packages_categories/');
        const data = await response.json();

        if (!response.ok) {
            throw new Error();
        }

        typeSelect.innerHTML = '';
        priceSelect.innerHTML = '';

        data.package_types.forEach(type => {
            typeSelect.innerHTML += `<option value="${type.id}">${type.name}</option>`;
        });

        data.package_prices.forEach(price => {
            priceSelect.innerHTML += `<option value="${price.id}">${price.name} - $${price.mount}</option>`;
        });

        shipmentModal.show();
    } catch {
        showNotification('error', 'Error contacte con el administrador');
    }
});

shipmentButton.addEventListener('click', async () => {
    shipmentButton.classList.add('disabled');
    shipmentForm.classList.add('d-none');
    shipmentSpinner.classList.remove('d-none');

    const formData = new FormData(shipmentForm);

    const sender = formData.get('sender');
    const envelopeAmount = formData.get('envelope_amount');

    formData.set('sender', !sender || sender === '' ? 'N&C' : sender);
    formData.set('envelope_amount', !envelopeAmount || envelopeAmount === '' ? 0 : envelopeAmount);

    formData.append('package_type', typeSelect.value);
    formData.append('package_amount', priceSelect.value);
    formData.append('package_pickup', packageCheckbox.checked);

    const formDataObject = Object.fromEntries(formData);

    try {
        const response = await fetch('/api/v1/create_shipment/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(formDataObject)
        });
        const data = await response.json();

        if (!response.ok) {
            showNotification('error', data.message);
            return;
        }

        printQR(data.shipment);

        showNotification('success', data.message);
        shipmentModal.hide();

        table.ajax.reload();
    } catch (error) {
        showNotification('error', 'Error al contactar con el servidor');
    } finally {
        shipmentButton.classList.remove('disabled');
        shipmentForm.classList.remove('d-none');
        shipmentSpinner.classList.add('d-none');
    }
});

typeSelect.addEventListener('change', function () {
    if (this.options[this.selectedIndex].text.toLowerCase() === 'turismo') {
        senderInput.disabled = true;
        senderInput.value = '';
        senderContainer.classList.add('d-none');

        envelopeInput.disabled = true;
        envelopeInput.value = '';
        envelopeContainer.classList.add('d-none');

        packageCheckbox.disabled = true;
        packageCheckbox.checked = false;
        packageContainer.classList.add('d-none');
    } else {
        senderInput.disabled = false;
        senderContainer.classList.remove('d-none');

        envelopeInput.disabled = false;
        envelopeContainer.classList.remove('d-none');

        packageCheckbox.disabled = false;
        packageContainer.classList.remove('d-none');
    }
});

shipmentModal._element.addEventListener('hidden.bs.modal', function () {
    shipmentForm.reset();

    senderInput.disabled = false;
    senderContainer.classList.remove('d-none');

    envelopeInput.disabled = false;
    envelopeContainer.classList.remove('d-none');

    packageCheckbox.disabled = false;
    packageCheckbox.checked = false;
    packageContainer.classList.remove('d-none');

    typeSelect.innerHTML = '';
    priceSelect.innerHTML = '';
});

// Event Listeners - Modal QR
scanQr.addEventListener('click', () => {
    scanner = new Html5QrcodeScanner("qr-reader", {
        fps: 10,
        qrbox: 250,
        showTorchButtonIfSupported: true,
        qrScanSuccess
    });

    scanner.render(qrScanSuccess);
    qrModal.show();
});

qrModal._element.addEventListener('hide.bs.modal', async function () {
    if (scanner) {
        scanner.clear();
    }
});

// Event Listeners - Modal Configuración
showConfig.addEventListener('click', async () => {
    try {
        const response = await fetch("http://localhost:2811/impresoras");
        const printerList = await response.json();

        printerSelect.innerHTML = '';

        printerList.forEach(printer => {
            printerSelect.innerHTML += `<option value="${printer}">${printer}</option>`;
        });
    } catch (e) {
        console.log(e);
    }

    configModal.show();
});

printerButton.addEventListener('click', () => {
    const selectedPrinter = printerSelect.value;
    document.cookie = `selectedPrinter=${selectedPrinter};path=/;max-age=31536000`;
    configModal.hide();
});