<?php

add_action( 'rest_api_init', function () {
    register_rest_route(
        'caiman/v1',
        '/model',
        array(
            'methods'             => 'GET',
            'callback'            => 'caiman_get_models',
            'permission_callback' => '__return_true',
            'args'                => array(
                'key'      => array(
                    'type'     => 'string',
                    'required' => false,
                ),
                'prefix'   => array(
                    'type'     => 'string',
                    'required' => false,
                ),
                'lang'     => array(
                    'type'     => 'string',
                    'required' => false,
                ),
            ),
        )
    );
} );

function caiman_switch_model_language( $lang ) {
    if ( empty( $lang ) || $lang === 'it' ) {
        return null;
    }

    global $sitepress;

    if ( ! isset( $sitepress ) ) {
        return null;
    }

    $previous = $sitepress->get_current_language();
    $sitepress->switch_lang( $lang );

    return $previous;
}

function caiman_restore_model_language( $previous ) {
    if ( $previous === null ) {
        return;
    }

    global $sitepress;

    if ( isset( $sitepress ) ) {
        $sitepress->switch_lang( $previous );
    }
}

function caiman_get_models( WP_REST_Request $request ) {
    $params        = $request->get_params();
    $previous_lang = caiman_switch_model_language( $params['lang'] ?? null );

    try {
        if ( ! empty( $params['key'] ) ) {
            $posts  = caiman_query_models(
                array(
                    'meta_key'   => 'key',
                    'meta_value' => $params['key'],
                )
            );
            $result = array_map( 'caiman_format_model_detail', $posts );
        } elseif ( ! empty( $params['prefix'] ) ) {
            $posts  = caiman_query_models(
                array(
                    'meta_key'   => 'prefix',
                    'meta_value' => $params['prefix'],
                )
            );
            $result = array_map( 'caiman_format_model_detail', $posts );
        } else {
            $posts  = caiman_query_models();
            $result = array_map( 'caiman_format_model_summary', $posts );
        }

        return new WP_REST_Response( $result, 200 );
    } finally {
        caiman_restore_model_language( $previous_lang );
    }
}

function caiman_query_models( $extra_args = array() ) {
    $args = array_merge(
        array(
            'post_type'   => 'model',
            'post_status' => 'publish',
            'numberposts' => -1,
        ),
        $extra_args
    );

    return get_posts( $args );
}

function caiman_format_model_summary( $post ) {
    return array(
        'name' => $post->post_title,
        'key'  => get_post_meta( $post->ID, 'key', true ),
    );
}

function caiman_format_model_detail( $post ) {
    $thumbnail_id = get_post_thumbnail_id( $post->ID );

    return array(
        'id'          => $post->ID,
        'name'        => $post->post_title,
        'description' => wp_strip_all_tags( $post->post_excerpt ),
        'image'       => $thumbnail_id ? wp_get_attachment_url( $thumbnail_id ) : null,
        'acf'         => get_fields( $post->ID ) ?: array(),
    );
}
