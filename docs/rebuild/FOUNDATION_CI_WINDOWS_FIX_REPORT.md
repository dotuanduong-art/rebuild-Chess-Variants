# Foundation CI — Windows line endings

Ngày kiểm chứng: 2026-10-14 (Asia/Saigon).

## Phạm vi và nguyên nhân

Chỉ sửa chính sách checkout/formatting. Không đổi gameplay, architecture, dependencies,
scripts, workflow hoặc các bước kiểm tra CI. Không commit/push.

Ảnh log do người dùng cung cấp cho thấy Ubuntu PASS, Windows thất bại trong
`npm run lint` → `npm run format:check`, báo 81 files. Các bước sau lint bị skip.

Đã kiểm tra `.prettierrc.json`, `.prettierignore`, `.editorconfig`, root `package.json`
và `.github/workflows/ci.yml`:

- Prettier yêu cầu `endOfLine: "lf"`; EditorConfig cũng yêu cầu LF.
- `format:check` chạy `prettier --check .`; `format` chạy `prettier --write .`.
- `lint` giữ ESLint zero warnings, dependency boundaries và Prettier check.
- CI dùng cùng workflow, locked install, Node và scripts cho hai OS.
- Repo ban đầu không có `.gitattributes`; source/tooling trong index là LF.
- Git Windows trên máy kiểm chứng có `core.autocrlf=true` từ system config.

Tái hiện bằng checkout-index vào thư mục tạm riêng, không sửa index/source:

```powershell
git -c core.autocrlf=true checkout-index --all --prefix=D:/restart/node_modules/.cache/foundation-ci-before/
```

Chạy Prettier CLI đã cài từ workspace trong thư mục checkout này tái hiện chính xác
`Code style issues found in 81 files`. Kiểm tra qua Prettier API với cùng config
và ignore rules cho thấy 81/81 files dùng CRLF; chỉ thay CRLF thành LF trong bộ nhớ
thì cả 81 đạt check, không có khác biệt formatting khác.

Nguyên nhân: Git checkout chuyển LF thành CRLF trên Windows, mâu thuẫn với chính
sách LF của Prettier. EditorConfig/Prettier không điều khiển Git checkout.
Nguồn chính thức: [Prettier endOfLine](https://prettier.io/docs/options#end-of-line),
[Git text/eol attributes](https://git-scm.com/docs/gitattributes).

## Deliverables

- Thêm `.gitattributes`: `text=auto eol=lf` cho root files, `.github/`, `apps/`,
  `packages/`, `scripts/`, `tests/` và `docs/rebuild/`.
- Các đường dẫn legacy `reference/old-project/` và docs ngoài `docs/rebuild/`
  không nhận chính sách mới; đã kiểm bằng `git check-attr`.
- Thêm báo cáo này.
- `npm run format` đã chạy theo cấu hình hiện có: toàn bộ 81 files unchanged.
  Không cần diff nội dung source vì source trong index đã chuẩn LF.
- Không thay `.prettierrc.json`, `.prettierignore`, `package.json`, lockfile hay
  `.github/workflows/ci.yml`; không tắt/bỏ qua/nới lỏng checks.

## Kết quả kiểm chứng

Môi trường: Windows, Node v24.14.0, npm 11.9.0, Prettier 3.9.10; dependencies
hiện có, không chạy lại `npm ci` hoặc thay lockfile.

| Check | Kết quả |
| --- | --- |
| Trước sửa: checkout `core.autocrlf=true` + Prettier | FAIL, đúng 81 files |
| Sau sửa: checkout `core.autocrlf=true` + Prettier | PASS |
| Sau sửa: checkout `core.autocrlf=false` + Prettier | PASS |
| `npm run format` | PASS, 81 files unchanged |
| `npm run lint` (gồm `format:check`, boundaries) | PASS |
| `npm run typecheck` | PASS, tooling và cả 6 workspaces |
| `npm test` | PASS, 19 test files / 213 tests |
| `npm run build` | PASS, packages, backend, frontend |
| `npm run smoke:exports` | PASS, ESM/CJS và private paths |
| `npm run smoke:runtime` | PASS, backend health và frontend HTTP 200 |
| `npm run check:hygiene` | PASS |
| `npm audit --audit-level=high` | PASS, 0 vulnerabilities |
| `git diff --exit-code` sau build | PASS, tracked source không bị build sửa |
| `git diff --check` | PASS |

Hai checkout sau sửa dùng chính `.gitattributes` mới trong working tree; Git
checkout-index áp dụng attributes này dù file chưa được stage. Prettier CLI chạy
trong mỗi checkout với bản config/ignore của checkout, dùng cùng binary đã cài.
Đây là regression probe cho đường lỗi thực tế; CI Prettier check hiện có tiếp tục
kiểm tra chính lỗi này trên fresh checkout, không cần thêm test gameplay.

Audit ban đầu bị sandbox chặn DNS (`ENOTFOUND`); runtime smoke bị sandbox chặn
HTTP loopback (`EACCES`). Cả hai đã được chạy lại ngoài sandbox và PASS, không
sửa scripts để né lỗi.

## Giới hạn và bước tiếp theo

Chưa chạy toàn bộ workflow trên Ubuntu hoặc GitHub-hosted runners. Checkout
`core.autocrlf=false` chỉ kiểm chứng đường LF tương ứng Linux, không thay thế
Typecheck/Tests/Build trên Linux. Ubuntu PASS trước sửa là thông tin từ ảnh của
người dùng, không phải một lần chạy mới của phiên này.

Không tạo commit/push và không dispatch workflow; do đó chưa thể tuyên bố hai
GitHub jobs đã PASS cho bản sửa. Sau khi chủ dự án commit/push cả `.gitattributes`
và báo cáo, cần xác nhận lại hai jobs của Foundation CI. Không có lỗi local còn
tồn tại trong các checks đã chạy.
