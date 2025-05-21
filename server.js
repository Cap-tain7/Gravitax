const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const app = express();
const PORT = 3000;

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'public/uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Only images are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter,
});

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// File paths for data storage
const postsFile = path.join(__dirname, 'posts.json');
const usersFile = path.join(__dirname, 'users.json');
const notificationsFile = path.join(__dirname, 'notifications.json');
const friendsFile = path.join(__dirname, 'friends.json');

// Helper functions for file operations
function readPosts() {
  try {
    if (!fs.existsSync(postsFile)) fs.writeFileSync(postsFile, '[]');
    return JSON.parse(fs.readFileSync(postsFile));
  } catch (error) {
    console.error('Error reading posts:', error);
    return [];
  }
}

function writePosts(posts) {
  try {
    fs.writeFileSync(postsFile, JSON.stringify(posts, null, 2));
  } catch (error) {
    console.error('Error writing posts:', error);
  }
}

function readUsers() {
  try {
    if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, '[]');
    return JSON.parse(fs.readFileSync(usersFile));
  } catch (error) {
    console.error('Error reading users:', error);
    return [];
  }
}

function writeUsers(users) {
  try {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error writing users:', error);
  }
}

function readNotifications() {
  try {
    if (!fs.existsSync(notificationsFile)) fs.writeFileSync(notificationsFile, '[]');
    return JSON.parse(fs.readFileSync(notificationsFile));
  } catch (error) {
    console.error('Error reading notifications:', error);
    return [];
  }
}

function writeNotifications(notifications) {
  try {
    fs.writeFileSync(notificationsFile, JSON.stringify(notifications, null, 2));
  } catch (error) {
    console.error('Error writing notifications:', error);
  }
}

function readFriends() {
  try {
    if (!fs.existsSync(friendsFile)) fs.writeFileSync(friendsFile, '{}');
    return JSON.parse(fs.readFileSync(friendsFile));
  } catch (error) {
    console.error('Error reading friends:', error);
    return {};
  }
}

function writeFriends(friends) {
  try {
    fs.writeFileSync(friendsFile, JSON.stringify(friends, null, 2));
  } catch (error) {
    console.error('Error writing friends:', error);
  }
}

// Get all users
app.get('/users', (req, res) => {
  try {
    res.json(readUsers());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Save or update a user profile
app.post('/users', (req, res) => {
  try {
    const users = readUsers();
    const { username, userEmail, photoURL } = req.body;

    if (!username || !userEmail) {
      return res.status(400).json({ error: 'username and userEmail are required' });
    }

    const existingUserIndex = users.findIndex(u => u.userEmail === userEmail);
    if (existingUserIndex !== -1) {
      users[existingUserIndex] = { username, userEmail, photoURL };
    } else {
      users.push({ username, userEmail, photoURL });
    }

    writeUsers(users);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving user:', error);
    res.status(500).json({ error: 'Failed to save user' });
  }
});

// Get all posts
app.get('/posts', (req, res) => {
  try {
    res.json(readPosts());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.post('/posts', upload.single('media'), (req, res) => {
  try {
    const posts = readPosts();
    let media = null;

    // Handle uploaded media
    if (req.file) {
      media = `/uploads/${req.file.filename}`;
    }

    const newPost = {
      id: Date.now(),
      username: req.body.username,
      userEmail: req.body.userEmail,
      caption: req.body.caption,
      tag: req.body.tag || null,
      date: new Date().toISOString(),
      likes: 0,
      reports: 0,
      comments: [],
      media,
      mediaType: media ? 'image' : null,
      likedBy: [],
      reportedBy: [],
      bookmarkedBy: [],
    };
    posts.push(newPost);
    writePosts(posts);
    res.json({ success: true });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});
// Bookmark a post
app.post('/posts/:id/bookmark', (req, res) => {
  try {
    const posts = readPosts();
    const post = posts.find((post) => post.id == req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    post.bookmarkedBy = post.bookmarkedBy || [];
    if (!post.bookmarkedBy.includes(req.body.username)) {
      post.bookmarkedBy.push(req.body.username);
      writePosts(posts);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'User already bookmarked this post' });
    }
  } catch (error) {
    console.error('Error bookmarking post:', error);
    res.status(500).json({ error: 'Failed to bookmark post' });
  }
});
// Unbookmark a post
app.post('/posts/:id/unbookmark', (req, res) => {
  try {
    const posts = readPosts();
    const post = posts.find((post) => post.id == req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (!post.bookmarkedBy || !post.bookmarkedBy.includes(req.body.username)) {
      return res.status(400).json({ error: 'You have not bookmarked this post' });
    }
    post.bookmarkedBy = post.bookmarkedBy.filter(user => user !== req.body.username);
    writePosts(posts);
    res.status(200).json({ message: 'Post unbookmarked successfully' });
  } catch (error) {
    console.error('Error unbookmarking post:', error);
    res.status(500).json({ error: 'Failed to unbookmark post' });
  }
});
// Like a post
app.post('/posts/:id/like', (req, res) => {
  try {
    const posts = readPosts();
    const notifications = readNotifications();
    const post = posts.find((post) => post.id == req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    post.likedBy = post.likedBy || [];
    if (!post.likedBy.includes(req.body.username)) {
      post.likes++;
      post.likedBy.push(req.body.username);

      // Create a notification for the post owner
      if (post.username !== req.body.username) {
        const notification = {
          id: Date.now(),
          type: 'like',
          actor: req.body.username,
          message: `liked your post: "${post.caption.slice(0, 50)}${post.caption.length > 50 ? '...' : ''}"`,
          recipient: post.username,
          postId: post.id,
          date: new Date().toISOString(),
        };
        notifications.push(notification);
      }

      writePosts(posts);
      writeNotifications(notifications);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'User already liked this post' });
    }
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// Report a post
app.post('/posts/:id/report', (req, res) => {
  try {
    const posts = readPosts();
    const post = posts.find((post) => post.id == req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    post.reportedBy = post.reportedBy || [];
    if (!post.reportedBy.includes(req.body.username)) {
      post.reports = (post.reports || 0) + 1;
      post.reportedBy.push(req.body.username);
      writePosts(posts);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'User already reported this post' });
    }
  } catch (error) {
    console.error('Error reporting post:', error);
    res.status(500).json({ error: 'Failed to report post' });
  }
});
// Un-like a post
app.post('/posts/:id/unlike', async (req, res) => {
  const postId = parseInt(req.params.id);
  const { username } = req.body;

  try {
    let posts = await readPosts();
    const post = posts.find(p => p.id === postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (!post.likedBy || !post.likedBy.includes(username)) {
      return res.status(400).json({ error: 'You have not liked this post' });
    }

    post.likedBy = post.likedBy.filter(user => user !== username);
    post.likes = (post.likes || 0) - 1;

    await writePosts(posts);
    res.status(200).json({ message: 'Post unliked successfully' });
  } catch (error) {
    console.error('Error unliking post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Un-report a post
app.post('/posts/:id/unreport', async (req, res) => {
  const postId = parseInt(req.params.id);
  const { username } = req.body;

  try {
    let posts = await readPosts();
    const post = posts.find(p => p.id === postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (!post.reportedBy || !post.reportedBy.includes(username)) {
      return res.status(400).json({ error: 'You have not reported this post' });
    }

    post.reportedBy = post.reportedBy.filter(user => user !== username);
    post.reports = (post.reports || 0) - 1;

    await writePosts(posts);
    res.status(200).json({ message: 'Post unreported successfully' });
  } catch (error) {
    console.error('Error unreporting post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Add a comment to a post
app.post('/posts/:id/comment', (req, res) => {
  try {
    const posts = readPosts();
    const notifications = readNotifications();
    const post = posts.find((post) => post.id == req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const newComment = {
      username: req.body.username,
      text: req.body.text,
    };
    post.comments.push(newComment);
    
    // Create a notification for the post owner
    if (post.username !== req.body.username) {
      const notification = {
        id: Date.now(),
        type: 'comment',
        actor: req.body.username,
        message: `commented on your post: "${newComment.text.slice(0, 50)}${newComment.text.length > 50 ? '...' : ''}"`,
        recipient: post.username,
        postId: post.id,
        date: new Date().toISOString(),
      };
      notifications.push(notification);
    }

    writePosts(posts);
    writeNotifications(notifications);
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Vote on a poll
app.post('/posts/:id/vote', (req, res) => {
  try {
    const posts = readPosts();
    const post = posts.find((post) => post.id == req.params.id);
    if (!post || !post.poll) {
      return res.status(404).json({ error: 'Post or poll not found' });
    }
    const { username, optionIndex } = req.body;
    if (optionIndex < 0 || optionIndex >= post.poll.options.length) {
      return res.status(400).json({ error: 'Invalid option index' });
    }
    post.poll.votedBy = post.poll.votedBy || [];
    if (!post.poll.votedBy.includes(username)) {
      post.poll.votes[optionIndex]++;
      post.poll.votedBy.push(username);
      writePosts(posts);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'User already voted in this poll' });
    }
  } catch (error) {
    console.error('Error voting:', error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// Get notifications for a user
app.get('/notifications', (req, res) => {
  try {
    const username = req.query.username;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    const notifications = readNotifications();
    const userNotifications = notifications
      .filter(notification => notification.recipient === username)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(userNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get friends and friend requests for a user
app.get('/friends', (req, res) => {
  try {
    const username = req.query.username;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    const friendsData = readFriends();
    const users = readUsers();

    // Initialize user data if not present
    if (!friendsData[username]) {
      friendsData[username] = { friends: [], requests: [], following: [], followers: [] };
      writeFriends(friendsData);
    }

    const friends = friendsData[username].friends || [];
    const requests = friendsData[username].requests || [];
    const following = friendsData[username].following || [];
    const followers = friendsData[username].followers || [];

    res.json({
      friends,
      requests,
      following,
      followers,
      users,
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});
// Send a friend request
app.post('/friend-request', (req, res) => {
  try {
    const { from, to } = req.body;
    if (!from || !to) {
      return res.status(400).json({ error: 'Sender and recipient usernames are required' });
    }
    if (from === to) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    const friendsData = readFriends();
    const notifications = readNotifications();
    const users = readUsers();

    // Initialize data for users if not present
    if (!friendsData[from]) friendsData[from] = { friends: [], requests: [] };
    if (!friendsData[to]) friendsData[to] = { friends: [], requests: [] };

    // Check if users exist
    const fromUser = users.find(u => u.username === from);
    const toUser = users.find(u => u.username === to);
    if (!fromUser || !toUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already friends
    if (friendsData[from].friends.includes(to) || friendsData[to].friends.includes(from)) {
      return res.status(400).json({ error: 'Users are already friends' });
    }

    // Check if request already exists
    const existingRequest = friendsData[to].requests.find(r => r.from === from && r.to === to);
    if (existingRequest) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    // Add friend request
    friendsData[to].requests.push({ from, to, date: new Date().toISOString() });

    // Create a notification for the recipient
    const notification = {
      id: Date.now(),
      type: 'friend_request',
      actor: from,
      message: `sent you a friend request`,
      recipient: to,
      date: new Date().toISOString(),
    };
    notifications.push(notification);

    writeFriends(friendsData);
    writeNotifications(notifications);
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// Accept a friend request
app.post('/friend-request/accept', (req, res) => {
  try {
    const { from, to } = req.body;
    if (!from || !to) {
      return res.status(400).json({ error: 'Sender and recipient usernames are required' });
    }

    const friendsData = readFriends();
    const notifications = readNotifications();

    // Initialize data for users if not present
    if (!friendsData[from]) friendsData[from] = { friends: [], requests: [] };
    if (!friendsData[to]) friendsData[to] = { friends: [], requests: [] };

    // Find and remove the friend request
    const requestIndex = friendsData[to].requests.findIndex(r => r.from === from && r.to === to);
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    friendsData[to].requests.splice(requestIndex, 1);

    // Add each user to the other's friends list
    friendsData[from].friends.push(to);
    friendsData[to].friends.push(from);

    // Create a notification for the sender
    const notification = {
      id: Date.now(),
      type: 'friend_accept',
      actor: to,
      message: `accepted your friend request`,
      recipient: from,
      date: new Date().toISOString(),
    };
    notifications.push(notification);

    writeFriends(friendsData);
    writeNotifications(notifications);
    res.json({ success: true });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});
function readFriends() {
  try {
    if (!fs.existsSync(friendsFile)) fs.writeFileSync(friendsFile, '{}');
    const friendsData = JSON.parse(fs.readFileSync(friendsFile));
    // Ensure all users have following and followers arrays
    Object.keys(friendsData).forEach(username => {
      friendsData[username].following = friendsData[username].following || [];
      friendsData[username].followers = friendsData[username].followers || [];
    });
    return friendsData;
  } catch (error) {
    console.error('Error reading friends:', error);
    return {};
  }
}                                                                                                                                             
// Follow a user
    app.post('/follow', (req, res) => {
      try {
        const { follower, followed } = req.body;
        if (!follower || !followed) {
          return res.status(400).json({ error: 'Follower and followed usernames are required' });
        }
        if (follower === followed) {
          return res.status(400).json({ error: 'Cannot follow yourself' });
        }

        const friendsData = readFriends();
        const users = readUsers();
        const notifications = readNotifications();

        // Initialize data for users if not present
        if (!friendsData[follower]) friendsData[follower] = { friends: [], requests: [], following: [], followers: [] };
        if (!friendsData[followed]) friendsData[followed] = { friends: [], requests: [], following: [], followers: [] };

        // Check if users exist
        const followerUser = users.find(u => u.username === follower);
        const followedUser = users.find(u => u.username === followed);
        if (!followerUser || !followedUser) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Check if already following
        if (friendsData[follower].following.includes(followed)) {
          return res.status(400).json({ error: 'Already following this user' });
        }

        // Add to follow lists
        friendsData[follower].following = friendsData[follower].following || [];
        friendsData[follower].following.push(followed);
        friendsData[followed].followers = friendsData[followed].followers || [];
        friendsData[followed].followers.push(follower);

        // Create a notification for the followed user
        const notification = {
          id: Date.now(),
          type: 'follow',
          actor: follower,
          message: `started following you`,
          recipient: followed,
          date: new Date().toISOString(),
        };
        notifications.push(notification);

        writeFriends(friendsData);
        writeNotifications(notifications);
        res.json({ success: true });
      } catch (error) {
        console.error('Error following user:', error);
        res.status(500).json({ error: 'Failed to follow user' });
      }
    });

    // Unfollow a user
    app.post('/unfollow', (req, res) => {
      try {
        const { follower, followed } = req.body;
        if (!follower || !followed) {
          return res.status(400).json({ error: 'Follower and followed usernames are required' });
        }

        const friendsData = readFriends();
        if (!friendsData[follower] || !friendsData[followed]) {
          return res.status(404).json({ error: 'User data not found' });
        }

        // Check if following
        if (!friendsData[follower].following.includes(followed)) {
          return res.status(400).json({ error: 'Not following this user' });
        }

        // Remove from follow lists
        friendsData[follower].following = friendsData[follower].following.filter(user => user !== followed);
        friendsData[followed].followers = friendsData[followed].followers.filter(user => user !== follower);

        writeFriends(friendsData);
        res.json({ success: true });
      } catch (error) {
        console.error('Error unfollowing user:', error);
        res.status(500).json({ error: 'Failed to unfollow user' });
      }
    });
// Delete a post
app.delete('/posts/:id', (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    let posts = readPosts();
    const post = posts.find(p => p.id === postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Verify ownership
    if (post.username !== username) {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    // Remove the post
    posts = posts.filter(p => p.id !== postId);
    writePosts(posts);

    // If the post had media, optionally delete the file
    if (post.media) {
      const mediaPath = path.join(__dirname, 'public', post.media);
      fs.unlink(mediaPath, err => {
        if (err) console.error('Error deleting media file:', err);
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});
// Delete a notification
app.delete('/notifications/:id', (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    let notifications = readNotifications();
    const notification = notifications.find(n => n.id === notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Verify ownership
    if (notification.recipient !== username) {
      return res.status(403).json({ error: 'You can only delete your own notifications' });
    }

    // Remove the notification
    notifications = notifications.filter(n => n.id !== notificationId);
    writeNotifications(notifications);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});
// Delete all notifications for a user
app.delete('/notifications', (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    let notifications = readNotifications();
    // Keep only notifications that don't belong to the user
    notifications = notifications.filter(n => n.recipient !== username);
    writeNotifications(notifications);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ error: 'Failed to delete all notifications' });
  }
});
// Like a comment
app.post('/posts/:id/comments/:commentId/like', (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const commentId = parseInt(req.params.commentId);
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const posts = readPosts();
    const notifications = readNotifications();
    const post = posts.find(p => p.id === postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Find the comment (including in replies)
    let targetComment = null;
    const findComment = (comments) => {
      for (const comment of comments) {
        if (comment.id === commentId) {
          targetComment = comment;
          return true;
        }
        if (comment.replies && findComment(comment.replies)) {
          return true;
        }
      }
      return false;
    };
    if (!findComment(post.comments)) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    targetComment.likedBy = targetComment.likedBy || [];
    if (targetComment.likedBy.includes(username)) {
      return res.status(400).json({ error: 'User already liked this comment' });
    }

    targetComment.likedBy.push(username);

    // Create a notification for the comment owner
    if (targetComment.username !== username) {
      const notification = {
        id: Date.now(),
        type: 'comment_like',
        actor: username,
        message: `liked your comment: "${targetComment.text.slice(0, 50)}${targetComment.text.length > 50 ? '...' : ''}"`,
        recipient: targetComment.username,
        postId: post.id,
        date: new Date().toISOString(),
      };
      notifications.push(notification);
    }

    writePosts(posts);
    writeNotifications(notifications);
    res.json({ success: true });
  } catch (error) {
    console.error('Error liking comment:', error);
    res.status(500).json({ error: 'Failed to like comment' });
  }
});

// Unlike a comment
app.post('/posts/:id/comments/:commentId/unlike', (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const commentId = parseInt(req.params.commentId);
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const posts = readPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Find the comment (including in replies)
    let targetComment = null;
    const findComment = (comments) => {
      for (const comment of comments) {
        if (comment.id === commentId) {
          targetComment = comment;
          return true;
        }
        if (comment.replies && findComment(comment.replies)) {
          return true;
        }
      }
      return false;
    };
    if (!findComment(post.comments)) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (!targetComment.likedBy || !targetComment.likedBy.includes(username)) {
      return res.status(400).json({ error: 'You have not liked this comment' });
    }

    targetComment.likedBy = targetComment.likedBy.filter(user => user !== username);

    writePosts(posts);
    res.json({ success: true });
  } catch (error) {
    console.error('Error unliking comment:', error);
    res.status(500).json({ error: 'Failed to unlike comment' });
  }
});

// Reply to a comment
app.post('/posts/:id/comments/:commentId/reply', (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const commentId = parseInt(req.params.commentId);
    const { username, text } = req.body;

    if (!username || !text) {
      return res.status(400).json({ error: 'Username and text are required' });
    }

    const posts = readPosts();
    const notifications = readNotifications();
    const post = posts.find(p => p.id === postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Find the comment (including in replies)
    let targetComment = null;
    const findComment = (comments) => {
      for (const comment of comments) {
        if (comment.id === commentId) {
          targetComment = comment;
          return true;
        }
        if (comment.replies && findComment(comment.replies)) {
          return true;
        }
      }
      return false;
    };
    if (!findComment(post.comments)) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const newReply = {
      id: Date.now(),
      username,
      text,
      likedBy: [],
      replies: [],
    };

    targetComment.replies = targetComment.replies || [];
    targetComment.replies.push(newReply);

    // Create a notification for the comment owner
    if (targetComment.username !== username) {
      const notification = {
        id: Date.now(),
        type: 'comment_reply',
        actor: username,
        message: `replied to your comment: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`,
        recipient: targetComment.username,
        postId: post.id,
        date: new Date().toISOString(),
      };
      notifications.push(notification);
    }

    writePosts(posts);
    writeNotifications(notifications);
    res.json({ success: true });
  } catch (error) {
    console.error('Error replying to comment:', error);
    res.status(500).json({ error: 'Failed to reply to comment' });
  }
});
// Set up storage for banner uploads
const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'public/uploads/banners');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter for banner images
const bannerFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed for banners!'));
  }
};

const bannerUpload = multer({
  storage: bannerStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: bannerFileFilter,
});

// Update user bio and banner
app.post('/users/update', bannerUpload.single('banner'), async (req, res) => {
  try {
    const users = readUsers();
    const { username, bio } = req.body;
    const bannerFile = req.file;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update bio
    if (bio) {
      users[userIndex].bio = bio;
    }

    // Handle banner upload
    if (bannerFile) {
      // Delete old banner if it exists
      if (users[userIndex].bannerURL) {
        const oldBannerPath = path.join(__dirname, 'public', users[userIndex].bannerURL);
        fs.unlink(oldBannerPath, err => {
          if (err) console.error('Error deleting old banner:', err);
        });
      }
      users[userIndex].bannerURL = `/uploads/banners/${bannerFile.filename}`;
    }

    writeUsers(users);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});
// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
