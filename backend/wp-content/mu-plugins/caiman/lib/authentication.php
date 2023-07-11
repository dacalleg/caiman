<?php

add_filter(
    'jwt_auth_payload',
    function ( $payload, $user ) {
        $u = array();
        $u['id'] = $user->ID;
        $u['name'] = $user->display_name;
        $u['email'] = $user->user_email;
        $u['roles'] = $user->roles;
        $payload["email"] = $user->user_email;
        $payload["id_app"] = $user->user_email;
        $payload["id_brand"] = $_ENV["AGUA_ID_BRAND"];
        $payload["customer_code"] = $_ENV["AGUA_CUSTOMER_CODE"];
        $payload["data"]["user"] = $u;
        $payload["auth0"] = "true";
        $payload["id"] = $_ENV["JWT_ID_FIELD"];
        return $payload;
}, 10, 2);

add_filter( 'jwt_auth_iss', function( $args ){
    return $_ENV["JWT_ISS_FIELD"];
}, 10, 1);


add_filter('jwt_auth_expire', function ( $expire, $issued_at ) {
        return time() + 86400;
}, 10, 2);

add_filter( 'jwt_auth_whitelist', function ( $endpoints ) {
    $your_endpoints = array(
        '/wp-json/caiman/v1/forgot-password',
        '/wp-json/caiman/v1/reset-password',
        '/wp-json/caiman/v1/register',
        '/wp-json/caiman/v1/confirm',
        '/wp-json/caiman/v1/info',
    );

    return array_unique( array_merge( $endpoints, $your_endpoints ) );
});
