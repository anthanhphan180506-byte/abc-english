# Trung tâm tiếng Anh ABC – Quản lý đào tạo (DT06)

React 19 + Vite + Tailwind CSS 4. Dữ liệu demo lưu trong localStorage của trình duyệt.

## Chạy
```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 51 ca kiểm thử luật nghiệp vụ (không cần trình duyệt)
npm run build    # xuất bản vào dist/
```

## Tài khoản (mật khẩu 123456)
quanly (Quản lý đào tạo) · ghidanh (Ghi danh) · ketoan (Kế toán) · gv1, gv2 (Giáo viên)

## Cấu trúc
- `src/lib/rules.js` – toàn bộ luật nghiệp vụ và phân quyền (không phụ thuộc React); `seed.js` dữ liệu demo; `tests.js` ca kiểm thử (chạy bằng `npm test`)
- `src/store.jsx` – context giữ CSDL, người dùng, toast, hộp thoại
- `src/ui.jsx` – thành phần giao diện dùng chung (Tailwind)
- `src/forms.jsx` – các hộp thoại nghiệp vụ; `src/pages/` – các trang

## Giả định cần giảng viên xác nhận (sửa trong `CFG` ở `src/lib/rules.js`)
Sĩ số 10–20; đóng ≥ 50% học phí mới xác nhận chỗ; bảo lưu khi đã học ≤ 50% số buổi, hạn 3 tháng; chuyển lớp chỉ giữa các khóa cùng cấp độ (lệch phí: đắt hơn đóng thêm, rẻ hơn cộng số dư); tiền giữ lại khi rời lớp giữa chừng = đã đóng − giá trị buổi đã học; giữ chỗ 7 ngày; sửa điểm danh cũ >7 ngày chỉ quản lý; học bù tối đa 2 buổi/đăng ký ở lớp khác cùng khóa; chỉ Quản lý đào tạo được duyệt.

Bản demo không có máy chủ: mật khẩu và dữ liệu nằm ở trình duyệt, chỉ dùng để minh họa.

## Tài liệu khác
- `HUONG_DAN_CODE.md/.pdf` – hướng dẫn code và luồng chạy
- `BAO_CAO_SUA_LOI.md` – bảng xử lý các lỗi B01–B19 từ báo cáo kiểm tra
