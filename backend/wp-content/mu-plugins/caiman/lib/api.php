<?php

add_action( 'rest_api_init', function(){
    register_rest_route(
        'caiman/v1',
        '/gateway/(?P<board>\d+)/(?P<gateway>\w+)',
        array(
            'methods' => 'GET',
            'callback' => 'caiman_get_gateway',
            'permission_callback' => '__return_true'
        )
    );
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
});

function caiman_get_unsecure_file( WP_REST_Request $request ) {
    $params = $request->get_params();
    $md5 = md5_file(get_attached_file($params["attachment"]));
    $url = wp_get_attachment_url($params["attachment"]);
    $parts = parse_url($url);
    $path = "/files" . str_replace("/backend/wp-content/uploads", "", $parts["path"]);
    $unsecure_url = "http://" . $parts["host"] . $path;
    return new WP_REST_Response(array("md5" => $md5, "url" => $unsecure_url), 200);
}

function caiman_get_gateway( WP_REST_Request $request ) {
    $params = $request->get_params();
    $posts = get_posts(array(
        'numberposts'   => -1,
        'post_type'     => 'gateway',
        'fields'          => 'ids',
        'meta_query'    => array(
            'relation'      => 'AND',
            array(
                'key'       => 'type',
                'value'     => $params['gateway'],
                'compare'   => '=',
            ),
            array(
                'key'       => 'board',
                'value'     => $params['board'],
                'compare'   => '=',
            ),
        ),
    ));
    return new WP_REST_Response($posts, 200);
}

function caiman_get_info( WP_REST_Request $request ) {
    return get_fields('options');
}

