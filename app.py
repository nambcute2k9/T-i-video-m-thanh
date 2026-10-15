import os
import shutil
import tempfile
import re
import urllib.parse
from typing import Optional
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp

app = FastAPI(title="iOS Media Downloader PWA")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = os.path.join(tempfile.gettempdir(), "ios_pwa_downloads")
os.makedirs(TEMP_DIR, exist_ok=True)

def get_ffmpeg_path() -> Optional[str]:
    path = shutil.which("ffmpeg")
    if path:
        return path
    try:
        import imageio_ffmpeg
        exe = imageio_ffmpeg.get_ffmpeg_exe()
        if os.path.exists(exe):
            return exe
    except Exception:
        pass
def get_cookie_file() -> Optional[str]:
    # 1. Kiểm tra biến môi trường YOUTUBE_COOKIES (dành cho Render/Cloud)
    env_cookies = os.environ.get("YOUTUBE_COOKIES")
    if env_cookies and len(env_cookies.strip()) > 10:
        temp_cookie_path = os.path.join(tempfile.gettempdir(), "youtube_cookies.txt")
        try:
            with open(temp_cookie_path, "w", encoding="utf-8") as f:
                f.write(env_cookies.strip())
            return temp_cookie_path
        except Exception as e:
            print(f"Error writing env cookies: {e}")

    # 2. Kiểm tra file cookies.txt trong thư mục dự án
    local_cookie = os.path.join(os.path.dirname(__file__), "cookies.txt")
    if os.path.exists(local_cookie) and os.path.getsize(local_cookie) > 0:
        return local_cookie

    return None

def get_base_ydl_opts() -> dict:
    opts = {
        'quiet': True,
        'no_warnings': True,
        'extractor_args': {
            'youtube': {
                'player_client': ['ios', 'android', 'mweb'],
            }
        }
    }
    cookie_path = get_cookie_file()
    if cookie_path:
        opts['cookiefile'] = cookie_path
    return opts

def cleanup_file(path: str):
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception as e:
        print(f"Error cleaning up file {path}: {e}")

def sanitize_filename(name: str) -> str:
    clean = re.sub(r'[\\/*?:"<>|]', "", name)
    clean = clean.strip()
    return clean[:100] if clean else "media"

def format_duration(seconds: Optional[int]) -> str:
    if not seconds:
        return "--:--"
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h}:{m:02d}:{s:02d}"
    return f"{m}:{s:02d}"

def detect_platform(url: str) -> str:
    url_lower = url.lower()
    if "youtube.com" in url_lower or "youtu.be" in url_lower:
        return "YouTube"
    if "tiktok.com" in url_lower:
        return "TikTok"
    if "facebook.com" in url_lower or "fb.watch" in url_lower or "fb.com" in url_lower:
        return "Facebook"
    if "instagram.com" in url_lower:
        return "Instagram"
    if "twitter.com" in url_lower or "x.com" in url_lower:
        return "X (Twitter)"
    if "threads.net" in url_lower:
        return "Threads"
    return "Đa nền tảng"

class InfoRequest(BaseModel):
    url: str

@app.get("/api/search")
def search_youtube(q: str = Query(..., min_length=1)):
    """Tìm kiếm video YouTube trực tiếp không cần API Key"""
    ydl_opts = get_base_ydl_opts()
    ydl_opts.update({
        'extract_flat': True,
        'skip_download': True,
    })
    
    query = f"ytsearch15:{q}"
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            res = ydl.extract_info(query, download=False)
            entries = res.get('entries', [])
            
            results = []
            for item in entries:
                if not item:
                    continue
                video_id = item.get('id')
                url = item.get('url') or f"https://www.youtube.com/watch?v={video_id}"
                
                # Thumbnail chất lượng cao
                thumbnail = item.get('thumbnail')
                if not thumbnail and video_id:
                    thumbnail = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
                
                results.append({
                    "id": video_id,
                    "title": item.get('title', 'Video không có tiêu đề'),
                    "url": url,
                    "thumbnail": thumbnail,
                    "duration": format_duration(item.get('duration')),
                    "uploader": item.get('uploader') or item.get('channel') or "YouTube",
                    "view_count": item.get('view_count'),
                })
            return {"success": True, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tìm kiếm: {str(e)}")

@app.post("/api/info")
def get_media_info(req: InfoRequest):
    """Trích xuất thông tin video & danh sách định dạng hỗ trợ"""
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="Vui lòng nhập đường link")
    
    ydl_opts = get_base_ydl_opts()
    ydl_opts.update({
        'skip_download': True,
    })
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                raise HTTPException(status_code=404, detail="Không thể trích xuất video từ đường dẫn này")
            
            title = info.get('title', 'Video')
            thumbnail = info.get('thumbnail', '')
            duration = format_duration(info.get('duration'))
            uploader = info.get('uploader') or info.get('creator') or info.get('channel') or ""
            platform = detect_platform(url)
            
            # Phân tích định dạng có sẵn
            formats = info.get('formats', [])
            max_height = 0
            has_video = False
            for f in formats:
                h = f.get('height') or 0
                if h > max_height:
                    max_height = h
                if f.get('vcodec') != 'none':
                    has_video = True
            
            # Xây dựng danh sách options cho người dùng chọn
            download_options = []
            
            # Video options
            if max_height >= 2160:
                download_options.append({"id": "4k", "label": "Video 4K Ultra HD (2160p)", "type": "video", "badge": "4K"})
            if max_height >= 1440:
                download_options.append({"id": "2k", "label": "Video 2K Quad HD (1440p)", "type": "video", "badge": "2K"})
            if max_height >= 1080:
                download_options.append({"id": "1080p", "label": "Video Full HD (1080p 60fps)", "type": "video", "badge": "FHD"})
            if max_height >= 720 or max_height == 0:
                download_options.append({"id": "720p", "label": "Video HD Chuẩn (720p)", "type": "video", "badge": "HD"})
            download_options.append({"id": "480p", "label": "Video Tiết kiệm dung lượng (480p/SD)", "type": "video", "badge": "SD"})
            
            # Audio options
            download_options.append({"id": "mp3_320", "label": "Âm thanh MP3 Cực nét (320 kbps)", "type": "audio", "badge": "MP3"})
            download_options.append({"id": "mp3_192", "label": "Âm thanh MP3 Chuẩn (192 kbps)", "type": "audio", "badge": "MP3"})
            download_options.append({"id": "m4a", "label": "Âm thanh M4A Gốc (Chất lượng gốc)", "type": "audio", "badge": "M4A"})
            
            return {
                "success": True,
                "title": title,
                "thumbnail": thumbnail,
                "duration": duration,
                "uploader": uploader,
                "platform": platform,
                "url": url,
                "options": download_options
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Không thể phân tích link: {str(e)}")

@app.get("/api/download")
def download_media(
    background_tasks: BackgroundTasks,
    url: str = Query(..., min_length=1),
    quality: str = Query("720p"),
    custom_title: Optional[str] = None
):
    """Tải và xử lý file để trả về trực tiếp cho Safari iOS"""
    clean_title = sanitize_filename(custom_title) if custom_title else "download"
    ffmpeg_path = get_ffmpeg_path()
    has_ffmpeg = ffmpeg_path is not None
    
    # Cấu hình format yt-dlp
    out_tmpl = os.path.join(TEMP_DIR, f"{clean_title}_%(id)s_%(epoch)s.%(ext)s")
    
    ydl_opts = get_base_ydl_opts()
    ydl_opts.update({
        'outtmpl': out_tmpl,
        'restrictfilenames': True,
    })
    if has_ffmpeg:
        ydl_opts['ffmpeg_location'] = ffmpeg_path
    
    is_audio = quality.startswith("mp3") or quality == "m4a"
    
    if is_audio:
        if quality == "mp3_320":
            ydl_opts.update({
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '320',
                }] if has_ffmpeg else []
            })
        elif quality == "mp3_192":
            ydl_opts.update({
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }] if has_ffmpeg else []
            })
        else: # m4a
            ydl_opts.update({
                'format': 'm4a/bestaudio/best',
            })
    else:
        # Video
        height_map = {
            "4k": 2160,
            "2k": 1440,
            "1080p": 1080,
            "720p": 720,
            "480p": 480
        }
        target_h = height_map.get(quality, 720)
        
        if has_ffmpeg:
            ydl_opts.update({
                'format': f"bestvideo[height<={target_h}]+bestaudio/best[height<={target_h}]/best",
                'merge_output_format': 'mp4',
            })
        else:
            # Fallback nếu server chưa có ffmpeg: lấy stream kết hợp tốt nhất
            ydl_opts.update({
                'format': f"best[height<={target_h}]/best",
            })

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            res = ydl.extract_info(url, download=True)
            # Tìm file thực tế đã được tải về
            downloaded_file = ydl.prepare_filename(res)
            
            # Nếu đã qua post-processor đổi đuôi (ví dụ mp3 hoặc merge mp4)
            base, _ = os.path.splitext(downloaded_file)
            if is_audio and has_ffmpeg:
                expected = base + ".mp3"
                if os.path.exists(expected):
                    downloaded_file = expected
            else:
                if has_ffmpeg and not is_audio:
                    expected = base + ".mp4"
                    if os.path.exists(expected):
                        downloaded_file = expected
            
            if not os.path.exists(downloaded_file):
                # Quét file mới nhất trong TEMP_DIR
                files = [os.path.join(TEMP_DIR, f) for f in os.listdir(TEMP_DIR)]
                if files:
                    downloaded_file = max(files, key=os.path.getctime)
                else:
                    raise HTTPException(status_code=500, detail="Không tìm thấy tệp sau khi tải")

            ext = os.path.splitext(downloaded_file)[1].lstrip('.').lower()
            mime_type = "video/mp4"
            if ext in ["mp3"]:
                mime_type = "audio/mpeg"
            elif ext in ["m4a"]:
                mime_type = "audio/mp4"
            elif ext in ["webm"]:
                mime_type = "video/webm"

            final_filename = f"{clean_title}.{ext}"
            # URL encode tên file để Safari hiển thị đúng tiếng Việt
            encoded_filename = urllib.parse.quote(final_filename)
            
            background_tasks.add_task(cleanup_file, downloaded_file)
            
            return FileResponse(
                path=downloaded_file,
                media_type=mime_type,
                filename=final_filename,
                headers={
                    "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
                }
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi tải tệp: {str(e)}")

# Mount static files cho PWA
app.mount("/", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "static"), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
