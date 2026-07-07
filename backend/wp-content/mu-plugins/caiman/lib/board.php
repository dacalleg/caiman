<?php

add_action( 'rest_api_init', function () {
    register_rest_route(
        'caiman/v1',
        '/board/(?P<id>\d+)',
        array(
            'methods'             => 'GET',
            'callback'            => 'caiman_get_board',
            'permission_callback' => '__return_true',
            'args'                => array(
                'id'   => array(
                    'type'     => 'integer',
                    'required' => true,
                ),
                'lang' => array(
                    'type'     => 'string',
                    'required' => false,
                ),
            ),
        )
    );
} );

function caiman_get_board( WP_REST_Request $request ) {
    $params        = $request->get_params();
    $previous_lang = caiman_switch_model_language( $params['lang'] ?? null );

    try {
        $post = get_post( (int) $params['id'] );

        if ( ! $post || $post->post_type !== 'board' || $post->post_status !== 'publish' ) {
            return new WP_REST_Response( array( 'message' => 'Board not found' ), 404 );
        }

        return new WP_REST_Response( caiman_format_board_detail( $post ), 200 );
    } finally {
        caiman_restore_model_language( $previous_lang );
    }
}

function caiman_format_board_detail( $post ) {
    return array(
        'id'   => $post->ID,
        'name' => $post->post_title,
        'acf'  => get_fields( $post->ID ) ?: array(),
    );
}
