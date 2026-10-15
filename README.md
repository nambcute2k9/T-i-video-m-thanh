# 📱 iDownloader Pro (iOS PWA)

Ứng dụng Web App (PWA) tối ưu riêng cho **iPhone**, chạy độc lập toàn màn hình như một App thật mà **không cần cài file .ipa**, không lo hết hạn chứng chỉ 7 ngày và hoàn toàn miễn phí.

---

## 🌟 Tính năng nổi bật
1. **Tìm kiếm YouTube trực tiếp**: Gõ từ khóa tìm bài hát, MV, Shorts ngay trong App mà không cần mở YouTube.
2. **Tải đa nền tảng**:
   - 🎵 **TikTok**: Tự động lấy video HD **không logo / không watermark**.
   - ▶️ **YouTube**: Hỗ trợ 4K, 2K, 1080p 60fps, 720p hoặc tách nhạc MP3 320kbps.
   - 📸 **Instagram**: Tải Reels, Video bài viết chất lượng cao.
   - 📘 **Facebook**: Tải video chất lượng HD.
   - 🐦 **X (Twitter)**, Threads,...
3. **Trải nghiệm iOS Native**:
   - Nút "Dán từ bộ nhớ tạm" tiện lợi.
   - Giao diện Dark Mode chuẩn Apple (SF Pro font, Frosted Glass, Bo tròn góc).
   - Tối ưu vùng khuyết tai thỏ / Dynamic Island trên iPhone.
   - Hỗ trợ lưu thẳng vào ứng dụng **Ảnh (Cuộn Camera)** trên iOS.

---

## 🚀 Cách 1: Chạy thử ngay trên máy tính & kết nối với iPhone (Cùng mạng Wi-Fi)

1. Mở PowerShell hoặc Terminal tại thư mục `ios_video_pwa`:
   ```bash
   pip install -r requirements.txt
   ```
2. Khởi chạy server:
   ```bash
   python app.py
   ```
3. Xem địa chỉ IP máy tính của bạn (chạy lệnh `ipconfig` trên Windows, tìm dòng `IPv4 Address`, ví dụ: `192.168.1.15`).
4. Trên **iPhone**, mở trình duyệt Safari và truy cập:
   `http://192.168.1.15:8000`

---

## ☁️ Cách 2: Đưa lên mạng miễn phí 24/7 để dùng mọi lúc (Cả Wi-Fi và 4G/5G)

Bạn có thể đưa mã nguồn này lên các nền tảng miễn phí tốt nhất hiện nay:

### Lựa chọn A: Render.com (Khuyên dùng - Miễn phí)
1. Đăng ký tài khoản miễn phí tại [Render.com](https://render.com).
2. Tạo một kho lưu trữ (Repository) trên GitHub và tải thư mục này lên.
3. Trong Dashboard của Render: Chọn **New +** ➔ **Web Service** ➔ Kết nối với GitHub Repo của bạn.
4. Render sẽ tự động nhận diện file `Dockerfile` và cài đặt sẵn `ffmpeg` + `yt-dlp`.
5. Bấm **Deploy**. Sau 2-3 phút, bạn sẽ có một đường link dạng:
   `https://idownloader-xyz.onrender.com`

### Lựa chọn B: Hugging Face Spaces (Hoàn toàn miễn phí, không giới hạn thời gian)
1. Tạo tài khoản tại [HuggingFace.co](https://huggingface.co).
2. Chọn **New Space** ➔ Đặt tên ➔ Chọn SDK: **Docker** ➔ Chọn **Blank**.
3. Tải các file trong thư mục này lên Space. Hugging Face sẽ tự động build và cấp cho bạn link HTTPS vĩnh viễn.

---

## 📲 Cách cài đặt thành Icon App trên màn hình chính iPhone

1. Mở đường link ứng dụng trên trình duyệt **Safari** của iPhone.
2. Bấm nút **Chia sẻ** (biểu tượng hình vuông có mũi tên hướng lên ở thanh dưới Safari).
3. Cuộn xuống và chọn **"Thêm vào MH chính" (Add to Home Screen)**.
4. Bấm **Thêm** ở góc trên bên phải.
5. Biểu tượng **iDownloader** sẽ xuất hiện trên màn hình iPhone của bạn. Khi bấm vào, ứng dụng sẽ mở toàn màn hình như một App gốc độc lập!

---

## 📥 Hướng dẫn lưu Video vào Cuộn Camera (Photos) trên iPhone

1. Chọn chất lượng video và bấm tải về trong App.
2. Safari sẽ hiển thị hộp thoại: *"Bạn có muốn tải về [tên video] không?"* ➔ Chọn **Tải về**.
3. Nhìn lên góc thanh địa chỉ Safari (biểu tượng mũi tên tải xuống màu xanh) ➔ Bấm vào và chọn video vừa tải.
4. Bấm nút **Chia sẻ** ở góc dưới ➔ Chọn **Lưu video (Save Video)**.
5. Video chất lượng cao sẽ nằm ngay trong album **Ảnh** của bạn!
