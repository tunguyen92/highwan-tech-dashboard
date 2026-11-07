# SRS: Đặc tả yêu cầu phần mềm, hệ thống Quản lý kho

|                     |                                                                  |
| ------------------- | ---------------------------------------------------------------- |
| Phiên bản           | 1.0                                                              |
| Ngày                | 06/11/2026                                                       |
| Tài liệu liên quan  | BRD.md, PRD.md, INTEGRATION.md                                   |
| Mã nguồn tham chiếu | src/server/_ (nghiệp vụ), src/app/(main)/dashboard/_ (giao diện) |

## 1. Giới thiệu

### 1.1 Mục đích và phạm vi

Tài liệu đặc tả chức năng, dữ liệu, quy tắc nghiệp vụ và yêu cầu phi chức năng của hệ thống quản lý kho cho công ty sản xuất nhỏ (một kho, một đối tác). Phạm vi sản phẩm xem BRD.md mục 4.

### 1.2 Thuật ngữ

| Thuật ngữ                         | Nghĩa                                                                |
| --------------------------------- | -------------------------------------------------------------------- |
| Mã hàng (item)                    | Một dòng trong danh mục: nguyên liệu, bán thành phẩm hoặc thành phẩm |
| MATERIAL                          | Nguyên liệu (linh kiện, dây điện, ốc vít, keo...), có lưu kho        |
| SEMI                              | Bán thành phẩm, không lưu kho, chỉ là cấp trung gian của định mức    |
| PRODUCT                           | Thành phẩm, có lưu kho                                               |
| BOM / định mức                    | Danh sách thành phần và số lượng cho 1 đơn vị đầu ra                 |
| Phiếu (voucher)                   | Chứng từ nhập hoặc xuất kho                                          |
| Giao dịch kho (stock transaction) | Một dòng trong sổ kho, bất biến                                      |
| Giao dịch đảo (reversal)          | Giao dịch ngược dấu ghi khi hủy phiếu                                |
| Thẻ kho                           | Sổ chi tiết nhập/xuất/tồn của một mã hàng                            |
| Kỳ (period)                       | Tháng YYYY-MM theo giờ Việt Nam                                      |

## 2. Mô tả tổng thể

### 2.1 Kiến trúc

mermaid
flowchart TB
B[Trình duyệt<br/>React client components] -->|Server Actions| A[src/server/actions<br/>kiểm quyền, validate zod]
A --> S[src/server/lib<br/>dịch vụ nghiệp vụ]
S --> M[src/server/models<br/>Mongoose]
M --> D[(MongoDB replica set)]
B -. cookie phiên .-> P[proxy.ts<br/>kiểm chữ ký JWT]
P --> L[dashboard/layout<br/>kiểm người dùng trong CSDL]

- _Giao diện:_ Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui (template Studio Admin).
- _Nghiệp vụ:_ chỉ chạy phía máy chủ (Server Actions). Mã client không truy cập CSDL.
- _Dữ liệu:_ MongoDB qua Mongoose 9. _Bắt buộc replica set_ vì mọi thao tác ảnh hưởng tồn kho chạy trong transaction.
- _Xác thực:_ JWT ký HS256 (jose) trong cookie httpOnly; mật khẩu băm bcryptjs (cost 12).
- _Kiểm dữ liệu vào:_ zod 4.
- _Đa ngôn ngữ:_ cơ chế nhẹ tự xây (src/lib/i18n), khóa dịch là chính câu tiếng Việt; ngôn ngữ lưu trong cookie wms_locale.

### 2.2 Ràng buộc thiết kế

1.  Mọi thao tác ghi ảnh hưởng tồn kho nằm trong _một_ transaction MongoDB.
2.  Số lượng lưu bằng Decimal128 và truyền qua mạng dạng chuỗi; không dùng số thực. Tính toán phía client/server dùng decimal.js.
3.  Kho một đơn vị: mỗi mã hàng chỉ có _một_ đơn vị tính; không có bộ chuyển đổi đơn vị.
4.  Lịch sử giao dịch kho _chỉ thêm_, không sửa, không xóa.
5.  Ngày nghiệp vụ và số phiếu theo giờ Việt Nam (UTC+7).
6.  Dữ liệu lưu và truyền không phụ thuộc ngôn ngữ (mã enum tiếng Anh, số thập phân chuẩn); ngôn ngữ chỉ ảnh hưởng cách hiển thị.

### 2.3 Môi trường chạy

Node.js 22 trở lên; MongoDB 6 trở lên chạy replica set (một node là đủ). Triển khai: bất kỳ nơi chạy được Next.js (VPS, container, Vercel + MongoDB Atlas). Production phải dùng HTTPS (cookie phiên đặt cờ secure).

## 3. Yêu cầu chức năng

Ký hiệu: _Quyền_ là quyền tối thiểu cần có (bảng ở mục 7).

### 3.1 Xác thực và tài khoản (AUTH)

| Mã         | Yêu cầu                                                                                                                                                                                 | Quyền        |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| FR-AUTH-01 | Đăng nhập bằng tên đăng nhập (không phân biệt hoa thường) và mật khẩu. Sai tên hoặc sai mật khẩu đều trả cùng thông báo, và thời gian xử lý không lộ tên đăng nhập có tồn tại hay không | Công khai    |
| FR-AUTH-02 | Nhập sai 5 lần liên tiếp thì khóa tài khoản 15 phút; đăng nhập đúng đặt lại bộ đếm                                                                                                      | Công khai    |
| FR-AUTH-03 | Phiên là cookie httpOnly, sameSite=lax, secure ở production, hiệu lực 12 giờ                                                                                                            |              |
| FR-AUTH-04 | Mỗi yêu cầu có phiên đều đọc lại người dùng trong CSDL: người dùng bị khóa hoặc tokenVersion đã đổi thì phiên mất hiệu lực ngay                                                         |              |
| FR-AUTH-05 | Đăng xuất xóa cookie phiên                                                                                                                                                              | Đã đăng nhập |
| FR-AUTH-06 | Tự đổi mật khẩu (nhập mật khẩu hiện tại; mới 8–72 ký tự). Sau khi đổi, các thiết bị khác bị đăng xuất, thiết bị hiện tại giữ phiên                                                      | Đã đăng nhập |
| FR-AUTH-07 | proxy.ts chuyển về /login mọi yêu cầu không có JWT hợp lệ (trừ /login); layout dashboard kiểm lại trong CSDL và chuyển về /login nếu phiên không còn hợp lệ                             |              |

### 3.2 Quản lý người dùng (USR)

| Mã        | Yêu cầu                                                                                                                      | Quyền       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------- |
| FR-USR-01 | Tạo người dùng: tên đăng nhập 3–50 ký tự (chữ, số, ., \_, -; lưu chữ thường, duy nhất), họ tên, vai trò, mật khẩu 8–72 ký tự | user:manage |
| FR-USR-02 | Đổi vai trò / khóa-mở tài khoản. Mỗi lần đổi tăng tokenVersion để đăng xuất mọi phiên của người đó                           | user:manage |
| FR-USR-03 | Không được tự đổi vai trò hoặc tự khóa chính mình                                                                            | user:manage |
| FR-USR-04 | Luôn còn ít nhất một quản trị viên đang hoạt động (chặn hạ quyền/khóa quản trị viên cuối cùng)                               | user:manage |
| FR-USR-05 | Đặt lại mật khẩu cho người khác: xóa trạng thái khóa tạm, đăng xuất mọi phiên                                                | user:manage |
| FR-USR-06 | Liệt kê người dùng (không bao giờ trả băm mật khẩu)                                                                          | user:manage |

### 3.3 Danh mục mã hàng (ITM)

| Mã        | Yêu cầu                                                                                                                                                                                  | Quyền      |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| FR-ITM-01 | Tạo mã hàng: mã (chuẩn hóa chữ hoa, duy nhất), tên, loại (MATERIAL`/SEMI`/`PRODUCT`), đơn vị, số chữ số lẻ 0–6, nhóm, tồn tối thiểu, cờ “không đối chiếu”, quy cách (tham khảo), ghi chú | item:write |
| FR-ITM-02 | isStocked luôn suy ra từ loại: SEMI là false, còn lại true; không sửa tay                                                                                                                | item:write |
| FR-ITM-03 | Khi mã đã xuất hiện trong phiếu, giao dịch kho hoặc định mức, _khóa_ việc đổi code, type, unit, decimalPlaces (lỗi ITEM_FIELD_LOCKED). Đổi tên, nhóm, tồn tối thiểu, ghi chú vẫn được    | item:write |
| FR-ITM-04 | Ngừng sử dụng (ẩn) thay vì xóa. Không ngừng được mã còn tồn kho > 0 (ITEM_HAS_STOCK)                                                                                                     | item:write |
| FR-ITM-05 | Liệt kê, lọc theo loại, tìm theo mã/tên, tùy chọn gồm mã đã ngừng; tối đa 1000 dòng                                                                                                      | item:read  |
| FR-ITM-06 | Tra ngược: liệt kê các định mức _đang áp dụng_ chứa một mã hàng                                                                                                                          | bom:read   |

### 3.4 Định mức (BOM)

| Mã        | Yêu cầu                                                                                                                                                                                                                                     | Quyền         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| FR-BOM-01 | Tạo bản nháp cho một PRODUCT hoặc SEMI (không lập cho MATERIAL). Phiên bản = lớn nhất hiện có + 1. Mỗi mã chỉ có tối đa 1 bản nháp (BOM_DRAFT_EXISTS)                                                                                       | bom:write     |
| FR-BOM-02 | Dòng định mức: mã là MATERIAL hoặc SEMI, đang hoạt động, không trùng, không là chính đầu ra; số lượng > 0 tối đa 6 chữ số lẻ; hao hụt cho phép 0–100%. Mã, tên, đơn vị được chụp (snapshot) vào dòng. Tối đa 500 dòng                       | bom:write     |
| FR-BOM-03 | Chỉ sửa/xóa được bản _nháp_; điều kiện trạng thái nằm trong chính câu lệnh cập nhật                                                                                                                                                         | bom:write     |
| FR-BOM-04 | Kích hoạt (một transaction): chỉ bản nháp; không rỗng; kiểm tra loại mã; _kiểm tra vòng lặp_; chuyển bản ACTIVE cũ sang ARCHIVED; đặt ACTIVE, effectiveFrom, người và thời điểm kích hoạt. Cơ sở dữ liệu đảm bảo mỗi mã tối đa 1 bản ACTIVE | bom:activate  |
| FR-BOM-05 | Tạo phiên bản mới: sao chép một định mức (thường là bản đang áp dụng) thành bản nháp mới, làm mới snapshot từ danh mục hiện tại                                                                                                             | bom:write     |
| FR-BOM-06 | Cây khai triển: hiển thị các cấp; dòng SEMI được mở bằng định mức ACTIVE của nó; báo “chưa có định mức” nếu thiếu; chặn vòng và độ sâu quá 20 cấp                                                                                           | bom:read      |
| FR-BOM-07 | Khai triển tổng nhu cầu cho N đơn vị (mục 6.3): gộp nguyên liệu trùng giữa các nhánh, trả norm (theo định mức) và allowed (tối đa cho phép)                                                                                                 | bom:read      |
| FR-BOM-08 | “Điền theo định mức”: từ FR-BOM-07, làm tròn _lên_ từng dòng theo số chữ số lẻ của mã, trả kèm normQuantity chính xác để lưu vào phiếu                                                                                                      | voucher:write |

### 3.5 Phiếu nhập/xuất (VCH)

| Mã        | Yêu cầu                                                                                                                                                                                                                                    | Quyền           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| FR-VCH-01 | Sáu loại phiếu với quy tắc loại mã hàng ở bảng 3.5.1                                                                                                                                                                                       |                 |
| FR-VCH-02 | Lưu nháp: kiểm tra mã tồn tại, đang hoạt động, có lưu kho, đúng loại theo phiếu, không trùng mã trong phiếu, số lượng > 0, không vượt số chữ số lẻ của mã. Chụp mã, tên, đơn vị vào từng dòng. Tối đa 500 dòng                             | voucher:write   |
| FR-VCH-03 | Chỉ sửa/xóa được phiếu _nháp_ (điều kiện nằm trong câu lệnh cập nhật, không đè lên phiếu vừa được xác nhận)                                                                                                                                | voucher:write   |
| FR-VCH-04 | Xác nhận (một transaction, mục 6.1): “chiếm” phiếu từ nháp sang xác nhận một cách nguyên tử, kiểm tra lại từng dòng, cấp số phiếu, cập nhật tồn, ghi giao dịch kho. Lỗi ở bất kỳ bước nào thì hoàn tác toàn bộ và phiếu giữ nguyên là nháp | voucher:confirm |
| FR-VCH-05 | Số phiếu PN-YYYY-00001 (nhập) và PX-YYYY-00001 (xuất); năm tính theo ngày chứng từ giờ Việt Nam; bộ đếm tăng nguyên tử; chỉ cấp khi xác nhận để không hổng số do phiếu nháp                                                                |                 |
| FR-VCH-06 | Hủy phiếu đã xác nhận (một transaction, mục 6.2): bắt buộc lý do; ghi giao dịch đảo theo _ngày hủy_; phiếu chuyển CANCELLED                                                                                                                | voucher:cancel  |
| FR-VCH-07 | Phiếu “Xuất sản xuất” lưu tham chiếu sản xuất (productionRef: thành phẩm, số lượng). Mã và tên thành phẩm do máy chủ tự tra, không tin dữ liệu từ client                                                                                   | voucher:write   |
| FR-VCH-08 | Mỗi dòng có thể lưu normQuantity (định mức tại thời điểm điền). Sửa định mức về sau không làm đổi phiếu                                                                                                                                    | voucher:write   |
| FR-VCH-09 | Liệt kê: lọc theo hướng, loại, trạng thái, kỳ, tiền tố số phiếu; sắp theo ngày giảm dần; phân trang (1–100/trang, mặc định giao diện 20)                                                                                                   | voucher:read    |
| FR-VCH-10 | Trường “Mã đợt” (batchNote, tối đa 200 ký tự) tự do trên mọi phiếu                                                                                                                                                                         | voucher:write   |

_Bảng 3.5.1: loại phiếu và loại mã hàng được phép_

| Loại phiếu                       | Hướng | Mã hàng được phép | Tiền tố |
| -------------------------------- | ----- | ----------------- | ------- |
| IMPORT_MATERIAL Nhập nguyên liệu | Nhập  | MATERIAL          | PN      |
| IMPORT_PRODUCT Nhập thành phẩm   | Nhập  | PRODUCT           | PN      |
| IMPORT_OTHER Nhập khác           | Nhập  | MATERIAL, PRODUCT | PN      |
| EXPORT_PRODUCTION Xuất sản xuất  | Xuất  | MATERIAL          | PX      |
| EXPORT_PRODUCT Xuất giao đối tác | Xuất  | PRODUCT           | PX      |
| EXPORT_OTHER Xuất khác           | Xuất  | MATERIAL, PRODUCT | PX      |

SEMI không bao giờ được phép trên phiếu (ITEM_NOT_STOCKED).

### 3.6 Tồn kho và sổ kho (STK)

| Mã        | Yêu cầu                                                                                                                                                                | Quyền       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| FR-STK-01 | Tồn hiện tại cho các mã có lưu kho và đang hoạt động; mã chưa có giao dịch hiển thị 0; cờ isLow khi tồn < tồn tối thiểu; lọc theo loại, tìm, chỉ mã thấp               | report:read |
| FR-STK-02 | Thẻ kho một mã trong khoảng ngày: tồn đầu kỳ, từng phát sinh, _số dư chạy tính lại theo thứ tự ngày_ (luôn đơn điệu kể cả phiếu lùi ngày); giao dịch đảo được đánh dấu | report:read |
| FR-STK-03 | Sổ kho bất biến: các thao tác update/delete/replace trên giao dịch kho bị chặn ở tầng ứng dụng (STOCK_TRANSACTION_IS_IMMUTABLE)                                        |             |
| FR-STK-04 | Chống ghi trùng sổ: ràng buộc duy nhất (voucherId, lineNo, kind) và mỗi giao dịch chỉ bị đảo một lần (reversalOf duy nhất)                                             |             |
| FR-STK-05 | Tồn không bao giờ âm: lệnh trừ tồn có điều kiện onHand >= số lượng ngay trong câu cập nhật, nên hai phiếu xác nhận đồng thời cũng không thể cùng thắng                 |             |

### 3.7 Báo cáo (RPT)

| Mã        | Yêu cầu                                                                                                                                                                                                                   | Quyền       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| FR-RPT-01 | Nhập - Xuất - Tồn trong [từ ngày, đến ngày] (ngày đến tính trọn ngày, giờ Việt Nam): tồn đầu = tổng phát sinh trước kỳ; nhập, xuất = tổng phát sinh có dấu dương/âm trong kỳ; tồn cuối = đầu + nhập − xuất. Lọc theo loại | report:read |
| FR-RPT-02 | Đối chiếu định mức theo tháng (mục 6.4)                                                                                                                                                                                   | report:read |
| FR-RPT-03 | Báo cáo NXT, thẻ kho, tồn kho, đối chiếu, tổng nhu cầu xuất được CSV (UTF-8 có BOM, ô được đặt trong dấu nháy)                                                                                                            | report:read |

### 3.8 Đa ngôn ngữ (I18N)

| Mã         | Yêu cầu                                                                                                                                                                                                                           | Quyền          |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| FR-I18N-01 | Hỗ trợ vi (mặc định) và en. Người dùng chọn bằng nút ngôn ngữ ở thanh trên và ở trang đăng nhập; lựa chọn lưu trong cookie wms_locale (1 năm, sameSite=lax). Cookie thiếu hoặc không hợp lệ thì dùng vi                           | Mọi người      |
| FR-I18N-02 | Toàn bộ chữ trên giao diện được dịch: màn hình, nút, cảnh báo, hộp thoại, menu, nhóm menu, ô tìm kiếm, bảng tùy chỉnh giao diện, trang “Không có quyền”, tiêu đề tab và metadata (<html lang>, og:site_name)                      |                |
| FR-I18N-03 | Thông báo lỗi do Server Action trả về được dịch theo ngôn ngữ của yêu cầu (đọc cookie ở máy chủ). Mã lỗi (code) không đổi theo ngôn ngữ. Phần chi tiết kỹ thuật kèm theo (mã hàng; tên trường và lý do của zod) giữ nguyên        |                |
| FR-I18N-04 | Số và ngày hiển thị theo ngôn ngữ: vi dùng 1.234,5 và vi-VN; en dùng 1,234.5 và en-GB (ngày trước tháng). Giá trị lưu và truyền vẫn là chuỗi thập phân chuẩn. Ô nhập số lượng chấp nhận cả , và . làm dấu thập phân               |                |
| FR-I18N-05 | Dữ liệu người dùng nhập (tên mã hàng, nhóm, ghi chú, mã đợt, lý do hủy, họ tên) không được dịch                                                                                                                                   |                |
| FR-I18N-06 | Nhãn hệ thống (loại mã hàng, loại và trạng thái phiếu, trạng thái định mức, vai trò, trạng thái đối chiếu) được dịch khi hiển thị; giá trị lưu trong CSDL vẫn là mã (MATERIAL, CONFIRMED...)                                      |                |
| FR-I18N-07 | Tiêu đề cột của file CSV xuất ra theo ngôn ngữ hiện tại; tên file và giá trị số giữ nguyên                                                                                                                                        | report:read    |
| FR-I18N-08 | Khi thêm chuỗi mới, nhà phát triển viết t(“câu tiếng Việt”) và thêm bản dịch vào src/lib/i18n/en.ts. Lệnh npm run wms:i18n thất bại nếu thiếu bản dịch, nếu {placeholder} hai bản không khớp, và cảnh báo bản dịch không còn dùng | Nhà phát triển |

_Cơ chế._ Khóa dịch là chính câu tiếng Việt (kiểu gettext). translate(locale, key, params) trả về chính khóa với vi, và tra en[key] với en (thiếu thì lùi về khóa). {tên} được thay bằng tham số. Phía client dùng useT() (I18nProvider ở layout gốc); phía máy chủ dùng getServerT(). Layout gốc đọc cookie nên các trang được render theo ngôn ngữ ngay ở lần tải đầu (không nhấp nháy).

## 4. Mô hình dữ liệu

```mermaid
erDiagram
ITEM ||--o{ BOM : “outputItemId”
BOM ||--|{ BOM_LINE : “lines[]”
ITEM ||--o{ BOM_LINE : “itemId”
VOUCHER ||--|{ VOUCHER_LINE : “lines[]”
ITEM ||--o{ VOUCHER_LINE : “itemId”
ITEM ||--o| INVENTORY : “itemId”
VOUCHER ||--o{ STOCK_TRANSACTION : “voucherId”
ITEM ||--o{ STOCK_TRANSACTION : “itemId”
STOCK_TRANSACTION ||--o| STOCK_TRANSACTION : “reversalOf”
USER ||--o{ VOUCHER : “createdBy”
```

BOM_LINE và VOUCHER_LINE là mảng nhúng trong tài liệu cha. Mọi giá trị số lượng là Decimal128.

### 4.1 items

| Trường                    | Kiểu       | Ghi chú                     |
| ------------------------- | ---------- | --------------------------- |
| code                      | string     | Chữ hoa, duy nhất           |
| name, unit                | string     |                             |
| type                      | enum       | MATERIAL \| SEMI \| PRODUCT |
| decimalPlaces             | number     | 0–6                         |
| group, packSize, note     | string?    | packSize chỉ để tham khảo   |
| minStock                  | Decimal128 | Mặc định 0                  |
| isStocked                 | boolean    | Suy ra từ type              |
| excludeFromReconciliation | boolean    |                             |
| isActive                  | boolean    |                             |

Chỉ mục: code duy nhất; (type, isActive); text trên name, code.

### 4.2 boms

| Trường                                  | Kiểu             | Ghi chú                                                        |
| --------------------------------------- | ---------------- | -------------------------------------------------------------- |
| outputItemId, outputItemCode            | ObjectId, string | Mã được chụp                                                   |
| version                                 | number           | Tăng theo từng mã đầu ra                                       |
| status                                  | enum             | DRAFT \| ACTIVE \| ARCHIVED                                    |
| effectiveFrom, activatedBy, activatedAt |                  | Đặt khi kích hoạt                                              |
| lines[]                                 |                  | itemId, itemCode, itemName, unit, quantity, scrapPercent, note |
| note, createdBy                         |                  |                                                                |

Chỉ mục: (outputItemId, version) duy nhất; **duy nhất 1 ACTIVE mỗi mã** và **duy nhất 1 DRAFT mỗi mã** (partial unique); (lines.itemId, status) cho tra ngược.

### 4.3 vouchers

| Trường                                                  | Kiểu          | Ghi chú                                                                  |
| ------------------------------------------------------- | ------------- | ------------------------------------------------------------------------ |
| voucherNo                                               | string?       | Cấp khi xác nhận; duy nhất khi có                                        |
| type, direction, status                                 | enum          | direction suy ra từ type                                                 |
| voucherDate, period                                     | Date, YYYY-MM | period suy ra theo giờ Việt Nam                                          |
| batchNote, note                                         | string?       |                                                                          |
| productionRef                                           | object?       | Chỉ cho EXPORT_PRODUCTION                                                |
| lines[]                                                 |               | lineNo, itemId, itemCode, itemName, unit, quantity, normQuantity?, note? |
| createdBy, confirmedBy/At, cancelledBy/At, cancelReason |               |                                                                          |

Chỉ mục: voucherNo (partial unique); (type, voucherDate, status); (period, type, status).

### 4.4 inventory

itemId (duy nhất), onHand (Decimal128). Một dòng mỗi mã có phát sinh. Chỉ thay đổi trong transaction xác nhận/hủy phiếu.

### 4.5 stockTransactions

| Trường                                    | Ghi chú                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| kind                                      | POST (khi xác nhận) \| REVERSAL (khi hủy)                                      |
| voucherId, voucherNo, voucherType, lineNo | Liên kết phiếu; voucherType của giao dịch đảo giữ loại phiếu gốc               |
| itemId, itemCode                          |                                                                                |
| direction, quantity, signedQuantity       | quantity luôn dương; signedQuantity có dấu (+ nhập, − xuất), dùng để cộng tổng |
| balanceAfter                              | Tồn ngay sau khi ghi (dấu vết kiểm toán)                                       |
| businessDate, period                      | POST: ngày chứng từ. REVERSAL: ngày hủy                                        |
| reversalOf                                | Tham chiếu giao dịch gốc                                                       |

Chỉ mục: (voucherId, lineNo, kind) duy nhất; reversalOf duy nhất (partial); (itemId, businessDate, \_id); (period, voucherType, itemId).

### 4.6 counters, users

counters: \_id = PN-2026 / PX-2026, seq tăng nguyên tử.
users: username (duy nhất, chữ thường), name, passwordHash (không trả mặc định), role, isActive, tokenVersion, failedLoginCount, lockedUntil, lastLoginAt.

## 5. Máy trạng thái

mermaid
stateDiagram-v2
[*] --> DRAFT: tạo phiếu
DRAFT --> DRAFT: sửa / lưu
DRAFT --> [*]: xóa nháp
DRAFT --> CONFIRMED: xác nhận (ghi sổ kho)
CONFIRMED --> CANCELLED: hủy (ghi giao dịch đảo)
CANCELLED --> [*]

mermaid
stateDiagram-v2
[*] --> DRAFT: tạo / tạo phiên bản mới
DRAFT --> [*]: xóa nháp
DRAFT --> ACTIVE: kích hoạt (kiểm vòng lặp)
ACTIVE --> ARCHIVED: có bản mới được kích hoạt

Phiếu CANCELLED và định mức ARCHIVED không chuyển ngược trạng thái.

## 6. Quy tắc và thuật toán nghiệp vụ

### 6.1 Xác nhận phiếu (FR-VCH-04)

Trong một transaction:

1.  Cập nhật có điều kiện status = DRAFT → CONFIRMED. Nếu không khớp: VOUCHER_NOT_DRAFT (chống bấm xác nhận hai lần).
2.  Phiếu phải có dòng; với mỗi dòng kiểm tra: mã tồn tại, đang hoạt động, có lưu kho, loại mã hợp lệ theo bảng 3.5.1, số lượng > 0, số chữ số lẻ ≤ decimalPlaces.
3.  Cấp voucherNo từ bộ đếm theo năm Việt Nam của ngày chứng từ.
4.  Duyệt các dòng theo thứ tự itemId (để các phiếu song song khóa theo cùng thứ tự, giảm xung đột ghi):

- _Nhập:_ cộng onHand (tạo dòng inventory nếu chưa có).
- _Xuất:_ trừ onHand chỉ khi onHand >= số lượng; không khớp thì lỗi INSUFFICIENT_STOCK:<mã>.

5.  Ghi một stockTransactions (kind = POST) cho mỗi dòng.
6.  Lỗi ở bất kỳ bước nào làm hoàn tác tất cả, kể cả bước 1.

### 6.2 Hủy phiếu (FR-VCH-06)

Trong một transaction: chuyển CONFIRMED → CANCELLED (có điều kiện), đọc các giao dịch POST của phiếu, với mỗi giao dịch áp dụng chiều ngược lại lên tồn (hủy phiếu _nhập_ là trừ tồn nên cũng không được làm tồn âm: INSUFFICIENT_STOCK_FOR_CANCEL), ghi giao dịch REVERSAL với reversalOf và businessDate = ngày hủy.

Hệ quả có chủ đích: kỳ đã chốt không bị đổi số; trong báo cáo, hủy phiếu xuất xuất hiện ở cột Nhập của kỳ hủy.

### 6.3 Khai triển định mức (FR-BOM-07)

Duyệt đệ quy từ định mức ACTIVE của mã gốc, bắt đầu với mult = N (số lượng) và allowedMult = 1:

- Với mỗi dòng: q = mult × quantity.
- Dung sai dòng tol = scrapPercent nếu > 0; nếu bằng 0 thì 0 với dòng SEMI và _dung sai chung_ với dòng nguyên liệu (mặc định tham số, 2% khi gọi từ báo cáo). Nhờ vậy dung sai chung chỉ áp một lần ở dòng nguyên liệu, còn hao hụt khai báo rõ ràng ở các cấp thì nhân dồn.
- am = allowedMult × (1 + tol/100).
- Dòng SEMI: đệ quy với (q, am); thiếu định mức ACTIVE thì lỗi BOM_NOT_FOUND.
- Dòng nguyên liệu: cộng dồn norm += q, allowed += q × am.
- Chặn vòng (BOM_CIRCULAR_REFERENCE) và độ sâu > 20 (BOM_TOO_DEEP).

Ví dụ: SA1 = 2×R1 + 0,5×W1 (hao hụt 10%); FG1 = 1×SA1 + 3×R1. Với 100 FG1: R1 = 100×(2+3) = 500; W1 = 50, tối đa cho phép 55.

### 6.4 Đối chiếu định mức theo tháng (FR-RPT-02)

Đầu vào: kỳ YYYY-MM, dung sai chung (mặc định 2%), cờ chỉ dòng bất thường.

1.  produced[p] = tổng signedQuantity của giao dịch IMPORT_PRODUCT trong kỳ cho từng thành phẩm (đã gồm giao dịch đảo).
2.  Với mỗi thành phẩm có produced > 0: khai triển định mức ACTIVE hiện tại; cộng dồn norm và allowed theo nguyên liệu. Thành phẩm chưa có định mức ACTIVE bị _bỏ qua và liệt kê_ riêng (skipped), không làm hỏng báo cáo.
3.  actual[m] = tổng của −signedQuantity các giao dịch EXPORT_PRODUCTION trong kỳ.
4.  Bỏ các mã có excludeFromReconciliation.
5.  Với mỗi nguyên liệu: diff = actual − norm; diffPercent = diff / norm × 100 (rỗng nếu norm = 0). Trạng thái, theo thứ tự ưu tiên:

| Điều kiện              | Trạng thái                 |
| ---------------------- | -------------------------- |
| norm = 0 và actual > 0 | NO_NORM Không có định mức  |
| actual > allowed       | OVER Vượt định mức         |
| actual < norm          | UNDER Xuất ít hơn định mức |
| còn lại                | OK                         |

Sắp xếp: OVER, NO_NORM, UNDER, OK, rồi theo |chênh lệch| giảm dần.

_Giới hạn đã biết:_ dùng định mức đang áp dụng tại thời điểm xem (không phải bản đúng thời điểm sản xuất); hàng dở dang cuối kỳ làm lệch tạm thời; không tách được hao hụt theo thành phẩm hay theo đợt.

### 6.5 Danh sách quy tắc

| Mã    | Quy tắc                                                           | Kiểm bởi                   |
| ----- | ----------------------------------------------------------------- | -------------------------- |
| BR-01 | Tồn kho không âm (kể cả khi hủy phiếu nhập)                       | FR-STK-05, mục 6.1–6.2     |
| BR-02 | Chỉ phiếu đã xác nhận mới đổi tồn                                 | FR-VCH-04                  |
| BR-03 | Phiếu đã xác nhận không sửa/xóa được                              | FR-VCH-03                  |
| BR-04 | Hủy bằng giao dịch đảo, bắt buộc có lý do                         | FR-VCH-06                  |
| BR-05 | Sổ kho bất biến, không ghi trùng                                  | FR-STK-03, FR-STK-04       |
| BR-06 | SEMI không lưu kho, không xuất hiện trên phiếu                    | FR-ITM-02, FR-VCH-02       |
| BR-07 | Định mức ACTIVE không sửa; mỗi mã tối đa một ACTIVE và một DRAFT  | FR-BOM-03, chỉ mục         |
| BR-08 | Định mức không tham chiếu vòng                                    | FR-BOM-04                  |
| BR-09 | Xuất vượt định mức không bị chặn, chỉ cảnh báo                    | Giao diện phiếu; FR-RPT-02 |
| BR-10 | Mã đã phát sinh dữ liệu không đổi mã/loại/đơn vị/số lẻ            | FR-ITM-03                  |
| BR-11 | Mã còn tồn không ngừng sử dụng được                               | FR-ITM-04                  |
| BR-12 | Luôn còn ≥ 1 quản trị viên hoạt động; không tự hạ quyền/khóa mình | FR-USR-03, FR-USR-04       |

## 7. Phân quyền

| Quyền                                             | ADMIN | MANAGER | STOREKEEPER | VIEWER |
| ------------------------------------------------- | :---: | :-----: | :---------: | :----: |
| item:read, bom:read, voucher:read, report:read    |   ✓   |    ✓    |      ✓      |   ✓    |
| item:write                                        |   ✓   |    ✓    |             |        |
| bom:write                                         |   ✓   |    ✓    |             |        |
| bom:activate                                      |   ✓   |    ✓    |             |        |
| voucher:write (lập, sửa, xóa nháp, điền định mức) |   ✓   |    ✓    |      ✓      |        |
| voucher:confirm                                   |   ✓   |    ✓    |      ✓      |        |
| voucher:cancel                                    |   ✓   |    ✓    |             |        |
| user:manage                                       |   ✓   |         |             |        |

Quyền được kiểm _ở máy chủ_ trong mọi Server Action; giao diện chỉ ẩn nút/menu cho gọn. Trang quản trị người dùng chuyển về /unauthorized nếu thiếu quyền.

## 8. Giao diện lập trình nội bộ (Server Actions)

Mọi action trả { ok: true, data } hoặc { ok: false, code, message }; không ném lỗi ra client. Lỗi lạ được ghi log phía máy chủ và trả thông báo chung.

| Nhóm (src/server/actions) | Action                                                                             | Quyền           |
| ------------------------- | ---------------------------------------------------------------------------------- | --------------- |
| auth                      | loginAction, logoutAction, meAction                                                | Công khai       |
|                           | changeOwnPasswordAction                                                            | Đã đăng nhập    |
| users                     | listUsersAction, createUserAction, updateUserAction, resetPasswordAction           | user:manage     |
| items                     | listItemsAction, getItemAction                                                     | item:read       |
|                           | createItemAction, updateItemAction, setItemActiveAction                            | item:write      |
| boms                      | listBomsAction, getBomAction, bomTreeAction, whereUsedAction, explodePreviewAction | bom:read        |
|                           | createBomDraftAction, updateBomDraftAction, deleteBomDraftAction, cloneBomAction   | bom:write       |
|                           | activateBomAction                                                                  | bom:activate    |
| vouchers                  | listVouchersAction, getVoucherAction                                               | voucher:read    |
|                           | saveDraftAction, deleteDraftAction, fillByBomAction                                | voucher:write   |
|                           | confirmVoucherAction                                                               | voucher:confirm |
|                           | cancelVoucherAction                                                                | voucher:cancel  |
| reports                   | currentStockAction, stockSummaryAction, stockCardAction, reconciliationAction      | report:read     |

## 9. Mã lỗi

Mã lỗi nghiệp vụ là phần trước dấu : của thông báo; phần sau (nếu có) là chi tiết như mã hàng.

| Mã                                                                                                                                                                                                                                                                                                                | Ý nghĩa                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| UNAUTHENTICATED, FORBIDDEN                                                                                                                                                                                                                                                                                        | Chưa đăng nhập; thiếu quyền                                      |
| INVALID_CREDENTIALS, ACCOUNT_LOCKED, WRONG_PASSWORD                                                                                                                                                                                                                                                               | Đăng nhập, đổi mật khẩu                                          |
| VALIDATION                                                                                                                                                                                                                                                                                                        | Dữ liệu vào sai định dạng (kèm trường lỗi)                       |
| DUPLICATE_KEY                                                                                                                                                                                                                                                                                                     | Trùng giá trị duy nhất (mã hàng, tên đăng nhập...)               |
| INSUFFICIENT_STOCK:<mã>                                                                                                                                                                                                                                                                                           | Xuất vượt tồn                                                    |
| INSUFFICIENT_STOCK_FOR_CANCEL:<mã>                                                                                                                                                                                                                                                                                | Hủy phiếu nhập sẽ làm tồn âm                                     |
| VOUCHER_NOT_DRAFT, VOUCHER_NOT_CONFIRMED, VOUCHER_NOT_EDITABLE, VOUCHER_EMPTY, VOUCHER_DUPLICATE_ITEM, VOUCHER_TYPE_INVALID, CANCEL_REASON_REQUIRED                                                                                                                                                               | Trạng thái và nội dung phiếu                                     |
| ITEM_NOT_FOUND, ITEM_INACTIVE, ITEM_NOT_STOCKED, ITEM_TYPE_NOT_ALLOWED, QTY_MUST_BE_POSITIVE, QTY_TOO_MANY_DECIMALS, PRODUCT_NOT_FOUND                                                                                                                                                                            | Dòng phiếu                                                       |
| ITEM_FIELD_LOCKED, ITEM_HAS_STOCK                                                                                                                                                                                                                                                                                 | Ràng buộc danh mục                                               |
| BOM_NOT_FOUND, BOM_CIRCULAR_REFERENCE, BOM_TOO_DEEP, BOM_DUPLICATE_LINE, BOM_SELF_REFERENCE, BOM_EMPTY, BOM_QTY_MUST_BE_POSITIVE, BOM_ONLY_DRAFT_CAN_BE_ACTIVATED, BOM_OUTPUT_MUST_BE_PRODUCT_OR_SEMI, BOM_LINE_CANNOT_BE_PRODUCT, BOM_LINE_ITEM_NOT_FOUND, BOM_ITEM_INACTIVE, BOM_DRAFT_EXISTS, BOM_NOT_EDITABLE | Định mức                                                         |
| USER_NOT_FOUND, CANNOT_MODIFY_SELF, LAST_ADMIN                                                                                                                                                                                                                                                                    | Người dùng                                                       |
| STOCK_TRANSACTION_IS_IMMUTABLE                                                                                                                                                                                                                                                                                    | Cố sửa/xóa sổ kho (lỗi lập trình, không hiển thị cho người dùng) |

## 10. Yêu cầu phi chức năng

| Mã     | Nhóm                 | Yêu cầu                                                                                                                                                                                         |
| ------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-01 | Toàn vẹn             | Thao tác ảnh hưởng tồn kho là nguyên tử (transaction); lỗi không để lại trạng thái nửa vời                                                                                                      |
| NFR-02 | Đồng thời            | Hai thao tác xác nhận cùng lúc không làm tồn âm; xung đột ghi được transaction tự thử lại                                                                                                       |
| NFR-03 | Bảo mật              | Mật khẩu băm bcrypt cost 12; không trả băm ra ngoài; cookie httpOnly, sameSite=lax, secure ở production; chống dò tên đăng nhập; khóa tạm khi dò mật khẩu; AUTH_SECRET ≥ 32 ký tự               |
| NFR-04 | Bảo mật              | Mọi quyền kiểm ở máy chủ; dữ liệu vào được kiểm bằng zod; thông báo lỗi nội bộ không rò ra client                                                                                               |
| NFR-05 | Kiểm toán            | Sổ kho bất biến và có balanceAfter; phiếu lưu người tạo, người xác nhận, người hủy và thời điểm                                                                                                 |
| NFR-06 | Chính xác số         | Không dùng số thực cho số lượng (Decimal128, chuỗi, decimal.js)                                                                                                                                 |
| NFR-07 | Múi giờ              | Số phiếu, kỳ báo cáo, ranh giới ngày theo UTC+7                                                                                                                                                 |
| NFR-08 | Hiệu năng (mục tiêu) | Với vài nghìn mã hàng và vài chục nghìn giao dịch, các danh sách và báo cáo phản hồi trong khoảng 1–2 giây trên máy chủ nhỏ. Các chỉ mục ở mục 4 phục vụ mục tiêu này. Chưa đo trên dữ liệu lớn |
| NFR-09 | Khả dụng             | Cần replica set; mất kết nối CSDL thì các thao tác báo lỗi chung, không ghi nửa chừng                                                                                                           |
| NFR-10 | Khả năng mở rộng     | Có chỗ nâng cấp lên lệnh sản xuất (batchNote, productionRef) mà không đổi sổ kho                                                                                                                |
| NFR-11 | Dễ dùng              | Giao diện hai ngôn ngữ (Tiếng Việt, English); thao tác chính không rời trang danh sách (ngăn kéo); responsive theo template                                                                     |
| NFR-12 | Khả năng bảo trì     | Nghiệp vụ tách khỏi giao diện (src/server/lib); hằng số dùng chung không phụ thuộc máy chủ (src/lib/wms); mã vượt kiểm tra TypeScript và Biome                                                  |

## 11. Kiểm thử và truy vết

### 11.1 Kiểm thử tự động mức dịch vụ

scripts/smoke-test.ts chạy các dịch vụ nghiệp vụ trên MongoDB replica set trong bộ nhớ (không cần Next.js, không cần cài MongoDB). Lệnh: npm run wms:test. Kết quả ở lần phát hành này: _toàn bộ đạt (46 kiểm tra)_.

| Nhóm kiểm tra                                                                                      | Yêu cầu / quy tắc được phủ         |
| -------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Mã hàng chuẩn hóa chữ hoa; SEMI không lưu kho; trùng mã bị chặn                                    | FR-ITM-01, FR-ITM-02               |
| Định mức đa cấp kích hoạt được; MATERIAL không lập định mức; PRODUCT không là thành phần           | FR-BOM-01, FR-BOM-02, BR-07        |
| Phát hiện vòng lặp khi kích hoạt                                                                   | FR-BOM-04, BR-08                   |
| Khai triển: R1=500, W1=50, tối đa 55 (dung sai không bị nhân dồn sai)                              | FR-BOM-07, mục 6.3                 |
| Cây khai triển mở đúng thành phần của bán thành phẩm                                               | FR-BOM-06                          |
| Phiếu: sai loại mã, SEMI trên phiếu, quá số lẻ bị chặn                                             | FR-VCH-02, BR-06                   |
| Xác nhận: cấp số PN-…-00001; xác nhận hai lần bị chặn; cập nhật tồn; phiếu xác nhận không sửa được | FR-VCH-04, FR-VCH-05, BR-02, BR-03 |
| “Điền theo định mức” + xác nhận phiếu xuất sản xuất                                                | FR-BOM-08, FR-VCH-07               |
| Xuất vượt tồn bị chặn; phiếu vẫn là nháp, tồn không đổi, không có dòng sổ                          | BR-01, mục 6.1 bước 6              |
| Hai phiếu xuất đồng thời (300 + 300 so với tồn 500): đúng một phiếu thành công                     | FR-STK-05, NFR-02                  |
| Hủy phiếu xuất hoàn tồn; không hủy hai lần; một giao dịch đảo; bắt buộc lý do                      | FR-VCH-06, BR-04                   |
| Hủy phiếu nhập đã tiêu thụ hàng bị chặn                                                            | BR-01, mục 6.2                     |
| Sổ kho: update/delete bị chặn                                                                      | FR-STK-03, BR-05                   |
| Khóa đổi đơn vị khi đã dùng; không ngừng mã còn tồn                                                | BR-10, BR-11                       |
| Đối chiếu: nhu cầu 500 so với thực xuất 515 → OVER; thành phẩm thiếu định mức được liệt kê skipped | FR-RPT-02                          |
| NXT: tồn cuối = đầu + nhập − xuất; thẻ kho có số dư chạy cuối kỳ đúng                              | FR-RPT-01, FR-STK-02               |

Kiểm tra đa ngôn ngữ: npm run wms:i18n (scripts/check-i18n.ts) quét mã nguồn: _362 khóa trong mã, 362 bản dịch, không thiếu, không thừa, placeholder khớp_. Đã thử xóa một bản dịch để xác nhận lệnh báo lỗi và thoát với mã khác 0.

### 11.2 Kiểm tra tích hợp thủ công đã thực hiện

Build production thành công (không lỗi TypeScript), khởi động next start với MongoDB replica set thật và kiểm tra:

| Kiểm tra                                     | Kết quả                                                                                                                                                                                                                                |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chưa đăng nhập vào /, /dashboard/...         | Chuyển về /login                                                                                                                                                                                                                       |
| Cookie phiên rác                             | Chuyển về /login                                                                                                                                                                                                                       |
| Đã đăng nhập vào /login                      | Chuyển về /dashboard/stock                                                                                                                                                                                                             |
| Quản trị viên mở 11 trang                    | Tất cả 200; loại phiếu không hợp lệ trả 404                                                                                                                                                                                            |
| Vai trò chỉ xem mở trang quản trị người dùng | Chuyển về /unauthorized; menu “Người dùng” không hiển thị                                                                                                                                                                              |
| Cookie wms_locale=en                         | Trang tiếng Anh, <html lang=“en”>; menu “Inventory, Receipts, Issues...”, nhóm menu “Warehouse, Catalog, Reports, System”, og:site_name “Warehouse management”; trang Tồn kho không còn ký tự tiếng Việt nào trong HTML (ngoài script) |
| Không có cookie, hoặc cookie wms_locale=fr   | Tiếng Việt                                                                                                                                                                                                                             |
| Nhật ký máy chủ                              | Không có lỗi                                                                                                                                                                                                                           |

### 11.3 Chưa kiểm thử tự động

Giao diện (thao tác chuột/bàn phím trong trình duyệt), hiệu năng với dữ liệu lớn, và việc gọi Server Action từ trình duyệt thật. Nên chạy thử thủ công luồng 6.1–6.6 của PRD.md trước khi dùng thật.

## 12. Hạn chế đã biết và đề xuất tiếp theo

| #   | Hạn chế                                                                                                | Hướng xử lý                                               |
| --- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| 1   | Đối chiếu dùng định mức đang áp dụng, không theo phiên bản tại thời điểm sản xuất                      | Lệnh sản xuất hoặc lưu phiên bản định mức theo kỳ         |
| 2   | Hàng dở dang cuối tháng chưa có ô điều chỉnh                                                           | Thêm bảng điều chỉnh theo kỳ và mã                        |
| 3   | Chưa có phiếu kiểm kê                                                                                  | Phiếu điều chỉnh riêng có đối chiếu số liệu               |
| 4   | Danh sách người dùng và mã hàng không phân trang (mã hàng giới hạn 1000)                               | Phân trang phía máy chủ khi dữ liệu lớn                   |
| 5   | Chưa có màn hình nhật ký thao tác (dữ liệu đã có trong phiếu và sổ kho)                                | Màn hình xem nhật ký cho quản trị                         |
| 6   | Chưa in phiếu                                                                                          | Mẫu in theo biểu mẫu công ty                              |
| 7   | Giới hạn 500 dòng mỗi phiếu/định mức                                                                   | Nâng giới hạn nếu cần                                     |
| 8   | Ngôn ngữ lưu theo trình duyệt (cookie), chưa theo tài khoản                                            | Thêm trường locale cho người dùng                         |
| 9   | Chỉ có hai ngôn ngữ; en.ts là bản đồ duy nhất                                                          | Tách thành từ điển theo ngôn ngữ khi thêm ngôn ngữ thứ ba |
| 10  | Chi tiết lỗi kiểm dữ liệu (tên trường, lý do của zod) luôn bằng tiếng Anh                              | Dịch thông điệp zod nếu cần                               |
| 11  | Ô chọn ngày/tháng của trình duyệt hiển thị theo ngôn ngữ của trình duyệt, không theo nút chọn ngôn ngữ | Dùng bộ chọn ngày tự dựng nếu cần đồng nhất               |
