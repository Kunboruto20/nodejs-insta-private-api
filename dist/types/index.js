/**
 * Type definitions for nodejs-insta-private-api
 * These are JavaScript representations of common data structures
 */

class IgUser {
  constructor(data = {}) {
    this.pk = data.pk;
    this.username = data.username;
    this.full_name = data.full_name;
    this.is_private = data.is_private;
    this.profile_pic_url = data.profile_pic_url;
    this.profile_pic_id = data.profile_pic_id;
    this.is_verified = data.is_verified;
    this.has_anonymous_profile_picture = data.has_anonymous_profile_picture;
    this.can_boost_post = data.can_boost_post;
    this.can_see_organic_insights = data.can_see_organic_insights;
    this.show_insights_terms = data.show_insights_terms;
    this.reel_auto_archive = data.reel_auto_archive;
    this.is_unpublished = data.is_unpublished;
    this.is_favorite = data.is_favorite;
    this.is_favorite_for_stories = data.is_favorite_for_stories;
    this.is_favorite_for_highlights = data.is_favorite_for_highlights;
    this.live_subscription_status = data.live_subscription_status;
    this.subscription_status = data.subscription_status;
    this.usertags_count = data.usertags_count;
    this.total_igtv_videos = data.total_igtv_videos;
    this.total_clips_count = data.total_clips_count;
    this.has_videos = data.has_videos;
    this.has_music = data.has_music;
    this.can_be_reported_as_fraud = data.can_be_reported_as_fraud;
    this.can_follow_hashtag = data.can_follow_hashtag;
    this.is_business = data.is_business;
    this.account_type = data.account_type;
    this.is_call_to_action_enabled = data.is_call_to_action_enabled;
    this.include_direct_blacklist_status = data.include_direct_blacklist_status;
    this.can_boost_post = data.can_boost_post;
    this.can_see_organic_insights = data.can_see_organic_insights;
    this.show_insights_terms = data.show_insights_terms;
    this.can_convert_to_business = data.can_convert_to_business;
    this.can_create_sponsor_tags = data.can_create_sponsor_tags;
    this.can_be_tagged_as_sponsor = data.can_be_tagged_as_sponsor;
    this.fan_club_info = data.fan_club_info;
    this.fbid_v2 = data.fbid_v2;
    this.nametag = data.nametag;
    this.allow_contacts_sync = data.allow_contacts_sync;
    this.phone_number = data.phone_number;
    this.country_code = data.country_code;
    this.national_number = data.national_number;
    this.category = data.category;
    this.category_id = data.category_id;
    this.public_email = data.public_email;
    this.contact_phone_number = data.contact_phone_number;
    this.public_phone_number = data.public_phone_number;
    this.public_phone_country_code = data.public_phone_country_code;
    this.city_id = data.city_id;
    this.city_name = data.city_name;
    this.address_street = data.address_street;
    this.direct_messaging = data.direct_messaging;
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.zip = data.zip;
    this.instagram_location_id = data.instagram_location_id;
    this.interop_messaging_user_fbid = data.interop_messaging_user_fbid;
    this.biography = data.biography;
    this.biography_with_entities = data.biography_with_entities;
    this.external_url = data.external_url;
    this.external_lynx_url = data.external_lynx_url;
    this.follower_count = data.follower_count;
    this.following_count = data.following_count;
    this.following_tag_count = data.following_tag_count;
    this.media_count = data.media_count;
    this.geo_media_count = data.geo_media_count;
  }
}

class IgMedia {
  constructor(data = {}) {
    this.taken_at = data.taken_at;
    this.pk = data.pk;
    this.id = data.id;
    this.device_timestamp = data.device_timestamp;
    this.media_type = data.media_type;
    this.code = data.code;
    this.client_cache_key = data.client_cache_key;
    this.filter_type = data.filter_type;
    this.is_unified_video = data.is_unified_video;
    this.user = data.user ? new IgUser(data.user) : null;
    this.can_viewer_reshare = data.can_viewer_reshare;
    this.caption_is_edited = data.caption_is_edited;
    this.like_and_view_counts_disabled = data.like_and_view_counts_disabled;
    this.commerciality_status = data.commerciality_status;
    this.is_paid_partnership = data.is_paid_partnership;
    this.is_visual_reply_commenter_notice_enabled = data.is_visual_reply_commenter_notice_enabled;
    this.original_media_has_visual_reply_media = data.original_media_has_visual_reply_media;
    this.comment_likes_enabled = data.comment_likes_enabled;
    this.comment_threading_enabled = data.comment_threading_enabled;
    this.has_more_comments = data.has_more_comments;
    this.max_num_visible_preview_comments = data.max_num_visible_preview_comments;
    this.preview_comments = data.preview_comments;
    this.comments = data.comments;
    this.comment_count = data.comment_count;
    this.inline_composer_display_condition = data.inline_composer_display_condition;
    this.inline_composer_imp_trigger_time = data.inline_composer_imp_trigger_time;
    this.image_versions2 = data.image_versions2;
    this.original_width = data.original_width;
    this.original_height = data.original_height;
    this.is_reshare_of_text_post_app_media_in_ig = data.is_reshare_of_text_post_app_media_in_ig;
    this.caption = data.caption;
    this.can_viewer_save = data.can_viewer_save;
    this.organic_tracking_token = data.organic_tracking_token;
    this.has_liked = data.has_liked;
    this.like_count = data.like_count;
    this.play_count = data.play_count;
    this.fb_play_count = data.fb_play_count;
    this.can_see_insights_as_brand = data.can_see_insights_as_brand;
    this.top_likers = data.top_likers;
    this.likers = data.likers;
    this.photo_of_you = data.photo_of_you;
    this.can_viewer_reshare = data.can_viewer_reshare;
    this.can_reshare = data.can_reshare;
    this.can_reply = data.can_reply;
    this.is_comments_gif_composer_enabled = data.is_comments_gif_composer_enabled;
    this.comment_inform_treatment = data.comment_inform_treatment;
    this.sharing_friction_info = data.sharing_friction_info;
    this.product_type = data.product_type;
    this.is_in_profile_grid = data.is_in_profile_grid;
    this.profile_grid_control_enabled = data.profile_grid_control_enabled;
    this.deleted_reason = data.deleted_reason;
    this.integrity_review_decision = data.integrity_review_decision;
    this.music_metadata = data.music_metadata;
    this.is_artist_pick = data.is_artist_pick;
  }
}

class IgThread {
  constructor(data = {}) {
    this.thread_id = data.thread_id;
    this.thread_v2_id = data.thread_v2_id;
    this.users = data.users ? data.users.map(user => new IgUser(user)) : [];
    this.left_users = data.left_users ? data.left_users.map(user => new IgUser(user)) : [];
    this.admin_user_ids = data.admin_user_ids || [];
    this.items = data.items || [];
    this.last_activity_at = data.last_activity_at;
    this.muted = data.muted;
    this.is_pin = data.is_pin;
    this.named = data.named;
    this.canonical = data.canonical;
    this.pending = data.pending;
    this.archived = data.archived;
    this.thread_type = data.thread_type;
    this.viewer_id = data.viewer_id;
    this.thread_title = data.thread_title;
    this.pending_score = data.pending_score;
    this.folder = data.folder;
    this.vc_muted = data.vc_muted;
    this.is_group = data.is_group;
    this.mentions_muted = data.mentions_muted;
    this.approval_required_for_new_members = data.approval_required_for_new_members;
    this.input_mode = data.input_mode;
    this.business_thread_folder = data.business_thread_folder;
    this.read_state = data.read_state;
    this.last_seen_at = data.last_seen_at;
    this.oldest_cursor = data.oldest_cursor;
    this.newest_cursor = data.newest_cursor;
    this.next_cursor = data.next_cursor;
    this.prev_cursor = data.prev_cursor;
    this.has_older = data.has_older;
    this.has_newer = data.has_newer;
    this.last_permanent_item = data.last_permanent_item;
  }
}

class IgStory {
  constructor(data = {}) {
    this.taken_at = data.taken_at;
    this.pk = data.pk;
    this.id = data.id;
    this.device_timestamp = data.device_timestamp;
    this.media_type = data.media_type;
    this.code = data.code;
    this.client_cache_key = data.client_cache_key;
    this.filter_type = data.filter_type;
    this.is_unified_video = data.is_unified_video;
    this.user = data.user ? new IgUser(data.user) : null;
    this.can_viewer_reshare = data.can_viewer_reshare;
    this.caption_is_edited = data.caption_is_edited;
    this.like_and_view_counts_disabled = data.like_and_view_counts_disabled;
    this.is_reel_media = data.is_reel_media;
    this.timezone_offset = data.timezone_offset;
    this.story_locations = data.story_locations;
    this.story_events = data.story_events;
    this.story_hashtags = data.story_hashtags;
    this.story_polls = data.story_polls;
    this.story_feed_media = data.story_feed_media;
    this.story_sound_on = data.story_sound_on;
    this.creative_config = data.creative_config;
    this.story_static_models = data.story_static_models;
    this.supports_reel_reactions = data.supports_reel_reactions;
    this.show_one_tap_fb_share_tooltip = data.show_one_tap_fb_share_tooltip;
    this.has_shared_to_fb = data.has_shared_to_fb;
    this.image_versions2 = data.image_versions2;
    this.original_width = data.original_width;
    this.original_height = data.original_height;
    this.imported_taken_at = data.imported_taken_at;
    this.caption = data.caption;
    this.can_viewer_save = data.can_viewer_save;
    this.organic_tracking_token = data.organic_tracking_token;
    this.expiring_at = data.expiring_at;
    this.is_pride_media = data.is_pride_media;
    this.can_reshare = data.can_reshare;
    this.can_reply = data.can_reply;
    this.reel_mentions = data.reel_mentions;
    this.story_app_attribution = data.story_app_attribution;
    this.story_bloks_stickers = data.story_bloks_stickers;
    this.can_viewer_save = data.can_viewer_save;
    this.is_dash_eligible = data.is_dash_eligible;
    this.video_dash_manifest = data.video_dash_manifest;
    this.video_codec = data.video_codec;
    this.number_of_qualities = data.number_of_qualities;
    this.video_versions = data.video_versions;
    this.has_audio = data.has_audio;
    this.video_duration = data.video_duration;
    this.view_count = data.view_count;
    this.viewers = data.viewers;
    this.viewer_count = data.viewer_count;
    this.viewer_cursor = data.viewer_cursor;
    this.total_viewer_count = data.total_viewer_count;
    this.multi_author_reel_names = data.multi_author_reel_names;
    this.is_pride_media = data.is_pride_media;
    this.can_see_insights_as_brand = data.can_see_insights_as_brand;
  }
}

// Options interfaces
class LoginOptions {
  constructor(options = {}) {
    this.username = options.username;
    this.password = options.password;
    this.email = options.email;
  }
}

class DMOptions {
  constructor(options = {}) {
    this.to = options.to;
    this.message = options.message;
    this.threadId = options.threadId;
    this.imagePath = options.imagePath;
    this.videoPath = options.videoPath;
  }
}

class UploadOptions {
  constructor(options = {}) {
    this.imagePath = options.imagePath;
    this.videoPath = options.videoPath;
    this.caption = options.caption;
    this.width = options.width;
    this.height = options.height;
    this.duration_ms = options.duration_ms;
    this.uploadId = options.uploadId;
  }
}

class StoryOptions {
  constructor(options = {}) {
    this.storyId = options.storyId;
    this.reaction = options.reaction;
    this.imagePath = options.imagePath;
    this.videoPath = options.videoPath;
    this.caption = options.caption;
  }
}

module.exports = {
  IgUser,
  IgMedia,
  IgThread,
  IgStory,
  LoginOptions,
  DMOptions,
  UploadOptions,
  StoryOptions
};