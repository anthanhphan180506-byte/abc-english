# Báo cáo xử lý lỗi theo "Báo cáo kiểm tra dự án DT06" (commit 4840749)

Mỗi lỗi B01–B19 đều có ca kiểm thử hồi quy trong `src/lib/tests.js` (mã ca = mã lỗi) trừ các lỗi thuộc lớp giao diện/lưu trữ (B13–B17), đã được kiểm tra thủ công trên trình duyệt.
Chạy `npm test`: **38/38 ca đạt** (23 ca cũ + 15 ca hồi quy mới).

| Mã | Ưu tiên | Trạng thái | Cách xử lý | Vị trí chính |
|---|---|---|---|---|
| B01 | P1 | ✅ Đã sửa | Lớp đợt sau dùng phòng/giáo viên khác lớp đợt này nên không còn trùng khi lớp hiện tại kéo dài qua quý. Nạp dữ liệu có `try/catch`, lỗi seed thì rơi về dữ liệu nền và báo trên màn hình. Ca B01 thử khởi tạo seed cho **cả 365 ngày** năm 2026 | `seed.js`, `store.jsx` |
| B02 | P1 | ✅ Đã sửa | `setSchedule` kiểm tra lịch mới với lịch của **từng học viên đã ghi danh** (kể cả buổi học bù); lỗi thì giữ nguyên lịch cũ | `rules.js` |
| B03 | P1 | ✅ Đã sửa | Đăng ký `Hoàn thành` vẫn thu được nợ (`R.COLLECTIBLE`); trang Học phí, Đăng ký học, Chi tiết lớp và Tổng quan dùng chung một tiêu chí | `rules.js`, `pages.jsx` |
| B04 | P2 | ⚠️ Sửa theo đề xuất, cần giảng viên chốt | Không kết thúc lớp khi chưa học buổi nào; kết thúc sớm (chưa đủ buổi) bắt buộc nhập lý do, lưu vào `finishNote` | `rules.js`, `forms.jsx` (`FinishForm`) |
| B05 | P1 | ✅ Đã sửa | Chỉ điểm danh lớp `Đang học`; lớp `Kết thúc` chỉ Quản lý đào tạo được sửa. Danh sách điểm danh chỉ liệt kê các buổi hợp lệ | `rules.js`, `pages.jsx` |
| B06 | P1 | ✅ Đã sửa | Gộp luật ghi danh vào `R.enrollCheck` dùng chung cho **ghi danh, chuyển lớp, học lại** (học viên hoạt động, lớp mở, còn chỗ, không trùng khóa/đợt, không trùng lịch) | `rules.js` |
| B07 | P1 | ✅ Đã sửa | `R.studentBusy` tính cả các buổi học bù đã duyệt và đang chờ duyệt; áp dụng khi tạo, khi duyệt và khi đổi lịch | `rules.js` |
| B08 | P1 | ✅ Đã sửa | Form học bù chỉ loại các buổi đã xin bù của **chính đăng ký đó** (`R.makeupMissed`) | `rules.js`, `forms.jsx` |
| B09 | P1 | ✅ Đã sửa | Danh sách điểm danh theo lịch sử: giữ người đã có bản ghi dù sau đó chuyển lớp/bảo lưu; học viên chỉ xuất hiện từ ngày ghi danh trở đi | `rules.js` (`R.attendees`) |
| B10 | P2 | ✅ Đã sửa | Số thứ tự mã lớp = lớn nhất đã dùng + 1; sửa lớp không đổi nhóm thì giữ nguyên mã | `rules.js` |
| B11 | P3 | ✅ Đã sửa | Trạng thái "Hết hạn" tính từ ngày (`R.rvStatus`) và được ghi nhận bởi `R.syncExpiry` khi mở ứng dụng, không sửa trong giao dịch bị hủy | `rules.js`, `store.jsx` |
| B12 | P3 | ✅ Đã sửa | Kiểm tra hình thức thu, số hữu hạn, giờ `HH:mm`, ngày hợp lệ, thứ trong tuần 0–6, số buổi nguyên 1–200 | `rules.js` |
| B13 | P2 | ✅ Đã sửa | Kiểm tra đủ mọi bảng khi nạp; dữ liệu hỏng được **sao lưu riêng** (không xóa) rồi nạp lại; có `ErrorBoundary` với nút tải dữ liệu / nạp lại demo; thêm nút Sao lưu và Nạp bản sao lưu (JSON) | `store.jsx`, `App.jsx` |
| B14 | P1 | ✅ Đã sửa | `commit()` trả về thành công/thất bại; lưu lỗi thì **hoàn tác** thao tác và báo lỗi đỏ (hoặc hiện banner "chưa lưu" kèm nút sao lưu nếu không hoàn tác được). Form/`act` chỉ báo thành công khi đã lưu | `store.jsx`, `ui.jsx` |
| B15 | P1 (nhiều tab) | ⚠️ Giảm thiểu | Mỗi lần ghi kiểm tra số phiên bản `meta.rev`: tab nào ghi sau mà dữ liệu đã đổi thì bị từ chối, tải bản mới và báo "hãy thực hiện lại"; đồng thời lắng nghe `storage` để các tab tự đồng bộ. **Chưa phải giải pháp đa người dùng thật** – cần backend/CSDL | `store.jsx` |
| B16 | P2 | ✅ Đã sửa | Trang công khai không còn giả định có khóa học; có thông báo khi danh mục rỗng | `public.jsx` |
| B17 | P2 | ✅ Đã sửa (chọn phương án 2) | Vai trò không có trang Lớp học (kế toán) thấy mã lớp dạng chữ, không còn liên kết dẫn về Tổng quan | `util.js`, `pages.jsx` |
| B18 | P1 | ✅ Đã sửa | CRUD danh mục chuyển vào `R.saveMaster/deleteMaster`: chặn đổi chi nhánh của phòng đang có lịch, đổi mã/cấp độ/số buổi của khóa đã có lớp, đổi mã/thời gian của đợt đã có lớp, đổi mã chi nhánh đã có lớp, chuyển giáo viên còn buổi dạy sang "Nghỉ" | `rules.js`, `master.jsx` |
| B19 | P2 | ✅ Đã sửa | Kiểm tra giá trị **sau khi trim** ở lớp nghiệp vụ: tên/trường bắt buộc, điện thoại, email, ngày, số, danh sách lựa chọn; lỗi chỉ rõ trường và giữ nội dung form | `rules.js` |

Lỗi nhỏ phát sinh khi kiểm tra và đã sửa luôn: form **Tạo lớp** từng chuyển trang trước khi lưu xong (nếu lưu thất bại sẽ mở trang lớp không tồn tại); nay chỉ chuyển sau khi lưu thành công (`onDone`).

## Chưa làm / cần quyết định

- **Các câu hỏi chính sách mục 5 của báo cáo** (tiền khi chuyển lớp sau khi đã học một phần, công thức bảo lưu khi đóng một phần, giữ chỗ học bù khi gửi hay khi duyệt, hủy đăng ký riêng/hoàn tiền, ai sửa điểm danh cũ…): giữ nguyên hành vi hiện tại, chờ giảng viên chốt.
- **Đợt 2–5 của báo cáo** (hủy đăng ký riêng, hoàn tiền/sổ số dư, đổi một buổi học, lọc/phân trang phiếu thu, tách service, backend + CSDL, hồ sơ M1–M4, kiểm thử trình duyệt thật/responsive/bàn phím): chưa thực hiện, là công việc tiếp theo.
- **Đa người dùng thật** (nhiều nhân viên/chi nhánh dùng chung dữ liệu, form tư vấn của khách đến máy nhân viên): cần backend; B15 mới chỉ giảm thiểu rủi ro mất dữ liệu giữa các tab.
- README nay ghi đúng **38 ca** kiểm thử; mã ca hồi quy dùng trực tiếp mã lỗi (B01…B19); mã TC riêng và ma trận truy vết BR→FR→UC→TC vẫn là việc của bộ hồ sơ M2.
