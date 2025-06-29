const orderModal = document.getElementById('orderModal');
const orderInstance = bootstrap.Modal.getOrCreateInstance(orderModal);
const detailModal = document.getElementById('detailModal');
const detailInstance = bootstrap.Modal.getOrCreateInstance(detailModal);

const ordersTable = document.getElementById('ordersTable');
const orderForm = document.getElementById("orderForm");
const inputsForm = orderForm.querySelectorAll('[name]');
const envelopeInput = document.getElementById('envelopeInput');
const envelopeInputValue = document.getElementById('envelopeInputValue');
const phoneInput = document.getElementById('phoneInput');

const showOrderModal = document.getElementById("showOrderModal");
const confirmOrderButton = document.getElementById('confirmOrderButton');

const provinceSelect = document.getElementById('provinceSelect');
const localitySelect = document.getElementById('localitySelect');

let alpineOrder;
let table;
let expandedRows = new Set();

document.addEventListener('DOMContentLoaded', function () {
    initializeTable();
    alpineOrder = Alpine.$data(orderModal);
});

function initializeTable() {
    if (table) {
        table.destroy();
    }

    table = new DataTable(ordersTable, {
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
                data: null,
                defaultContent: '<i class="ti ti-id fs-4 detail-control" style="cursor: pointer;"></i>',
                responsivePriority: 0,
                searchable: false
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
                responsivePriority: 4,
                searchable: false,
                render: function (data, type, row) {
                    if (type === 'display' || type === 'filter') {
                        if (data > 0) {
                            return `<p class="text-success mb-0 fs-6 fw-bold">${data}</p>`;
                        } else {
                            return '<i class="ti ti-currency-dollar-off d-block text-danger fs-5 fw-bold" style="line-height: 0;"></i>';
                        }
                    }
                    return data;
                },

            },
            {
                data: 'creation_date',
                visible: false
            },
            {
                data: 'locality',
                visible: false
            },
            {
                title: 'Monto del Sobre',
                data: 'envelope_amount',
                visible: false,
                searchable: false,
                render: function (data, type, row) {
                    if (type === 'display' || type === 'filter' || type === 'sort') {
                        if (data !== null && data !== undefined) {
                            return parseFloat(data).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0, useGrouping: true });
                        }
                        return data;
                    }
                    return data;
                }
            }
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
        },
        dom: "<'mb-2 d-flex justify-content-between p-0 m-0' <'d-inline' B> <f> >" + "<'row'<'col-md-12'tr>>",
        buttons: [
            {
                text: '<i class="ti ti-printer fs-5 d-block"></i>',
                extend: 'print',
                className: 'btn btn-success',
                title: 'Orden de Traslado',
                exportOptions: {
                    columns: [2, 3, 7],
                    rows: function (idx, data, node) {
                        return data.envelope_amount > 0 ? true : false;
                    }
                }
            }
        ]
    });

    table.on('click', '.detail-control', function (e) {
        let tr = e.target.closest('tr');
        let row = table.row(tr);
        let rowData = row.data();
        let trackingNumber = rowData.tracking_number;

        if (row.child.isShown()) {
            row.child.hide();
            expandedRows.delete(trackingNumber);
        } else {
            row.child(showDetails(rowData)).show();
            expandedRows.add(trackingNumber);
        }
    });

    table.on('draw.dt', function () {
        if (expandedRows.size > 0) {
            table.rows().every(function () {
                let rowData = this.data();
                if (rowData && expandedRows.has(rowData.tracking_number)) {
                    if (!this.child.isShown()) {
                        this.child(showDetails(rowData)).show();
                    }
                }
            });
        }
    });
};

function showDetails(data) {
    console.log(data);
    return (
        `
        <div class="d-flex flex-column gap-2 my-2" id="detailOrder">
            <div class="text-center">
                <h2 class="text-decoration-underline link-offset-1 fs-4">Detalles de la orden</h2>
            </div>
            <div class="d-flex flex-column gap-2 flex-lg-row align-items-center justify-content-center justify-content-md-around">
                <div class="d-flex flex-column gap-2 text-center">
                    <p class="mb-0"><strong>Fecha de creación:</strong> ${data.creation_date}</p>
                    <p class="mb-0"><strong>Número de seguimiento:</strong> ${data.tracking_number}</p>
                    <p class="mb-0"><strong>Proveedor:</strong> ${data.supplier}</p>
                    <p class="mb-0"><strong>Cliente:</strong> ${data.customer}</p>
                </div>
                <div class="d-flex flex-column gap-2 text-center">
                    ${data.local_address ? `<p class="mb-0"><strong>Dirección de retiro:</strong> ${data.local_address}</p>` : ''}
                    <p class="mb-0"><strong>Número de telefono:</strong> ${data.phone}</p>
                    <p class="mb-0"><strong>Estado:</strong> ${data.status.name}</p>
                </div>
            </div>
        </div>
        `
    );
};

showOrderModal.addEventListener('click', async () => {
    provinceSelect.replaceChildren(provinceSelect.firstElementChild);
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

orderInstance._element.addEventListener('hidden.bs.modal', () => {        
    alpineOrder.showAddress = false;
    alpineOrder.showEnvelope = false;

    provinceSelect.replaceChildren(provinceSelect.firstElementChild);
    localitySelect.replaceChildren(localitySelect.firstElementChild);

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

phoneInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');

    if (e.target.value.length > 11) {
        e.target.value = e.target.value.slice(0, 11);
    }
});

envelopeInput.addEventListener('input', (e) => {
    let value = e.target.value;
    const cursorPosition = e.target.selectionStart;

    const cleanedValue = value.replace(/[^\d,]/g, '');

    if (!cleanedValue) {
        e.target.value = '';
        envelopeInputValue.value = '';
        return;
    }

    const numericValue = cleanedValue.replace(',', '.');
    const numberValue = parseFloat(numericValue);

    if (isNaN(numberValue)) {
        return;
    }

    envelopeInputValue.value = numberValue;

    const formatter = new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
        useGrouping: true
    });

    const lengthBeforeFormat = value.length;
    const formattedValue = formatter.format(numberValue);
    e.target.value = formattedValue;

    const lengthAfterFormat = formattedValue.length;
    const lengthDifference = lengthAfterFormat - lengthBeforeFormat;
    
    const newCursorPosition = cursorPosition + lengthDifference;
    e.target.setSelectionRange(newCursorPosition, newCursorPosition);
});

window.createOrder = async () => {
    let formData = new FormData(orderForm);

    for (let pair of formData.entries()) {
        console.log(pair[0]+ ': ' + pair[1]);
    }

    alpineOrder.isLoading = true;

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

                showNotification(data.type, data.title, data.message);
                return;
            } /* else if (response.status === 403) {
                showNotification(data.type, data.title, data.message);
                return;
            } */
        }

        showNotification(data.type, data.message);

        if (data.order.supplier_payment) {
            detailInstance._element.querySelector('.modal-body').innerHTML = `
                <div class="d-flex flex-column align-items-center justify-content-center gap-2">
                    <h2 class="text-center text-decoration-underline link-offset-1 fs-4 mb-0">Numero de orden generado</h2>
                    <p class="text-center fw-semibold fs-4 mb-0">${data.order.tracking_number}</p>
                </div>
            `;

            detailInstance.show();
        }

        table.ajax.reload();

        orderForm.reset();
        orderInstance.hide();
    } catch (error) {
        console.log(error.message);
        return;
    } finally {
        alpineOrder.isLoading = false;
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