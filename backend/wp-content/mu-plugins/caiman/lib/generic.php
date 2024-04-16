<?php

add_filter( 'wp_mail_content_type', function() {
    return 'text/html';
});

add_action('init', function() {
    $administrator = get_role('administrator');
    $administrator->add_cap("unfiltered_upload");
});

add_filter( 'upload_mimes', function($mime_types) {
    $mime_types['snet2'] = 'text/plain';
    $mime_types['bin'] = 'application/x-dosexec';
    $mime_types['enc'] = 'text/plain';

    return $mime_types;
}, 1, 1 );

function updated_disable_comments_post_types_support() {
    $types = get_post_types();
    foreach ($types as $type) {
       if(post_type_supports($type, 'comments')) {
          remove_post_type_support($type, 'comments');
          remove_post_type_support($type, 'trackbacks');
       }
    }
 }
 add_action('admin_init', 'disable_comments_post_types_support');
 
 /* 2. Hide any existing comments on front end */ 
 function disable_comments_hide_existing_comments($comments) {
    $comments = array();
    return $comments;
 }
 add_filter('comments_array', 'disable_comments_hide_existing_comments', 10, 2);
 
 /* 3. Disable commenting */ 
 function disable_comments_status() {
    return false;
 }
 add_filter('comments_open', 'disable_comments_status', 20, 2);
 add_filter('pings_open', 'disable_comments_status', 20, 2);