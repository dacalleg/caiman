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

function caiman_query_gateways_for_board( $board_id ) {
    $board_specific_posts = get_posts(
        array(
            'numberposts' => -1,
            'post_type'   => 'gateway',
            'post_status' => 'publish',
            'meta_query'  => array(
                array(
                    'key'     => 'board',
                    'value'   => $board_id,
                    'compare' => '=',
                ),
            ),
        )
    );

    $covered_types = array();
    $gateways      = array();

    foreach ( $board_specific_posts as $post ) {
        $type = get_field( 'type', $post->ID );

        if ( $type ) {
            $covered_types[ $type ] = true;
        }

        $gateways[] = caiman_format_gateway_detail( $post );
    }

    $generic_posts = get_posts(
        array(
            'numberposts' => -1,
            'post_type'   => 'gateway',
            'post_status' => 'publish',
            'meta_query'  => array(
                caiman_gateway_has_no_board_meta_query(),
            ),
        )
    );

    foreach ( $generic_posts as $post ) {
        $type = get_field( 'type', $post->ID );

        if ( ! $type || isset( $covered_types[ $type ] ) ) {
            continue;
        }

        $gateways[] = caiman_format_gateway_detail( $post );
    }

    return $gateways;
}

function caiman_gateway_has_no_board_meta_query() {
    return array(
        'relation' => 'OR',
        array(
            'key'     => 'board',
            'compare' => 'NOT EXISTS',
        ),
        array(
            'key'     => 'board',
            'value'   => array( '', '0' ),
            'compare' => 'IN',
        ),
    );
}

function caiman_find_gateway_post( $board_id, $type ) {
    $board_specific_posts = get_posts(
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

    if ( count( $board_specific_posts ) > 0 ) {
        return $board_specific_posts[0];
    }

    $generic_posts = get_posts(
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
                caiman_gateway_has_no_board_meta_query(),
            ),
        )
    );

    return count( $generic_posts ) > 0 ? $generic_posts[0] : null;
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
