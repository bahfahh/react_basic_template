
## Ant Design X 是一套專為 React 應用打造的 AI 元件庫，旨在簡化整合人工智慧的開發流程。它提供了多種元件，涵蓋聊天界面、提示訊息、附件管理等功能。

```md
# Ant Design X 元件總覽 (@ant-design/x)

## 📦 Common

### Bubble
- 用於顯示對話中的氣泡訊息。
```tsx
import { Bubble } from "@ant-design/x"
```

### Conversations
- 管理多個對話的清單，類似聊天室列表。
```tsx
import { Conversations } from "@ant-design/x"
```

---

## 🚀 Wake

### Welcome
- 初次載入時展示歡迎訊息。
```tsx
import { Welcome } from "@ant-design/x"
```

### Prompts
- 顯示提示建議問題，點擊可快速輸入。
```tsx
import { Prompts } from "@ant-design/x"
```

---

## ✉️ Express

### Attachments
- 顯示與管理附件列表（可拖拉上傳）。
```tsx
import { Attachments } from "@ant-design/x"

<Attachments
  items={[
    {
      uid: '1',
      name: 'file.pdf',
      status: 'done',
      url: 'https://example.com/file.pdf',
    }
  ]}
/>
```

#### Props:
- `items: Attachment[]`：附件資料。
- `overflow: 'wrap' | 'scrollX' | 'scrollY'`：溢出行為。
- `placeholder`：無資料時顯示內容。

---

### Sender
- 輸入訊息用的文字框 + 發送按鈕。
```tsx
import { Sender } from "@ant-design/x"
```

---

### Suggestion
- 顯示 AI 建議回覆或動作。
```tsx
import { Suggestion } from "@ant-design/x"
```

---

## 🧠 Confirm

### ThoughtChain
- 用來顯示 AI 的思考歷程（多步推理流程）。
```tsx
import { ThoughtChain } from "@ant-design/x"
```

---

## 🛠 Tools

### useXAgent
- hook：處理 AI agent 的邏輯。
```tsx
import { useXAgent } from "@ant-design/x"
```

---

### useXChat
- hook：管理聊天狀態與訊息流程。
```tsx
import { useXChat } from "@ant-design/x"
```

---

### XStream
- 處理訊息串流，支援 streaming responses。
```tsx
import { XStream } from "@ant-design/x"
```

---

### XRequest
- 用於封裝與 AI agent 的請求邏輯。
```tsx
import { XRequest } from "@ant-design/x"
```

---

### XProvider
- 提供 context 管理整體狀態。
```tsx
import { XProvider } from "@ant-design/x"
```

---

> 📘 文件來源：https://x.ant.design/components/overview/