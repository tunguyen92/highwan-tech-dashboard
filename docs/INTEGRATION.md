# Hướng dẫn tích hợp và cài đặt

Gói này là _lớp phủ (overlay)_ lên template [`next-shadcn-admin-dashboard`](https://github.com/arhamkhnz/next-shadcn-admin-dashboard). Bạn giải nén vào thư mục gốc của repo template, cài thêm vài thư viện, cấu hình MongoDB rồi chạy.

Phiên bản đã kiểm chứng: template studio-admin 2.2.0 (commit 036631e, Next.js 16.4.5, React 19, Tailwind 4), Mongoose 9.12, zod 4.6, tsx 4.23, Node.js 22. Nếu template của bạn mới hơn, 12 file template bị ghi đè (mục 😎 có thể xung đột: so sánh bằng git diff trước khi chấp nhận.

## 1. Chuẩn bị

| Cần                                       | Ghi chú                                                |
| ----------------------------------------- | ------------------------------------------------------ |
| Node.js 22 trở lên                        |                                                        |
| MongoDB 6 trở lên _chạy replica set_      | Bắt buộc vì phiếu kho dùng transaction. Một node là đủ |
| Repo template đã git clone và npm install |                                                        |

### MongoDB replica set: chọn một cách

- _MongoDB Atlas (dễ nhất)._ Cụm miễn phí mặc định đã là replica set. Lấy chuỗi kết nối cho MONGODB_URI.
- _Máy cục bộ._ Khởi động mongod --replSet rs0 --dbpath <thư mục>, rồi chạy một lần trong mongosh: rs.initiate(). Chuỗi kết nối: mongodb://localhost:27017/wms?replicaSet=rs0.
- _Docker._ Dùng image mongo:7 với tham số --replSet rs0 và khởi tạo bằng rs.initiate() như trên. Mình chưa chạy thử cấu hình Docker trong môi trường của mình.

## 2. Cài đặt

# 1) Giải nén gói vào thư mục gốc của repo template (chọn ghi đè khi được hỏi)

unzip warehouse-overlay.zip -d /duong/dan/toi/repo-template
cd /duong/dan/toi/repo-template

# 2) Cài thư viện mới

npm install mongoose jose bcryptjs decimal.js
npm install -D tsx mongodb-memory-server

# 3) Thêm các lệnh tiện ích vào package.json

npm pkg set scripts.wms:setup=“tsx --env-file=.env.local scripts/setup.ts” \
 scripts.wms:test=“tsx scripts/smoke-test.ts” \
 scripts.wms:i18n=“tsx scripts/check-i18n.ts” \
 scripts.wms:cleanup=“node scripts/cleanup-template.mjs”

# 4) Cấu hình môi trường

cp .env.example .env.local # rồi sửa các giá trị (mục 3)

# 5) Tạo chỉ mục và tài khoản quản trị đầu tiên

npm run wms:setup

# 6) (Tùy chọn) xóa các màn hình demo của template

npm run wms:cleanup -- --dry-run # xem sẽ xóa gì
npm run wms:cleanup # xóa thật

# 7) Chạy

npm run dev

Mở http://localhost:3000, đăng nhập bằng ADMIN_USERNAME / ADMIN_PASSWORD đã đặt, _đổi mật khẩu ngay_ ở menu người dùng → “Tài khoản và mật khẩu”.

## 3. Biến môi trường (.env.local)

| Biến                           | Ý nghĩa                                                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MONGODB_URI                    | Chuỗi kết nối MongoDB (phải là replica set)                                                                                                                 |
| AUTH_SECRET                    | Chuỗi ngẫu nhiên ký cookie phiên, tối thiểu 32 ký tự. Tạo bằng openssl rand -base64 48. _Đổi giá trị này sẽ đăng xuất mọi người_                            |
| NEXT_PUBLIC_APP_URL            | Địa chỉ công khai của ứng dụng (dùng cho metadata)                                                                                                          |
| ADMIN_USERNAME, ADMIN_PASSWORD | Chỉ dùng bởi wms:setup để tạo quản trị viên đầu tiên (mật khẩu tối thiểu 8 ký tự). wms:setup chỉ tạo khi chưa có quản trị viên nào, nên chạy lại là an toàn |

## 4. Nhập dữ liệu ban đầu: thứ tự nên làm

1.  _Mã hàng_ (Danh mục → Mã hàng): nguyên liệu, bán thành phẩm, thành phẩm. Chọn đúng đơn vị và số chữ số lẻ ngay từ đầu (sau khi dùng sẽ bị khóa).
2.  _Định mức_ (Danh mục → Định mức): tạo bản nháp, thêm thành phần (có thể dán từ Excel), xem _Cây khai triển_, rồi _Kích hoạt_. Kích hoạt các bán thành phẩm trước, thành phẩm sau.
3.  _Phiếu nhập nguyên liệu_ để đưa tồn đầu kỳ vào hệ thống (hoặc dùng “Nhập khác” kèm ghi chú “Tồn đầu kỳ”).
4.  Bắt đầu lập phiếu hằng ngày.
5.  _Người dùng_ (Hệ thống → Người dùng): tạo tài khoản cho thủ kho, quản lý, người chỉ xem.

## 5. Các lệnh

| Lệnh                      | Việc làm                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| npm run wms:setup         | Tạo chỉ mục (kể cả chỉ mục duy nhất một phần) và quản trị viên đầu tiên. Chạy lại sau khi cập nhật gói nếu có thay đổi chỉ mục |
| npm run wms:test          | Kiểm thử nghiệp vụ kho trên MongoDB replica set tạo tạm trong bộ nhớ (46 kiểm tra). Lần chạy đầu tải bản mongod về máy         |
| npm run wms:i18n          | Kiểm tra mọi chuỗi tiếng Việt trong mã đều có bản dịch tiếng Anh                                                               |
| npm run wms:cleanup       | Xóa màn hình demo của template (-- --dry-run để chỉ liệt kê). Chạy bằng Node nên dùng được trên mọi hệ điều hành               |
| npm run build / npm start | Build và chạy production                                                                                                       |
| npm run check             | Kiểm tra Biome của template                                                                                                    |

## 6. Đa ngôn ngữ (Tiếng Việt / English)

- Nút ngôn ngữ ở thanh trên và ở trang đăng nhập. Lựa chọn lưu trong cookie wms_locale; mặc định Tiếng Việt.
- _Thêm hoặc sửa chữ trên giao diện:_ viết câu tiếng Việt trong t(“...”) (client: const t = useT() từ @/lib/i18n/provider; server: const t = await getServerT() từ @/lib/i18n/server). Thêm bản dịch tiếng Anh vào src/lib/i18n/en.ts với khóa là đúng câu tiếng Việt đó. Chỗ cần chèn giá trị dùng {tên}: t(“Đã điền {count} dòng”, { count }).
- Chạy npm run wms:i18n để biết còn thiếu bản dịch nào. Lệnh này cũng bắt lỗi {placeholder} hai bản không khớp.
- Nhãn có sẵn dưới dạng hằng số (ITEM_TYPE_LABEL, VOUCHER_STATUS_LABEL...) là khóa dịch: dùng t(ITEM_TYPE_LABEL[x]) khi hiển thị.
- _Thêm ngôn ngữ thứ ba:_ thêm mã vào LOCALES và LOCALE_LABEL (src/lib/i18n/config.ts), thêm bảng dịch tương tự en.ts, và mở rộng translate(), format.ts (DATE_LOCALE, SEPARATORS) cho ngôn ngữ đó.

## 7. Triển khai production

- npm run build rồi npm start (hoặc triển khai lên nền tảng chạy Next.js; Vercel kết hợp MongoDB Atlas dùng được).
- _Bắt buộc HTTPS_: cookie phiên đặt cờ secure ở production, không có HTTPS thì không đăng nhập được.
- Đặt AUTH_SECRET riêng cho production và giữ bí mật.
- _Sao lưu MongoDB định kỳ_ (ví dụ mongodump hằng ngày, hoặc sao lưu tự động của Atlas) và thử khôi phục ít nhất một lần.
- Nhật ký lỗi của máy chủ (console.error) được giữ lại ở production; theo dõi chúng.

## 8. Nội dung gói

_File mới_ (không ghi đè gì): src/server/** (mô hình, dịch vụ nghiệp vụ, Server Actions), src/lib/wms/**, src/lib/i18n/**, src/components/language-switcher.tsx, src/proxy.ts, các màn hình trong src/app/(main)/dashboard/{stock,items,boms,vouchers,reports,admin,account}, src/app/(main)/dashboard/\_components/wms/**, src/app/(auth)/login/\*_, scripts/_, docs/\*, .env.example.

_12 file của template bị ghi đè_ (đã chỉnh cho hệ thống kho):

| File                                                                 | Thay đổi                                                                                           |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| next.config.mjs                                                      | Chuyển hướng /dashboard → /dashboard/stock; serverExternalPackages; giữ console.error ở production |
| src/app/layout.tsx                                                   | Ngôn ngữ, nhà cung cấp i18n, bỏ script Google Analytics của tác giả template                       |
| src/app/(main)/dashboard/layout.tsx                                  | Bắt buộc đăng nhập, cấp người dùng cho giao diện, nút ngôn ngữ; bỏ menu demo                       |
| src/app/(main)/dashboard/page.tsx                                    | Chuyển về Tồn kho                                                                                  |
| .../\_components/sidebar/app-sidebar.tsx, nav-main.tsx, nav-user.tsx | Menu theo vai trò, bỏ nút “Quick Create” demo, đăng xuất thật                                      |
| .../\_components/header/search-dialog.tsx, layout-controls.tsx       | Dịch chữ giao diện                                                                                 |
| src/app/(main)/unauthorized/page.tsx                                 | Dịch chữ                                                                                           |
| src/config/app-config.ts                                             | Tên và mô tả ứng dụng                                                                              |
| src/navigation/sidebar/sidebar-items.ts                              | Menu của hệ thống kho, lọc theo vai trò                                                            |

## 9. Sự cố thường gặp

| Triệu chứng                                                  | Nguyên nhân và cách xử lý                                                                                                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Transaction numbers are only allowed on a replica set member | MongoDB chưa chạy replica set. Xem mục 1                                                                                                                           |
| AUTH_SECRET must be set and at least 32 characters           | Thiếu hoặc quá ngắn trong .env.local                                                                                                                               |
| Không đăng nhập được ngay sau wms:setup                      | Kiểm tra ADMIN_USERNAME`/ADMIN_PASSWORD` có trong .env.local lúc chạy setup. Nếu đã có quản trị viên, setup không tạo thêm; dùng quản trị viên đó đặt lại mật khẩu |
| Đăng nhập xong bị đẩy về trang đăng nhập (production)        | Đang chạy HTTP thay vì HTTPS (cookie secure)                                                                                                                       |
| Trang không có menu “Người dùng”                             | Chỉ vai trò Quản trị viên mới có                                                                                                                                   |
| wms:i18n báo thiếu bản dịch                                  | Thêm khóa vào src/lib/i18n/en.ts                                                                                                                                   |
| wms:cleanup rồi tsc báo lỗi import                           | Có file của bạn đang dùng thư mục đã xóa (ví dụ src/data). Khôi phục bằng git hoặc sửa import                                                                      |
| wms:test chạy chậm lần đầu                                   | Đang tải bản mongod (khoảng vài chục MB), các lần sau dùng bản đã tải                                                                                              |

## 10. Giới hạn cần biết

Giao diện đã được build và kiểm tra ở mức máy chủ (trang, quyền, ngôn ngữ), và nghiệp vụ kho được kiểm thử tự động; _thao tác chuột/bàn phím trong trình duyệt chưa được kiểm thử tự động_. Hãy chạy thử các luồng trong PRD.md mục 6 với dữ liệu mẫu trước khi dùng thật. Các hạn chế đã biết của sản phẩm nằm ở SRS.md mục 12.
