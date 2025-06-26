const orderModal = document.getElementById('orderModal');
const orderInstance = bootstrap.Modal.getOrCreateInstance(orderModal);
const detailModal = document.getElementById('detailModal');
const detailInstance = bootstrap.Modal.getOrCreateInstance(detailModal);

const orderForm = document.getElementById("orderForm");
const inputsForm = orderForm.querySelectorAll('[name]');
const envelopeInput = document.getElementById('envelopeInput');
const envelope_amount = document.getElementById('envelope_amount');
const addressInput = document.getElementById('addressInput');

const showOrderModal = document.getElementById("showOrderModal");
const createOrderButton = document.getElementById("createOrderButton");
const confirmOrderButton = document.getElementById('confirmOrderButton');
const pickupCheckbox = document.getElementById('pickupCheckbox');
const payCheckbox = document.getElementById('payCheckbox');

const provinceSelect = document.getElementById('provinceSelect');
const localitySelect = document.getElementById('localitySelect');

const alpineOrder = Alpine.$data(orderModal);
let table;

document.addEventListener('DOMContentLoaded', function () {
    initializeTable();
});

function showNotification(icon, title, timer = 3000){
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: timer,
        showClass: {
            popup: `
                animate__animated
                animate__fadeInRight
                animate__faster
            `
        },
        hideClass: {
            popup: `
                animate__animated
                animate__fadeOutRight
                animate__faster
            `
        }
    });

    Toast.fire({
        icon: icon,
        title: title
    });
};

function showDetails(data) {
    console.log(data);
    return (
        `
        <div class="d-flex flex-column my-2" id="detailOrder">
            <div class="text-center mb-3">
                <h2 class="text-decoration-underline link-offset-1 fs-4">Detalles de la orden</h2>
            </div>
            <div class="d-flex flex-column flex-lg-row align-items-center justify-content-center justify-content-md-around mb-3">
                <div class="shipment-details text-center">
                    <p><strong>Fecha de creacion:</strong> ${data.creation_date}</p>
                    <p><strong>Numero de seguimiento:</strong> ${data.tracking_number}</p>
                    <p><strong>Proveedor:</strong> ${data.supplier}</p>
                    <p><strong>Cliente:</strong> ${data.customer}</p>
                </div>
                <div class="shipment-status text-center">
                    <p><strong>Fecha de entrega:</strong> ${data.update_date}</p>
                    <p><strong>Numero de telefono:</strong> ${data.phone}</p>
                    <p><strong>Estado:</strong> ${data.status.name}</p>
                    <div class="d-flex align-items-center justify-content-center gap-2">
                        <button type="button" class="btn btn-success fw-medium>Confirmar</button>
                        <button type="button" class="btn btn-danger fw-medium">Eliminar</button>
                    </div>
                </div>
            </div>
        </div>
        `
    );
};

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
};  

function initializeTable() {
    if (table) {
        table.destroy();
        $('#ordersTableReceived').empty();
    }

    table = new DataTable('#ordersTableReceived', {
        ajax: {
            url: '/api/v1/orders/',
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
                data: null,
                defaultContent: '<i class="ti ti-id fs-4"></i>'
            },
            { 
                data: 'tracking_number',
                responsivePriority: 2
            },
            { 
                data: 'supplier',
                responsivePriority: 3
            },
            { 
                data: 'customer',
                responsivePriority: 1
            },
            { 
                data: 'total_amount',
                responsivePriority: 4
            },
            {
                data: 'creation_date',
                visible: false
            },
            {
                data: 'locality',
                visible: false
            },
        ],
        ordering: false,
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
};

showOrderModal.addEventListener('click', async () => {
    provinceSelect.replaceChildren(provinceSelect.firstElementChild);
    provinceSelect.selectedIndex = 0;
    orderInstance.show();

    try {
        let response = await fetch('https://apis.datos.gob.ar/georef/api/provincias');
        let data = await response.json();

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const naturalSort = (a, b) => {
            return a.nombre.localeCompare(
                b.nombre,
                'es',
                {
                    sensitivity: 'base',
                    numeric: true
                }
            );
        };

        const orderedProvinces = data.provincias.sort(naturalSort);

        const allowedProvinceIds = ['02', '06', '14', '18', '22', '30', '34', '82'];

        orderedProvinces
            .filter(province => allowedProvinceIds.includes(province.id.toString()))
            .forEach(province => {
                let option = document.createElement('option');
                option.value = province.nombre;
                option.text = province.nombre;
                provinceSelect.appendChild(option);
            });
    } catch (error) {
        console.error(error);
        return;
    }
});

document.getElementById('confirmOrderButton').addEventListener('click', async () => {
    console.log('Hago click');
    detailInstance.show();
});

orderInstance._element.addEventListener('hidden.bs.modal', () => {        
    alpineOrder.showAddress = false;
    alpineOrder.showEnvelope = false;

    provinceSelect.replaceChildren(provinceSelect.firstElementChild);
    localitySelect.replaceChildren(localitySelect.firstElementChild);

    provinceSelect.selectedIndex = 0;
    localitySelect.selectedIndex = 0;

    inputsForm.forEach(inputElement => {
        inputElement.classList.remove('is-invalid');
    });

    orderForm.reset();
});

provinceSelect.addEventListener('change', async (e) => {
    let provinceId = e.target.value;

    localitySelect.replaceChildren(localitySelect.firstElementChild);
    localitySelect.selectedIndex = 0;

    try {
        let response = await fetch(`https://apis.datos.gob.ar/georef/api/municipios?provincia=${provinceId}&campos=id,nombre&max=1000`);
        let data = await response.json();

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const naturalSort = (a, b) => {
            return a.nombre.localeCompare(
                b.nombre,
                'es',
                {
                    sensitivity: 'base',
                    numeric: true
                }
            );
        };

        const orderedLocations = data.municipios.sort(naturalSort);

        orderedLocations.forEach(locality => {
            let option = document.createElement('option');
            option.value = locality.nombre;
            option.textContent = locality.nombre;
            localitySelect.appendChild(option);
        });
    } catch (error) {
        console.error(error);
        localitySelect.innerHTML = '<option selected disabled>Error</option>';
        return;
    }
});

window.createOrder = async () => {
    let formData = new FormData(orderForm);
    alpineOrder.loading = true;

    try {
        let response = await fetch('/api/v1/create_order/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        let data = await response.json();

        if (!response.ok) {
            if (response.status === 400) {
                inputsForm.forEach(inputElement => {
                    const errorFields = data.fields;
                    const fieldName = inputElement.name;
    
                    if (errorFields.includes(fieldName)) {
                        inputElement.classList.add('is-invalid');
                    } else {
                        inputElement.classList.remove('is-invalid');
                    }
                });
 
                showNotification(data.type, data.message);
                return;
            }
        }
        
        showNotification(data.type, data.message);

        orderForm.reset();
        orderInstance.hide();
    } catch (error) {
        console.log(error.message);
        return;
    } finally {
        alpineOrder.loading = false;
    }
};

window.confirmOrder = async (trackingNumber) => {
    try {
        let response = await fetch(`/api/v1/complete_order/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCookie('csrftoken'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tracking_number: trackingNumber
            })
        });
        let data = await response.json();

        if (!response.ok) {
            showNotification(data.type, data.message);
            return;
        }

        showNotification(data.type, data.message);
        table.ajax.reload();
    } catch (error) {
        console.log(error.message);
        return;
    }
};