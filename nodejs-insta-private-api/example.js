const { IgApiClient } = require('./src/index');
const Utils = require('./src/utils');
const fs = require('fs');

async function main() {
  const ig = new IgApiClient();
  
  try {
    console.log('🚀 Starting Instagram API Example...\n');
    
    // ============================================
    // 1. AUTHENTICATION
    // ============================================
    console.log('📝 1. Authentication');
    
    // Check if we have a saved session
    const sessionFile = 'session.json';
    let loggedIn = false;
    
    if (fs.existsSync(sessionFile)) {
      console.log('   📁 Loading saved session...');
      try {
        const session = JSON.parse(fs.readFileSync(sessionFile));
        await ig.loadSession(session);
        
        if (await ig.isSessionValid()) {
          console.log('   ✅ Session is valid!');
          loggedIn = true;
        } else {
          console.log('   ❌ Session expired, need to login again');
        }
      } catch (error) {
        console.log('   ❌ Failed to load session:', error.message);
      }
    }
    
    // Login if not already logged in
    if (!loggedIn) {
      console.log('   🔐 Logging in...');
      
      // REPLACE WITH YOUR CREDENTIALS
      const credentials = {
        username: 'your_username',
        password: 'your_password',
        email: 'your_email@example.com'
      };
      
      try {
        await ig.login(credentials);
        console.log('   ✅ Login successful!');
        
        // Save session for future use
        const session = await ig.saveSession();
        fs.writeFileSync(sessionFile, JSON.stringify(session));
        console.log('   💾 Session saved!');
        
      } catch (error) {
        console.log('   ❌ Login failed:', Utils.humanizeError(error));
        
        // Handle specific errors
        if (error.name === 'IgLoginTwoFactorRequiredError') {
          console.log('   📱 Two-factor authentication required');
          console.log('   Please enter the verification code from your phone');
          // In a real app, you would get input from the user here
          return;
        }
        
        return;
      }
    }
    
    // ============================================
    // 2. USER OPERATIONS
    // ============================================
    console.log('\n👤 2. User Operations');
    
    // Get current user info
    const currentUser = await ig.account.currentUser();
    console.log(`   📊 Logged in as: @${currentUser.user.username}`);
    console.log(`   👥 Followers: ${currentUser.user.follower_count}`);
    console.log(`   👤 Following: ${currentUser.user.following_count}`);
    
    // Search for users
    console.log('   🔍 Searching for users...');
    const searchResults = await ig.user.search('instagram');
    console.log(`   Found ${searchResults.length} users matching "instagram"`);
    
    // Get user info by username
    if (searchResults.length > 0) {
      const user = await ig.user.infoByUsername(searchResults[0].username);
      console.log(`   📱 @${user.username}: ${user.biography || 'No bio'}`);
    }
    
    // ============================================
    // 3. DIRECT MESSAGES
    // ============================================
    console.log('\n💬 3. Direct Messages');
    
    // Get inbox
    const inbox = await ig.dm.getInbox();
    console.log(`   📬 You have ${inbox.inbox.threads.length} conversations`);
    
    // Example: Send DM (commented out to avoid spam)
    /*
    console.log('   📤 Sending test DM...');
    await ig.dm.send({
      to: 'friend_username',
      message: 'Hello from the nodejs-insta-private-api! 🚀'
    });
    console.log('   ✅ DM sent!');
    
    // Wait to avoid rate limiting
    await Utils.randomDelay(2000, 4000);
    */
    
    // ============================================
    // 4. STORIES
    // ============================================
    console.log('\n📱 4. Stories');
    
    // Get story feed
    const storyFeed = await ig.story.getFeed();
    console.log(`   📺 Found ${storyFeed.tray.length} story trays`);
    
    // React to stories (commented out to avoid spam)
    /*
    if (storyFeed.tray.length > 0 && storyFeed.tray[0].items.length > 0) {
      const firstStory = storyFeed.tray[0].items[0];
      console.log('   ❤️ Reacting to first story...');
      await ig.story.react({
        storyId: firstStory.id,
        reaction: '❤️'
      });
      console.log('   ✅ Reaction sent!');
    }
    */
    
    // ============================================
    // 5. FEED OPERATIONS
    // ============================================
    console.log('\n📸 5. Feed Operations');
    
    // Get timeline feed
    const timeline = await ig.feed.getFeed();
    console.log(`   📱 Timeline has ${timeline.items.length} posts`);
    
    // Get explore feed
    const explore = await ig.feed.getExploreFeed();
    console.log(`   🔍 Explore has ${explore.items.length} posts`);
    
    // Like a post (commented out to avoid spam)
    /*
    if (timeline.items.length > 0) {
      const firstPost = timeline.items[0];
      console.log('   ❤️ Liking first post...');
      await ig.media.like(firstPost.id);
      console.log('   ✅ Post liked!');
      
      // Wait to avoid rate limiting
      await Utils.randomDelay(2000, 4000);
      
      // Unlike the post
      console.log('   💔 Unliking the post...');
      await ig.media.unlike(firstPost.id);
      console.log('   ✅ Post unliked!');
    }
    */
    
    // ============================================
    // 6. MEDIA UPLOAD EXAMPLE
    // ============================================
    console.log('\n📤 6. Media Upload Example');
    
    // Example: Upload photo (commented out to avoid spam)
    /*
    console.log('   📸 Uploading photo...');
    await ig.feed.upload({
      imagePath: './example-photo.jpg', // Make sure this file exists
      caption: 'Posted using nodejs-insta-private-api! 🚀 #instagram #api'
    });
    console.log('   ✅ Photo uploaded!');
    */
    
    console.log('   ℹ️ Photo upload is commented out - uncomment to test');
    
    // ============================================
    // 7. BATCH OPERATIONS WITH RATE LIMITING
    // ============================================
    console.log('\n⚡ 7. Batch Operations Example');
    
    // Example: Send messages to multiple users with proper delays
    const testUsers = ['user1', 'user2', 'user3']; // Replace with real usernames
    const message = 'Hello from the API! 👋';
    
    console.log('   📤 Batch DM example (commented out):');
    console.log(`   Would send "${message}" to ${testUsers.length} users`);
    
    /*
    for (let i = 0; i < testUsers.length; i++) {
      const user = testUsers[i];
      try {
        console.log(`   📤 Sending message to ${user}...`);
        await ig.dm.send({ to: user, message });
        console.log(`   ✅ Message sent to ${user}`);
        
        // Wait between requests to avoid rate limiting
        if (i < testUsers.length - 1) {
          console.log('   ⏳ Waiting to avoid rate limits...');
          await Utils.randomDelay(3000, 6000);
        }
      } catch (error) {
        console.log(`   ❌ Failed to send to ${user}:`, Utils.humanizeError(error));
      }
    }
    */
    
    // ============================================
    // 8. ERROR HANDLING EXAMPLES
    // ============================================
    console.log('\n🛡️ 8. Error Handling Examples');
    
    // Example: Handle different types of errors
    try {
      // This will likely fail with a not found error
      await ig.user.infoByUsername('this_user_definitely_does_not_exist_12345');
    } catch (error) {
      console.log('   📝 Expected error caught:');
      console.log(`   Type: ${error.name}`);
      console.log(`   Message: ${Utils.humanizeError(error)}`);
    }
    
    // ============================================
    // 9. UTILITY FUNCTIONS
    // ============================================
    console.log('\n🔧 9. Utility Functions');
    
    console.log('   🎲 Generated UUID:', Utils.generateUUID());
    console.log('   📱 Generated Device ID:', Utils.generateDeviceId());
    console.log('   ⏰ Current timestamp:', Utils.getCurrentTimestamp());
    console.log('   📧 Email validation:', Utils.isValidEmail('test@example.com'));
    console.log('   👤 Username validation:', Utils.isValidUsername('valid_username'));
    
    // File validation examples
    console.log('   📁 File validation:');
    console.log('   - photo.jpg is image:', Utils.isImageFile('photo.jpg'));
    console.log('   - video.mp4 is video:', Utils.isVideoFile('video.mp4'));
    
    // ============================================
    // 10. CLEANUP
    // ============================================
    console.log('\n🧹 10. Cleanup');
    
    console.log('   💾 Session is still valid for future use');
    console.log('   🚀 All operations completed successfully!');
    
    // Clean up resources
    ig.destroy();
    
  } catch (error) {
    console.error('\n❌ Fatal error:', Utils.humanizeError(error));
    console.error('Full error:', error);
  }
}

// Run the example
if (require.main === module) {
  console.log('====================================');
  console.log('🤖 nodejs-insta-private-api Example');
  console.log('====================================');
  console.log('');
  console.log('⚠️  IMPORTANT NOTES:');
  console.log('1. Replace credentials with your own');
  console.log('2. Many operations are commented out to avoid spam');
  console.log('3. Always respect Instagram\'s rate limits');
  console.log('4. Use responsibly and follow ToS');
  console.log('');
  
  main().catch(console.error);
}

module.exports = main;