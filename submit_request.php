<?php
error_reporting(0);

include_once "database_details.php";
assert(!empty($pgHostString));

if (isset($_SERVER["HTTP_CF_CONNECTING_IP"])) {
    $_SERVER['REMOTE_ADDR'] = $_SERVER["HTTP_CF_CONNECTING_IP"];
}

function http_response($responseCode, $message)
{
    echo json_encode(array("status" => $responseCode, "message" => $message));
    http_response_code($responseCode);
}

if (!isset($_POST['requestData'])) {
    http_response(400, 'Data was not supplied.');
    exit();
}

$requestData = json_decode($_POST['requestData'], true);

function get_request_param($paramName)
{
    global $requestData;

    if (isset($requestData[$paramName])) {
        return $requestData[$paramName];
    } else {
        http_response(400, 'Missing request parameter.');
        exit();
    }
}

$clientName = get_request_param('clientName');
$emailAddress = get_request_param('emailAddress');
$phoneNumber = get_request_param('phoneNumber');
$postCode = get_request_param('postCode');
$requestedDate = get_request_param('requestedDate');
$carModel = get_request_param('carModel');
$details = get_request_param('details');
$selectedServices = get_request_param('selectedServices');

function check_param_not_empty($param)
{
    if ($param === "") {
        http_response(400, 'Required parameter was empty.');
        exit();
    }
}

check_param_not_empty($clientName);
check_param_not_empty($postCode);
check_param_not_empty($requestedDate);
check_param_not_empty($carModel);

if (empty($emailAddress) and empty($phoneNumber)) {
    http_response(400, 'Both email address and phone number were empty.');
    exit();
}

function check_regex($param, $regex)
{
    if (preg_match('/' . $regex . '/', $param) !== 1) {
        http_response(400, 'Parameter failed validation check.');
        exit();
    };
}

check_regex($clientName, "^[a-zA-Z\\s]+$");
if (!empty($emailAddress)) {
    check_regex($emailAddress, "^[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$");
}
if (!empty($phoneNumber)) {
    check_regex($phoneNumber, "^[0][23478][0-9]{8}$");
}
check_regex($postCode, "^([3][0-9]{3})|([8][0-9]{3})$");
check_regex($carModel, "^[a-zA-Z\\s0-9]+$");

$requestedDateAsDateTime = null;

try {
    $requestedDateAsDateTime = new DateTime($requestedDate);
    if ($requestedDateAsDateTime <= new DateTime()) {
        http_response(400, 'Requested date is in the past.');
        exit();
    }
} catch (Exception $e) {
    http_response(400, 'Bad date ' . $requestedDate . '.');
    exit();
}

if (count($selectedServices) === 0) {
    http_response(400, 'No services were selected.');
    exit();
}

$servicesData = json_decode(file_get_contents('services_data.json'), true);
$explodedSelectedServices = [];

foreach ($selectedServices as $selectedService) {
    $explodedSelectedService = explode('=', $selectedService);

    $found = false;
    foreach ($servicesData['services'] as $service) {
        if ($explodedSelectedService[0] === $service['id']) {
            $found = true;

            $isSelectLabourPricingType = $service['labourPricingType'] === 'select';

            if ($isSelectLabourPricingType) {
                if (!isset($explodedSelectedService[1])) {
                    http_response(400, 'Expected labour description for ' . $service['name'] . '.');
                    exit();
                } else if (!in_array($explodedSelectedService[1], $service['labourPricing']['descriptions'])) {
                    http_response(400, 'Unknown car type "' . $explodedSelectedService[1] . '".');
                    exit();
                }
            } else {
                $explodedSelectedService[1] = null;
            }
            break;
        }
    }

    $explodedSelectedServices[] = $explodedSelectedService;
    if (!$found) {
        http_response(400, 'Unknown service ' . $selectedService . '.');
        exit();
    }
}

$db = pg_connect($pgHostString);

if (!$db) {
    http_response(500, 'Could not connect to database.');
    exit();
}

function do_safe_query($query, $params)
{
    global $db;

    $resultSet = @pg_query_params($db, $query, $params);

    if (!$resultSet) {
        http_response(500, 'Error in database query.');
        exit();
    }

    return $resultSet;
}

function get_scalar_query_result($query, $params)
{
    return @pg_fetch_result(do_safe_query($query, $params), 0, 0);
}

$existingRequestsCount = get_scalar_query_result(
    ' SELECT ' .
    '   count(*) ' .
    ' FROM ' .
    '   Request ' .
    ' WHERE ' .
    '   Request.RequestIP = $1 AND ' .
    '   Request.RequestTime >= now() - interval \'24 hours\'; ',
    [$_SERVER['REMOTE_ADDR']]
);

if ($existingRequestsCount >= 3) {
    http_response(429, 'You may only submit 3 requests within a 24 hour period.');
    exit();
}

pg_query($db, ' BEGIN TRANSACTION; ');

$requestID = get_scalar_query_result(
    ' INSERT INTO ' .
    '   Request ' .
    '   (RequestIP, ClientName, ClientEmail, ClientPhone, PostCode, RequestedDate, CarModel, Details) ' .
    ' VALUES ' .
    '   ($1, $2, $3, $4, $5, $6, $7, $8) ' .
    ' RETURNING RequestID; ',
    [
        $_SERVER['REMOTE_ADDR'],
        $clientName,
        $emailAddress,
        $phoneNumber,
        $postCode,
        $requestedDate,
        $carModel,
        $details
    ]
);

foreach ($explodedSelectedServices as $explodedSelectedService) {
    do_safe_query(
        ' INSERT INTO ' .
        '   RequestedServices ' .
        '   (RequestID, ServiceID, CarType) ' .
        ' VALUES ' .
        '   ($1, $2, $3); ',
        [$requestID, $explodedSelectedService[0], $explodedSelectedService[1]]
    );
}

pg_query($db, ' COMMIT; ');

pg_close($db);

http_response(200, 'Request created.');