<?php

add_action( 'rest_api_init', function () {
    register_rest_route(
        'caiman/v1',
        '/product',
        array(
            'methods'             => 'GET',
            'callback'            => 'caiman_get_product',
            'permission_callback' => '__return_true',
            'args'                => array(
                'key'     => array(
                    'type'     => 'string',
                    'required' => false,
                ),
                'prefix'  => array(
                    'type'     => 'string',
                    'required' => false,
                ),
                'gateway' => array(
                    'type'     => 'string',
                    'required' => false,
                ),
                'lang'    => array(
                    'type'     => 'string',
                    'required' => false,
                ),
            ),
        )
    );
} );

function caiman_get_product( WP_REST_Request $request ) {
    $params = $request->get_params();

    if ( empty( $params['key'] ) && empty( $params['prefix'] ) ) {
        return new WP_REST_Response( array( 'message' => 'key or prefix required' ), 400 );
    }

    $previous_lang = caiman_switch_model_language( $params['lang'] ?? null );

    try {
        if ( ! empty( $params['key'] ) ) {
            $models = caiman_query_models(
                array(
                    'meta_key'   => 'key',
                    'meta_value' => $params['key'],
                )
            );
        } else {
            $models = caiman_query_models(
                array(
                    'meta_key'   => 'prefix',
                    'meta_value' => $params['prefix'],
                )
            );
        }

        if ( empty( $models ) ) {
            return new WP_REST_Response( array( 'message' => 'Product not found' ), 404 );
        }

        $model_post = $models[0];
        $board_id   = get_field( 'board', $model_post->ID );

        if ( ! $board_id ) {
            return new WP_REST_Response( array( 'message' => 'Board not found' ), 404 );
        }

        $board_post = get_post( (int) $board_id );

        if ( ! $board_post || $board_post->post_type !== 'board' || $board_post->post_status !== 'publish' ) {
            return new WP_REST_Response( array( 'message' => 'Board not found' ), 404 );
        }

        $gateway_detail = null;

        if ( ! empty( $params['gateway'] ) ) {
            $gateway_post = caiman_find_gateway_post( (int) $board_id, $params['gateway'] );

            if ( $gateway_post ) {
                $gateway_detail = caiman_format_gateway_detail( $gateway_post );
            }
        }

        return new WP_REST_Response(
            array(
                'model'   => caiman_format_model_detail( $model_post ),
                'board'   => caiman_format_board_detail( $board_post ),
                'gateway' => $gateway_detail,
            ),
            200
        );
    } finally {
        caiman_restore_model_language( $previous_lang );
    }
}
