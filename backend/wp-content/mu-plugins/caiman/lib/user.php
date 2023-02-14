<?php

require_once __DIR__ . '/utils.php';

function caiman_update_user_language(WP_REST_Request $request)
{
    $user = wp_get_current_user();
    update_field("language", get_language_code(), "user_" . $user->ID);
    return new WP_REST_Response(200);
}

function caiman_confirm_user(WP_REST_Request $request)
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

    update_field("reg_code", "", "user_" . $user->ID);

    $administrators = get_users(array(
        'role__in' => array('administrator'),
    ));

    $headers = array('Content-Type: text/html; charset=UTF-8');

    foreach($administrators as $admin)
    {
        $admin_email = $admin->user_email;
        $admin_language = get_field("language", "user_" . $admin->ID);
        if($admin_language === null || $admin_language === "")
            $admin_language = $_ENV['DEFAULT_LANGUAGE'];
        
        $title = get_translation_value("registration.admin.email.title", array(), $admin_language);
        $message = nl2br(get_translation_value("registration.admin.email.body", array("user_email" => $email), $admin_language));
        wp_mail($admin_email, $title, $message, $headers);
    }

    return new WP_REST_Response(200);
}

function caiman_register_user(WP_REST_Request $request)
{
    $body = $request->get_json_params();
    $email = $body["email"];
    $password = $body["password"];
    $name = $body["name"];
    $surname = $body["surname"];
    $display_name = $surname. " " . $name;
    $wp_user_id = wp_create_user($email, $password, $email);

    if(is_wp_error($wp_user_id))
    {
        return new WP_REST_Response(array('error_code' => $wp_user_id->get_error_code()), 404);
    }

    $reg_code = md5($email . time());
    $wp_user = new WP_User($wp_user_id);
    wp_update_user( array (
        'ID' => $wp_user_id, 
        'display_name' => $display_name,
        'first_name' => $name,
        'last_name' => $surname,
    ));

    $wp_user->set_role( $_ENV["DEFAULT_ROLE"] );

    update_field("user_access", $_ENV["DEFAULT_USER_ACCESS"], "user_" . $wp_user_id);
    update_field("reg_code", $reg_code, "user_" . $wp_user_id);
    update_field("language", get_language_code(), "user_" . $wp_user_id);

    foreach ($body as $key => $value) {
        if($key != "email" && $key != "password" && $key != "name" && $key != "surname")
            update_field($key, $value, "user_" . $wp_user_id);
    }

    $title = get_translation_value("registration.email.title");
    $message = nl2br(get_translation_value("registration.email.body", array("reg_code" => $reg_code, "email" => $email, 'display_name' => $display_name)));
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

function caiman_get_user(WP_REST_Request $request)
{
    $user = wp_get_current_user();
    if($user->ID == 0)
        return new WP_REST_Response(array('error_code' => "user_not_found"), 404);
    $ret = new \stdClass();
    $ret->id = $user->ID;
    $ret->email = $user->user_email;
    $ret->name = $user->first_name;
    $ret->surname = $user->last_name;
    $ret->display_name = $user->display_name;
    $ret->role = $user->roles[0];
    $ret->fields = get_fields("user_" . $user->ID);
    return new WP_REST_Response($ret, 200);
}

add_filter( 'retrieve_password_title', function($title, $user_login, $user_data){
    return get_translation_value("reset.email.title");
}, 10, 3 );

add_filter( 'retrieve_password_message', function($message, $key, $user_login, $user_data){   
    return nl2br(get_translation_value("reset.email.body", array("key" => $key, "user" => $user_login)));
}, 10, 4 );

add_filter( 'wp_password_change_notification_email', function( $wp_password_change_notification_email, $user, $blogname ){   
    $message = get_translation_value("passwordchange.email.body");
    $title = get_translation_value("passwordchange.email.title");
    $wp_password_change_notification_email["subject"] = $title;
    $wp_password_change_notification_email["message"] = nl2br($message);
    return $wp_password_change_notification_email;
}, 10, 3 );

add_action('acf/save_post', function ($post_id) {
    // Check the new value of user access field.
    if( isset($_POST['acf']['field_63eb3dca6b357']) ) {
        $id = str_replace("user_", "", $post_id);
        $wp_user = new WP_User($id);
        if($wp_user->ID == 0 && is_wp_error($wp_user))
            return;
        $roles = $wp_user->roles;
        if(in_array("administrator", $roles))
            return;

        $access = $_POST['acf']['field_63eb3dca6b357'];
        $user_language = get_field("language", "user_" . $id);
        if($user_language === null || $user_language === "")
            $user_language = $_ENV['DEFAULT_LANGUAGE'];

        $title = get_translation_value("user.access.email.title", array(), $user_language);

        if($access == "locked")
            $message = nl2br(get_translation_value("user.access.locked.email.body", array("display_name" => $wp_user->display_name), $user_language));
        if($access == "noexpire")
            $message = nl2br(get_translation_value("user.access.noexpire.email.body", array("display_name" => $wp_user->display_name), $user_language));
        if($access == "expire")
        {
            $expiration = null;
            if(array_key_exists('field_63eb3e3a6b358', $_POST['acf']))
                $expiration = $_POST['acf']['field_63eb3e3a6b358'];

            $re = '/(\w{4})(\w{2})(\w{2})/m';
            $subst = "$3/$2/$1";
            
            $expiration = preg_replace($re, $subst, $expiration);
            
            $message = nl2br(get_translation_value("user.access.expire.email.body", array("display_name" => $wp_user->display_name, "expiration" => $expiration), $user_language));
        }

        $headers = array('Content-Type: text/html; charset=UTF-8');
        wp_mail($wp_user->user_email, $title, $message, $headers);
    }
}, 5, 1);


add_filter( 'authenticate', function($user, $username, $password ){
    if( $user === null || is_wp_error($user))
        return $user;

    $roles = $user->roles;
    if(in_array("administrator", $roles))
        return $user;

    $user_reg_code = get_field("reg_code", "user_" . $user->ID);

    if($user_reg_code !== null && $user_reg_code !== "")
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


add_action( 'rest_api_init', function(){
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
            'callback' => 'caiman_register_user',
            'permission_callback' => '__return_true'
        )
    );
    register_rest_route(
        'caiman/v1',
        '/confirm',
        array(
            'methods' => 'POST',
            'callback' => 'caiman_confirm_user',
            'permission_callback' => '__return_true'
        )
    );
    register_rest_route(
        'caiman/v1',
        '/update-language',
        array(
            'methods' => 'POST',
            'callback' => 'caiman_update_user_language',
            'permission_callback' => '__return_true'
        )
    );
});