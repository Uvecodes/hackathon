/* ============================================
   THE MOTHER SUITE — COMMUNITY PAGE JS
   ============================================ */

// Sample user data
const currentUser = {
  name: 'Jane',
  avatar: '👩'
};

// Initialize community
document.addEventListener('DOMContentLoaded', () => {
  loadPosts();
  setupPostSubmission();
});

// Load posts from localStorage
function loadPosts() {
  const postsFeed = document.getElementById('postsFeed');
  if (!postsFeed) return;

  const posts = JSON.parse(localStorage.getItem('communityPosts')) || [];
  
  if (posts.length === 0) {
    postsFeed.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-emoji">💬</span>
        <p class="empty-state-text">No posts yet. Be the first to share your experience!</p>
      </div>
    `;
    return;
  }

  // Display posts in reverse order (newest first)
  postsFeed.innerHTML = posts.reverse().map((post, index) => createPostHTML(post, posts.length - 1 - index)).join('');
  
  // Attach event listeners
  attachPostListeners();
}

// Create HTML for a single post
function createPostHTML(post, postId) {
  const commentsHTML = post.comments.map(comment => `
    <div class="comment-item">
      <div class="comment-avatar">${comment.avatar}</div>
      <div class="comment-content">
        <div class="comment-user">${comment.username}</div>
        <div class="comment-text">${escapeHtml(comment.text)}</div>
        <div class="comment-time">${getTimeAgo(new Date(comment.timestamp))}</div>
      </div>
    </div>
  `).join('');

  const likeCount = post.likes.length > 0 ? `(${post.likes.length})` : '';
  const isLiked = post.likes.includes(currentUser.name);

  return `
    <div class="post-card" data-post-id="${postId}">
      <div class="post-header">
        <div class="post-user-info">
          <div class="post-avatar">${post.avatar}</div>
          <div class="post-user-meta">
            <div class="post-username">${post.username}</div>
            <div class="post-timestamp">${getTimeAgo(new Date(post.timestamp))}</div>
          </div>
        </div>
      </div>
      <div class="post-content">${escapeHtml(post.content)}</div>
      <div class="post-actions">
        <button class="post-action-btn like-btn ${isLiked ? 'liked' : ''}" data-post-id="${postId}">
          ❤️ Like <span class="like-count">${likeCount}</span>
        </button>
        <button class="post-action-btn comment-toggle-btn" data-post-id="${postId}">
          💬 Comment (${post.comments.length})
        </button>
      </div>
      <div class="post-comments" style="display: none;">
        ${commentsHTML}
        <div class="add-comment-form">
          <input type="text" class="add-comment-input" placeholder="Add a comment..." />
          <button class="add-comment-btn" data-post-id="${postId}">Reply</button>
        </div>
      </div>
    </div>
  `;
}

// Setup post submission
function setupPostSubmission() {
  const submitBtn = document.getElementById('submitPostBtn');
  const postInput = document.getElementById('postInput');

  if (!submitBtn || !postInput) return;

  submitBtn.addEventListener('click', () => {
    const content = postInput.value.trim();

    if (content.length === 0) {
      alert('Please write something to share!');
      return;
    }

    // Create new post
    const newPost = {
      username: currentUser.name,
      avatar: currentUser.avatar,
      content: content,
      timestamp: new Date().toISOString(),
      likes: [],
      comments: []
    };

    // Get existing posts and add new one
    const posts = JSON.parse(localStorage.getItem('communityPosts')) || [];
    posts.push(newPost);
    localStorage.setItem('communityPosts', JSON.stringify(posts));

    // Clear input and reload
    postInput.value = '';
    loadPosts();
  });

  // Allow posting with Shift+Enter
  postInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
      submitBtn.click();
    }
  });
}

// Attach event listeners to posts
function attachPostListeners() {
  // Like button
  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const postId = btn.dataset.postId;
      toggleLike(postId);
    });
  });

  // Comment toggle
  document.querySelectorAll('.comment-toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const postId = btn.dataset.postId;
      const commentSection = document.querySelector(`.post-card[data-post-id="${postId}"] .post-comments`);
      if (commentSection) {
        commentSection.style.display = commentSection.style.display === 'none' ? 'flex' : 'none';
      }
    });
  });

  // Comment submit
  document.querySelectorAll('.add-comment-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const postId = btn.dataset.postId;
      const input = document.querySelector(`.post-card[data-post-id="${postId}"] .add-comment-input`);
      if (input && input.value.trim()) {
        addComment(postId, input.value.trim());
        input.value = '';
      }
    });
  });

  // Comment input Enter key
  document.querySelectorAll('.add-comment-input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const btn = e.target.nextElementSibling;
        if (btn) btn.click();
      }
    });
  });
}

// Toggle like on a post
function toggleLike(postId) {
  const posts = JSON.parse(localStorage.getItem('communityPosts')) || [];
  const post = posts[postId];

  if (!post) return;

  const likeIndex = post.likes.indexOf(currentUser.name);
  if (likeIndex > -1) {
    post.likes.splice(likeIndex, 1);
  } else {
    post.likes.push(currentUser.name);
  }

  posts[postId] = post;
  localStorage.setItem('communityPosts', JSON.stringify(posts));
  loadPosts();
}

// Add comment to a post
function addComment(postId, commentText) {
  const posts = JSON.parse(localStorage.getItem('communityPosts')) || [];
  const post = posts[postId];

  if (!post) return;

  const newComment = {
    username: currentUser.name,
    avatar: currentUser.avatar,
    text: commentText,
    timestamp: new Date().toISOString()
  };

  post.comments.push(newComment);
  posts[postId] = post;
  localStorage.setItem('communityPosts', JSON.stringify(posts));
  loadPosts();
}

// Utility: Escape HTML to prevent XSS
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Utility: Get time ago string
function getTimeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}
