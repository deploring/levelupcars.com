"use strict";

const SELECT_RATE = "select";
const FLAT_RATE = "flat";
const LABOR_FLAT_RATE_DESC = "Labour flat rate";
let servicesData;
let productsData;
let selectedServices = [];

function initialise() {
    $.ajax({
        url: "services_data.json",
        dataType: 'json',
        success: function (json) {
            servicesData = json["services"];
            productsData = json["products"];
            populatePage();

            $('#loading').addClass('hidden');
            $('#collapseControls').removeClass('hidden');
        }
    });
}

function addToolTip(element, tooltipText) {
    element.attr('data-toggle', 'tooltip');
    element.attr('data-placement', 'top');
    element.attr('title', tooltipText);
    element.tooltip();
}

function removeToolTip(element) {
    element.tooltip('destroy');
}

function getProductData(productId) {
    let foundProduct;
    $.each(productsData, function (index, product) {
        if (product["id"] === productId) {
            foundProduct = product;
        }
    });
    console.assert(foundProduct !== undefined);
    return foundProduct;
}

function getServiceData(serviceId) {
    let foundService;
    $.each(servicesData, function (index, service) {
        if (service["id"] === serviceId) {
            foundService = service;
        }
    });
    console.assert(foundService !== undefined);
    return foundService;
}

function getLabourCharge(service, selectedLabourDesc) {
    if (service["labourPricingType"] === SELECT_RATE) {
        let foundPrice;
        $.each(service["labourPricing"]["descriptions"], function (index, labourDesc) {
            if (labourDesc === selectedLabourDesc) {
                foundPrice = service["labourPricing"]["prices"][index];
            }
        });
        console.assert(foundPrice !== undefined);
        return foundPrice;
    } else {
        console.assert(service["labourPricingType"] === FLAT_RATE);
        console.assert(selectedLabourDesc === LABOR_FLAT_RATE_DESC);
        return service["labourPricing"];
    }
}

function setServiceCharges(service, selectedLabourDesc) {
    let serviceId = service["id"];
    let productCharge = service["productPricing"];
    let labourCharge = getLabourCharge(service, selectedLabourDesc);

    let serviceAddButtonElement = $('#' + serviceId + 'Button');
    serviceAddButtonElement.removeAttr('disabled');
    removeToolTip(serviceAddButtonElement);

    $('#' + serviceId + 'LabourCost').html(
        '<span class="bi bi-person-gear"></span> ' + selectedLabourDesc + ' charge: $' + labourCharge.toFixed(2)
    );
    $('#' + serviceId + 'Total').text('($' + Number(productCharge + labourCharge).toFixed(2) + ')');
}

function getSelectedLabourDesc(service) {
    if (service["labourPricingType"] === FLAT_RATE) return LABOR_FLAT_RATE_DESC;
    else return $('#' + service["id"] + 'Heading select').find(":selected").val();
}

function onSelectCarType(serviceId) {
    let service = getServiceData(serviceId);
    setServiceCharges(service, getSelectedLabourDesc(service));

    if (selectedServices.includes(serviceId)) {
        updateTotals();
    }
}

function updateTotals() {
    let total = 0;
    $.each(servicesData, function (index, service) {
        if (selectedServices.includes(service["id"])) {
            total += service["productPricing"];
            total += getLabourCharge(service, getSelectedLabourDesc(service));
        }
    });

    if (total > 0) {
        $('#noServicesSelectedGuidance').addClass('hidden');
        $('#totalAndRequestContainer').removeClass('hidden');
        $('#total').text('$' + total.toFixed(2));
    } else {
        $('#noServicesSelectedGuidance').removeClass('hidden');
        $('#totalAndRequestContainer').addClass('hidden');
    }
}

function onToggleServiceSelection(serviceId) {
    let selected = selectedServices.includes(serviceId);
    let serviceSelectButtonElement = $('#' + serviceId + 'Button');

    if (serviceSelectButtonElement.attr('disabled') !== undefined) return;

    if (selected) {
        selectedServices.splice(selectedServices.indexOf(serviceId), 1);
        serviceSelectButtonElement.removeClass('btn-danger');
        serviceSelectButtonElement.addClass('btn-success');
        serviceSelectButtonElement.text('Add');
    } else {
        selectedServices.push(serviceId);
        serviceSelectButtonElement.removeClass('btn-success');
        serviceSelectButtonElement.addClass('btn-danger');
        serviceSelectButtonElement.text('Remove');
    }

    updateTotals();
}

function populatePage() {
    $.each(servicesData, function (index, service) {
        let serviceId = service["id"];
        let productPricing = service["productPricing"];

        $('#services').append(
            '<div class="panel panel-default">' +
            '    <div class="panel-heading" role="tab" id="' + serviceId + 'Heading">' +
            '        <div class="panel-title-container">' +
            '            <h4 class="panel-title">' +
            '                <a role="button" data-toggle="collapse" href="#' + serviceId + 'Collapse"' +
            '                   aria-expanded="false" aria-controls="' + serviceId + 'Collapse">' +
            '                    ' + service["name"] + ' <span id="' + serviceId + 'Total"></span>' +
            '                </a>' +
            '            </h4>' +
            '        </div>' +
            '        <div class="panel-options-container">' +
            '            <a class="btn btn-success" id="' + serviceId + 'Button" onclick="onToggleServiceSelection(\'' + serviceId + '\')" disabled>' +
            '                Add' +
            '            </a>' +
            '        </div>' +
            '    </div>' +
            '    <div id="' + serviceId + 'Collapse" class="panel-collapse collapse" role="tabpanel" aria-labelledby="' + serviceId + 'Heading">' +
            '        <div class="panel-body">' +
            '            <h4>Summary</h4>' +
            '            <p>' + service["summary"] + '</p>' +
            '            <h4>Price Breakdown</h4>' +
            '            <ul>' +
            '              <li><span class="bi bi-cart"></span> Product flat rate charge: $' + productPricing.toFixed(2) + '</li>' +
            '              <li id="' + serviceId + 'LabourCost"></li>' +
            '            </ul>' +
            '            <h4>Service Actions</h4>' +
            '            <ul id="' + serviceId + 'Actions">' +
            '            </ul>' +
            '            <h4>Products Consumed</h4>' +
            '            <div id="' + serviceId + 'Products"></div>' +
            '        </div>' +
            '    </div>' +
            '</div>'
        );

        let serviceHeadingElement = $('#' + serviceId + 'Heading');
        let serviceSelectButtonElement = $('#' + serviceId + 'Button');
        let laborPricingType = service["labourPricingType"];

        if (laborPricingType === SELECT_RATE) {
            serviceHeadingElement.find('.panel-options-container').prepend(
                '<label>' +
                '    Select car type:' +
                '    <select class="form-control" onchange="onSelectCarType(\'' + serviceId + '\')">' +
                '      <option disabled selected></option>' +
                '    </select>' +
                '</label>'
            );
            let serviceSelectElement = serviceHeadingElement.find('select');
            let carType;
            for (carType of service["labourPricing"]["descriptions"]) {
                serviceSelectElement.append('<option>' + carType + '</option>');
            }

            $('#' + serviceId + 'LabourCost').html(
                '<em><span class="bi bi-exclamation-circle"></span> Please select a car type to see the labour charge.</em>'
            );

            addToolTip(serviceSelectButtonElement, 'Please select a car type before adding this service.');
        } else {
            console.assert(laborPricingType === FLAT_RATE);
            setServiceCharges(service, LABOR_FLAT_RATE_DESC);
        }

        let serviceActionsListElement = $('#' + serviceId + 'Actions');
        let action;
        for (action of service["actions"]) {
            serviceActionsListElement.append('<li>' + action + '</li>');
        }

        let serviceProductsListElement = $('#' + serviceId + 'Products');
        let productId;
        for (productId of service["products"]) {
            let product = getProductData(productId);
            let productName = product["name"];
            let productImage = serviceProductsListElement.append(
                '<a href="' + product["link"] + '" class="product">' +
                '  <img src="' + product["image"] + '" alt="' + productName + '"/>' +
                '</a>'
            ).find(":last-child img");
            addToolTip(productImage, productName);
        }
    });
}

function onExpandAll() {
    $('.collapse').collapse('show');
}

function onCollapseAll() {
    $('.collapse').collapse('hide');
}

$(function () {
    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
    });

    initialise();
});