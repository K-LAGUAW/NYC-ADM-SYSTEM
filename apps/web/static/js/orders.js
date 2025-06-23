const showOrder = document.getElementById("showOrder");
const orderForm = document.getElementById("orderForm");
const orderModal = new bootstrap.Modal(document.getElementById('orderModal'));
const alpineOrder = Alpine.$data(document.getElementById('orderForm'));
const provinceSelect = document.getElementById('provinceSelect');
const localitySelect = document.getElementById('localitySelect');

let table;

document.addEventListener('DOMContentLoaded', function () {
    initializeTable();
});

function showDetails(data) {
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
                ${data.status.id === 3 ? `<button class="btn btn-success fw-medium" onclick="completeOrder('${data.tracking_number}')">Confirmar entrega</button>` : ''}
            </div>
        </div>
        `
    );
};

function initializeTable() {
    if (table) {
        table.destroy();
        $('#ordersTable').empty();
    }

    table = new DataTable('#ordersTable', {
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
                orderable: false,
                data: null,
                defaultContent: '<i class="ti ti-id fs-4"></i>'
            },  
            { 
                data: 'tracking_number',
                responsivePriority: 2
            },
            { 
                data: 'sender',
                responsivePriority: 3
            },
            { 
                data: 'recipient',
                responsivePriority: 1
            }
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
};

showOrder.addEventListener('click', async () => {
    provinceSelect.replaceChildren(provinceSelect.firstElementChild);
    provinceSelect.selectedIndex = 0;
    orderModal.show();

    try {
        let response = await fetch('https://apis.datos.gob.ar/georef/api/provincias');
        let data = await response.json();

        const allowedProvinceIds = ['02', '06', '14', '18', '22', '30', '34'];
        data.provincias
            .filter(province => allowedProvinceIds.includes(province.id.toString()))
            .forEach(province => {
                let option = document.createElement('option');
                option.value = province.id;
                option.text = province.nombre;
                provinceSelect.appendChild(option);
            });
    } catch (error) {
        console.error(error);
        return;
    }
});

provinceSelect.addEventListener('change', async (e) => {
    let provinceId = e.target.value;

    localitySelect.replaceChildren(localitySelect.firstElementChild);
    localitySelect.selectedIndex = 0;

    try {
        let response = await fetch(`https://apis.datos.gob.ar/georef/api/municipios?provincia=${provinceId}&campos=id,nombre&max=1000`);
        let data = await response.json();

        data.municipios.forEach(locality => {
            let option = document.createElement('option');
            option.value = locality.id;
            option.text = locality.nombre;
            localitySelect.appendChild(option);
        });
    } catch (error) {
        console.error(error);
        return;
    }
});

orderModal._element.addEventListener('hidden.bs.modal', () => {        
    alpineOrder.showAddress = false;
    alpineOrder.showEnvelope = false;

    provinceSelect.replaceChildren(provinceSelect.firstElementChild);
    localitySelect.replaceChildren(localitySelect.firstElementChild);

    provinceSelect.selectedIndex = 0;
    localitySelect.selectedIndex = 0;

    orderForm.reset();
});
