# NAK FARM ACCOUNT

ไฟล์นี้รวมระบบเดิม + Supabase Login + Role Admin/User/Viewer + QR พร้อมเพย์

## ไฟล์
- index.html — เว็บหลัก
- promptpay-qr.png — QR พร้อมเพย์จากรูปที่ให้มา
- supabase_setup.sql — สร้าง profiles/trigger และ helper สำหรับสิทธิ์
- supabase/functions/admin-user-management/index.ts — Edge Function สำหรับ Admin เพิ่ม/ลบ/ปิดผู้ใช้/ตั้งรหัสผ่าน

## สำคัญ
Publishable key อยู่ใน index.html ได้ แต่ห้ามใส่ service role key ในเว็บ

## ขั้นตอน Supabase
1. SQL Editor: รัน supabase_setup.sql
2. Authentication > Users: สร้างบัญชีเจ้าของระบบ 1 บัญชี
3. เอา UID บัญชีเจ้าของระบบไปตั้ง role=admin ใน profiles ตาม SQL
4. Deploy Edge Function admin-user-management และให้ฟังก์ชันมี SUPABASE_SERVICE_ROLE_KEY เป็น secret
5. เอา index.html และ promptpay-qr.png ไว้โฟลเดอร์เดียวกัน
