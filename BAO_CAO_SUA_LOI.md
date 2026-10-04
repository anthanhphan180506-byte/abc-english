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

## Giai đoạn 2 – tính năng nghiệp vụ còn thiếu (Đợt 2 của báo cáo) và chính sách mặc định

Các câu hỏi chính sách ở mục 5 của báo cáo chưa được giảng viên chốt. Nhóm **chọn mặc định hợp lý**, đưa vào hằng số `CFG` ở `src/lib/rules.js` và ghi rõ là **giả định cần xác nhận** (đổi bằng một dòng):

| # | Câu hỏi của báo cáo | Mặc định đã chọn | Hằng số / vị trí |
|---|---|---|---|
| 1 | Chuyển lớp sau khi đã học một phần: chuyển toàn bộ tiền hay trừ buổi đã học? | **Trừ giá trị buổi đã học**: tiền chuyển = đã đóng − học phí × (số buổi đã học / tổng số buổi), tối thiểu 0 | `R.refundable`, `R.X.transfer` |
| 2 | Bảo lưu khi mới đóng một phần: công thức nào? | Cùng công thức mục 1 (ví dụ phí 3,6 triệu, đóng 1,8 triệu, học 12/24 buổi → giữ lại 0 ₫; đóng đủ thì giữ lại 1,8 triệu) | `R.X.reserve` |
| 3 | Học viên được đóng nợ sau khi hoàn thành không? | **Có** (đã làm ở B03) | `R.COLLECTIBLE` |
| 4 | Hủy đăng ký riêng, hoàn tiền: ai có quyền, phí phạt, duyệt, lịch sử? | Nhân viên ghi danh/quản lý **tạo yêu cầu "Hủy đăng ký"**, **Quản lý duyệt**; tiền hoàn = công thức mục 1, vào **số dư học viên**; kế toán **hoàn tiền mặt/chuyển khoản** từ số dư; không có phí phạt riêng. Mọi biến động ghi vào **sổ số dư** | `R.V/X.cancel`, `R.refundBalance`, `R._balance` |
| 5 | Học bù giữ chỗ lúc gửi hay lúc duyệt? | **Lúc gửi** (yêu cầu đang chờ cũng chiếm chỗ và lịch của học viên) | `R.V.makeup` |
| 6 | Ai sửa điểm danh cũ? | Giáo viên sửa trong **7 ngày**; sau đó **chỉ Quản lý** và **bắt buộc ghi lý do**; mọi lần đổi trạng thái lưu lịch sử | `CFG.attendanceEditDays`, `R.markAttendance` |
| 7 | Học viên bảo lưu có tiếp tục buổi bù đã duyệt? | **Không**: bảo lưu/chuyển lớp/hủy đăng ký thì các yêu cầu học bù còn hiệu lực tự hủy | `R._dropMakeups` |
| 8 | Đợt đào tạo bắt buộc đúng quý hay linh hoạt? Lớp có kết thúc ở quý sau được không? | Đợt phải kéo dài **đúng 3 tháng** (bắt đầu ngày nào cũng được); lớp mở trong đợt **được phép** kết thúc ở đợt sau | `CFG.termMonths`, `R.saveMaster` |
| 9 | Thời hạn giữ chỗ cho đăng ký "Chờ đóng phí" | **7 ngày** cho lớp chưa khai giảng; quá hạn tự hủy và hoàn tiền đã đóng (nếu có) vào số dư. Lớp đang học không áp dụng | `CFG.holdDays`, `R.expireHolds` |
| 10 | Điều kiện kết thúc lớp | Đã học ≥ 1 buổi; chưa đủ buổi thì cần lý do (đã làm ở B04) | `R.finishClass` |

Tính năng mới (đều có ca kiểm thử):

| Tính năng | Nơi dùng |
|---|---|
| **Hủy đăng ký riêng** (yêu cầu + duyệt, hoàn vào số dư) | Đăng ký học → nút *Hủy đăng ký*; Yêu cầu |
| **Sổ số dư có lịch sử** và **Hoàn tiền** | Hồ sơ học viên (bảng *Sổ số dư*); Học phí → *Học viên còn số dư* |
| **Hủy phiếu thu** (không xóa, lưu lý do/người hủy; trả số dư; đăng ký quay về *Chờ đóng phí* nếu dưới 50%) | Học phí → nút *Hủy phiếu* |
| **Đổi một buổi học** (ngày/giờ/phòng/giáo viên thay thế) kiểm tra lại giáo viên, phòng, học viên, học viên học bù; lưu lịch sử | Chi tiết lớp → *Đổi buổi* |
| **Giữ chỗ hết hạn** tự động | Khi mở ứng dụng / đăng nhập |
| **Phân trang và lọc** phiếu thu (tìm, theo ngày, ẩn/hiện phiếu hủy); **lọc điểm danh theo khoảng ngày** | Học phí; Điểm danh |
| **Báo cáo** lọc theo đợt và khoảng ngày; phân biệt *số đăng ký* và *học viên không trùng*; số tiền đã hoàn; **xuất CSV** | Báo cáo |
| **Nhật ký thao tác**: ai, lúc nào, làm gì, giá trị trước → sau (500 mục gần nhất) | Menu *Nhật ký* (Quản lý) |

Bộ kiểm thử nay là **51 ca** (38 + 13 ca cho các tính năng và chính sách trên; mã ca `POL-*`, `LEDGER`, `VOID`, `RESCHED`, `HOLD`, `ATT-EDIT`, `TERM`, `AUDIT`).

## Chưa làm

- **Backend / CSDL dùng chung** cho nhiều nhân viên và chi nhánh, xác thực máy chủ, mật khẩu băm, form tư vấn của khách đến máy nhân viên (Đợt 3): dữ liệu vẫn lưu trong trình duyệt. B15 chỉ ở mức giảm thiểu.
- **Hồ sơ học phần M1–M4** (biên bản phỏng vấn, use case, UML, ma trận truy vết, Test Plan, nhật ký nhóm) và **kiểm thử trình duyệt thật** (responsive, bàn phím, in ấn) (Đợt 4–5).
- Các mặc định ở bảng trên **vẫn cần giảng viên xác nhận**; nếu giảng viên chọn khác, chỉ cần đổi hằng số hoặc một hàm nhỏ tương ứng.
