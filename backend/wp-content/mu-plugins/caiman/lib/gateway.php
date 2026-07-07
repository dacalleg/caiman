<?php

add_action( 'rest_api_init', function () {
    register_rest_route(
        'caiman/v1',
        '/gateway/(?P<board>\d+)/(?P<gateway>\w+)',
        array(
            'methods'             => 'GET',
            'callback'            => 'caiman_get_gateway',
            'permission_callback' => '__return_true',
            'args'                => array(
                'board'   => array(
                    'type'     => 'integer',
                    'required' => true,
                ),
                'gateway' => array(
                    'type'     => 'string',
                    'required' => true,
                ),
                'lang'    => array(
                    'type'     => 'string',
                    'required' => false,
                ),
            ),
        )
    );
} );

function caiman_find_gateway_post( $board_id, $type ) {
    $posts = get_posts(
        array(
            'numberposts' => 1,
            'post_type'   => 'gateway',
            'post_status' => 'publish',
            'meta_query'  => array(
                'relation' => 'AND',
                array(
                    'key'     => 'type',
                    'value'   => $type,
                    'compare' => '=',
                ),
                array(
                    'key'     => 'board',
                    'value'   => $board_id,
                    'compare' => '=',
                ),
            ),
        )
    );

    return count( $posts ) > 0 ? $posts[0] : null;
}

function caiman_format_gateway_detail( $post ) {
    $acf = get_fields( $post->ID ) ?: array();

    return array(
        'id'            => $post->ID,
        'board'         => $acf['board'] ?? null,
        'type'          => $acf['type'] ?? null,
        'firmware_list' => $acf['firmware'] ?? array(),
    );
}

function caiman_get_gateway( WP_REST_Request $request ) {
    $params        = $request->get_params();
    $previous_lang = caiman_switch_model_language( $params['lang'] ?? null );

    try {
        $post = caiman_find_gateway_post( (int) $params['board'], $params['gateway'] );

        if ( ! $post ) {
            return new WP_REST_Response( null, 200 );
        }

        return new WP_REST_Response( caiman_format_gateway_detail( $post ), 200 );
    } finally {
        caiman_restore_model_language( $previous_lang );
    }
}
