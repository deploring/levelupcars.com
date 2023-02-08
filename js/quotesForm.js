"use strict";

function getSelectedServicesWithCarTypes() {
    let result = [];
    let selectedService;
    for (selectedService of selectedServices) {
        let service = getServiceData(selectedService);
        let labourPricingType = getServiceData(selectedService)["labourPricingType"];
        if (labourPricingType === FLAT_RATE) {
            result.push(selectedService);
        } else {
            console.assert(labourPricingType === SELECT_RATE);
            result.push(selectedService + '=' + getSelectedLabourDesc(service));
        }
    }
    return result;
}

function getJSONRequest() {
    return JSON.stringify({
        clientName: $('#inputClientName').val(),
        emailAddress: $('#inputEmailAddress').val(),
        phoneNumber: $('#inputPhoneNumber').val(),
        postCode: $('#inputPostCode').val(),
        requestedDate: $('#inputRequestedDate').val(),
        carModel: $('#inputCarModel').val(),
        details: $('#inputDetails').val(),
        selectedServices: getSelectedServicesWithCarTypes()
    });
}

function showSubmitError(message) {
    $('#formErrorsGuidance').removeClass('hidden');
    $('#formErrorsGuidanceText').text('Could not submit: ' + message);
}

function handleError(xhr) {
    $('#submitRequest').removeClass('disabled');

    if (xhr.responseText === "") {
        showSubmitError('the server returned an unexpected response. Please try again later.');
    } else {
        let response = JSON.parse(xhr.responseText);
        console.assert(Number(response["status"]) === Number(xhr.status));

        switch (response.status) {
            case 400:
                showSubmitError('the server rejected your request. Please try again later.');
                console.log("Specific error was: " + response["message"]);
                break;
            case 429:
                showSubmitError('you can only submit a maximum of 3 requests in a 24 hour timespan.');
                break;
            case 500:
                showSubmitError('the server was not able to process your request. Please try again later.');
                console.log("Specific error was: " + response["message"]);
                break;
        }
    }
}

function submit() {
    let valid = validateClientName()
    valid = validateEmailAddress() && valid;
    valid = validatePhoneNumber() && valid;
    valid = validatePostCode() && valid;
    valid = validateRequestedDate() && valid;
    valid = validateCarModel() && valid;

    let formErrorsGuidanceElement = $('#formErrorsGuidance');
    formErrorsGuidanceElement.toggleClass('hidden', valid);
    $('#formErrorsGuidanceText').text('Could not submit as there are errors in the form.');

    if (valid) {
        let submitRequestButtonElement = $('#submitRequest');

        if (submitRequestButtonElement.hasClass('disabled')) return;
        submitRequestButtonElement.addClass('disabled');

        $.post(
            "submit_request.php",
            {
                requestData: getJSONRequest()
            }
        ).fail(function (xhr) {
            handleError(xhr);
        }).done(function (xhr) {
            $('#servicesContainer').addClass('hidden');
            $('#totalAndRequestContainer').addClass('hidden');
            $('#requestCompleteContainer').removeClass('hidden');
        });
    }
}

function setFormState(fieldId, valid, errorMessage) {
    $('#form' + fieldId).toggleClass('has-error', !valid);
    $('#form' + fieldId + 'Error').toggleClass('hidden', valid);

    if (!valid) {
        $('#form' + fieldId + 'ErrorMessage').text(errorMessage);
    }
}

function isFieldEmpty(fieldId) {
    return $('#input' + fieldId).val() === '';
}

function validateFieldEmpty(fieldId) {
    let isEmpty = isFieldEmpty(fieldId);

    setFormState(fieldId, !isEmpty, 'This is required.');

    return !isEmpty;
}

function validateRegex(fieldId, regex, errorMessage) {
    let regExp = new RegExp(regex);
    let isMatch = regExp.test($('#input' + fieldId).val());

    setFormState(fieldId, isMatch, errorMessage);

    return isMatch;
}

function validateClientName() {
    return validateFieldEmpty('ClientName') &&
        validateRegex('ClientName', '^[a-zA-Z\\s]+$', 'Please only use letters in your name.');
}

function validateEmailAddress() {
    let isEmpty = isFieldEmpty('EmailAddress');

    if (isEmpty) {
        let valid = !isFieldEmpty('PhoneNumber');
        setFormState('EmailAddress', valid, 'A phone number or email address is required.');
        return valid;
    } else return validateRegex('EmailAddress', '^[a-z0-9!#$%&\'*+\\/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+\\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$', 'Please enter a valid email address.');
}

function validatePhoneNumber() {
    let isEmpty = isFieldEmpty('PhoneNumber');

    if (isEmpty) {
        let valid = !isFieldEmpty('EmailAddress');
        setFormState('PhoneNumber', valid, 'A phone number or email address is required.');
        return valid;
    } else return validateRegex('PhoneNumber', '^[0][23478][0-9]{8}$', 'Please enter a valid Australian phone number starting with 0 without any spaces.');
}

function validatePostCode() {
    return validateFieldEmpty('PostCode') &&
        validateRegex('PostCode', '^([3][0-9]{3})|([8][0-9]{3})$', 'Please enter a valid Victorian postcode.');
}

function validateRequestedDate() {
    let weekdayWarningElement = $('#formRequestedDateWarning');
    let formElement = $('#formRequestedDate');

    weekdayWarningElement.addClass('hidden');
    formElement.removeClass('has-warning');

    let isValid = validateFieldEmpty('RequestedDate');

    if (isValid) {
        let date = new Date($('#inputRequestedDate').val());
        if (date - new Date() <= 0) {
            setFormState('RequestedDate', false, 'Please select a date after today\'s date.');
            isValid = false;
        }

        if (isValid && date.getDay() % 6 !== 0) {
            // This is a weekday.
            weekdayWarningElement.removeClass('hidden');
            formElement.addClass('has-warning');
        }
    }
    return isValid;
}

function validateCarModel() {
    return validateFieldEmpty('CarModel') &&
        validateRegex('CarModel', '^[a-zA-Z\\s0-9]+$', 'Please only use letters and numbers in your car model.');
}