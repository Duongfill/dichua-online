# Chùa Online 3D (tên tạm)

Ngôi chùa 3D low-poly / chibi chạy trên trình duyệt (ưu tiên điện thoại): cùng đi dạo, lễ Phật, nghe kinh, chat và voice.
Toàn bộ mô hình, màu sắc, logo, icon đều **tự thiết kế** từ khối hình học, không dùng tài sản của game nào khác.

> Trạng thái: **Giai đoạn 1–4 xong**: khung 3D, di chuyển, đồng bộ người chơi, kênh, hai khu vực; HUD đầy đủ, chat theo khu vực, chat nhanh, bong bóng chat, minimap, cài đặt; 4 nghi thức Thắp hương, Lạy Phật, Thỉnh chuông, Phóng sinh; ngồi 20 bồ đoàn; voice LiveKit (theo khoảng cách ở sân, chung cả phòng ở chánh điện), Tịnh tâm.

## Kiến trúc

```
chua3d/
├─ shared/            @chua/shared – dùng chung client & server
│  └─ src/protocol.ts   kiểu sự kiện Socket.IO, hằng số (tốc độ, sức chứa, tick), ngoại hình
│  └─ src/world.ts      biên khu vực, vật cản, vùng cửa, 20 vị trí bồ đoàn, hàm collide()
├─ server/            Node + TypeScript (chạy bằng tsx) + Express + Socket.IO
│  └─ src/index.ts      sự kiện hello / move / scene:change, vòng lặp snapshot 15 Hz, stats
│  └─ src/world.ts      kênh (≤50 người), chánh điện (≤20/kênh), kiểm tra tốc độ + va chạm
│  └─ src/moderation.ts lọc tên/chat (có dấu tiếng Việt), ẩn link & số điện thoại, giới hạn tần suất
└─ client/            React + Vite + TypeScript + React Three Fiber + drei + Zustand + Tailwind
   └─ src/net/          socket, đồng hồ server, bộ đệm nội suy (trễ 150 ms)
   └─ src/state/store.ts  Zustand: phiên chơi, người chơi, khu vực, toast; gửi vị trí 15 Hz
   └─ src/game/         Canvas, camera góc nhìn thứ ba, nhân vật chibi, người chơi local/remote
   └─ src/game/world/   Sân chùa, Chánh điện, props (đỉnh hương, hồ sen, Quan Âm, lầu chuông,
                        bonsai, đèn lồng, cờ ngũ sắc…), texture vẽ bằng canvas
   └─ src/ui/           Đăng nhập + tuỳ chỉnh nhân vật, joystick, minimap, icon tự vẽ, error boundary
   └─ src/ui/hud/       Corners (thẻ người chơi, tiền tệ, nút nhanh), ActionGrid, BottomNav,
                        Banner, ChatBox (khung chat / bảng chat điện thoại), Panels (cài đặt, bản đồ…)
```

**Đồng bộ vị trí**
- Client tự di chuyển ngay (dự đoán phía client) để không bị trễ, rồi gửi `[x, z, hướng, anim]` 15 lần/giây khi di chuyển, 1 lần/giây khi đứng yên.
- Server giới hạn bước đi theo tốc độ tối đa và chạy lại `collide()` (cùng code với client), nên không teleport hay đi xuyên vật cản được.
- Snapshot chỉ gửi cho người cùng kênh và cùng khu vực.
- Client hiển thị người khác **trễ 150 ms** và nội suy giữa hai mẫu, nên chuyển động mượt dù mạng giật.

**Chat (giai đoạn 2)**
- Chat theo **khu vực**: người ở sân không thấy chat trong chánh điện và ngược lại. Mỗi khu vực của mỗi kênh giữ 30 tin gần nhất; người mới vào nhận lịch sử.
- 4 câu chat nhanh ("A Di Đà Phật", "Chào mọi người", "Tùy hỷ", "Bình an nhé"): client chỉ gửi chỉ số, server tự điền nội dung.
- Server lọc từ thô tục (so khớp **có dấu**, nên "du lịch" không bị chặn nhầm), ẩn link và số điện thoại, giới hạn 160 ký tự; mỗi người tối đa 1 tin/1,2 giây, 5 tin/15 giây, không lặp lại tin vừa gửi.
- Tin hiện thành **bong bóng trên đầu nhân vật** trong 6 giây; tin hệ thống báo vào/ra khu vực; banner giữa trên báo "X vừa đến chùa".

**Nghi thức (giai đoạn 3)**

| Nghi thức | Ở đâu | Công đức / KN | Chờ | Diễn ra |
|---|---|---|---|---|
| Thắp hương | Đỉnh hương giữa sân, hoặc bàn thờ trong chánh điện | +5 / +6 | 30s | Nâng hương vái 3 lần, nén mới cắm vào đỉnh, khói bốc, tiếng quẹt lửa + mõ |
| Lạy Phật | Trong chánh điện, trước bàn thờ | +3 / +4 | 15s | Quỳ lạy 3 lần, mỗi lạy một tiếng khánh, hào quang tượng sáng lên |
| Thỉnh chuông | Lầu chuông phía tây | +4 / +5 | 20s | Chày đánh vào chuông, chuông lắc, sóng âm lan ra, tiếng chuông ngân ~7s; mỗi khu vực chỉ một hồi chuông một lúc |
| Phóng sinh | Bờ hồ sen phía đông | +6 / +7 | 45s | Ôm cá tung xuống hồ, nước bắn, cá koi bơi quanh tượng Quan Âm 2 phút |

- Đứng gần vật thể sẽ hiện nút nổi "Thắp hương [E]"; bấm E hoặc chạm để làm. Bấm nút trong cột hành động khi đang ở xa thì nhân vật **tự đi tới** rồi làm.
- **Server quyết định tất cả**: kiểm tra đứng đúng chỗ (theo vị trí server biết), cooldown, đang bận; khoá di chuyển trong lúc làm; cộng công đức/kinh nghiệm; phát sự kiện cho mọi người cùng khu vực (ai cũng thấy animation và hiệu ứng, kể cả cá rơi đúng chỗ nhờ `seed` chung); banner cho cả kênh (tối đa 1 banner / 8 giây).
- **Cấp độ**: kinh nghiệm cần cho cấp n = 100 × n^1,35 (100, 255, 441…). Danh hiệu: Phật tử mới (1) → Người hữu duyên (3) → Đạo hữu tinh tấn (5) → Hộ pháp (8) → Thiện tri thức (12). Lên cấp có banner + âm báo, số cấp trên bảng tên cập nhật cho mọi người.
- **Giữ công đức khi tải lại trang**: trình duyệt lưu một mã ngẫu nhiên (`c3.token`), server giữ hồ sơ (cấp, ví, cooldown) theo mã đó **trong RAM**. Server khởi động lại thì mất; giai đoạn 6 chuyển sang DB + đăng nhập.
- **Âm thanh** tổng hợp bằng Web Audio (`client/src/game/sfx.ts`), không cần file; âm lượng theo cài đặt "Hiệu ứng" và nhỏ dần theo khoảng cách. Muốn dùng tiếng thật: thay từng hàm bằng phát file trong `/public/sfx/`.
- Thêm/chỉnh nghi thức: `shared/src/actions.ts` (điểm, cooldown, vị trí) dùng chung cho client & server.

**Bồ đoàn & voice (giai đoạn 4)**
- **20 bồ đoàn** trong chánh điện: đứng cạnh hiện nút "Ngồi bồ đoàn [E]"; bấm thẳng vào bồ đoàn thì tự đi tới và ngồi. Ngồi kiết già quay về bàn thờ; mọi người thấy tư thế ngồi (`anim = 2` trong snapshot). Đang ngồi vẫn **Lạy Phật** được. Di chuyển (phím, joystick) là tự đứng dậy. Server giữ ai ngồi chỗ nào, chặn tranh chỗ, tự giải phóng khi ra sân hoặc mất kết nối.
- **Voice qua LiveKit (SFU)**: mỗi khu vực của mỗi kênh là một phòng (`c1-courtyard`, `c1-hall`); đổi khu vực thì tự đổi phòng. Server cấp token chỉ cho đúng phòng, danh tính = id người chơi, **chỉ được phát micro**, hạn 2 giờ.
  - **Micro tắt mặc định**; chỉ xin quyền khi bấm nút mic. Nên dùng tai nghe.
  - **Sân chùa: nghe theo khoảng cách**: ≤3 m rõ hẳn, nhỏ dần tới 18 m thì im; >24 m ngừng nhận luồng để tiết kiệm mạng (nhận lại khi <20 m).
  - **Chánh điện: nghe chung** cả phòng.
  - Biểu tượng **đang nói** (3 vạch nhảy) trên bảng tên; **tắt tiếng từng người**: bấm vào nhân vật, hoặc bảng **Đạo hữu** (danh sách người cùng khu vực).
  - **Tịnh tâm** (nút hoa sen ở khung chat / cột phải trên điện thoại / Cài đặt): ẩn chat và bong bóng, tắt giọng mọi người, tắt micro.
  - Âm lượng giọng nói trong Cài đặt. Trình duyệt chặn phát tiếng thì hiện nút "Chạm để nghe giọng nói".
  - `livekit-client` chỉ tải khi vào phòng voice; server chưa cấu hình LiveKit thì nút mic báo lý do, mọi thứ khác vẫn chạy. Máy chủ voice tạm mất thì client tự thử lại mỗi 15 giây.

**Nhạc nền chùa**
- Hai bản nhạc **nguyên gốc, tổng hợp bằng máy** (không dùng mẫu âm thanh nào, không vướng bản quyền), thang âm ngũ cung Việt, mỗi bản 2 phút lặp liền mạch:
  - `client/public/audio/bgm-courtyard.mp3` – *Sân chùa – gió sớm*: ngân nền, đàn rải kiểu đàn tranh, đại hồng chung, gió nhẹ, chim hót.
  - `client/public/audio/bgm-hall.mp3` – *Chánh điện – trầm hương*: ngân trầm, khánh, mõ thưa, vang phòng lớn.
- Đổi khu vực thì chuyển chéo 2,5 giây. Phát bằng Web Audio (lặp chính xác từng mẫu, không hở), chỉ giải mã 1 bản lúc phát (24 kHz) cho nhẹ điện thoại. Bắt đầu sau lần chạm/phím đầu tiên (chính sách autoplay).
- Bật/tắt nhanh bằng nút ♫ góc phải trên; âm lượng ở Cài đặt → "Nhạc nền / kinh". Tịnh tâm vẫn giữ nhạc nền.
- Tạo lại / đổi giai điệu: `node scripts/gen-bgm.mjs` (cần ffmpeg; đổi `seed` trong file). Muốn dùng **nhạc thật**: thay 2 file mp3 cùng tên – nhớ chỉ dùng bản bạn có quyền sử dụng.
- iPhone đang bật **gạt im lặng** thì Web Audio không phát tiếng (giới hạn của iOS).

**Cờ tướng ngoài sân chùa**
- Bàn cờ đá dưới gốc cây cổ thụ (góc tây nam sân, gần cổng), 2 ghế đá. Quân cờ 3D trên mặt bàn cập nhật theo ván đang đánh – ai đi ngang cũng thấy.
- Lại gần bàn → nút **"Bàn cờ tướng [E]"** (hoặc bấm vào bàn đá) mở bàn cờ lớn: ngồi cầm quân **Đỏ** hoặc **Đen**; đủ 2 người là ván tự bắt đầu, Đỏ đi trước. Người khác mở ra để **xem**.
- Chạm quân để chọn → chấm xanh gợi ý nước hợp lệ → chạm ô đích. Cầm Đen thì bàn tự xoay cho quân mình ở dưới. Đổi chữ trên quân: **chữ Hán** (帥 仕 相 傌 俥 炮 兵) / **chữ Việt** (Tg S T M X P B).
- **Luật đầy đủ, server kiểm tra từng nước** (`shared/src/xiangqi.ts`, dùng chung với client): tướng/sĩ trong cung, tượng không qua sông & bị cản mắt, mã bị cản chân, pháo ăn qua đúng 1 ngòi, tốt qua sông đi ngang, **lộ mặt tướng**, cấm tự để tướng bị chiếu; bị chiếu bí hoặc hết nước đều thua; quá 300 nước xử hòa.
- **Xin thua**, **Ván mới**, **Rời bàn** (rời bàn / đổi khu vực / mất kết nối giữa ván = thua). Đang ngồi bàn cờ thì nhân vật ngồi yên trên ghế đá (không lỡ tay đi mất). Kết quả được báo trong chat sân chùa + banner cả kênh; tiếng quân gõ xuống bàn đá, tiếng khánh khi chiếu tướng.
- Kiểm thử luật: `npm test` (18 trường hợp, gồm thế khai cuộc đúng 44 nước hợp lệ).

**Phát chung (giai đoạn 5)** – bảng *Phát chung* (Cài đặt → 🎵, hoặc chạm dòng "♪ Đang phát" giữa màn hình)
- **Tải lên** mp3/wav/m4a/ogg/mp4/webm ≤ 50 MB/file, kho ≤ 500 MB; phải tick cam kết **có quyền sử dụng**. Server **chuyển mã bằng ffmpeg** (`ffmpeg-static`, không cần cài): mp3 128k; video thêm mp4 480p để **chiếu lên màn hình tường trái chánh điện**. File không giải mã được bị loại. Tên file gốc không dùng làm đường dẫn.
- **Phân quyền**: *Điều phối/Admin* đăng nhập bằng `ADMIN_PASSWORD` (dev mặc định `admin`) → phát/tạm dừng/tua/bài trước–sau, chế độ 🔁 lặp danh sách · 🔂 lặp 1 bài · 🔀 ngẫu nhiên, sắp xếp/xoá hàng chờ, duyệt/từ chối, xoá bài. *Người thường* tải lên = **đề xuất** chờ duyệt; có nút 🚩 báo cáo (3 người báo cáo → gỡ chờ duyệt lại).
- **Link YouTube**: dán link (watch, youtu.be, shorts, live) vào ô *Thêm/Đề xuất link YouTube*. Phát bằng trình phát YouTube nhúng chính thức, hiện thẳng trên màn hình lớn ngoài sân và trong chánh điện – đồng bộ cả chùa như file tải lên; video bị chủ kênh tắt nhúng sẽ bị từ chối.
- **Màn hình ngoài sân**: màn hình lớn phía tây sân chùa (có ghế đá) chiếu video Phát chung, giống màn hình trong chánh điện.
- **Đồng bộ**: server giữ `{bài, startedAt, tạm dừng}` cho cả chùa (mọi kênh, mọi khu vực); client tính vị trí theo giờ server, lệch > 0,6 s thì tua lại; người mới vào nghe tiếp đúng đoạn. Âm lượng = Cài đặt "Nhạc nền / kinh"; nhạc nền tự nhỏ đi khi đang phát. Bỏ tick "Nghe Phát chung" để tắt trên máy mình.
- Lưu: `server/uploads/` (`MEDIA_DIR`), có `library.json`. ⚠️ Gói free Render **xoá ổ đĩa khi deploy lại / ngủ** → file tải lên mất; cần Render Disk (trả phí) hoặc S3/R2 (giai đoạn sau).

**Kênh**: mỗi kênh tối đa 50 người. Kênh đầy thì tự mở kênh mới; kênh trống (trừ kênh 1) tự đóng. Chánh điện mỗi kênh tối đa 20 người.

## Chạy local

Cần Node.js ≥ 18.18.

```bash
cd chua3d
```

```bash
npm install
```

```bash
npm run dev
```

- Giao diện: http://localhost:5180 (Vite; tự chuyển `/socket.io` sang server).
- Server: http://localhost:3180 (`/healthz` xem số người online và số kênh).

### Bố cục HUD
| Vị trí | Máy tính (≥768px) | Điện thoại |
|---|---|---|
| Trái trên | Avatar, tên, danh hiệu, thanh kinh nghiệm, cấp; khu vực, nút vào/ra chánh điện, "Hoa", online | như máy tính, gọn hơn |
| Phải trên | Công đức, ngọc, Thư (badge), Yêu thích, Trợ giúp, Toàn màn hình, minimap (bấm để mở bản đồ lớn) | như máy tính, minimap 96px |
| Cột phải | Lưới 12 hành động + Chụp ảnh, thu gọn được | nút ▦ mở lưới |
| Giữa trên | Banner sự kiện tự mờ dần + thông báo | |
| Giữa dưới | Thanh: Nhiệm vụ, Túi đồ, Cửa hàng, Đạo hữu, Bản đồ, Văn khấn, Lịch lễ, Cài đặt | thanh đáy toàn chiều ngang |
| Trái dưới | Khung chat mờ + chat nhanh + ô gõ + nút mic | joystick + 3 dòng chat xem trước; nút chat mở bảng trượt |

Đã chạy thật: chat, chat nhanh, bong bóng, banner, minimap + bản đồ lớn (bấm để đi tới), Cài đặt (đổ bóng, chất lượng, ẩn tên, ẩn bong bóng, âm lượng lưu sẵn), Thư (2 thư chào mừng), Trợ giúp (tự mở lần đầu), Yêu thích, Toàn màn hình, Chụp ảnh (PNG có dấu thời gian).
Còn **"Sắp ra mắt"**: 8 nút hành động (Xin xăm, Tử vi, Hoa đăng, Dải đỏ, Kinh luân, Nhiều tháp, Tưởng niệm, Điện thờ), Nhiệm vụ, Túi đồ, Cửa hàng, Đạo hữu, Văn khấn, Lịch lễ (giai đoạn 6), mic (giai đoạn 4), Phát chung (giai đoạn 5).

### Thử nhiều người chơi
1. Mở 2–3 tab hoặc cửa sổ http://localhost:5180, đặt tên và ngoại hình khác nhau. Trình duyệt chỉ vẽ 3D ở tab đang xem, nên nên đặt các cửa sổ cạnh nhau.
2. Đi lại ở một tab, xem nhân vật đó di chuyển mượt ở tab kia.
3. Bấm **Vào chánh điện**, hoặc đi tới cửa chánh điện rồi nhấn **E**. Người ở sân sẽ thấy bạn biến mất; HUD hiện "điện x/20".

### Điều khiển
| | Máy tính | Điện thoại |
|---|---|---|
| Đi | WASD / phím mũi tên | Joystick ảo góc trái dưới |
| Đi tới điểm | Bấm vào mặt đất | Chạm vào mặt đất |
| Xoay camera | Kéo chuột | Kéo màn hình |
| Thu phóng | Lăn chuột | Chụm hai ngón |
| Tương tác / nghi thức | E (khi đứng gần) | Chạm nút nổi |
| Gõ chat | Enter | Nút chat góc phải dưới |
| Ngồi / đứng bồ đoàn | E khi đứng cạnh (đi là tự đứng dậy) | Chạm nút nổi / chạm bồ đoàn |
| Bật/tắt micro | Nút mic ở khung chat | Nút mic cột phải |
| Đóng bảng | Esc | Chạm nền mờ / ✕ |

## Bật voice (LiveKit)

Voice cần một máy chủ LiveKit. Máy này **đã có sẵn** `tools/livekit/livekit-server.exe` (v1.13.11, tải từ GitHub Releases chính thức, đã đối chiếu SHA-256) và file `.env` cho dev. Chỉ cần:

```bash
npm run dev:all
```

Lệnh này chạy cùng lúc **LiveKit + game server + giao diện**. Muốn chạy riêng LiveKit thì dùng `npm run voice`.

Máy khác (hoặc muốn cách khác), chọn **một** trong các cách sau:

1. **Tải `livekit-server`** cho hệ điều hành của bạn tại [livekit/livekit Releases](https://github.com/livekit/livekit/releases), giải nén vào `chua3d/tools/livekit/`, rồi `npm run voice` (thư mục `tools/` đã nằm trong `.gitignore`).
2. **Docker**: `docker compose up -d`.
3. **LiveKit Cloud** (có gói miễn phí): tạo project, lấy URL `wss://<project>.livekit.cloud` + API key/secret.

> ⚠️ Đừng chạy LiveKit với `--node-ip 127.0.0.1`: Chrome không gửi WebRTC qua loopback nên âm thanh không nối được (ICE thất bại), dù vẫn "vào phòng" được. `npm run voice` để LiveKit tự nhận địa chỉ mạng của máy.

File `chua3d/.env` (chép từ `.env.example`) chứa 3 biến `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`. Cách 1 và 2 dùng nguyên giá trị mẫu `ws://localhost:7880` / `devkey` / `secret`. Đổi `.env` thì phải chạy lại server. Log server sẽ ghi `[voice] LiveKit: ...`.

Thử voice: mở 2 cửa sổ trình duyệt, bật mic ở một bên (đeo tai nghe để khỏi hú). Ở sân chùa đi xa nhau sẽ nghe nhỏ dần; vào chánh điện thì nghe chung. Trên điện thoại cần **HTTPS** (xem phần Deploy) vì trình duyệt chỉ cho dùng micro trên HTTPS hoặc localhost.

## Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | 3180 | Cổng server khi chạy production (Render/Railway/Fly tự đặt) |
| `DEV_SERVER_PORT` | 3180 | Cổng server khi `npm run dev` (bỏ qua `PORT`) |
| `CORS_ORIGIN` | – | Chỉ cần khi client và server khác domain |
| `VITE_SERVER_URL` | – | (build client) URL server nếu tách domain |
| `ADMIN_PASSWORD` | dev: `admin` | Mật khẩu Điều phối Phát chung (chạy thật bắt buộc đặt) |
| `MEDIA_DIR` | `server/uploads` | Nơi lưu file Phát chung |
| `LIVEKIT_URL` | – | URL máy chủ LiveKit (`ws://localhost:7880` khi dev, `wss://…` khi chạy thật) |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | – | Khoá API LiveKit (dev: `devkey` / `secret`) |

Server tự đọc `chua3d/.env` nếu có (không ghi đè biến đã đặt sẵn). `.env` đã nằm trong `.gitignore`.

Biến cho S3/R2 (giai đoạn 5) và database (giai đoạn 6) sẽ được bổ sung khi tới giai đoạn đó.

## Build & deploy

```bash
npm install && npm run build
```

```bash
npm start
```

Server phục vụ luôn `client/dist`, nên chỉ cần **một service Node** chạy **một instance** (trạng thái kênh nằm trong RAM).
### Đưa lên mạng cho mọi người (GitHub + Render + LiveKit Cloud, đều có gói miễn phí)

1. **GitHub**: tạo repo mới (github.com → New repository, ví dụ `chua-online`, *không* tick "Add README"). Trong `chua3d/` chạy:
   ```bash
   git remote add origin https://github.com/<tên-bạn>/chua-online.git
   git push -u origin main
   ```
   Lần đầu Windows sẽ mở trình duyệt để đăng nhập GitHub.
2. **LiveKit Cloud** (voice): đăng ký cloud.livekit.io → tạo project → **Settings → Keys** → tạo key. Ghi lại *WebSocket URL* (`wss://….livekit.cloud`), *API Key*, *API Secret*.
3. **Render**: đăng ký render.com bằng tài khoản GitHub → **New → Blueprint** → chọn repo → Render đọc `render.yaml` và hỏi 3 biến `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` → dán giá trị từ bước 2 → **Apply**.
4. Đợi build ~3–5 phút, Render cấp link cố định dạng `https://chua-online.onrender.com` (có HTTPS sẵn, dùng được micro trên điện thoại). Gửi link đó cho mọi người.
5. Sửa code sau này: `git add -A && git commit -m "..." && git push` → Render tự deploy lại.

Lưu ý gói free của Render: không ai vào ~15 phút thì server "ngủ", người đầu tiên vào lại phải chờ ~1 phút; mỗi lần ngủ/deploy lại thì **công đức, cấp, lịch sử chat bị xoá** (đang lưu RAM – giai đoạn 6 sẽ thêm database). Gói trả phí rẻ nhất của Render không ngủ.

- **Railway**: Root directory `chua3d`; Build `npm ci --include=dev && npm run build`; Start `npm start`; đặt 3 biến `LIVEKIT_*`.
- **Fly.io**: `fly launch` trong `chua3d/`, `internal_port = 3180` (hoặc đặt `PORT`), `fly scale count 1`.
- **HTTPS là bắt buộc** cho voice. Các nền tảng trên đều cấp HTTPS sẵn.
- **LiveKit khi deploy**: dễ nhất là LiveKit Cloud (đặt 3 biến `LIVEKIT_*`). Tự host thì chạy `livekit-server` trên VPS có IP công khai, mở cổng 7880 (sau reverse proxy TLS → `wss://`), 7881/tcp và dải UDP; bật TURN tích hợp của LiveKit cho mạng 4G/công ty. Xem tài liệu "self-hosting" của LiveKit.
- Muốn chạy nhiều instance: dùng Redis adapter cho Socket.IO và chia kênh theo instance (hoặc chuyển sang Colyseus).

## Thay model 3D thật (.glb)

Mọi vật thể là component riêng trong `client/src/game/world/props.tsx`, `Courtyard.tsx`, `Hall.tsx` và `client/src/game/Character.tsx`, mỗi chỗ đều có ghi chú. Cách thay:
1. Đặt file vào `client/public/models/ten.glb` (nên nén Draco hoặc meshopt, dưới 2 MB mỗi model cho điện thoại).
2. Đổi nội dung component thành `<primitive object={useGLTF('/models/ten.glb').scene.clone()} />`, giữ nguyên vị trí lấy từ `shared/src/world.ts`.
3. Nếu kích thước vật thể thay đổi, sửa bán kính va chạm trong `COLLIDERS` ở `shared/src/world.ts` (client và server cùng dùng).

Nguồn asset low-poly miễn phí, nhớ kiểm tra giấy phép CC0/CC-BY: Kenney.nl, Quaternius, Poly Pizza.

## Lộ trình

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Khung 3D, di chuyển, đồng bộ người chơi, kênh, 2 khu vực | ✅ |
| 2 | HUD đầy đủ (tiền tệ, thư, minimap, banner, cột hành động, thanh dưới), chat theo khu vực + chat nhanh, lọc từ, giới hạn tần suất | ✅ |
| 3 | Thắp hương, Lạy Phật, Thỉnh chuông, Phóng sinh: nút nổi [E], animation, âm thanh, cooldown, cộng công đức; các nút khác báo "Sắp ra mắt" | ✅ |
| 4 | Ngồi bồ đoàn ở chánh điện; voice LiveKit (SFU): mic tắt mặc định, biểu tượng đang nói trên đầu, tắt tiếng từng người, voice theo khoảng cách ở sân, chung cả phòng ở chánh điện; docker-compose (LiveKit) | ✅ |
| 5 | Phát chung: upload audio/video, ffmpeg chuyển mã, thư viện + hàng chờ, lặp/ngẫu nhiên, đồng bộ phát + chỉnh drift, phân quyền, đề xuất bài, giới hạn dung lượng, lưu local/S3/R2, báo cáo bản quyền, màn hình video trong chánh điện + ngoài sân, link YouTube | ✅ (lưu local; S3/R2 để sau) |
| 6 | Đăng nhập (Google), lưu cấp độ/công đức/túi đồ (SQLite → Postgres), nhiệm vụ hằng ngày, lịch âm (mùng 1, rằm, ngày lễ) và trạng thái "Hoa" | ⏳ tiếp theo |

**Việc nên làm sau giai đoạn 6:** nhiều chùa/bản đồ, sự kiện theo mùa (Vu Lan, Phật Đản), livestream từ chùa thật, hoa đăng/xin xăm/tử vi, chụp ảnh và chia sẻ, PWA và chế độ đồ hoạ thấp cho máy yếu, trang quản trị (báo cáo, chặn, thống kê).
