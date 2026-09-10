<?php
/**
 * Admin UI and CSV importer for board and model posts.
 *
 * @package import-products
 */

defined( 'ABSPATH' ) || exit;

const IMPORT_PRODUCTS_PAGE_SLUG = 'import-products';
const IMPORT_PRODUCTS_NONCE_ACTION = 'import_products_csv';

add_action( 'admin_menu', 'import_products_register_admin_page' );

function import_products_register_admin_page() {
    add_management_page(
        'Import products',
        'Import products',
        'manage_options',
        IMPORT_PRODUCTS_PAGE_SLUG,
        'import_products_render_admin_page'
    );
}

function import_products_render_admin_page() {
    if ( ! current_user_can( 'manage_options' ) ) {
        wp_die( esc_html__( 'You do not have permission to access this page.', 'import-products' ) );
    }

    $result = null;

    if ( import_products_is_import_request() ) {
        $result = import_products_handle_upload();
    }

    ?>
    <div class="wrap">
        <h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
        <p>
            <?php esc_html_e( 'Upload a CSV file to import boards and model posts. Rows with deleted=1 are skipped.', 'import-products' ); ?>
        </p>

        <?php import_products_render_result_notices( $result ); ?>

        <form method="post" enctype="multipart/form-data">
            <?php wp_nonce_field( IMPORT_PRODUCTS_NONCE_ACTION ); ?>
            <input type="hidden" name="import_products_submit" value="1" />
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row">
                        <label for="import_products_csv"><?php esc_html_e( 'CSV file', 'import-products' ); ?></label>
                    </th>
                    <td>
                        <input
                            type="file"
                            name="import_products_csv"
                            id="import_products_csv"
                            accept=".csv,text/csv"
                            required
                        />
                    </td>
                </tr>
            </table>
            <?php submit_button( __( 'Import', 'import-products' ) ); ?>
        </form>
    </div>
    <?php
}

function import_products_is_import_request() {
    return isset( $_POST['import_products_submit'] )
        && check_admin_referer( IMPORT_PRODUCTS_NONCE_ACTION );
}

function import_products_handle_upload() {
    if ( empty( $_FILES['import_products_csv']['tmp_name'] ) ) {
        return import_products_build_result(
            array(
                'errors' => array(
                    array(
                        'line'    => 0,
                        'message' => __( 'No file uploaded.', 'import-products' ),
                    ),
                ),
            )
        );
    }

    $file = $_FILES['import_products_csv'];

    if ( UPLOAD_ERR_OK !== (int) $file['error'] ) {
        return import_products_build_result(
            array(
                'errors' => array(
                    array(
                        'line'    => 0,
                        'message' => __( 'File upload failed.', 'import-products' ),
                    ),
                ),
            )
        );
    }

    $extension = strtolower( pathinfo( $file['name'], PATHINFO_EXTENSION ) );

    if ( 'csv' !== $extension ) {
        return import_products_build_result(
            array(
                'errors' => array(
                    array(
                        'line'    => 0,
                        'message' => __( 'Only CSV files are allowed.', 'import-products' ),
                    ),
                ),
            )
        );
    }

    return import_products_import_csv( $file['tmp_name'] );
}

function import_products_import_csv( $file_path ) {
    $header_result = import_products_read_csv_header( $file_path );

    if ( is_wp_error( $header_result ) ) {
        return import_products_build_result(
            array(
                'errors' => array(
                    array(
                        'line'    => 0,
                        'message' => $header_result->get_error_message(),
                    ),
                ),
            )
        );
    }

    $column_indexes = $header_result;
    $board_errors   = array();
    $boards         = import_products_collect_boards( $file_path, $column_indexes, $board_errors );
    $board_map      = import_products_create_boards( $boards, $board_errors );

    $model_result = import_products_import_models( $file_path, $column_indexes, $board_map );

    return import_products_build_result(
        array(
            'boards_created'  => count( $board_map ),
            'created'         => $model_result['created'],
            'skipped_deleted' => $model_result['skipped_deleted'],
            'errors'          => array_merge( $board_errors, $model_result['errors'] ),
        )
    );
}

function import_products_read_csv_header( $file_path ) {
    $handle = fopen( $file_path, 'r' );

    if ( false === $handle ) {
        return new WP_Error(
            'import_products_read_error',
            __( 'Unable to read the CSV file.', 'import-products' )
        );
    }

    $header = fgetcsv( $handle );
    fclose( $handle );

    if ( false === $header ) {
        return new WP_Error(
            'import_products_empty_file',
            __( 'The CSV file is empty.', 'import-products' )
        );
    }

    return import_products_map_header_indexes( $header );
}

function import_products_collect_boards( $file_path, array $column_indexes, array &$errors ) {
    $handle = fopen( $file_path, 'r' );

    if ( false === $handle ) {
        $errors[] = array(
            'line'    => 0,
            'message' => __( 'Unable to read the CSV file.', 'import-products' ),
        );

        return array();
    }

    fgetcsv( $handle );

    $boards       = array();
    $line_number  = 1;

    while ( ( $row = fgetcsv( $handle ) ) !== false ) {
        $line_number++;

        if ( import_products_is_empty_row( $row ) ) {
            continue;
        }

        $record = import_products_extract_record( $row, $column_indexes );

        if ( import_products_is_deleted( $record['deleted'] ) ) {
            continue;
        }

        if ( '' === $record['regmap_id'] || '' === $record['regmap_name'] ) {
            continue;
        }

        if ( ! isset( $boards[ $record['regmap_id'] ] ) ) {
            $boards[ $record['regmap_id'] ] = $record['regmap_name'];
            continue;
        }

        if ( $boards[ $record['regmap_id'] ] !== $record['regmap_name'] ) {
            $errors[] = array(
                'line'    => $line_number,
                'message' => sprintf(
                    /* translators: 1: regmap id, 2: regmap name */
                    __( 'Conflicting regmap_name for regmapId %1$s: "%2$s".', 'import-products' ),
                    $record['regmap_id'],
                    $record['regmap_name']
                ),
            );
        }
    }

    fclose( $handle );

    return $boards;
}

function import_products_create_boards( array $boards, array &$errors ) {
    $board_map = array();

    foreach ( $boards as $regmap_id => $regmap_name ) {
        $post_id = wp_insert_post(
            array(
                'post_type'   => 'board',
                'post_status' => 'publish',
                'post_title'  => $regmap_name,
            ),
            true
        );

        if ( is_wp_error( $post_id ) ) {
            $errors[] = array(
                'line'    => 0,
                'message' => sprintf(
                    /* translators: 1: regmap id, 2: error message */
                    __( 'Board %1$s: %2$s', 'import-products' ),
                    $regmap_id,
                    $post_id->get_error_message()
                ),
            );
            continue;
        }

        //import_products_save_acf_field( (int) $post_id, 'key', $regmap_id );
        $board_map[ $regmap_id ] = (int) $post_id;
    }

    return $board_map;
}

function import_products_import_models( $file_path, array $column_indexes, array $board_map ) {
    $handle = fopen( $file_path, 'r' );

    if ( false === $handle ) {
        return array(
            'created'         => 0,
            'skipped_deleted' => 0,
            'errors'          => array(
                array(
                    'line'    => 0,
                    'message' => __( 'Unable to read the CSV file.', 'import-products' ),
                ),
            ),
        );
    }

    fgetcsv( $handle );

    $created         = 0;
    $skipped_deleted = 0;
    $errors          = array();
    $line_number     = 1;

    while ( ( $row = fgetcsv( $handle ) ) !== false ) {
        $line_number++;

        if ( import_products_is_empty_row( $row ) ) {
            continue;
        }

        $record = import_products_extract_record( $row, $column_indexes );

        if ( import_products_is_deleted( $record['deleted'] ) ) {
            $skipped_deleted++;
            continue;
        }

        if ( '' === $record['id'] || '' === $record['name'] ) {
            $errors[] = array(
                'line'    => $line_number,
                'message' => __( 'Missing required id or name.', 'import-products' ),
            );
            continue;
        }

        $post_id = wp_insert_post(
            array(
                'post_type'    => 'model',
                'post_status'  => 'publish',
                'post_title'   => $record['name'],
                'post_excerpt' => $record['description'],
            ),
            true
        );

        if ( is_wp_error( $post_id ) ) {
            $errors[] = array(
                'line'    => $line_number,
                'message' => $post_id->get_error_message(),
            );
            continue;
        }

        import_products_save_acf_field( (int) $post_id, 'key', $record['id'] );
        import_products_link_model_board( (int) $post_id, $record, $board_map, $line_number, $errors );
        $created++;
    }

    fclose( $handle );

    return array(
        'created'         => $created,
        'skipped_deleted' => $skipped_deleted,
        'errors'          => $errors,
    );
}

function import_products_link_model_board( $post_id, array $record, array $board_map, $line_number, array &$errors ) {
    if ( '' === $record['regmap_id'] ) {
        return;
    }

    if ( ! isset( $board_map[ $record['regmap_id'] ] ) ) {
        $errors[] = array(
            'line'    => $line_number,
            'message' => sprintf(
                /* translators: %s: regmap id */
                __( 'Board not found for regmapId %s.', 'import-products' ),
                $record['regmap_id']
            ),
        );
        return;
    }

    import_products_save_acf_field( $post_id, 'board', $board_map[ $record['regmap_id'] ] );
}

function import_products_map_header_indexes( array $header ) {
    $indexes = array();

    foreach ( $header as $index => $column_name ) {
        $normalized             = strtolower( trim( $column_name, " \t\n\r\0\x0B\"" ) );
        $indexes[ $normalized ] = $index;
    }

    $required_columns = array(
        'id',
        'name',
        'description',
        'deleted',
        'regmapid',
        'regmap_name',
    );

    foreach ( $required_columns as $column ) {
        if ( ! array_key_exists( $column, $indexes ) ) {
            return new WP_Error(
                'import_products_missing_column',
                sprintf(
                    /* translators: %s: CSV column name */
                    __( 'Missing required CSV column: %s', 'import-products' ),
                    $column
                )
            );
        }
    }

    return $indexes;
}

function import_products_extract_record( array $row, array $column_indexes ) {
    return array(
        'id'           => import_products_get_column_value( $row, $column_indexes, 'id' ),
        'name'         => import_products_get_column_value( $row, $column_indexes, 'name' ),
        'description'  => import_products_get_column_value( $row, $column_indexes, 'description' ),
        'deleted'      => import_products_get_column_value( $row, $column_indexes, 'deleted' ),
        'regmap_id'    => import_products_get_column_value( $row, $column_indexes, 'regmapid' ),
        'regmap_name'  => import_products_get_column_value( $row, $column_indexes, 'regmap_name' ),
    );
}

function import_products_get_column_value( array $row, array $column_indexes, $column_name ) {
    if ( ! array_key_exists( $column_name, $column_indexes ) ) {
        return '';
    }

    $index = $column_indexes[ $column_name ];

    if ( ! array_key_exists( $index, $row ) ) {
        return '';
    }

    return trim( (string) $row[ $index ] );
}

function import_products_is_empty_row( array $row ) {
    foreach ( $row as $value ) {
        if ( '' !== trim( (string) $value ) ) {
            return false;
        }
    }

    return true;
}

function import_products_is_deleted( $value ) {
    $normalized = strtolower( trim( (string) $value ) );

    return in_array( $normalized, array( '1', 'true', 'yes' ), true );
}

function import_products_save_acf_field( $post_id, $field_name, $value ) {
    if ( function_exists( 'update_field' ) ) {
        update_field( $field_name, $value, $post_id );
        return;
    }

    update_post_meta( $post_id, $field_name, $value );
}

function import_products_build_result( array $partial ) {
    return array_merge(
        array(
            'boards_created'  => 0,
            'created'         => 0,
            'skipped_deleted' => 0,
            'errors'          => array(),
        ),
        $partial
    );
}

function import_products_render_result_notices( $result ) {
    if ( null === $result ) {
        return;
    }

    $boards_created  = (int) $result['boards_created'];
    $created         = (int) $result['created'];
    $skipped_deleted = (int) $result['skipped_deleted'];
    $errors          = $result['errors'];

    if ( $boards_created > 0 ) {
        printf(
            '<div class="notice notice-success is-dismissible"><p>%s</p></div>',
            esc_html(
                sprintf(
                    /* translators: %d: number of created boards */
                    _n( '%d board created.', '%d boards created.', $boards_created, 'import-products' ),
                    $boards_created
                )
            )
        );
    }

    if ( $created > 0 ) {
        printf(
            '<div class="notice notice-success is-dismissible"><p>%s</p></div>',
            esc_html(
                sprintf(
                    /* translators: %d: number of created posts */
                    _n( '%d model created.', '%d models created.', $created, 'import-products' ),
                    $created
                )
            )
        );
    }

    if ( $skipped_deleted > 0 ) {
        printf(
            '<div class="notice notice-info is-dismissible"><p>%s</p></div>',
            esc_html(
                sprintf(
                    /* translators: %d: number of skipped rows */
                    _n( '%d deleted row skipped.', '%d deleted rows skipped.', $skipped_deleted, 'import-products' ),
                    $skipped_deleted
                )
            )
        );
    }

    if ( empty( $errors ) ) {
        return;
    }

    echo '<div class="notice notice-error"><p><strong>' . esc_html__( 'Import errors:', 'import-products' ) . '</strong></p><ul>';

    foreach ( $errors as $error ) {
        printf(
            '<li>%s</li>',
            esc_html(
                sprintf(
                    /* translators: 1: line number, 2: error message */
                    __( 'Line %1$d: %2$s', 'import-products' ),
                    (int) $error['line'],
                    $error['message']
                )
            )
        );
    }

    echo '</ul></div>';
}
