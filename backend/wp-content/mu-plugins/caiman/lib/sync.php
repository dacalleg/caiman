<?php

add_action( 'rest_api_init', function () {
    register_rest_route(
        'caiman/v1',
        '/sync',
        array(
            'methods'             => 'GET',
            'callback'            => 'caiman_get_sync_batch',
            'permission_callback' => '__return_true',
            'args'                => array(
                'lang' => array(
                    'type'     => 'string',
                    'required' => false,
                ),
                'keys' => array(
                    'type'     => 'string',
                    'required' => false,
                ),
            ),
        )
    );
} );

function caiman_get_sync_batch( WP_REST_Request $request ) {
    $params        = $request->get_params();
    $previous_lang = caiman_switch_model_language( $params['lang'] ?? null );

    try {
        $models = caiman_query_models();

        if ( ! empty( $params['keys'] ) ) {
            $allowed_keys = array_filter( array_map( 'trim', explode( ',', $params['keys'] ) ) );
            $models       = array_values(
                array_filter(
                    $models,
                    function ( $post ) use ( $allowed_keys ) {
                        $key = get_post_meta( $post->ID, 'key', true );
                        return in_array( $key, $allowed_keys, true );
                    }
                )
            );
        }

        $products   = array();
        $board_keys = array();
        $gateways   = array();

        foreach ( $models as $model_post ) {
            $board_id = get_field( 'board', $model_post->ID );

            if ( ! $board_id ) {
                continue;
            }

            $board_post = get_post( (int) $board_id );

            if ( ! $board_post || $board_post->post_type !== 'board' || $board_post->post_status !== 'publish' ) {
                continue;
            }

            $board_detail = caiman_format_board_detail( $board_post );
            $board_key    = $board_detail['acf']['key'] ?? null;
            $board_id     = (int) $board_post->ID;

            if ( $board_key ) {
                $board_keys[ $board_key ] = true;
            }

            foreach ( caiman_query_gateways_for_board( $board_id ) as $gateway_detail ) {
                $gateway_key = $board_id . ':' . ( $gateway_detail['type'] ?? '' );
                if ( ! isset( $gateways[ $gateway_key ] ) ) {
                    $gateways[ $gateway_key ] = $gateway_detail;
                }
            }

            $products[] = array(
                'key'   => get_post_meta( $model_post->ID, 'key', true ),
                'model' => caiman_format_model_detail( $model_post ),
                'board' => $board_detail,
            );
        }

        return new WP_REST_Response(
            array(
                'products'   => $products,
                'board_keys' => array_keys( $board_keys ),
                'gateways'   => array_values( $gateways ),
            ),
            200
        );
    } finally {
        caiman_restore_model_language( $previous_lang );
    }
}
