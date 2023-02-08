<?php
class ConnectionParams {
    public $host;
    public $port;
    public $dbname;
    public $user;
    public $password;
}
$connectionParams = new ConnectionParams;
$connectionParams->host = 'localhost';
$connectionParams->port = '5433';
$connectionParams->dbname = 'LevelUpCars';
$connectionParams->user = 'XXX';
$connectionParams->password = 'XXX';

$pgHostString = '';
foreach ($connectionParams as $key => $value) {
    $pgHostString = $pgHostString . $key . "=" . $value . " ";
}