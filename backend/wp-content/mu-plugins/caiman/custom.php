<?php
/**
 * Plugin Name: Caiman Web Functions
 * Plugin URI:  https://www.micronovasrl.com
 * Description: Caiman Web Functions.
 * Version:     2.1.3
 * Author:      Daniele Callegaro
 * Author URI:  https://www.micronovasrl.com
 * License:     GPL-3.0
 * Text Domain: caiman
 * Domain Path: /languages
 *
 * @package caiman
 */

require_once __DIR__ . '/lib/authentication.php';
require_once __DIR__ . '/lib/user.php';
require_once __DIR__ . '/lib/admin.php';
require_once __DIR__ . '/lib/generic.php';

add_action( 'rest_api_init', function(){
    remove_filter( 'rest_pre_serve_request', 'rest_send_cors_headers' );
    add_filter( 'rest_pre_serve_request', function( $value ) {
        $http_origin = $_SERVER['HTTP_ORIGIN'];
        if ($http_origin == "http://localhost:4200" || $http_origin == get_site_url())
            header("Access-Control-Allow-Origin: $http_origin");
        header( 'Access-Control-Allow-Headers: *' );
        header( 'Access-Control-Allow-Methods: GET, POST, OPTIONS' );
        header( 'Access-Control-Allow-Credentials: true' );
        header( 'Access-Control-Expose-Headers: Link', false );
        return $value;
    });
    register_rest_route(
        'caiman/v1',
        '/options',
        array(
            'methods' => 'GET',
            'callback' => 'caiman_get_options',
            'permission_callback' => '__return_true'
        )
    );
});

function caiman_get_options(WP_REST_Request $request)
{
    $ret = new \stdClass();

    $ret->agua_endpoint = $_ENV["AGUA_ENDPOINT"];
    $ret->agua_hostname = $_ENV["AGUA_HOSTNAME"];
    $ret->agua_id_brand = intval($_ENV["AGUA_ID_BRAND"]);
    $ret->agua_customer_code = intval($_ENV["AGUA_CUSTOMER_CODE"]);

    return new WP_REST_Response($ret, 200);
}

add_filter( 'rest_model_query', function( $args, $request ){
    if ( $key = $request->get_param( 'key' ) ) {
        $args['meta_key'] = 'key';
        $args['meta_value'] = $key;
    }
    return $args;
}, 10, 2 );
    
add_filter( 'rest_translation_query', function( $args, $request ){
    if ( $language = $request->get_param( 'language' ) ) {
        $args['meta_key'] = 'code';
        $args['meta_value'] = $language;
    }
    return $args;
}, 10, 2 );