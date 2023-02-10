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
        $payload["software"] = $_ENV["JWT_SOFTWARE_FIELD"];
        $payload["id"] = $_ENV["JWT_ID_FIELD"];
        return $payload;
    },
    10,
    2
);

function edit_capabilities()
{
    $administrator = get_role('administrator');
    $administrator->add_cap("unfiltered_upload");
}
add_action('init', 'edit_capabilities');


add_filter(
    'jwt_auth_expire',
    function ( $expire, $issued_at ) {
        // Modify the "expire" here.
        return time() + 86400;
    },
    10,
    2
);


function set_other_mime_types( $mime_types ) {
  $mime_types['snet2'] = 'text/plain';
  $mime_types['bin'] = 'application/x-dosexec';
  

  return $mime_types;
}
add_filter( 'upload_mimes', 'set_other_mime_types', 1, 1 );


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
    