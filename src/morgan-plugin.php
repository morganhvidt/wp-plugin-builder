<?php
/**
 * Plugin Name: XPLUGIN_NAME
 * Description: XPLUGIN_DESCRIPTION
 * Version: XPLUGIN_VERSION
 * Author: XPLUGIN_AUTHOR
 * Author URI: https://morganhvidt.com/
 * License: GPL2
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// @if type = 'premium'
$text = "This text will be in the premium version only";
// @endif

// @if type = 'free'
$text = "This section will be in the free plugin.";
// @endif

