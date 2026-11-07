# BRD: Hệ thống quản lý kho cho công ty sản xuất nhỏ

|                    |                                                                       |
| ------------------ | --------------------------------------------------------------------- |
| Phiên bản          | 1.0                                                                   |
| Ngày               | 06/11/2026                                                            |
| Trạng thái         | Bản nháp để chủ doanh nghiệp xác nhận                                 |
| Tài liệu liên quan | PRD.md (sản phẩm), SRS.md (đặc tả kỹ thuật), INTEGRATION.md (cài đặt) |

## 1. Tóm tắt

Công ty sản xuất nhỏ (gia công, lắp ráp linh kiện điện tử) cần một website để quản lý kho: ghi nhận nguyên liệu nhập từ đối tác, xuất nguyên liệu cho sản xuất, nhập thành phẩm, xuất giao đối tác, theo dõi tồn kho và phát hiện hao hụt so với định mức. Hệ thống thay thế sổ sách/Excel rời rạc bằng một nguồn dữ liệu duy nhất, có phân quyền và lịch sử không thể sửa.

## 2. Bối cảnh và vấn đề

_Mô hình hoạt động._ Một kho duy nhất, một đối tác duy nhất. Đối tác giao nguyên liệu (linh kiện, dây điện, ốc vít, keo...) → công ty lắp ráp/gia công → giao thành phẩm lại cho chính đối tác đó. Sản phẩm có định mức nhiều cấp: thành phẩm → bán thành phẩm → nguyên liệu.

_Vấn đề hiện tại (giả định từ yêu cầu ban đầu, cần xác nhận):_

1. Số liệu nhập/xuất/tồn nằm rải rác, khó biết tồn thực tế tại một thời điểm.
2. Không có cơ chế cảnh báo khi nguyên liệu xuống thấp.
3. Hao hụt nguyên liệu chỉ phát hiện muộn, khi kiểm kê, vì không đối chiếu được lượng xuất với định mức.
4. Sửa phiếu sau khi đã ghi sổ làm mất dấu vết, khó truy trách nhiệm.
5. Lập danh sách nguyên liệu cần xuất cho một đợt sản xuất làm thủ công từ định mức nhiều cấp, dễ sai.

## 3. Mục tiêu kinh doanh

| #   | Mục tiêu                                     | Cách đo (đề xuất, cần chủ doanh nghiệp xác nhận)                                          |
| --- | -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| G1  | Biết tồn kho chính xác theo thời gian thực   | Chênh lệch giữa tồn hệ thống và kiểm đếm thực tế ≤ 1% số mã khi kiểm kê                   |
| G2  | Giảm sai sót khi lập phiếu xuất cho sản xuất | Phiếu xuất sản xuất lập từ định mức chiếm phần lớn số phiếu; giảm số phiếu xuất bù        |
| G3  | Phát hiện hao hụt bất thường sớm             | Báo cáo đối chiếu định mức chạy hằng tháng, mã vượt ngưỡng được xử lý trong tháng kế tiếp |
| G4  | Có dấu vết kiểm toán đầy đủ                  | 100% thay đổi tồn kho đi qua phiếu đã xác nhận; không có sửa/xóa giao dịch kho            |
| G5  | Kiểm soát quyền hạn                          | Mỗi vai trò chỉ làm được đúng việc của mình                                               |

## 4. Phạm vi

### 4.1 Trong phạm vi (phiên bản 1)

- Danh mục mã hàng: nguyên liệu, bán thành phẩm, thành phẩm.
- Định mức (BOM) đa cấp, có phiên bản, có kiểm soát vòng lặp.
- Phiếu nhập kho, phiếu xuất kho, có luồng nháp → xác nhận → hủy.
- Tồn kho hiện tại, cảnh báo dưới mức tối thiểu, thẻ kho.
- Báo cáo Nhập - Xuất - Tồn; báo cáo đối chiếu định mức theo tháng.
- Người dùng, vai trò, đăng nhập an toàn.
- Giao diện hai ngôn ngữ: Tiếng Việt và English, chuyển đổi bất cứ lúc nào.

### 4.2 Ngoài phạm vi (cố ý loại để giữ hệ thống gọn)

| Hạng mục                                     | Lý do loại                                                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Nhiều kho, chuyển kho                        | Công ty chỉ có 1 kho                                                                                 |
| Nhiều đối tác / khách hàng, nhà cung cấp     | Chỉ có 1 đối tác                                                                                     |
| Giá, thành tiền, giá vốn, giá trị tồn        | Không theo dõi giá trị tồn                                                                           |
| Quản lý lô, hạn sử dụng                      | Linh kiện điện tử không cần                                                                          |
| Tồn kho bán thành phẩm, theo dõi trên chuyền | Bán thành phẩm chỉ theo dõi ngoài hệ thống, trong kho chỉ là cấp trung gian của định mức             |
| Lệnh sản xuất (LSX), đối chiếu từng đợt      | Quy mô nhỏ, đối chiếu theo tháng là đủ. Thiết kế đã để sẵn trường “Mã đợt” dạng text để nâng cấp sau |
| Chuyển đổi đơn vị                            | Mỗi mã hàng chỉ có một đơn vị dùng chung                                                             |
| Kiểm kê chuyên biệt                          | Dùng phiếu “Nhập khác / Xuất khác” để điều chỉnh (xem mục 9)                                         |

## 5. Các bên liên quan

| Bên                        | Vai trò                                      | Quan tâm chính                                |
| -------------------------- | -------------------------------------------- | --------------------------------------------- |
| Chủ doanh nghiệp / quản lý | Người phê duyệt, quản lý định mức, hủy phiếu | Số liệu tin cậy, phát hiện hao hụt            |
| Thủ kho                    | Người dùng hằng ngày                         | Lập phiếu nhanh, ít nhập tay, tồn đúng        |
| Nhân viên xem              | Kế toán, kế hoạch                            | Xem tồn và báo cáo                            |
| Quản trị hệ thống          | Cài đặt, cấp tài khoản                       | Bảo mật, sao lưu                              |
| Đối tác                    | Không dùng hệ thống                          | Số liệu đối soát giao nhận (qua xuất báo cáo) |

## 6. Quy trình nghiệp vụ tổng quan

mermaid
flowchart LR
P[Đối tác] -->|giao nguyên liệu| IN1[Phiếu nhập nguyên liệu]
IN1 --> K[(Kho: nguyên liệu + thành phẩm)]
K -->|xuất theo định mức| OUT1[Phiếu xuất sản xuất]
OUT1 --> L[Dây chuyền / lắp ráp<br/>bán thành phẩm theo dõi ngoài hệ thống]
L -->|thành phẩm| IN2[Phiếu nhập thành phẩm]
IN2 --> K
K -->|giao| OUT2[Phiếu xuất giao đối tác]
OUT2 --> P
K --> R1[Báo cáo Nhập - Xuất - Tồn]
OUT1 --> R2[Đối chiếu định mức hằng tháng]
IN2 --> R2

## 7. Quy tắc nghiệp vụ cấp cao

| Mã    | Quy tắc                                                                                                              |
| ----- | -------------------------------------------------------------------------------------------------------------------- |
| BR-H1 | Tồn kho không bao giờ âm: không cho xuất vượt tồn.                                                                   |
| BR-H2 | Chỉ phiếu đã xác nhận mới thay đổi tồn kho.                                                                          |
| BR-H3 | Phiếu đã xác nhận không được sửa. Nhập sai thì hủy phiếu, lập phiếu mới. Hủy không xóa lịch sử mà ghi giao dịch đảo. |
| BR-H4 | Lịch sử giao dịch kho là bất biến (không sửa, không xóa).                                                            |
| BR-H5 | Bán thành phẩm không có tồn kho và không xuất hiện trên phiếu.                                                       |
| BR-H6 | Định mức đang áp dụng không được sửa; muốn đổi phải tạo phiên bản mới.                                               |
| BR-H7 | Định mức không được tham chiếu vòng.                                                                                 |
| BR-H8 | Xuất vượt định mức vẫn được phép (có hao hụt thực tế) nhưng được đánh dấu và đưa vào báo cáo đối chiếu.              |
| BR-H9 | Mỗi mã hàng chỉ có một đơn vị tính; số lượng không vượt số chữ số lẻ của mã đó.                                      |

Quy tắc chi tiết, có mã định danh và tiêu chí kiểm thử: xem SRS.md, mục 6.

## 8. Giả định và ràng buộc

- Công ty có thể vận hành một máy chủ web và một cơ sở dữ liệu MongoDB dạng replica set (hoặc dùng dịch vụ đám mây tương đương).
- Người dùng truy cập bằng trình duyệt hiện đại; giao diện có tiếng Việt (mặc định) và tiếng Anh.
- Ngày giờ nghiệp vụ tính theo múi giờ Việt Nam (UTC+7).
- Số lượng người dùng đồng thời nhỏ (vài người); thiết kế không nhắm tới quy mô lớn.
- Dữ liệu danh mục và định mức ban đầu do công ty cung cấp để nhập hệ thống (không nằm trong phạm vi code).

## 9. Rủi ro và cách xử lý

| Rủi ro                                                 | Mức        | Xử lý                                                                                                         |
| ------------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------- |
| Hàng dở dang trên chuyền làm lệch đối chiếu theo tháng | Trung bình | Đối chiếu theo tháng (đủ dài), ghi chú rõ trên báo cáo. Phase 2: ô điều chỉnh hàng dở dang hoặc lệnh sản xuất |
| Định mức nhập sai làm báo cáo đối chiếu sai            | Cao        | Quy trình duyệt kích hoạt (quyền riêng), xem trước “Tổng nhu cầu”, phiên bản định mức                         |
| Hủy phiếu nhập khi hàng đã xuất đi                     | Thấp       | Hệ thống chặn và hướng dẫn hủy phiếu xuất liên quan trước                                                     |
| Mất dữ liệu                                            | Cao        | Sao lưu MongoDB định kỳ (trách nhiệm vận hành, xem INTEGRATION.md)                                            |
| Mất mật khẩu quản trị                                  | Trung bình | Quản trị viên khác đặt lại; hoặc chạy lại setup khi chưa có admin nào                                         |
| Điều chỉnh sau kiểm kê chưa có chức năng riêng         | Thấp       | Tạm dùng phiếu “Nhập khác / Xuất khác” kèm ghi chú lý do                                                      |

## 10. Nhật ký quyết định

Các quyết định dưới đây được chốt trong quá trình làm rõ yêu cầu:

| #   | Quyết định                                                      | Hệ quả                                                                                         |
| --- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| D1  | Chỉ 1 kho, 1 đối tác                                            | Không có danh mục kho/đối tác trên phiếu                                                       |
| D2  | Không theo dõi giá trị, lô, hạn dùng                            | Bỏ mọi cột đơn giá, thành tiền                                                                 |
| D3  | Nguyên liệu gồm mọi loại (linh kiện, dây điện...), một cấp      | Loại hàng chỉ có 3 giá trị: nguyên liệu, bán thành phẩm, thành phẩm                            |
| D4  | Bán thành phẩm không lưu kho                                    | Chỉ là cấp trung gian của định mức; phiếu chỉ có nguyên liệu và thành phẩm                     |
| D5  | Thành phẩm sản xuất xong nhập vào kho của hệ thống              | Có phiếu “Nhập thành phẩm”                                                                     |
| D6  | Không làm lệnh sản xuất (đã cân nhắc, thấy phức tạp)            | Đối chiếu định mức theo tháng; để sẵn trường “Mã đợt”                                          |
| D7  | Không cho tồn âm                                                | Kiểm tra ngay trong lệnh cập nhật tồn                                                          |
| D8  | Phiếu đã xác nhận được hủy                                      | Hủy bằng giao dịch đảo, ghi theo ngày hủy                                                      |
| D9  | Danh mục tên loại dùng MATERIAL / SEMI / PRODUCT                | Giá trị lưu trong CSDL; giao diện hiển thị theo ngôn ngữ đã chọn                               |
| D10 | Giao diện đa ngôn ngữ Tiếng Việt / English, mặc định Tiếng Việt | Người dùng chọn ngôn ngữ ở thanh trên; dữ liệu nhập tay (tên mã hàng, ghi chú) không được dịch |

## 11. Lộ trình đề xuất

| Giai đoạn           | Nội dung                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1 (bản này)         | Danh mục, định mức, phiếu nhập/xuất, tồn kho, báo cáo NXT, đối chiếu theo tháng, người dùng                                |
| 2                   | Kiểm kê và điều chỉnh tồn có phiếu riêng; điều chỉnh hàng dở dang trong đối chiếu; nhật ký thao tác cho quản trị; in phiếu |
| 3 (nếu quy mô tăng) | Lệnh sản xuất và đối chiếu theo đợt; nhiều kho; đối tác thứ hai                                                            |

## 12. Phê duyệt

| Vai trò          | Họ tên | Ngày | Chữ ký |
| ---------------- | ------ | ---- | ------ |
| Chủ doanh nghiệp |        |      |        |
| Đại diện kho     |        |      |        |
