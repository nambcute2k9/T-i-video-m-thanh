// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('ServiceWorker registered with scope:', reg.scope);
    }).catch((err) => {
      console.log('ServiceWorker registration failed:', err);
    });
  });
}

// State
let currentMediaData = null;

// DOM Elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPages = document.querySelectorAll('.tab-page');
const urlInput = document.getElementById('urlInput');
const clearUrlBtn = document.getElementById('clearUrlBtn');
const pasteClipboardBtn = document.getElementById('pasteClipboardBtn');
const analyzeUrlBtn = document.getElementById('analyzeUrlBtn');

const ytSearchInput = document.getElementById('ytSearchInput');
const searchResults = document.getElementById('searchResults');

const formatModal = document.getElementById('formatModal');
const modalThumb = document.getElementById('modalThumb');
const modalTitle = document.getElementById('modalTitle');
const modalAuthor = document.getElementById('modalAuthor');
const videoFormatsList = document.getElementById('videoFormatsList');
const audioFormatsList = document.getElementById('audioFormatsList');

const tutorialModal = document.getElementById('tutorialModal');
const openTutorialBtn = document.getElementById('openTutorialBtn');
const closeTutorialModalBtn = document.getElementById('closeTutorialModalBtn');
const tipBanner = document.getElementById('tipBanner');
const closeTipBtn = document.getElementById('closeTipBtn');

// Tab Switching
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetTab = btn.getAttribute('data-tab');
    
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPages.forEach(p => p.classList.remove('active'));
    
    btn.classList.add('active');
    const page = document.getElementById(targetTab);
    if (page) page.classList.add('active');
  });
});

// Tip Banner
if (closeTipBtn) {
  closeTipBtn.addEventListener('click', () => {
    tipBanner.style.display = 'none';
    localStorage.setItem('hide_ios_tip', 'true');
  });
  if (localStorage.getItem('hide_ios_tip') === 'true') {
    tipBanner.style.display = 'none';
  }
}

// Tutorial Modal
if (openTutorialBtn) {
  openTutorialBtn.addEventListener('click', () => {
    tutorialModal.classList.add('open');
  });
}
if (closeTutorialModalBtn) {
  closeTutorialModalBtn.addEventListener('click', () => {
    tutorialModal.classList.remove('open');
  });
}

// Input Helpers
urlInput.addEventListener('input', () => {
  clearUrlBtn.style.display = urlInput.value.trim() ? 'flex' : 'none';
});

clearUrlBtn.addEventListener('click', () => {
  urlInput.value = '';
  clearUrlBtn.style.display = 'none';
  urlInput.focus();
});

// Paste from Clipboard Button
pasteClipboardBtn.addEventListener('click', async () => {
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        urlInput.value = text.trim();
        clearUrlBtn.style.display = 'flex';
        // Auto analyze
        analyzeUrl(text.trim());
      } else {
        alert('Bộ nhớ tạm đang trống. Hãy sao chép liên kết video trước!');
      }
    } else {
      alert('Trình duyệt chưa cấp quyền truy cập bộ nhớ tạm. Bạn hãy dán link thủ công.');
      urlInput.focus();
    }
  } catch (err) {
    console.error('Clipboard error:', err);
    alert('Không thể đọc bộ nhớ tạm. Hãy chạm giữ ô nhập để dán link.');
    urlInput.focus();
  }
});

// Analyze URL Button
analyzeUrlBtn.addEventListener('click', () => {
  const url = urlInput.value.trim();
  if (!url) {
    alert('Vui lòng nhập hoặc dán đường link video!');
    urlInput.focus();
    return;
  }
  analyzeUrl(url);
});

// Core Analyze Function
async function analyzeUrl(url) {
  setAnalyzeLoading(true);
  try {
    const res = await fetch('/api/info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Không thể trích xuất video này');
    }

    currentMediaData = data;
    showFormatModal(data);
  } catch (err) {
    alert('⚠️ Lỗi: ' + err.message);
  } finally {
    setAnalyzeLoading(false);
  }
}

function setAnalyzeLoading(isLoading) {
  if (isLoading) {
    analyzeUrlBtn.innerHTML = `
      <div class="spinner" style="width:16px; height:16px; border-width:2px; margin:0;"></div>
      Đang quét...
    `;
    analyzeUrlBtn.style.opacity = '0.7';
    analyzeUrlBtn.disabled = true;
  } else {
    analyzeUrlBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      Phân tích link
    `;
    analyzeUrlBtn.style.opacity = '1';
    analyzeUrlBtn.disabled = false;
  }
}

// Show Format Selection Bottom Sheet
function showFormatModal(data) {
  modalThumb.src = data.thumbnail || '/icons/icon-192.png';
  modalTitle.textContent = data.title;
  modalAuthor.textContent = `${data.uploader || data.platform} • ${data.duration}`;
  
  videoFormatsList.innerHTML = '';
  audioFormatsList.innerHTML = '';
  
  const videoOpts = (data.options || []).filter(o => o.type === 'video');
  const audioOpts = (data.options || []).filter(o => o.type === 'audio');
  
  // Render Video
  videoOpts.forEach(opt => {
    const item = document.createElement('div');
    item.className = 'format-item';
    let badgeClass = 'badge-fhd';
    if (opt.id === '4k') badgeClass = 'badge-4k';
    else if (opt.id === '2k') badgeClass = 'badge-2k';
    
    item.innerHTML = `
      <div class="format-left">
        <span class="format-badge ${badgeClass}">${opt.badge}</span>
        <span class="format-label">${opt.label}</span>
      </div>
      <div class="format-dl-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </div>
    `;
    item.addEventListener('click', () => triggerDownload(data.url, opt.id, data.title));
    videoFormatsList.appendChild(item);
  });
  
  // Render Audio
  audioOpts.forEach(opt => {
    const item = document.createElement('div');
    item.className = 'format-item';
    item.innerHTML = `
      <div class="format-left">
        <span class="format-badge badge-mp3">${opt.badge}</span>
        <span class="format-label">${opt.label}</span>
      </div>
      <div class="format-dl-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </div>
    `;
    item.addEventListener('click', () => triggerDownload(data.url, opt.id, data.title));
    audioFormatsList.appendChild(item);
  });
  
  formatModal.classList.add('open');
}

// Trigger Safari Native Download
function triggerDownload(url, quality, title) {
  // Đóng modal sau khi bấm
  formatModal.classList.remove('open');
  
  const dlUrl = `/api/download?url=${encodeURIComponent(url)}&quality=${encodeURIComponent(quality)}&custom_title=${encodeURIComponent(title)}`;
  
  // Hiển thị thông báo hướng dẫn ngắn trên iOS
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 60px;
    left: 20px;
    right: 20px;
    z-index: 200;
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid rgba(244, 63, 94, 0.5);
    border-radius: 14px;
    padding: 12px 16px;
    font-size: 13px;
    color: #fff;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    gap: 10px;
  `;
  toast.innerHTML = `
    <div class="spinner" style="width:18px;height:18px;margin:0;border-width:2px;"></div>
    <div>Đang chuẩn bị file... Safari sẽ hiện hộp thoại tải về ngay.</div>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 4000);

  // Mở luồng tải
  window.location.href = dlUrl;
}

// Close format modal when clicking outside
formatModal.addEventListener('click', (e) => {
  if (e.target === formatModal) {
    formatModal.classList.remove('open');
  }
});
tutorialModal.addEventListener('click', (e) => {
  if (e.target === tutorialModal) {
    tutorialModal.classList.remove('open');
  }
});

// YouTube Search Logic
let searchTimeout = null;
ytSearchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    performYouTubeSearch();
  }
});

async function performYouTubeSearch() {
  const query = ytSearchInput.value.trim();
  if (!query) return;

  searchResults.innerHTML = `
    <div class="state-box">
      <div class="spinner"></div>
      <p>Đang tìm kiếm trên YouTube...</p>
    </div>
  `;

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Lỗi tìm kiếm');

    const list = data.results || [];
    if (list.length === 0) {
      searchResults.innerHTML = `
        <div class="state-box">
          <p>Không tìm thấy video phù hợp. Hãy thử từ khóa khác.</p>
        </div>
      `;
      return;
    }

    searchResults.innerHTML = '';
    list.forEach(video => {
      const card = document.createElement('div');
      card.className = 'video-card';
      card.innerHTML = `
        <div class="thumb-container">
          <img class="thumb-img" src="${video.thumbnail}" alt="" loading="lazy">
          <span class="duration-tag">${video.duration}</span>
        </div>
        <div class="video-info">
          <h4 class="video-title">${video.title}</h4>
          <span class="video-channel">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>
            ${video.uploader}
          </span>
          <button class="quick-dl-btn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Tải về
          </button>
        </div>
      `;
      card.addEventListener('click', () => {
        analyzeUrl(video.url);
      });
      searchResults.appendChild(card);
    });

  } catch (err) {
    searchResults.innerHTML = `
      <div class="state-box">
        <p style="color: #f43f5e;">⚠️ Lỗi: ${err.message}</p>
      </div>
    `;
  }
}
