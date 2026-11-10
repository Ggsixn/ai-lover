# AI Lover — 成人 AI 陪聊 Web Prototype

此專案包含可運行的前端與 Node.js/Express 後端：
- 18+ 年齡確認、帳號註冊/登入（bcrypt 密碼雜湊、JWT）
- 角色列表與切換、聊天訊息、伺服器端 JSON 聊天紀錄
- 無 API Key 時使用示範回覆；設定 OpenAI API Key 後可切換即時 AI 對話
- 手機/桌面響應式深色粉紅 UI

## 啟動
1. 安裝 Node.js 20 或更新版本。
2. 在此資料夾執行 `npm install`
3. 複製 `.env.example` 為 `.env`，並設定 `JWT_SECRET`（必須換成隨機長字串）。
4. 執行 `npm start`
5. 瀏覽器開啟 `http://localhost:3000`

## 啟用 AI 回覆
在 `.env` 填入你自己的 `OPENAI_API_KEY`，以及可用的 `OPENAI_MODEL`，重啟服務。API Key 僅放在伺服器環境變數，不要放到前端。API 使用量會由該金鑰帳戶計費。

## 上線前必做
- 使用 HTTPS、正式資料庫（例如 PostgreSQL）、安全的秘密管理
- 加入速率限制、登入防暴力、帳號刪除/資料匯出、隱私政策與服務條款
- 依法完成年齡驗證；單純勾選18+不等於可靠的年齡驗證
- 加強內容安全、濫用檢舉與資料保存規則
- 設定備份、監控與部署流程

本專案是可執行的原型，不包含代替使用者建立雲端帳號、付費 API 金鑰或自動部署到公開網域。
