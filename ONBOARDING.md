# 新手上路指南(完全不會用 Git 也沒關係)

這份文件是寫給**第一次碰這個 repo、不知道 Git/GitHub 在幹嘛**的隊友看的。

如果你已經會用 Git,可以直接跳去看 [CONTRIBUTING.md](CONTRIBUTING.md) — 那份寫得更完整,包含欄位規則、review 流程等細節。這份文件只負責把你從「完全不會」帶到「能夠自己改資料、推上去」。

---

## 這份清單在幹嘛

四個人一起維護一份 ISO 稽核員培訓課程清單,網頁在這裡:
https://robinaudi.github.io/iso-cert-radar/

資料放在 `data/courses.json`,平常維護只需要改這一個檔案。

---

## 你需要先裝好三樣東西(只需要做一次)

1. **GitHub 帳號** — 沒有的話先去 https://github.com/signup 申請一個。
2. **Git** — 下載安裝:https://git-scm.com/downloads
   裝完之後,打開「Git Bash」(裝好會自動出現在開始選單),之後的指令都在這裡打。
3. **Node.js** — 下載安裝:https://nodejs.org (選 LTS 版本)
   這是用來跑「資料格式檢查」跟「本機預覽網頁」的工具。

装完後,在 Git Bash 打這兩行確認有裝成功:

```bash
git --version
node --version
```

有印出版本號(例如 `git version 2.xx`、`v22.xx.xx`)就是成功了。

> ⚠️ **不要以為 Windows 內建的 `python3` 可以用。** 它其實是 Microsoft Store 的空殼指令,點下去只會跳出商店,不是真的 Python。這個 repo 已經改用 Node 寫的 `scripts/dev-server.mjs` 來預覽網頁,不需要裝 Python。

---

## 第一次設定(只需要做一次)

### 1. Fork 這個 repo 到你自己的帳號

打開 https://github.com/robinaudi/iso-cert-radar ,按右上角的 **Fork** 按鈕,選你自己的帳號。

這樣你自己的 GitHub 底下就會有一份一模一樣的副本,你可以隨便改,不會動到原本大家共用的版本。

### 2. Clone 到你的電腦

在 Git Bash 裡(`你的帳號` 換成你剛剛 fork 到的帳號名稱):

```bash
git clone https://github.com/你的帳號/iso-cert-radar.git
cd iso-cert-radar
```

### 3. 把原始 repo 加成第二個來源(之後同步用)

```bash
git remote add upstream https://github.com/robinaudi/iso-cert-radar.git
```

打 `git remote -v` 應該會看到兩個:
- `origin` → 你自己的 fork(你有權限 push)
- `upstream` → 原始共用 repo(你沒有直接 push 權限,要透過 PR)

---

## 每次要改資料,照這個 SOP 走

### Step 1:先把最新版拉下來

```bash
git checkout main
git pull upstream main
git push origin main
```

這三行的意思是:切回主分支 → 從原始 repo 拉最新的 → 同步更新到你自己的 fork。**每次開始改東西之前都先做這一步**,避免你改的東西是舊版本。

### Step 2:開一條新分支

```bash
git checkout -b add/課程簡稱
```

例如新增一筆 SGS 12 月的課,分支名可以叫 `add/sgs-27001-1215`。**不要直接在 main 上改。**

### Step 3:用文字編輯器打開 `data/courses.json`,照格式加一筆或改一筆

建議裝 [VS Code](https://code.visualstudio.com/) 來編輯,對 JSON 格式有顏色提示,比較不容易漏打逗號。

每個欄位是什麼意思、必填選填、怎麼判斷 `cert` 等級,詳細規則看 [CONTRIBUTING.md](CONTRIBUTING.md) 的「每筆課程的欄位」那一節。

### Step 4:本機檢查格式有沒有錯

```bash
node scripts/validate.mjs
```

看到 `✓ 檢查通過` 才算過關。如果報錯,它會直接告訴你第幾筆、哪個欄位、怎麼修。

### Step 5:想看看網頁長怎樣,可以在本機預覽

```bash
node scripts/dev-server.mjs
```

然後瀏覽器打開 http://localhost:8000 。按 `Ctrl+C` 可以關掉伺服器。

### Step 6:存檔、推上去

```bash
git add data/courses.json
git commit -m "新增 SGS 12/15 27001 內稽班"
git push -u origin add/sgs-27001-1215
```

推完之後,終端機會印出一個網址,點進去(或直接去你的 fork 頁面)按 **Compare & pull request**。

### Step 7:開 PR,等審核

在開 PR 的頁面,確認:
- 目標是 `robinaudi/iso-cert-radar` 的 `main`(不是你自己 fork 的 main)
- 標題寫清楚這筆 PR 在做什麼
- 按 **Create pull request**

接著等頁面下方出現 ✅ 綠勾(代表機器自動檢查過關),再找一位隊友幫你 review、按 approve,就能合併上線了。

---

## 卡住了怎麼辦

| 狀況 | 怎麼辦 |
| --- | --- |
| `git: command not found` | Git 沒裝好,回頭裝 https://git-scm.com/downloads |
| `node: command not found` | Node.js 沒裝好,回頭裝 https://nodejs.org |
| 本機預覽打不開網頁,畫面空白 | 確認是用 `node scripts/dev-server.mjs` 開的,**不要**直接雙擊 `index.html` |
| `validate.mjs` 一直報錯 | 錯誤訊息會告訴你第幾筆、哪個欄位、怎麼修,照著改就好 |
| push 的時候要求輸入帳密,但打了密碼也失敗 | GitHub 現在不吃帳號密碼了,要用個人存取權杖(PAT)或改成 `gh auth login` 走 GitHub CLI 登入,問隊友或開 issue 求助 |
| PR 顯示衝突(conflict) | 代表你改的期間別人也改了同一段,把你的改動記下來、刪掉分支、從 Step 1 重開一次最省事 |
| 完全卡住 | 直接開一個 [Issue](https://github.com/robinaudi/iso-cert-radar/issues/new/choose) 求救,或把你要改的內容口頭/文字告訴其他隊友請他們代改 |

---

## 名詞速查(一句話版)

- **repo**:這個專案的資料夾,含所有歷史紀錄
- **fork**:把 repo 複製一份到你自己帳號底下
- **clone**:把 repo 下載到你的電腦
- **branch**:從主版本拉出來的工作分支,改壞了不影響正式版
- **commit**:一次存檔紀錄
- **push**:把本機的存檔上傳到 GitHub
- **pull**:把 GitHub 上的最新版本抓下來
- **PR(Pull Request)**:「我改好了,請看一下,沒問題就合併」的申請單
- **CI**:機器自動幫你檢查資料格式對不對
- **merge**:把 PR 的改動正式併入 main,線上就會更新
