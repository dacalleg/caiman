<?php

function get_language_code()
{
    $headers = getallheaders();
    $lang = $headers["Language"];
    
    if(!isset($lang))
        $lang = $_ENV["DEFAULT_LANGUAGE_CODE"];
    return $lang;
}

function get_translation_value($key, $placeholders=array(), $lang=null)
{
    if($lang == null)
        $lang = get_language_code();
    $default = array("base_url" => get_site_url(), "domain_url" => str_replace("/backend", "", get_site_url()));
    $placeholders = array_merge($default, $placeholders);

    $posts = get_posts(array(
        "post_type" => "translation",
        "meta_key" => "code",
        "meta_value" => $lang,
    ));

    if(count($posts) == 0)
        $posts = get_posts(array(
            "post_type" => "translation",
            "meta_key" => "code",
            "meta_value" => "en",
        ));

    $translations = get_field("translations", $posts[0]->ID);
    $message = null;

    foreach($translations as $translation)
    {
        if($translation["key"] == $key){
            $message = $translation["value"];
        }
        $placeholders[$translation["key"]] = $translation["value"];
    }

    if($message == null)
        return "Translation not found";

    foreach($placeholders as $key => $value)
        $message = str_replace("{{".$key."}}", $value, $message);

    return $message;
}