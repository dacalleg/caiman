<?php

add_action( 'rest_api_init', function(){
    register_rest_route(
        'caiman/v1',
        '/unsecure_file/(?P<attachment>\d+)',
        array(
            'methods' => 'GET',
            'callback' => 'caiman_get_unsecure_file',
            'permission_callback' => '__return_true'
        )
    );
    register_rest_route(
        'caiman/v1',
        '/info',
        array(
            'methods' => 'GET',
            'callback' => 'caiman_get_info',
            'permission_callback' => '__return_true'
        )
    );
    register_rest_route(
        'caiman/v1',
        '/email',
        array(
            'methods' => 'POST',
            'callback' => 'caiman_send_email',
            'permission_callback' => '__return_true'
        )
    );

    register_rest_route( 
        'caiman/v1', 
        '/detail/(?P<uuid>\w+)', 
        array(
            'methods' => 'GET',
            'callback' => 'caiman_order_detail',
            'permission_callback' => '__return_true'
        )
    );

    register_rest_route( 
        'caiman/v1', 
        '/ransom_order', 
        array(
            'methods' => 'POST',
            'callback' => 'caiman_ransom_order',
            'permission_callback' => '__return_true'
        )
    );

    register_rest_route( 
        'caiman/v1', 
        '/use_token', 
        array(
            'methods' => 'POST',
            'callback' => 'caiman_use_token',
            'permission_callback' => '__return_true'
        )
    );
});

function caiman_get_unsecure_file( WP_REST_Request $request ) {
    $params = $request->get_params();
    $md5 = md5_file(get_attached_file($params["attachment"]));
    $url = wp_get_attachment_url($params["attachment"]);
    $parts = parse_url($url);
    $path = "/files" . str_replace("/wp-content/uploads", "", $parts["path"]);
    $unsecure_url = "http://" . $parts["host"] . $path;
    return new WP_REST_Response(array("md5" => $md5, "url" => $unsecure_url), 200);
}

function caiman_get_info( WP_REST_Request $request ) {
    return get_fields('options');
}

function caiman_send_email( WP_REST_Request $request ) {
    $obj = $request->get_json_params();
    $to = $obj['to'];
    $subject = nl2br(get_translation_value($obj['subject'], $obj['placeholders']));
    $body = nl2br(get_translation_value($obj['body'], $obj['placeholders']));
    $headers = array('Content-Type: text/html; charset=UTF-8');

    wp_mail( $to, $subject, $body, $headers );

    return new WP_REST_Response(array('status' => 200));
}


function caiman_order_detail_by_uuid( $uuid ) {
    $args = array(
        'status'        => array('processing', 'completed'), // Accepts a string: one of 'pending', 'processing', 'on-hold', 'completed', 'refunded, 'failed', 'cancelled', or a custom order status.
        'meta_key'      => 'uuid', // Postmeta key field
        'meta_value'    => $uuid, // Postmeta value field
        'meta_compare'  => '=', // Possible values are ‘=’, ‘!=’, ‘>’, ‘>=’, ‘<‘, ‘<=’, ‘LIKE’, ‘NOT LIKE’, ‘IN’, ‘NOT IN’, ‘BETWEEN’, ‘NOT BETWEEN’, ‘EXISTS’ (only in WP >= 3.5), and ‘NOT EXISTS’ (also only in WP >= 3.5). Values ‘REGEXP’, ‘NOT REGEXP’ and ‘RLIKE’ were added in WordPress 3.7. Default value is ‘=’.
        'return'        => 'ids' // Accepts a string: 'ids' or 'objects'. Default: 'objects'.
    );
    $orders = wc_get_orders( $args );

    if(count($orders)>0){
        $ret = new \StdClass();
        $order_id = $orders[0];
        $order = wc_get_order( $order_id );

        $days = 0;
        $tokens = 0;

        if(!$order->get_meta('tokens') && !$order->get_meta('days'))
        {
                foreach ($order->get_items() as $item_id => $item ) {
                     $product = $item->get_product();
                     $days += get_field("days", $product->get_id());
                     $tokens += get_field("tokens", $product->get_id());
                }
                $order->update_meta_data( 'days', $days );
                $order->update_meta_data( 'tokens', $tokens );
        }
        else
        {
            $days = intval($order->get_meta('days'));
            $tokens = intval($order->get_meta('tokens'));
        }

        if($days != 0)
        {
            $ret->exp = $order->get_meta('exp');
            if(!$ret->exp)
            {
                $now = date_create();
                $date_exp = date_add($now,date_interval_create_from_date_string( $days . "days"));
                $ret->exp = $date_exp->format('c');
                $order->update_meta_data('exp', $ret->exp);
            }
        }

        $used = intval($order->get_meta('used') ? $order->get_meta('used') : "0");
        $used = $used + 1;
        $order->update_meta_data( 'used', $used );
        $order->save();

        if($days > 0)
            $ret->days = $days;
        if($tokens > 0)
            $ret->tokens = $tokens;
        $ret->used = $used;
        return $ret;
    }
    return null;
}

function caiman_ransom_order( WP_REST_Request $request )
{
    $user = wp_get_current_user();
    $params = $request->get_json_params();
    $ret = caiman_order_detail_by_uuid($params['uuid']);
    if($ret) {
        if(true || $ret->used == 1) {
            if(isset($ret->tokens)){
                $tokens = get_field("tokens","user_") ? intval(get_field("tokens","user_" . $user->ID)) : 0;
                $tokens += $ret->tokens;
                update_field("tokens", $tokens, "user_" . $user->ID);
            }
            if(isset($ret->exp)){
                $datetime = DateTime::createFromFormat('Y-m-d\TH:i:s+', $ret->exp);
                update_field('flat_license_expiration', $datetime->format('Ymd'), "user_" . $user->ID); 
            }
            $ret = new WP_REST_Response(array('status' => "ok"));
            return $ret;
        } else {
            $ret = new WP_REST_Response(array('message' => "uuid.alreadyused"));
            $ret->set_status( 422 );
            return $ret;
        }
    }

    $ret = new WP_REST_Response(array('message' => "uuid.notfound"));
    $ret->set_status( 404 );
    return $ret;
}


function caiman_order_detail( WP_REST_Request $request ) {
    $params = $request->get_params();
    $ret = caiman_order_detail_by_uuid($params['uuid']);
    if($ret)
        return new WP_REST_Response($ret);
    else {
        $response = new WP_REST_Response(array('message' => "uuid.notfound"));
        $response->set_status( 404 );
        return $response;
    }
}

function caiman_use_token( WP_REST_Request $request ) {
    $user = wp_get_current_user();
    $tokens = get_field("tokens","user_" . $user->ID) ? intval(get_field("tokens","user_" . $user->ID)) : 0;
    if($tokens > 0) {
        update_field("last_token_usage", date('Y-m-d\TH:i:s.000') . 'Z', "user_" . $user->ID);
        update_field("tokens", $tokens - 1, "user_" . $user->ID);
        $ret = new WP_REST_Response(array('status' => "ok"));
        return $ret;
    }
    $ret = new WP_REST_Response(array('message' => "uuid.alreadyused"));
    $ret->set_status( 422 );
    return $ret;
}
