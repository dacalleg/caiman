<?php
/**
 * Plugin Name: JWT Auth
 * Plugin URI:  https://github.com/usefulteam/jwt-auth
 * Description: WordPress JWT Authentication.
 * Version:     2.1.3-caiman.1
 * Author:      Useful Team
 * Author URI:  https://usefulteam.com
 * License:     GPL-3.0
 * License URI: https://oss.ninja/gpl-3.0?organization=Useful%20Team&project=jwt-auth
 * Text Domain: jwt-auth
 * Domain Path: /languages
 *
 * @package jwt-auth
 */

defined( 'ABSPATH' ) || die( "Can't access directly" );

// Helper constants.
define( 'JWT_AUTH_PLUGIN_DIR', rtrim( plugin_dir_path( __FILE__ ), '/' ) );
define( 'JWT_AUTH_PLUGIN_URL', rtrim( plugin_dir_url( __FILE__ ), '/' ) );
define( 'JWT_AUTH_PLUGIN_VERSION', '2.1.3-caiman.1' );

// Require composer.
require __DIR__ . '/vendor/autoload.php';

// Require classes.
require __DIR__ . '/class-auth.php';
require __DIR__ . '/class-setup.php';
require __DIR__ . '/class-devices.php';

JWTAuth\Setup::getInstance();

add_filter(
	'site_transient_update_plugins',
	function ( $value ) {
		if ( is_object( $value ) && isset( $value->response['jwt-auth/jwt-auth.php'] ) ) {
			unset( $value->response['jwt-auth/jwt-auth.php'] );
		}

		return $value;
	}
);

add_filter(
	'auto_update_plugin',
	function ( $update, $item ) {
		if ( isset( $item->plugin ) && 'jwt-auth/jwt-auth.php' === $item->plugin ) {
			return false;
		}

		return $update;
	},
	10,
	2
);
