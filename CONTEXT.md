# Variant Chess — ngôn ngữ miền

Từ vựng cho clean rebuild. Luật, trạng thái phê duyệt và chi tiết kỹ thuật nằm trong [gameplay spec](docs/rebuild/GAMEPLAY_SPEC.md).

## Trận và lượt

**Match**: Một trận giữa White và Black, mỗi bên chọn một Variant.

**Turn / ply**: Lượt hành động của một bên. White đi trước rồi hai bên luân phiên.
_Avoid_: dùng “round” để chỉ một lượt của một bên.

**Round**: Một vòng gồm lượt White và lượt Black.

**Main move**: Hành động chính sử dụng quân trong một turn; các loại hành động đặc biệt có thể thay thế bước di chuyển thông thường khi luật cho phép.

**AP**: Tài nguyên riêng của mỗi bên dùng cho kỹ năng Variant.

**Capture**: Hành động bắt quân; có thể đứng yên nếu một luật riêng cho phép.

**Destruction**: Loại quân do skill hoặc effect, khác capture.

**Sacrifice**: Chủ động hiến quân theo một luật riêng.

**Exile**: Tạm đưa quân khỏi bàn, khác chết hoặc bị capture.

## Quân, quyền và effect

**Original side**: Phe của quân khi quân được tạo; không đồng nghĩa quyền hiện tại.

**Owner**: Bên sở hữu hiện tại của quân. Conversion có thể đổi owner.

**Controller**: Bên có quyền sử dụng quân hiện tại. Control có thể đổi controller mà không đổi owner.
_Avoid_: dùng “color” cho cả quyền điều khiển và sở hữu.

**Effect source**: Bên và nguồn đã tạo effect; hoán đổi target không tự đổi nguồn này.

**Effect target**: Quân, ô hoặc bên đang mang effect.

**Variant**: Bộ năng lực của một bên được chọn cho trận.

**Mirror match**: Trận mà hai bên chọn cùng Variant.

**Gameplay rewind**: Kỹ năng Time khôi phục vị trí quân sống theo một thời điểm trước, giữ các thuộc tính khác hiện tại.
_Avoid_: gọi gameplay rewind là rollback toàn state.

**Ghost**: Effect cho phép đi xuyên vật cản theo luật riêng; luật đã chốt cho phép bắt vật cản thứ hai và giữ vật cản thứ nhất.

**Portal pair**: Hai ô Dimension có quan hệ entry/exit trong năng lực Space.
