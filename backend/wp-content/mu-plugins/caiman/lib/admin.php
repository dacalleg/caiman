<?php

add_filter( 'manage_users_columns', function ( $column ) {
    $column['status'] = 'Login';
    $column['business_name'] = 'Business Name';
    return $column;
});

add_filter( 'manage_users_custom_column', function( $val, $column_name, $user_id ) {
    switch ($column_name) {
        case 'business_name':
            return get_field("business_name", "user_" . $user_id);
        case 'status' :
            $user = get_user_by('id', $user_id);
            $roles = $user->roles;
            if(in_array("administrator", $roles))
                return "-";

            $user_reg_code = get_field("reg_code", "user_" . $user->ID);

            if($user_reg_code !== null && $user_reg_code !== "")
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

function init_op_page()
{
    if( function_exists('acf_add_options_page') ) {
        acf_add_options_page();
    }
}

add_action('acf/init', 'init_op_page');
