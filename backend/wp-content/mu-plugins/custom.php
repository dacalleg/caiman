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

add_filter(
    'jwt_auth_payload',
    function ( $payload, $user ) {
        $agua_customer_code = get_field("agua_customer_code", "option");
        $agua_id_brand = get_field("agua_id_brand", "option");

        $u = array();
        $u['id'] = $user->ID;
        $u['name'] = $user->display_name;
        $u['email'] = $user->user_email;
        $u['roles'] = $user->roles;
        $payload["email"] = $user->user_email;
        $payload["id_app"] = $user->user_email;
        $payload["id_brand"] = $agua_id_brand;
        $payload["customer_code"] = $agua_customer_code;
        $payload["data"]["user"] = $u;
        $payload["auth0"] = "true";
        $payload["software"] = "caiman";
        $payload["id"] = "464D7C31-0BBD-462D-A7F8-C03913EED030";
        return $payload;
    },
    10,
    2
);

add_filter(
    'jwt_auth_expire',
    function ( $expire, $issued_at ) {
        // Modify the "expire" here.
        return time() + 86400;
    },
    10,
    2
);

function add_default_options_page() {
    if( function_exists('acf_add_options_page') ) {
        acf_add_options_page();
    }
}
add_action( 'plugins_loaded', 'add_default_options_page' );

add_filter( 'upload_mimes', 'set_other_mime_types', 1, 1 );

function set_other_mime_types( $mime_types ) {
  $mime_types['snet2'] = 'text/plain';

  return $mime_types;
}

function register_caiman_rest_api()
{
    /*remove_filter( 'rest_pre_serve_request', 'rest_send_cors_headers' );
    add_filter( 'rest_pre_serve_request', function( $value ) {
      header( 'Access-Control-Allow-Origin: *' );
      header( 'Access-Control-Allow-Methods: GET' );
      header( 'Access-Control-Allow-Credentials: true' );
      header( 'Access-Control-Expose-Headers: Link', false );
      return $value;
    } );*/
    register_rest_route(
        'caiman/v1',
        '/me',
        array(
            'methods' => 'GET',
            'callback' => 'caiman_get_user',
            'permission_callback' => '__return_true'
        )
    );
    register_rest_route(
        'caiman/v1',
        '/options',
        array(
            'methods' => 'GET',
            'callback' => 'caiman_get_options',
            'permission_callback' => '__return_true'
        )
    );

}


add_action( 'rest_api_init', 'register_caiman_rest_api' );

function caiman_get_user(WP_REST_Request $request)
{
    return new WP_REST_Response(wp_get_current_user(), 200);
}

function caiman_get_options(WP_REST_Request $request)
{
    $ret = new \stdClass();
    $ret->agua_endpoint = get_field('agua_endpoint', 'option');
    $ret->agua_hostname = get_field('agua_hostname', 'option');
    $ret->agua_id_brand = intval(get_field('agua_id_brand', 'option'));
    $ret->agua_customer_code = intval(get_field('agua_customer_code', 'option'));

    return new WP_REST_Response($ret, 200);
}

add_filter( 'rest_model_query', function( $args, $request ){
    if ( $key = $request->get_param( 'key' ) ) {
        $args['meta_key'] = 'key';
        $args['meta_value'] = $key;
    }
    return $args;
}, 10, 2 );
    