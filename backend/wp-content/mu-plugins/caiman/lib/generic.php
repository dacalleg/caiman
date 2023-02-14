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
  
    return $mime_types;
}, 1, 1 );