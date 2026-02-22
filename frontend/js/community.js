/* ============================================
   THE MOTHER SUITE — Community JS
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {

  // ── Auth guard ─────────────────────────────────────────────────────────────
  const authUser = await AUTH.whenReady();
  if (!authUser) return;

  const user = AUTH.getUser();

  // ── Greet user in nav/sidebar ───────────────────────────────────────────────
  const firstName = (user?.name || user?.fullName || '').split(' ')[0] || '';
  if (firstName) {
    const greeting = document.getElementById('navGreeting');
    if (greeting) greeting.innerHTML = `Hi, <strong style="color:var(--text-dark);">${firstName}</strong> 👋`;
    const sidebarName = document.getElementById('sidebarName');
    if (sidebarName) sidebarName.textContent = firstName;
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    if (sidebarAvatar) sidebarAvatar.textContent = (firstName[0] || 'U').toUpperCase();
    const sidebarUserName = document.getElementById('sidebarUserName');
    if (sidebarUserName) sidebarUserName.textContent = user?.name || user?.fullName || '';
    const sidebarEmail = document.getElementById('sidebarEmail');
    if (sidebarEmail) sidebarEmail.textContent = user?.email || '';
  }

  // Set create-post avatar to user's initial
  const myAvatar = document.getElementById('myAvatar');
  if (myAvatar) {
    myAvatar.textContent = firstName ? firstName[0].toUpperCase() : '👩';
  }

  // ── Date ────────────────────────────────────────────────────────────────────
  const dateEl = document.getElementById('dashDate');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  document.getElementById('logoutBtn')?.addEventListener('click', () => AUTH.logout());
  document.getElementById('navLogoutBtn')?.addEventListener('click', () => AUTH.logout());

  // ── Mobile nav ──────────────────────────────────────────────────────────────
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('mobileMenu');
  toggle?.addEventListener('click', () => menu?.classList.toggle('open'));

  // ── Load posts ──────────────────────────────────────────────────────────────
  await loadPosts();

  // ── Submit new post ─────────────────────────────────────────────────────────
  const submitBtn = document.getElementById('submitPostBtn');
  const postInput = document.getElementById('postInput');

  submitBtn?.addEventListener('click', submitPost);
  postInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      submitPost();
    }
  });

});

// ── Load posts ────────────────────────────────────────────────────────────────
async function loadPosts() {
  const feed = document.getElementById('postsFeed');
  if (!feed) return;

  feed.innerHTML = renderSkeletons(3);

  try {
    const data = await AUTH.get('/api/community/posts');
    const posts = data.posts || [];

    if (!posts.length) {
      feed.innerHTML = `
        <div class="empty-state">
          <span class="empty-state-emoji">🌸</span>
          <p class="empty-state-text">Be the first to share something with the community.</p>
        </div>`;
      return;
    }

    feed.innerHTML = posts.map(renderPost).join('');
    attachPostListeners();
  } catch (err) {
    console.error('[Community] Failed to load posts:', err);
    feed.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-emoji">🌿</span>
        <p class="empty-state-text">Could not load posts right now. <button class="retry-btn" onclick="loadPosts()">Try again →</button></p>
      </div>`;
  }
}

// ── Render a single post card ─────────────────────────────────────────────────
function renderPost(post) {
  const d = new Date(post.createdAt || post.timestamp);
  const timeAgo = formatTimeAgo(d);
  const initial = (post.authorName || post.userName || 'A')[0].toUpperCase();
  const likes = post.likes || 0;
  const commentCount = (post.comments || []).length;

  return `
    <div class="post-card" data-post-id="${post.id}">
      <div class="post-header">
        <div class="post-user-info">
          <div class="post-avatar">${initial}</div>
          <div>
            <div class="post-username">${escapeHtml(post.authorName || post.userName || 'Mama')}</div>
            <div class="post-timestamp">${timeAgo}</div>
          </div>
        </div>
      </div>

      <div class="post-content">${escapeHtml(post.content || post.text || '')}</div>

      <div class="post-actions">
        <button class="post-action-btn like-btn ${post.likedByMe ? 'liked' : ''}" data-post-id="${post.id}">
          ${post.likedByMe ? '♥' : '♡'} ${likes > 0 ? likes : ''} Like
        </button>
        <button class="post-action-btn comment-toggle-btn" data-post-id="${post.id}">
          💬 ${commentCount > 0 ? commentCount : ''} Comment
        </button>
      </div>

      <div class="post-comments" id="comments-${post.id}" style="display:none;">
        ${(post.comments || []).map(renderComment).join('')}
        <form class="add-comment-form" data-post-id="${post.id}">
          <input type="text" class="add-comment-input" placeholder="Add a comment…" maxlength="500" required/>
          <button type="submit" class="add-comment-btn">Post</button>
        </form>
      </div>
    </div>`;
}

// ── Render a comment ──────────────────────────────────────────────────────────
function renderComment(comment) {
  const d = new Date(comment.createdAt || comment.timestamp);
  const initial = (comment.authorName || comment.userName || 'A')[0].toUpperCase();
  return `
    <div class="comment-item">
      <div class="comment-avatar">${initial}</div>
      <div>
        <div class="comment-user">${escapeHtml(comment.authorName || comment.userName || 'Mama')}</div>
        <div class="comment-text">${escapeHtml(comment.text || comment.content || '')}</div>
        <div class="comment-time">${formatTimeAgo(d)}</div>
      </div>
    </div>`;
}

// ── Attach listeners after rendering ─────────────────────────────────────────
function attachPostListeners() {
  // Like buttons
  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleLike(btn));
  });

  // Comment toggle
  document.querySelectorAll('.comment-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const postId = btn.dataset.postId;
      const commentsEl = document.getElementById(`comments-${postId}`);
      if (!commentsEl) return;
      const isOpen = commentsEl.style.display !== 'none';
      commentsEl.style.display = isOpen ? 'none' : 'flex';
      if (!isOpen) commentsEl.querySelector('.add-comment-input')?.focus();
    });
  });

  // Add comment forms
  document.querySelectorAll('.add-comment-form').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const input = form.querySelector('.add-comment-input');
      const text = input.value.trim();
      if (!text) return;

      const postId = form.dataset.postId;
      const btn = form.querySelector('.add-comment-btn');
      btn.disabled = true;
      btn.textContent = '…';

      try {
        const res = await AUTH.post(`/api/community/posts/${postId}/comments`, { text });
        const commentsEl = document.getElementById(`comments-${postId}`);
        if (commentsEl && res.comment) {
          // Insert new comment before the form
          const commentHtml = renderComment(res.comment);
          form.insertAdjacentHTML('beforebegin', commentHtml);
        }
        input.value = '';
        // Update comment count on toggle button
        updateCommentCount(postId);
      } catch (err) {
        console.error('[Community] Failed to post comment:', err);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Post';
      }
    });
  });
}

// ── Toggle like ───────────────────────────────────────────────────────────────
async function toggleLike(btn) {
  const postId = btn.dataset.postId;
  const isLiked = btn.classList.contains('liked');

  // Optimistic UI
  btn.classList.toggle('liked');
  const currentText = btn.textContent;
  // Update count optimistically
  const currentNum = parseInt(btn.textContent.match(/\d+/)?.[0] || '0');
  const newNum = isLiked ? Math.max(0, currentNum - 1) : currentNum + 1;
  btn.innerHTML = `${isLiked ? '♡' : '♥'} ${newNum > 0 ? newNum : ''} Like`;

  try {
    const endpoint = isLiked
      ? `/api/community/posts/${postId}/unlike`
      : `/api/community/posts/${postId}/like`;
    await AUTH.post(endpoint, {});
  } catch (err) {
    // Revert on failure
    btn.classList.toggle('liked');
    btn.textContent = currentText;
    console.error('[Community] Like failed:', err);
  }
}

// ── Update comment count on toggle button ────────────────────────────────────
function updateCommentCount(postId) {
  const commentsEl = document.getElementById(`comments-${postId}`);
  if (!commentsEl) return;
  // Count .comment-item elements (exclude form)
  const count = commentsEl.querySelectorAll('.comment-item').length;
  const toggleBtn = document.querySelector(`.comment-toggle-btn[data-post-id="${postId}"]`);
  if (toggleBtn) {
    toggleBtn.innerHTML = `💬 ${count > 0 ? count : ''} Comment`;
  }
}

// ── Submit new post ────────────────────────────────────────────────────────────
async function submitPost() {
  const postInput = document.getElementById('postInput');
  const submitBtn = document.getElementById('submitPostBtn');
  const content = postInput?.value.trim();

  if (!content) {
    postInput?.focus();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Posting…';

  try {
    const res = await AUTH.post('/api/community/posts', { content });
    postInput.value = '';

    if (res.post) {
      // Prepend new post to feed
      const feed = document.getElementById('postsFeed');
      const emptyState = feed.querySelector('.empty-state');
      if (emptyState) emptyState.remove();

      feed.insertAdjacentHTML('afterbegin', renderPost(res.post));
      attachPostListeners();
    } else {
      // Fallback: full reload
      await loadPosts();
    }
  } catch (err) {
    console.error('[Community] Failed to post:', err);
    alert('Could not post. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '🌸 Post';
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTimeAgo(date) {
  const secs = Math.floor((Date.now() - date) / 1000);
  if (secs < 60)   return 'just now';
  if (secs < 3600) return Math.floor(secs / 60) + 'm ago';
  if (secs < 86400) return Math.floor(secs / 3600) + 'h ago';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  const el = document.createElement('div');
  el.textContent = str;
  return el.innerHTML;
}

function renderSkeletons(n) {
  return Array.from({ length: n }, () => `
    <div class="post-card post-skeleton">
      <div class="skel skel-row">
        <div class="skel skel-avatar"></div>
        <div style="flex:1;">
          <div class="skel skel-line" style="width:40%;"></div>
          <div class="skel skel-line" style="width:25%;margin-top:6px;"></div>
        </div>
      </div>
      <div class="skel skel-line" style="width:90%;margin-top:1rem;"></div>
      <div class="skel skel-line" style="width:70%;margin-top:6px;"></div>
      <div class="skel skel-line" style="width:80%;margin-top:6px;"></div>
    </div>
  `).join('');
}
