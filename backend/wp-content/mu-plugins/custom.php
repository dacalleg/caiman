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

function html_wp_email_content_type() {
    return 'text/html';
}
add_filter( 'wp_mail_content_type', 'html_wp_email_content_type' );



add_filter( 'manage_users_columns', function ( $column ) {
    $column['status'] = 'Login';
    return $column;
});

add_filter( 'manage_users_custom_column', function( $val, $column_name, $user_id ) {
    switch ($column_name) {
        case 'status' :
            $user = get_user_by('id', $user_id);
            $roles = $user->roles;
            if(in_array("administrator", $roles))
                return "-";

            $user_reg_code = get_field("reg_code", "user_" . $user->ID);

            if($user_reg_code !== null)
                return "Pending";

            $access = get_field("user_access", "user_" . $user->ID);
            if($access == "locked")
                return "Locked";
            if($access == "noexpire")
                return "Granted";
            if($access == "expire")
            {
                $expiration = get_field("expiration", "user_" . $user->ID);
                $now = new DateTime();
                $exp = DateTime::createFromFormat('d/m/Y', $expiration);
                if($exp < $now)
                    return "Expired";
                return "Expire on " . $expiration;
            }
            return "*";            
    }
    return $val;
}, 10, 3 );

add_filter( 'authenticate', function($user, $username, $password ){
    if( $user === null || is_wp_error($user))
        return $user;

    $roles = $user->roles;
    if(in_array("administrator", $roles))
        return $user;

    $user_reg_code = get_field("reg_code", "user_" . $user->ID);

    if($user_reg_code !== null)
        return new WP_Error( 'account_pending', __( '<strong>ERROR</strong>: Your account is pending.' ));

    $access = get_field("user_access", "user_" . $user->ID);
    switch($access)
    {
        case "locked":
            return new WP_Error( 'account_locked', __( '<strong>ERROR</strong>: Your account is locked.' ));
        case "expire":
            $expiration = get_field("expiration", "user_" . $user->ID);
            $now = new DateTime();
            $exp = DateTime::createFromFormat('d/m/Y', $expiration);
            if($exp < $now)
                return new WP_Error( 'account_expired', __( '<strong>ERROR</strong>: Your account has expired.' ));
            return $user;
        case "noexpire":
            return $user;
    }
    return null;
}, 30, 3);

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

add_filter( 'jwt_auth_whitelist', function ( $endpoints ) {
    $your_endpoints = array(
        '/wp-json/caiman/v1/forgot-password',
        '/wp-json/caiman/v1/reset-password',
        '/wp-json/caiman/v1/register',
        '/wp-json/caiman/v1/confirm',
    );

    return array_unique( array_merge( $endpoints, $your_endpoints ) );
});

add_filter( 'retrieve_password_title', function($title, $user_login, $user_data){
    return get_translation_value("reset.email.title", get_language_code());
}, 10, 3 );

add_filter( 'retrieve_password_message', function($message, $key, $user_login, $user_data){   
    return nl2br(get_translation_value("reset.email.body", get_language_code(), array("key" => $key, "user" => $user_login)));
}, 10, 4 );

add_filter( 'wp_password_change_notification_email', function( $wp_password_change_notification_email, $user, $blogname ){   
    $message = get_translation_value("passwordchange.email.body", get_language_code());
    $title = get_translation_value("passwordchange.email.title", get_language_code());
    $wp_password_change_notification_email["subject"] = $title;
    $wp_password_change_notification_email["message"] = nl2br($message);
    return $wp_password_change_notification_email;
}, 10, 3 );

function get_language_code()
{
    $headers = getallheaders();
    $lang = $headers["Language"];
    
    if(!isset($lang))
        $lang = "en";
    return $lang;
}

function get_translation_value($key, $lang, $placeholders=array())
{
    $default = array("base_url" => get_site_url(), "domain_url" => str_replace("/backend", "", get_site_url()));
    $placeholders = array_merge($default, $placeholders);

    $posts = get_posts(array(
        "post_type" => "translation",
        "meta_key" => "code",
        "meta_value" => $lang,
    ));

    if(count($posts) == 0)
        $posts = get_posts(array(
            "post_type" => "translation",
            "meta_key" => "code",
            "meta_value" => "en",
        ));

    $translations = get_field("translations", $posts[0]->ID);
    $message = null;

    foreach($translations as $translation)
    {
        if($translation["key"] == $key){
            $message = $translation["value"];
        }
        $placeholders[$translation["key"]] = $translation["value"];
    }

    if($message == null)
        return "Translation not found";

    foreach($placeholders as $key => $value)
        $message = str_replace("{{".$key."}}", $value, $message);

    return $message;
}

function register_caiman_rest_api()
{
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
    register_rest_route(
        'caiman/v1',
        '/forgot-password',
        array(
            'methods' => 'POST',
            'callback' => 'caiman_forgot_password',
            'permission_callback' => '__return_true'
        )
    );
    register_rest_route(
        'caiman/v1',
        '/reset-password',
        array(
            'methods' => 'POST',
            'callback' => 'caiman_reset_password',
            'permission_callback' => '__return_true'
        )
    );
    register_rest_route(
        'caiman/v1',
        '/register',
        array(
            'methods' => 'POST',
            'callback' => 'caiman_register',
            'permission_callback' => '__return_true'
        )
    );
    register_rest_route(
        'caiman/v1',
        '/confirm',
        array(
            'methods' => 'POST',
            'callback' => 'caiman_confirm',
            'permission_callback' => '__return_true'
        )
    );
}

function caiman_confirm(WP_REST_Request $request)
{
    $body = $request->get_json_params();
    $email = $body["email"];
    $reg_code = $body["reg_code"];

    $user = get_user_by("email", $email);
    if($user == false)
        return new WP_REST_Response(array('error_code' => "user_not_found"), 404);

    $user_reg_code = get_field("reg_code", "user_" . $user->ID);
    if($user_reg_code != $reg_code)
        return new WP_REST_Response(array('error_code' => "invalid_reg_code"), 404);

    delete_field("reg_code", "user_" . $user->ID);

    return new WP_REST_Response(200);
}


function caiman_register(WP_REST_Request $request)
{
    $body = $request->get_json_params();
    $email = $body["email"];
    $password = $body["password"];
    $name = $body["name"];
    $surname = $body["surname"];
    $displayed_name = $surname. " " . $name;
    $wp_user_id = wp_create_user($email, $password, $email);

    if(is_wp_error($wp_user_id))
    {
        return new WP_REST_Response(array('error_code' => $wp_user_id->get_error_code()), 404);
    }

    $reg_code = md5($email . time());
    $wp_user = new WP_User($wp_user_id);
    wp_update_user( array (
        'ID' => $wp_user_id, 
        'display_name' => $displayed_name,
        'first_name' => $name,
        'last_name' => $surname,
    ));

    $wp_user->set_role( $_ENV["DEFAULT_ROLE"] );

    update_field("user_access", $_ENV["DEFAULT_USER_ACCESS"], "user_" . $wp_user_id);
    update_field("reg_code", $reg_code, "user_" . $wp_user_id);

    foreach ($body as $key => $value) {
        if($key != "email" && $key != "password" && $key != "name" && $key != "surname")
            update_field($key, $value, "user_" . $wp_user_id);
    }

    $title = get_translation_value("registration.email.title", get_language_code());
    $message = nl2br(get_translation_value("registration.email.body", get_language_code(), array("reg_code" => $reg_code, "email" => $email, 'displayed_name' => $displayed_name)));
    $headers = array('Content-Type: text/html; charset=UTF-8');
    
    wp_mail( $email, $title, $message, $headers );

    return new WP_REST_Response(200);
}

function caiman_forgot_password(WP_REST_Request $request)
{
    $body = $request->get_json_params();
    $result = retrieve_password($body["user"]);
    if($result)
        return new WP_REST_Response(200);
    else
        return new WP_REST_Response(404);
}

function caiman_reset_password(WP_REST_Request $request)
{
    $body = $request->get_json_params();
    $login = $body["user"];
    $key = $body["key"];
    $password = $body["password"];
    $user = check_password_reset_key($key, $login);
    if(is_wp_error($user))
        return new WP_REST_Response(array('message' => $user->get_error_message()), 404);
    reset_password($user, $password);
    return new WP_REST_Response(200);
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
    
add_filter( 'rest_translation_query', function( $args, $request ){
    if ( $language = $request->get_param( 'language' ) ) {
        $args['meta_key'] = 'code';
        $args['meta_value'] = $language;
    }
    return $args;
}, 10, 2 );

add_filter( 'jwt_auth_iss', function( $args ){
    return $_ENV["JWT_ISS_FIELD"];
}, 10, 1 );

