# PRD: Quản lý kho

|                    |                                |
| ------------------ | ------------------------------ |
| Phiên bản          | 1.0                            |
| Ngày               | 06/11/2026                     |
| Tài liệu liên quan | BRD.md, SRS.md, INTEGRATION.md |

## 1. Mục đích

Mô tả sản phẩm từ góc nhìn người dùng: ai dùng, làm gì, màn hình nào, luồng nào, thế nào là xong. Đặc tả kỹ thuật chi tiết nằm ở SRS.md.

## 2. Người dùng và vai trò

| Vai trò                 | Nhu cầu chính                                            | Quyền (tóm tắt)                                                                 |
| ----------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| _Thủ kho_ (STOREKEEPER) | Lập nhanh phiếu nhập/xuất, xác nhận, xem tồn             | Lập, sửa nháp, xác nhận phiếu; xem danh mục, định mức, báo cáo. Không hủy phiếu |
| _Quản lý_ (MANAGER)     | Quản lý danh mục và định mức, hủy phiếu sai, xem báo cáo | Tất cả của thủ kho + sửa danh mục, soạn/kích hoạt định mức, hủy phiếu           |
| _Quản trị viên_ (ADMIN) | Cấp tài khoản                                            | Tất cả của quản lý + quản lý người dùng                                         |
| _Chỉ xem_ (VIEWER)      | Xem tồn và báo cáo                                       | Chỉ đọc                                                                         |

Ma trận quyền đầy đủ: SRS.md, mục 7.

## 3. Nguyên tắc sản phẩm

1. _Ít gõ, ít sai._ Điền phiếu xuất theo định mức, dán từ Excel, chọn mã bằng ô tìm kiếm.
2. _Ghi sổ có chủ đích._ Phiếu nháp thoải mái chỉnh; xác nhận mới ghi sổ và không sửa lại được.
3. _Không bao giờ mất dấu vết._ Hủy = ghi đảo, không xóa.
4. _Chặn sai từ gốc._ Không xuất âm kho; không tham chiếu vòng trong định mức; không đổi đơn vị của mã đã dùng.
5. _Đơn giản trước._ Công ty nhỏ, một kho, một đối tác: không có tính năng cho quy mô lớn hơn.
6. _Hai ngôn ngữ._ Mọi chữ trên giao diện và thông báo lỗi có cả Tiếng Việt và English; dữ liệu người dùng tự nhập không bị dịch.

## 4. Epic và user story

Ưu tiên: _P1_ = có trong bản này; _P2_ = giai đoạn sau.

### E1. Đăng nhập và tài khoản

| Mã     | Câu chuyện                                                                           | Ưu tiên |
| ------ | ------------------------------------------------------------------------------------ | ------- |
| US-1.1 | Là người dùng, tôi đăng nhập bằng tên đăng nhập và mật khẩu để dùng hệ thống         | P1      |
| US-1.2 | Là người dùng, tôi tự đổi mật khẩu của mình                                          | P1      |
| US-1.3 | Là quản trị viên, tôi tạo tài khoản, đổi vai trò, khóa tài khoản và đặt lại mật khẩu | P1      |
| US-1.4 | Là quản trị viên, tôi muốn tài khoản bị khóa tạm khi nhập sai mật khẩu nhiều lần     | P1      |

### E2. Danh mục mã hàng

| Mã     | Câu chuyện                                                                                  | Ưu tiên |
| ------ | ------------------------------------------------------------------------------------------- | ------- |
| US-2.1 | Là quản lý, tôi thêm/sửa mã hàng với loại, đơn vị, số chữ số lẻ, tồn tối thiểu              | P1      |
| US-2.2 | Là quản lý, tôi đánh dấu vật tư tiêu hao nhỏ (keo, thiếc hàn) là “không đối chiếu”          | P1      |
| US-2.3 | Là quản lý, tôi ngừng sử dụng mã không còn dùng mà không mất dữ liệu cũ                     | P1      |
| US-2.4 | Là quản lý, tôi muốn xem một nguyên liệu đang nằm trong định mức nào trước khi đổi/ngừng nó | P1      |

### E3. Định mức (BOM)

| Mã     | Câu chuyện                                                                                  | Ưu tiên |
| ------ | ------------------------------------------------------------------------------------------- | ------- |
| US-3.1 | Là quản lý, tôi lập định mức nhiều cấp: thành phẩm gồm bán thành phẩm và nguyên liệu        | P1      |
| US-3.2 | Là quản lý, tôi khai báo hao hụt cho phép trên từng dòng                                    | P1      |
| US-3.3 | Là quản lý, tôi dán danh sách thành phần từ Excel                                           | P1      |
| US-3.4 | Là quản lý, tôi xem định mức dưới dạng cây và xem tổng nhu cầu nguyên liệu cho N thành phẩm | P1      |
| US-3.5 | Là quản lý, khi đổi định mức tôi tạo phiên bản mới, bản cũ vẫn giữ nguyên                   | P1      |
| US-3.6 | Là quản lý, tôi được hệ thống chặn nếu định mức tham chiếu vòng                             | P1      |

### E4. Phiếu nhập / xuất

| Mã      | Câu chuyện                                                                                                                                          | Ưu tiên |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| US-4.1  | Là thủ kho, tôi lập phiếu nhập nguyên liệu khi đối tác giao hàng                                                                                    | P1      |
| US-4.2  | Là thủ kho, tôi lập phiếu nhập thành phẩm khi sản xuất xong                                                                                         | P1      |
| US-4.3  | Là thủ kho, tôi lập phiếu xuất sản xuất bằng cách chọn thành phẩm và số lượng để hệ thống tự điền nguyên liệu theo định mức, rồi chỉnh số thực xuất | P1      |
| US-4.4  | Là thủ kho, tôi lập phiếu xuất giao đối tác cho thành phẩm                                                                                          | P1      |
| US-4.5  | Là thủ kho, tôi lưu nháp, sửa và chỉ xác nhận khi chắc chắn                                                                                         | P1      |
| US-4.6  | Là thủ kho, tôi được báo rõ mã nào thiếu hàng khi xuất vượt tồn                                                                                     | P1      |
| US-4.7  | Là quản lý, tôi hủy phiếu đã xác nhận kèm lý do; tồn kho được hoàn lại và lịch sử còn nguyên                                                        | P1      |
| US-4.8  | Là thủ kho, tôi ghi “Mã đợt” tự do trên phiếu để sau này truy theo đợt sản xuất                                                                     | P1      |
| US-4.9  | Là thủ kho, tôi lập phiếu nhập/xuất khác để xử lý trả hàng, hàng lỗi, điều chỉnh                                                                    | P1      |
| US-4.10 | Là thủ kho, tôi in phiếu                                                                                                                            | P2      |

### E5. Tồn kho và báo cáo

| Mã     | Câu chuyện                                                                                | Ưu tiên |
| ------ | ----------------------------------------------------------------------------------------- | ------- |
| US-5.1 | Là người dùng, tôi xem tồn hiện tại và lọc theo loại; mã dưới mức tối thiểu được cảnh báo | P1      |
| US-5.2 | Là người dùng, tôi xem thẻ kho của một mã (tồn đầu kỳ, từng phát sinh, số dư chạy)        | P1      |
| US-5.3 | Là quản lý, tôi xem báo cáo Nhập - Xuất - Tồn theo khoảng ngày                            | P1      |
| US-5.4 | Là quản lý, tôi xem đối chiếu định mức theo tháng để phát hiện mã xuất vượt               | P1      |
| US-5.5 | Là quản lý, tôi xuất các báo cáo ra CSV mở được bằng Excel                                | P1      |
| US-5.6 | Là quản lý, tôi điều chỉnh hàng dở dang cuối tháng trên báo cáo đối chiếu                 | P2      |
| US-5.7 | Là thủ kho, tôi kiểm kê và điều chỉnh tồn bằng phiếu kiểm kê riêng                        | P2      |

### E6. Đa ngôn ngữ

| Mã     | Câu chuyện                                                                                                                                     | Ưu tiên |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| US-6.1 | Là người dùng, tôi chuyển giữa Tiếng Việt và English bằng nút ngôn ngữ ở thanh trên (và ở trang đăng nhập); lựa chọn được nhớ trên trình duyệt | P1      |
| US-6.2 | Là người dùng, tôi thấy số và ngày theo thói quen của ngôn ngữ đã chọn (1.234,5 và 06/11/2026 so với 1,234.5 và 06/11/2026)                    | P1      |
| US-6.3 | Là người dùng, tôi nhận thông báo lỗi bằng ngôn ngữ đã chọn (ví dụ “Không đủ tồn kho (R1)” hoặc “Not enough stock (R1)“)                       | P1      |
| US-6.4 | Là người dùng, ngôn ngữ của tôi được lưu theo tài khoản và theo mọi trình duyệt tôi dùng                                                       | P2      |

## 5. Màn hình

| #   | Màn hình                            | Đường dẫn                                | Quyền xem     | Hành động chính                                                       |
| --- | ----------------------------------- | ---------------------------------------- | ------------- | --------------------------------------------------------------------- |
| 1   | Đăng nhập                           | /login                                   | Công khai     | Đăng nhập                                                             |
| 2   | Tồn kho                             | /dashboard/stock                         | Mọi vai trò   | Lọc, tìm, cảnh báo, mở thẻ kho, xuất CSV                              |
| 3   | Thẻ kho (ngăn kéo trên màn Tồn kho) |                                          | Mọi vai trò   | Chọn khoảng ngày, xuất CSV                                            |
| 4   | Phiếu nhập                          | /dashboard/vouchers/import               | Mọi vai trò   | Lọc, tạo, mở ngăn kéo phiếu                                           |
| 5   | Phiếu xuất                          | /dashboard/vouchers/export               | Mọi vai trò   | Như trên, kèm “Điền theo định mức”                                    |
| 6   | Mã hàng                             | /dashboard/items                         | Mọi vai trò   | Thêm, sửa, ngừng/dùng lại, xem “dùng ở định mức nào”                  |
| 7   | Danh sách định mức                  | /dashboard/boms                          | Mọi vai trò   | Lọc theo trạng thái, tạo định mức                                     |
| 8   | Chi tiết định mức                   | /dashboard/boms/[id]                     | Mọi vai trò   | Sửa dòng (nháp), lưu, kích hoạt, tạo phiên bản mới, cây, tổng nhu cầu |
| 9   | Báo cáo Nhập - Xuất - Tồn           | /dashboard/reports/movement              | Mọi vai trò   | Chọn khoảng ngày, xuất CSV                                            |
| 10  | Đối chiếu định mức                  | /dashboard/reports/reconciliation        | Mọi vai trò   | Chọn tháng, dung sai, xuất CSV                                        |
| 11  | Người dùng                          | /dashboard/admin/users                   | Quản trị viên | Thêm, đổi vai trò/khóa, đặt lại mật khẩu                              |
| 12  | Tài khoản                           | /dashboard/account                       | Mọi vai trò   | Đổi mật khẩu                                                          |
| 13  | Nút chọn ngôn ngữ                   | Thanh trên mọi trang, và trang đăng nhập | Mọi người     | Chuyển Tiếng Việt / English                                           |

Phiếu nhập/xuất tạo và sửa trong _ngăn kéo rộng_ (không sang trang khác) vì phiếu có nhiều dòng; thao tác bảng không bị chật.

## 6. Luồng chính

### 6.1 Nhập nguyên liệu

1. Thủ kho vào _Phiếu nhập → Tạo phiếu_, loại “Nhập nguyên liệu”.
2. Thêm dòng: chọn mã, nhập số lượng (hoặc _Dán từ Excel_).
3. _Lưu nháp_ (tùy chọn) hoặc _Xác nhận_.
4. Hệ thống cấp số PN-YYYY-00001, cộng tồn, ghi giao dịch kho.

### 6.2 Xuất cho sản xuất theo định mức

1. _Phiếu xuất → Tạo phiếu_, loại “Xuất sản xuất”.
2. Ở khung “Điền theo định mức”: chọn thành phẩm, nhập số lượng, bấm nút.
3. Hệ thống khai triển định mức đa cấp, gộp nguyên liệu trùng, điền các dòng (làm tròn lên theo số lẻ của mã) và lưu sẵn cột _Định mức_.
4. Thủ kho chỉnh số thực xuất nếu khác. Dòng vượt định mức được đánh dấu cảnh báo (không chặn).
5. _Xác nhận._ Nếu thiếu hàng, hệ thống báo mã nào thiếu và không ghi gì.

### 6.3 Nhập thành phẩm và xuất giao đối tác

Tương tự 6.1 với loại “Nhập thành phẩm” (khi sản xuất xong) và “Xuất giao đối tác” (khi giao hàng, không cho vượt tồn).

### 6.4 Hủy phiếu

1. Quản lý mở phiếu đã xác nhận → _Hủy phiếu_, nhập lý do (bắt buộc).
2. Hệ thống ghi giao dịch đảo theo ngày hủy; phiếu chuyển “Đã hủy”.
3. Nếu hủy phiếu nhập mà hàng đã xuất đi, hệ thống chặn và yêu cầu hủy phiếu xuất liên quan trước.

### 6.5 Thay đổi định mức

1. Mở định mức đang áp dụng → _Tạo phiên bản mới_ (tạo bản nháp sao chép).
2. Sửa thành phần, _Lưu_.
3. Xem _Cây khai triển_ để kiểm tra, _Kích hoạt_. Hệ thống kiểm tra vòng lặp; bản cũ chuyển “Đã thay thế”.

### 6.6 Đối chiếu cuối tháng

1. Quản lý vào _Đối chiếu định mức_, chọn tháng.
2. Xem các dòng _Vượt định mức_ / _Không có định mức_ trước; xuất CSV nếu cần.
3. Điều tra nguyên nhân (hao hụt thật, xuất bù, định mức sai, hàng dở dang) và, nếu định mức sai, tạo phiên bản mới.

## 7. Tiêu chí chấp nhận cấp sản phẩm

- Không có đường nào đưa tồn kho xuống âm (kể cả khi hai người xác nhận cùng lúc).
- Sau khi xác nhận, phiếu không sửa được; sau khi hủy, tồn kho trở về đúng giá trị trước đó và lịch sử còn đủ hai bút toán.
- “Điền theo định mức” cho ra đúng tổng nhu cầu qua nhiều cấp, kể cả nguyên liệu xuất hiện ở nhiều nhánh.
- Định mức tham chiếu vòng không kích hoạt được.
- Người dùng chỉ thấy và làm được những gì vai trò cho phép; thao tác trái quyền bị từ chối ở máy chủ, không chỉ ẩn ở giao diện.
- Mọi báo cáo xuất được CSV mở đúng tiếng Việt trong Excel.
- Chuyển sang English thì không còn chữ Tiếng Việt nào trên giao diện (kể cả menu, tiêu đề tab, thông báo lỗi); chuyển về Tiếng Việt thì ngược lại.

Các tiêu chí trên được kiểm thử tự động ở mức dịch vụ (xem SRS.md, mục 11).

## 8. Chỉ số theo dõi sau triển khai (đề xuất)

| Chỉ số                                              | Ý nghĩa                                                 |
| --------------------------------------------------- | ------------------------------------------------------- |
| Tỷ lệ phiếu bị hủy / tổng phiếu xác nhận            | Chất lượng nhập liệu                                    |
| Tỷ lệ phiếu xuất sản xuất dùng “Điền theo định mức” | Mức độ dùng định mức                                    |
| Số mã “Vượt định mức” mỗi tháng và xu hướng         | Hao hụt, chất lượng định mức                            |
| Số lần xuất bị chặn vì thiếu tồn                    | Chênh lệch giữa tồn hệ thống và thực tế, hoặc nhập chậm |

## 9. Câu hỏi mở

1. Ngưỡng dung sai chung cho đối chiếu (hiện mặc định 2%) có phù hợp? Có cần ngưỡng khác nhau theo nhóm vật tư?
2. Có cần hạn chế sửa ngày chứng từ lùi quá N ngày không?
3. Có cần in phiếu theo mẫu của công ty không (P2)?
4. Quy trình kiểm kê: tần suất và ai chịu trách nhiệm (P2)?
5. Sao lưu: tần suất và nơi lưu?
6. Có cần lưu ngôn ngữ theo tài khoản thay vì theo trình duyệt (P2) không? Có cần thêm ngôn ngữ thứ ba không?
