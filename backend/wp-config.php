<?php
/**
 * The base configuration for WordPress
 *
 * The wp-config.php creation script uses this file during the installation.
 * You don't have to use the web site, you can copy this file to "wp-config.php"
 * and fill in the values.
 *
 * This file contains the following configurations:
 *
 * * Database settings
 * * Secret keys
 * * Database table prefix
 * * ABSPATH
 *
 * @link https://wordpress.org/support/article/editing-wp-config-php/
 *
 * @package WordPress
 */

// ** Database settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define( 'DB_NAME', getenv("DB_NAME") ); 

/** Database username */
define( 'DB_USER', getenv("DB_USER") );

/** Database password */
define( 'DB_PASSWORD', getenv("DB_PASSWORD") );

/** Database hostname */
define( 'DB_HOST', getenv("DB_HOST") );

/** Database charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8mb4' );

/** The database collate type. Don't change this if in doubt. */
define( 'DB_COLLATE', '' );


/**#@+
 * Authentication unique keys and salts.
 *
 * Change these to different unique phrases! You can generate these using
 * the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}.
 *
 * You can change these at any point in time to invalidate all existing cookies.
 * This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define( 'AUTH_KEY',         ',g/m`)dBGT{>RoX;=f?J Uw_zL}9Eyuqx9I$[`fw1Z3$Unu9NTnw,)2LozYJ<s[[' );
define( 'SECURE_AUTH_KEY',  '9MD)q}L}N64B:9JWq]E2hs+ic5}ocQ;<WBa.-}C6>Z#G2tpN2 M9?f!RL8i|%8h!' );
define( 'LOGGED_IN_KEY',    'sjqKWvd|hg a>x*l`HI.ROM&t *-evV,A(R-upw 97e/afd<.tSUrZ}2W<5^vk!>' );
define( 'NONCE_KEY',        'J??[a6^9Y3#c.|9mB,Y7daD:,X}MN1}ZdEzaQadO)<K<_zw0j[Hy&JEn[@aT>aLW' );
define( 'AUTH_SALT',        ']Qso3f}3;]k?[y45ReFarn>THDJmp]f(b?gc9:no=o&gyeoE=r>ygk=~i4uLI+#=' );
define( 'SECURE_AUTH_SALT', 'f:hpp-.|va*MX[{xh?eX(vle.^ZXzQ]Y%&7!,q{pId?q*c**/Q(S3x@mH>fGB%Ku' );
define( 'LOGGED_IN_SALT',   ')+CXA>x$45yFgvw-6y#wUavVQ?q{k<L)%G`&Jawz}SC9jy4t]BL3WJx: zIP.)Fk' );
define( 'NONCE_SALT',       '{x1498:K? 4.v<Zwpg1*.?pG;U(`-fZNs2#0M*N*=,4Kb|J:KG8mo]z$?W$w).Gf' );

/**#@-*/

/**
 * WordPress database table prefix.
 *
 * You can have multiple installations in one database if you give each
 * a unique prefix. Only numbers, letters, and underscores please!
 */
$table_prefix = 'wp_';

/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 *
 * For information on other constants that can be used for debugging,
 * visit the documentation.
 *
 * @link https://wordpress.org/support/article/debugging-in-wordpress/
 */
define('WP_DEBUG', false);
//define('WP_DEBUG', getenv("WP_DEBUG") === "true" ? true : false);

define('JWT_AUTH_SECRET_KEY', getenv("JWT_AUTH_SECRET_KEY") );
define('JWT_AUTH_CORS_ENABLE', getenv("JWT_AUTH_CORS_ENABLE") === "true" ? true : false);

define( 'WP_HOME', $_SERVER['HTTP_X_FORWARDED_PROTO'] . '://' . $_SERVER['HTTP_X_FORWARDED_HOST'] );
define( 'WP_SITEURL', $_SERVER['HTTP_X_FORWARDED_PROTO'] . '://' . $_SERVER['HTTP_X_FORWARDED_HOST'] );

/* Add any custom values between this line and the "stop editing" line. */

if($_SERVER['HTTP_X_FORWARDED_PROTO'] == 'https'){
    $_SERVER['HTTPS'] = 'on';
    $_SERVER['SERVER_PORT'] = 443;
}


/* That's all, stop editing! Happy publishing. */

/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

/** Sets up WordPress vars and included files. */
require_once ABSPATH . 'wp-settings.php';
