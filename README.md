# Date with you ♡

Thiệp mời hẹn hò tương tác dành cho hai người. Bản public dùng **Cloudflare Pages** cho giao diện React; API chạy bằng **Workers (Pages Functions) + D1**. Không cần Render hoặc ổ đĩa trả phí. Dữ liệu phản hồi, phiên đăng nhập và giới hạn tốc độ được lưu trong D1, độc lập với vòng đời Worker. Cấu hình Workers Static Assets riêng vẫn có sẵn.

## Chạy local

Cần **Node.js 24+**.

```powershell
cd D:\GIN\projects\thiệp
npm ci
npm run dev
```

Lệnh này build giao diện ban đầu, tạo schema D1 local, chuẩn bị secret local rồi chạy Vite và Wrangler:

- Thiệp: http://127.0.0.1:5173/
- Quản trị: http://127.0.0.1:5173/admin
- Worker trực tiếp: http://127.0.0.1:8787/
- Kiểm tra API: http://127.0.0.1:8787/api/health

Mật khẩu local nằm trong `.dev.vars` (gitignored). Khi tạo lần đầu, script tái sử dụng `ADMIN_PASSWORD` trong `.env` nếu có và đủ 12 ký tự, hoặc tạo một mật khẩu ngẫu nhiên mới. Có thể sửa `.dev.vars` rồi khởi động lại Wrangler. `.dev.vars.example` là mẫu; không dùng mật khẩu mẫu cho production.

D1 local lưu tại `.wrangler/state/`, không phải database production. Tải lại trang, quay lại các bước và sửa từ màn tổng hợp đều giữ dữ liệu nháp trên cùng thiết bị/trình duyệt.

Để xem bản build qua chính Worker local:

```powershell
npm run build
npm start
```

Mở http://127.0.0.1:8787/ và http://127.0.0.1:8787/admin.

## Deploy Cloudflare Pages + Workers + D1 (bản public)

Source: https://github.com/HienNguyen186/thiep_hen_ho

Thiệp: https://a-special-date-invitation.pages.dev/ · Quản trị: https://a-special-date-invitation.pages.dev/admin

Link này đã kiểm tra giao diện, health, gửi phản hồi, chống gửi trùng, đăng nhập quản trị, xem chi tiết, CSV và đăng xuất. Phản hồi giả dùng kiểm thử đã được xóa; dữ liệu SQLite cũ vẫn chỉ nằm trên máy.

```powershell
npm run cf:login
npm run cf:setup
npm run deploy:pages
```

Với tài khoản hiện tại chỉ cần `npm run deploy:pages` mỗi lần cập nhật. Script build giao diện và `_worker.js` từ cùng `worker/index.ts`, áp dụng migration D1 còn thiếu, tái sử dụng/tạo dự án Pages `a-special-date-invitation`, cấu hình cùng database và publish lên nhánh production `main`. Các file build tạm ở `.cloudflare-pages/` đã được gitignore. Push GitHub chưa tự deploy.

Lần đầu script lấy `ADMIN_PASSWORD` từ `.dev.vars` hoặc `.env` qua stdin. Secret Pages đã có sẽ được giữ nguyên, độc lập với secret của Worker riêng. Để đổi mật khẩu trên bản Pages:

```powershell
npx wrangler pages secret put ADMIN_PASSWORD --project-name a-special-date-invitation
npm run deploy:pages
```

Nhập mật khẩu riêng tối thiểu 12 ký tự, tối đa 256 ký tự. Không gửi mật khẩu vào chat hay commit. Nếu fork sang tài khoản khác, đổi tên project trong `scripts/build-pages.mjs` và làm theo hướng dẫn đổi database ID bên dưới.

`_routes.json` chỉ gọi Worker cho `/api` và `/api/*`; các đường dẫn giao diện dùng SPA fallback của Pages. API và giao diện cùng domain nên không cần CORS hoặc domain trả phí. Dùng hạn mức miễn phí của Pages, Workers và D1; xem [Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/) và [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/).

## Deploy Worker riêng (tùy chọn)

Đã publish Worker tại https://thiep-hen-ho.hiennguyen186.workers.dev/ nhưng domain này còn trả lỗi edge `1042` / “There is nothing here yet”. Dùng link Pages ở trên để gửi thiệp. API của Worker đã chạy được qua remote preview; chưa xác nhận production trên domain `workers.dev` này.

Dùng tài khoản **Workers Free**, tên miền phụ `workers.dev` và D1 Free. Chi phí bằng 0 trong hạn mức miễn phí; không cần mua domain. Không bật gói Workers Paid hoặc dịch vụ bổ sung nếu muốn giữ cấu hình miễn phí. Xem [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) và [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) để kiểm tra hạn mức hiện hành.

1. Đăng nhập:

   ```powershell
   npm run cf:login
   ```

   Hoàn tất đăng nhập trong trình duyệt. Không gửi token hoặc mật khẩu Cloudflare vào chat hay commit.

2. Tạo/ghép database và chạy migration:

   ```powershell
   npm run cf:setup
   ```

   Script tìm database tên `thiep-hen-ho`, tái sử dụng nếu đã có, hoặc tạo D1 tại vùng APAC. ID thật được ghi vào `wrangler.jsonc`; ID này không phải secret. Các migration trong `migrations/` chỉ áp dụng một lần. Database đang có được giữ nguyên.

   Repository hiện gắn với D1 của tài khoản triển khai hiện tại. Nếu fork sang tài khoản khác, thay `database_id` bằng `00000000-0000-0000-0000-000000000000` trước khi chạy `cf:setup`. Không dùng ID của tài khoản khác.

3. Lưu mật khẩu quản trị production:

   ```powershell
   npx wrangler secret put ADMIN_PASSWORD
   ```

   Nhập mật khẩu riêng tối thiểu 12 ký tự, tối đa 256 ký tự. Secret chỉ nằm ở Cloudflare. Nếu chưa tạo secret, script deploy có thể lấy mật khẩu hiện có từ `.dev.vars` hoặc `.env` và chuyển qua stdin; không in mật khẩu, không đưa vào argv hay mã frontend. Secret production đã có sẽ được giữ lại.

4. Đăng ký tên miền phụ `workers.dev` trong **Workers & Pages** nếu tài khoản chưa có, sau đó:

   ```powershell
   npm run deploy
   ```

   Lệnh build, áp dụng migration còn thiếu, kiểm tra secret và publish Worker cùng assets. Dùng URL do Wrangler in ra. Nếu tài khoản mới chưa có subdomain, chạy `npx wrangler deploy` trong terminal tương tác để đăng ký, hoặc làm trên dashboard Cloudflare.

   - `/`: thiệp mời công khai.
   - `/admin`: trang quản trị, yêu cầu mật khẩu.
   - `/api/health`: kiểm tra secret, D1 binding và schema.

5. Khi cập nhật nội dung: chỉnh file, chạy checks, commit/push và `npm run deploy`. Push GitHub không tự deploy trừ khi bạn đã tự thiết lập Workers Builds/Git integration trên Cloudflare.

Không đặt `ADMIN_PASSWORD` trong `wrangler.jsonc`, `vars`, mã React hoặc GitHub public. HTTPS production tự sử dụng cookie `__Host-`, `Secure`, `HttpOnly`, `SameSite=Strict`. Local HTTP dùng cookie riêng không có Secure. Không cần `COOKIE_SECURE`, `DATABASE_PATH`, `PORT` hoặc `HOST` cho Worker production.

## Cá nhân hóa

- `src/config/invitation.ts`: tên hai người, lời mở đầu, chữ ký và câu kết.
- `shared/options.ts`: nhóm trang phục, món ăn, đồ uống và hoạt động.
- `src/styles.css`: màu kem, hồng bụi, font và responsive.
- `designs/`: các mẫu header form và thiệp mời PDF/vector đã tạo; video gốc ở `tư liệu/` được giữ nguyên.

Minh họa phong thư dùng CSS, ảnh món ăn Unsplash có lazy loading và fallback emoji; Google Fonts có fallback. Không phát âm thanh. Tên hiện dùng mẫu Anh / Em.

## Chức năng

- 10 màn hình từ mở thiệp đến cảm ơn; có lựa chọn suy nghĩ/tạm dừng tự nguyện.
- Nhiều ngày trong tương lai, nhiều khung giờ/ngày, thêm/xóa và validation; hoặc ngày linh hoạt. Múi giờ Asia/Bangkok.
- Chọn nhiều trang phục, món ăn và hoạt động. Tráng miệng/đồ uống/ghi chú không bắt buộc.
- Giờ về linh hoạt hoặc cụ thể, độc lập với giờ kết thúc khung giờ rảnh.
- Lưu nháp localStorage, khôi phục sau reload, sửa từng phần từ tổng hợp.
- Chặn nhấn gửi nhiều lần ở frontend và chống gửi trùng bằng khóa UNIQUE ở D1, kể cả request đồng thời từ nhiều Worker.
- Admin: đăng nhập, danh sách, chi tiết, đã xem, sao chép có fallback và tải CSV UTF-8 BOM. CSV xuất theo trang để tránh tải toàn bộ database vào RAM, đồng thời escape công thức.
- Mobile/desktop, label và focus bàn phím, aria-pressed, reduced motion.

## API, xác thực và bảo mật

| API | Chức năng |
| --- | --- |
| `POST /api/responses` | Validate và lưu câu trả lời, có idempotency qua UUID `submissionId` |
| `POST /api/admin/login` | Đăng nhập bằng `{ "password": "…" }` |
| `POST /api/admin/logout` | Hủy phiên |
| `GET /api/admin/responses` | Tối đa 1.000 bản ghi mới nhất |
| `GET /api/admin/responses/:id` | Xem chi tiết và đánh dấu đã xem |
| `GET /api/admin/responses/export` | CSV tất cả bản ghi |

Các API admin yêu cầu cookie phiên 8 giờ. Token ngẫu nhiên chỉ lưu dạng HMAC trong D1; thay `ADMIN_PASSWORD` tự vô hiệu hóa phiên cũ. Password được so sánh bằng Web Crypto native constant-time, không dùng scrypt đồng bộ tốn CPU của Node trên Workers Free. Mật khẩu không lưu trong database.

Rate limit lưu D1 và tăng atomically: 12 lần gửi/phút/IP, 8 lần đăng nhập/15 phút/IP. IP lấy từ header edge `CF-Connecting-IP`. Có kiểm tra Origin/Sec-Fetch-Site, body JSON tối đa 48 KiB (kể cả body truyền từng chunk), prepared statements, security headers và API no-store. Không render HTML từ ghi chú. `/api/*` chạy Worker trước SPA fallback, nên API lỗi không bị biến thành trang HTML.

Secret/binding chưa cấu hình trả `503`. Lỗi nội bộ không trả SQL/secret ra frontend. Rate limit bị vượt trả `429` với `Retry-After`. Database chưa migration có thể làm health thất bại; chạy `npm run cf:setup` hoặc `npm run db:migrate:remote`.

## Database và sao lưu

- Production: D1 binding `DB`, bảng `responses`, `sessions`, `rate_limits` và các index.
- Local: D1 riêng trong `.wrangler/state/`, không đồng bộ tự động lên production.
- Schema thay đổi bằng migration SQL mới; không sửa migration đã chạy trên production.
- `npx wrangler d1 export DB --remote --output backup.sql` để sao lưu thủ công. File backup chứa nội dung riêng; `backup*.sql` và `backups/` đã được gitignore. Giữ bản sao lưu ở nơi riêng tư.
- Dữ liệu SQLite cũ trong `data/` được giữ nguyên trên máy theo lựa chọn của chủ dự án. Không upload phản hồi cũ lên Cloudflare. Bản Cloudflare chỉ lưu các phản hồi gửi mới vào D1; không chuyển phiên đăng nhập cũ.

## Cấu trúc

```text
src/                   # React UI, config, API client, draft storage
shared/                # Types, Zod schema và danh sách lựa chọn
worker/                # Workers API, D1, Web Crypto, CSV stream
migrations/            # D1 SQL migrations
scripts/               # Local preparation, D1 setup và deploy CLI
public/_headers        # Security headers cho assets
wrangler.jsonc         # Worker, D1 binding, SPA và API routing
.dev.vars.example      # Secret mẫu cho local
server/                # Backend Node/Express cũ, tùy chọn
.env.example           # Biến môi trường cho Node cũ
tests/                 # Schema, Node API và Workers/D1 integration tests
```

React 19, TypeScript, Vite, CSS, Lucide, Zod; Cloudflare Workers + D1, Web Crypto, Wrangler. Không sử dụng API ảnh hoặc dịch vụ AI trả phí trong website.

## Kiểm thử

```powershell
npm run lint
npm test
npm run build
npm run deploy:check
```

17 integration tests kiểm tra cả backend cũ và workerd/D1 thật local: schema ngày/giờ, idempotency đồng thời, login/cookie/logout, đã xem, CSV nhiều trang/formula escaping, body quá lớn, CSRF, phiên hết hạn, đổi mật khẩu, rate limit theo IP và dữ liệu/phiên sau restart. Tự động dùng database kiểm thử riêng; không ghi vào production.

Đã kiểm tra luồng UI trên desktop/mobile, khôi phục nháp, sửa từ tổng hợp, gửi, quản trị, sao chép và tải CSV ở bản trước. Sau migration, đã kiểm tra giao diện thật trên Pages, `/api/health` trả `200 {"ok":true}`, API lỗi JSON, lưu/chống trùng, cookie Secure/HttpOnly/SameSite, danh sách/chi tiết/đã xem, CSV và đăng xuất. Ảnh QA ở `test-results/` (gitignored).

Bản Pages dùng cùng mã API và D1 để tránh lỗi cấp route `workers.dev` ở tài khoản mới. Không cần sửa UI hay chuyển database. Phản hồi kiểm thử production mới đã được xóa bằng UUID và marker riêng; không upload phản hồi SQLite cũ.

## Backend Node/Express cũ (tùy chọn)

Giữ nguyên `server/`, SQLite trong `data/` và `.env` cho nhu cầu chạy Node riêng:

```powershell
npm run dev:node
# Hoặc sau khi build:
npm run start:node
```

Node API mặc định cổng 3001; Vite ở chế độ `node` proxy về 3001. `.env.example` ghi `ADMIN_PASSWORD`, `PORT`, `DATABASE_PATH`, `COOKIE_SECURE`, tùy chọn `HOST`. Cấu hình Render cũ tự bind `0.0.0.0` và trust một proxy khi có `RENDER=true`; cần disk riêng nếu muốn lưu SQLite bền vững tại Render. Đây không phải đường deploy miễn phí chính của dự án nữa.
