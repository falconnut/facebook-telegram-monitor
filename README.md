# Facebook → Telegram Monitor (ใช้ฟรีบน GitHub Actions)

โปรเจกต์นี้ตั้งเวลาให้ตรวจโพสต์ใหม่จากเพจ **Golfclub by benz** ทุก 5 นาที แล้วส่งโพสต์ใหม่เข้า Telegram ผ่านบอทของคุณ โดยไม่ต้องเปิด Mac ค้างไว้

> Facebook อาจเปลี่ยนหน้าเว็บหรือบล็อกระบบอัตโนมัติได้ในอนาคต จึงควรตรวจหน้า Actions เป็นครั้งคราว หากงานล้มเหลว ระบบจะเก็บภาพ `facebook-debug` ไว้ช่วยวิเคราะห์ 3 วัน

## 1. สร้าง Repository

1. เข้า <https://github.com/new>
2. สร้าง repository ใหม่ แนะนำให้เลือก **Public** เพื่อไม่ใช้โควตานาทีของ GitHub Actions
3. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ โดยต้องคงโครงสร้าง `.github/workflows/monitor.yml`

## 2. เพิ่ม Secrets

เปิด repository แล้วไปที่ **Settings → Secrets and variables → Actions → New repository secret** จากนั้นสร้างสองรายการ:

| Secret | ค่า |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token แบบเต็มจาก BotFather |
| `TELEGRAM_CHAT_ID` | Chat ID ของผู้รับข้อความ |

ห้ามใส่ Token ลงในไฟล์ โค้ด Issue หรือข้อความ commit

## 3. เปิดสิทธิ์ให้ Workflow บันทึกสถานะ

ไปที่ **Settings → Actions → General → Workflow permissions** แล้วเลือก:

**Read and write permissions**

กด **Save** เพื่อให้ workflow บันทึกรหัสโพสต์ที่ตรวจแล้วกลับเข้า `data/state.json`

## 4. ทดสอบครั้งแรก

1. เปิดแท็บ **Actions**
2. เลือก **Monitor Facebook and notify Telegram**
3. กด **Run workflow**
4. ครั้งแรกจะสร้างข้อมูลตั้งต้นและจะ **ไม่ส่งโพสต์เก่าย้อนหลัง**
5. เปิดผลการทำงานและตรวจว่าขึ้น `Baseline created ...`

หลังจากนั้นระบบจะพยายามตรวจทุก 5 นาที เมื่อพบโพสต์ใหม่จึงส่ง Telegram ทั้งนี้ GitHub อาจหน่วงหรือข้าม Scheduled run บางรอบได้

## 5. ปิดงานเดิมบน Mac

เมื่องาน GitHub ทดสอบผ่านแล้ว ให้หยุดงาน Codex เดิมชื่อ **ติดตามทุกโพสต์ Golfclub by benz** เพื่อป้องกันข้อความซ้ำ

## ทดสอบจากเครื่อง (ไม่จำเป็น)

```bash
npm install
npx playwright install chromium
DRY_RUN=1 npm run monitor
```

โหมด `DRY_RUN=1` จะไม่ส่ง Telegram แต่ยังสร้างข้อมูลตั้งต้นใน `data/state.json`
