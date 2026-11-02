# Date with you ♡

Website thiệp mời hẹn hò dành cho hai người. Đã triển khai trực tiếp trong thư mục `thiệp`; thư mục `tư liệu` và video gốc được giữ nguyên. Trước khi triển khai, thư mục chỉ có video, chưa có frontend, backend hoặc cấu hình dự án.

## Chạy local

Cần **Node.js 24+** (dùng SQLite tích hợp sẵn, không cần cài database riêng).

```powershell
cd D:\GIN\projects\thiệp
npm install
Copy-Item .env.example .env
```

Mở `.env`, đặt `ADMIN_PASSWORD` riêng, tối thiểu 12 ký tự. Không để mật khẩu vào mã frontend hoặc commit `.env`.

```powershell
npm run dev
```

- Thiệp: http://127.0.0.1:5173/
- Quản trị: http://127.0.0.1:5173/admin
- API: http://127.0.0.1:3001/api/health

Dùng đúng địa chỉ `127.0.0.1` trong cấu hình trên; Vite chuyển tiếp `/api` về Express. Đăng nhập bằng mật khẩu đã đặt trong `.env`.

## Bản production local

```powershell
npm run lint
npm test
npm run build
npm start
```

Express phục vụ cả giao diện build và API tại http://127.0.0.1:3001/; trang quản trị tại http://127.0.0.1:3001/admin. `npm start` sử dụng `tsx`, vì vậy khi triển khai kiểu này cần giữ dependencies phát triển hoặc biên dịch server riêng. Đây là sản phẩm chạy local; chưa cấu hình hosting/domain. Để người yêu mở trên thiết bị khác, cần triển khai lên máy chủ Node 24 với HTTPS, gắn ổ lưu trữ bền vững cho `data/`, reverse proxy về cổng local, và đặt `COOKIE_SECURE=true`. Không đưa thư mục database lên public/static hosting. Phải giữ nguyên Host khi proxy (hoặc cấu hình rewrite Origin/Host nhất quán) để kiểm tra nguồn hoạt động.

## Cá nhân hóa

Sửa `src/config/invitation.ts`: tên người mời/người nhận, ngày tạo, lời mở đầu, câu hỏi, chữ ký và câu kết. Sửa các lựa chọn và URL ảnh trong `shared/options.ts`. Minh họa phong thư tạo bằng CSS, không cần API ảnh. Ảnh món ăn dùng Unsplash, lazy loading, kích thước 240px, fallback emoji khi tải lỗi. Font Google có fallback serif/sans-serif. Không phát âm thanh.

## Biến môi trường

| Biến | Ý nghĩa |
| --- | --- |
| `ADMIN_PASSWORD` | Bắt buộc, tối thiểu 12 ký tự; chỉ đọc ở backend |
| `PORT` | Cổng Express; mặc định `3001`. Nếu đổi khi dev, sửa proxy trong `vite.config.ts` |
| `DATABASE_PATH` | File SQLite, mặc định `./data/date-with-you.sqlite`; tương đối với thư mục chạy lệnh |
| `COOKIE_SECURE` | `false` khi HTTP local, `true` khi triển khai HTTPS |

## Chức năng

- 10 màn hình: mở thiệp → ngày/giờ → trang phục → món chính → tráng miệng/đồ uống → hoạt động → giờ về → lời nhắn → xem lại → cảm ơn.
- Nút suy nghĩ cho phép tạm dừng tự nguyện, không chạy trốn con trỏ, không ép đồng ý.
- Nhiều ngày trong tương lai, nhiều khung giờ/ngày; thêm/xóa và kiểm tra giờ kết thúc. Chọn ngày linh hoạt. Ngày hiện tại xác định theo múi giờ Asia/Bangkok.
- Chọn nhiều trang phục, món ăn, hoạt động. Tùy chọn không có sở thích/không tráng miệng được chọn riêng để tránh mâu thuẫn.
- Giờ về linh hoạt hoặc cụ thể, độc lập với giờ kết thúc khung giờ rảnh.
- Lưu bản nháp localStorage, khôi phục bằng nút Viết tiếp. Sửa từng phần ở bước xem lại và trở về bản tổng hợp. Chặn gửi nhiều lần, có trạng thái gửi/lỗi/thành công. Chỉ xóa nháp sau khi server xác nhận.
- `/admin`: mật khẩu, cookie phiên 8 giờ, danh sách câu trả lời, chi tiết từng nhóm, ngày giờ gửi GMT+7, đánh dấu đã xem, sao chép, xuất CSV UTF-8 có BOM để mở trong Excel.
- Responsive mobile/desktop, focus bàn phím, label input, aria-pressed, reduced motion.

## Cấu trúc

```text
src/
  components/    # Thiệp, lựa chọn, ngày giờ, từng bước, tổng hợp
  config/        # Nội dung cá nhân hóa
  pages/         # InvitationPage, AdminPage (lazy loaded)
  services/      # HTTP API và xử lý lỗi
  utils/         # Bản nháp, ngày và tổng hợp câu trả lời
  main.tsx
  styles.css
shared/          # Các lựa chọn, schema Zod, kiểu TypeScript
server/          # Express API, xác thực, SQLite, CSV và static serving
tests/           # Schema và integration tests (Node test + Supertest)
data/            # SQLite + WAL, tự tạo, gitignored
tư liệu/         # Video tham khảo gốc
.env.example
```

React 19, TypeScript, Vite, CSS thuần, Lucide React; Express 5, `node:sqlite`, Zod. Không cần dịch vụ trả phí.

## API và lưu trữ

- `POST /api/responses`: validate, lưu một phản hồi; `submissionId` UUID làm khóa idempotency. Gửi lại cùng mã/cùng nội dung trả bản ghi cũ; thay nội dung cùng mã trả `409`.
- `POST /api/admin/login`: `{ "password": "…" }`; giới hạn 8 lần / 15 phút / IP.
- `POST /api/admin/logout`: hủy phiên.
- `GET /api/admin/responses`: tối đa 1.000 câu trả lời mới nhất.
- `GET /api/admin/responses/:id`: xem chi tiết, đánh dấu đã xem.
- `GET /api/admin/responses/export`: xuất tất cả bản ghi, chống công thức CSV.

API quản trị yêu cầu cookie HttpOnly, SameSite=Strict. Phiên ngẫu nhiên chỉ lưu hash trong SQLite. Kiểm tra Origin/Sec-Fetch-Site cho thao tác ghi, Helmet, giới hạn body/rate, prepared statements, không trả lỗi nội bộ. Nếu đổi mật khẩu, khởi động lại server; các phiên đang có vẫn tồn tại đến khi hết hạn (có thể xóa bảng sessions để thu hồi tất cả). Nội dung ghi chú hiển thị bằng text React, không render HTML.

Sao lưu database bằng SQLite backup hoặc dừng server rồi sao chép file database (kèm WAL/SHM nếu sao chép khi đang chạy). Không xóa `data/` nếu muốn giữ phản hồi. Không có chức năng xóa câu trả lời trong giao diện.

## Kiểm thử

`npm test` kiểm tra schema ngày/giờ, lựa chọn không hợp lệ, trường không bắt buộc, lưu/idempotency, xác thực/cookie, đã xem, CSV/formula escaping, khác nguồn, phiên hết hạn, lưu bền vững sau mở lại database và gửi qua proxy Vite thật. Dữ liệu tự động dùng database riêng. Bản ghi tạo khi kiểm tra giao diện đã được dọn sau khi hoàn tất.

Đã kiểm tra thủ công luồng từ mở thiệp đến gửi thành công, khôi phục nháp sau reload, sửa từ tổng hợp, đăng nhập quản trị, trạng thái đã xem, sao chép có fallback và tải CSV thật. Ảnh kiểm tra lưu tại `test-results/` (gitignored). Các ảnh bên ngoài cần kết nối Internet; lỗi tải có fallback. Chưa triển khai lên Internet và chưa có tên/domain thực tế của hai người.

Nguồn ảnh thay thế đã đối chiếu nội dung: [lẩu — tommao wang](https://unsplash.com/photos/table-laden-with-hot-pot-ingredients-and-broth-qZfpBaznrN8), [steak — UY VO](https://unsplash.com/photos/steak-on-plate-M6dFjjpoqfU).
