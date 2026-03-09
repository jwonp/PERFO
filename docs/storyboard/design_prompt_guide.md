# Google Stitch (Gemini UI Generator) 프롬프트 가이드: PERFO

이 문서는 구글 Stitch(또는 유사 UI 생성 AI)를 사용하여 PERFO 앱의 화면을 디자인할 때 **일관된 톤앤매너**를 유지하며 고품질의 결과물을 얻기 위한 프롬프트 가이드입니다.

---

## 1. 전역 디자인 시스템 (Design System)

모든 프롬프트의 최상단 스니펫(또는 시스템 지시어)으로 다음 내용을 공통으로 삽입하세요.

```text
[Design System & Guidelines]
You are an expert UI/UX designer creating modern, premium mobile-first web applications.
Please strictly adhere to the following color palette for all components:
- Primary Color: #103783 (Deep Blue, use for main buttons, active states, brand logos, primary icons)
- Secondary Color: #9BAFD9 (Soft Blue, use for secondary buttons, borders, active tab backgrounds, subtle highlights)
- Background Color (White/Light): #F3FBFF (Very Light Blue/White, use for main app background and card backgrounds)
- Text/Dark Color (Black): #342A2D (Dark Brown/Black, use for primary text, headings, and high-contrast elements)

[Dark Mode Palette Mapping]
When asked to create the interface in Dark Mode, apply the following systematic inversions:
- Background: Change #F3FBFF to a deep dark color (e.g., #1A1A1A or #121212) or dark navy.
- Cards/Surfaces: Use a slightly lighter dark tone (e.g., #262626 or strong dark blue).
- Text: Change #342A2D (Dark Brown/Black) to pure white (#FFFFFF) or very light blue (#F3FBFF) for readability.
- Primary/Secondary: Retain #103783 and #9BAFD9, but you may brighten them slightly if they lack contrast against the dark background.

Typography: Use modern, legible sans-serif fonts (e.g., Inter, Roboto). Headings should be bold and prominent, body text should be highly readable.
Style: Use a minimalist, clean aesthetic with generous whitespace, subtle rounded corners (e.g., 8px to 12px for cards/buttons), and soft shadows for depth. No clashing colors.
Mobile-first: Ensure layouts are optimized for a mobile/tablet portrait view with touch-friendly target sizes (min 44x44px for buttons).

[Prompting Rules for Consistency]
1. Explicit Hex Codes: ALWAYS use the exact hex codes provided above (#103783, #9BAFD9, etc.) instead of generic color names.
2. State Management: Clearly differentiate component states using the palette. (e.g., Active/Hover = #103783, Inactive/Border = #9BAFD9).
3. Component Separation: Design layout logically by separating generic sections (Header, Cards, Bottom Navigation, Input Fields).
4. Code Generation for Both Themes: ALWAYS generate the UI code supporting BOTH Light and Dark modes simultaneously (e.g., using Tailwind's `dark:` classes or providing two separate complete component snippets if using standard CSS/inline styles) so the user does not have to prompt separately.
```

---

## 2. 화면별 프롬프트 예시 (총 13개 화면)

각 화면 영역에 맞게 위 공통 지시어(`[Design System & Guidelines]` 전체) 다음으로 아래 프롬프트를 추가합니다.

---

### ① 랜딩 페이지
```text
[Target Page: Landing Page]
Create a clean and engaging landing page for the "PERFO" ticketing application.
- Background: #F3FBFF
- Center focus: A large, bold "PERFO" text logo using #103783.
- Below the logo: A short service introduction text in #342A2D.
- Bottom area: A large, prominent "Get Started" button spanning the width, using #103783 background with #F3FBFF text.
- Overall mood should feel welcoming and premium.
```

---

### ② 이메일 입력 or 소셜 로그인 (로그인 진입점)
```text
[Target Page: Email Input / Social Login Selection]
Design the initial authentication screen.
- Background: #F3FBFF
- Top: "PERFO" logo in #103783 with a login prompt text in #342A2D.
- Middle Section: An email input field (border color #9BAFD9, focus border #103783) and a "Next" button (#103783 background, #F3FBFF text).
- Divider: A subtle "OR" divider line in #9BAFD9.
- Bottom Section: Social login buttons labeled "Google", "Kakao", "Line", "Naver". Use standard brand icons with #342A2D text and #9BAFD9 borders.
```

---

### ③ A-2. 비밀번호 입력 (기존 회원 로그인)
```text
[Target Page: Password Input for Existing User]
Design the password entry screen for a returning user.
- Background: #F3FBFF
- Top Left: A back arrow icon in #342A2D.
- Header: "PERFO" logo in #103783, below it "{email}로 로그인 환영 문구" in #342A2D.
- "Forgot Password?" link text in #9BAFD9.
- Password input field with a show/hide eye toggle icon. Default border #9BAFD9, focused border #103783.
- "Login" button: Full-width, #103783 background, #F3FBFF text.
```

---

### ④ B-2. 회원가입 (신규 회원)
```text
[Target Page: Sign Up for New User]
Design the registration screen for a new user.
- Background: #F3FBFF
- Top Left: A back arrow icon in #342A2D.
- Header: "PERFO" logo in #103783, below it "{email}로 회원가입 문구" in #342A2D.
- Password input field with show/hide eye toggle. Default border #9BAFD9, focused border #103783.
- Password Validation Checklist (real-time feedback):
  - Four rules displayed: "8자 이상", "영문 포함", "숫자 포함", "특수 문자 포함".
  - Valid rule: checkmark icon in #103783. Invalid rule: neutral gray tone.
- "Terms of Service" link in #9BAFD9.
- "Sign Up" button: Full-width, #103783 background, #F3FBFF text.
```

---

### ⑤ C-2. 비밀번호 초기화 - 본인 인증
```text
[Target Page: Identity Verification for Password Reset]
Design the identity verification screen before password reset.
- Background: #F3FBFF
- Top Left: A back arrow icon in #342A2D.
- Header: "PERFO" logo in #103783.
- Body text: "{email}으로 본인 확인용 6자리 인증번호 발송" in #342A2D.
- A 6-digit verification code input field (border #9BAFD9, focused #103783).
- Two buttons side by side:
  - "Verify" button: #103783 background, #F3FBFF text.
  - "Resend" button: Outlined with #9BAFD9 border, #342A2D text.
```

---

### ⑥ C-3. 비밀번호 초기화 - 새 비밀번호 입력
```text
[Target Page: New Password Input for Reset]
Design the password reset screen where the user sets a new password.
- Background: #F3FBFF
- Top Left: A back arrow icon in #342A2D.
- Header: "PERFO" logo in #103783, below it "{email}에 대한 비밀번호 초기화 문구" in #342A2D.
- Two password input fields (New Password, Confirm Password), each with show/hide eye toggle. Default border #9BAFD9, focused border #103783.
- Password Validation Checklist (same as Sign Up screen ④):
  - "8자 이상", "영문 포함", "숫자 포함", "특수 문자 포함". Valid = #103783 checkmark, Invalid = neutral gray.
- "Reset Password" button: Full-width, #103783 background, #F3FBFF text.
```

---

### ⑦ C-4. 비밀번호 변경 완료
```text
[Target Page: Password Change Complete]
Design a simple confirmation screen after a successful password reset.
- Background: #F3FBFF
- Header: "PERFO" logo in #103783.
- Center: "{email}에 대한 비밀번호 변경 완료 UI" — a success icon (checkmark) in #103783 with a confirmation message in #342A2D.
- "Go to Login Page" button: Full-width, #103783 background, #F3FBFF text.
```

---

### ⑧ 예약한 티켓 리스트 (메인 탭 1 - 리스트)
```text
[Target Page: Reserved Tickets List]
Design the main ticket list screen for a user's reserved tickets.
- Background: #F3FBFF
- Header: Title "예약한 티켓" in #342A2D, a search icon and a notification bell icon in #342A2D.
- Below header: A "사용한 티켓만 표시" toggle button (Off = #9BAFD9, On = #103783).
- Content: A vertically scrollable (infinite scroll) list of Ticket Cards.
- Ticket Card Design:
  - Card background: White with subtle drop shadow. Border radius 12px.
  - Ticket background image displayed at the top of the card.
  - Status badge: (e.g., "사용 전" in #9BAFD9, "순서 대기중" in #9BAFD9, "현재 순서임" in #103783, "사용 완료" in neutral gray).
  - Info: Ticket Name (Bold #342A2D), Ticket Number, Venue, Valid Date.
  - "QR 표시" button: Outlined in #103783.
- Bottom Navigation (Sticky): 3 tabs — "예약한 티켓" (active, #103783), "내가 발급한 티켓" (#9BAFD9), "유저 정보" (#9BAFD9).
```

---

### ⑨ 예약한 티켓 상세 - 사용 전
```text
[Target Page: Reserved Ticket Detail — Before Use]
Design the detail view for a reserved ticket that has NOT been used yet.
- Background: #F3FBFF
- Top Left: A back arrow icon in #342A2D.
- Ticket Card (large, prominent):
  - Ticket background image at the top.
  - Status badge: Current status (e.g., "사용 전", "순서 대기중", "현재 순서임") using #103783 or #9BAFD9.
  - Ticket Number in #342A2D.
  - Ticket Name (Bold, large, #342A2D).
  - Valid Date and Venue in #342A2D.
  - Ticket Usage Location in #342A2D.
- QR Code Section: A large, clearly visible QR code image centered below the ticket info.
- Bottom Navigation: Same as ⑧, "예약한 티켓" tab active (#103783).
```

---

### ⑩ 예약한 티켓 상세 - 사용 후
```text
[Target Page: Reserved Ticket Detail — After Use]
Design the detail view for a reserved ticket that has ALREADY been used.
- Background: #F3FBFF
- Top Left: A back arrow icon in #342A2D.
- Ticket Card (large):
  - Ticket background image at the top.
  - Status badge: "사용 완료" in neutral gray or muted tone (NOT primary blue).
  - Ticket Number in #342A2D.
  - Ticket Name (Bold, large, #342A2D).
  - Valid Date and Venue in #342A2D.
  - Ticket Usage Location in #342A2D.
- Instead of QR Code: Display the actual used date and a "사용완료" confirmation message in #342A2D, styled distinctly (e.g., with a subtle background or stamp-like visual).
- Bottom Navigation: Same as ⑧, "예약한 티켓" tab active (#103783).
```

---

### ⑪ 내가 발급한 티켓 리스트 (메인 탭 2 - 리스트)
```text
[Target Page: My Issued Tickets List]
Design the ticket management list screen for event organizers/issuers.
- Background: #F3FBFF
- Header: Title "예약한 티켓" in #342A2D (same header area), search icon and notification bell.
- Content: A vertically scrollable (infinite scroll) list of Issued Ticket Cards.
- Issued Ticket Card Design:
  - Card background: White with subtle drop shadow. Border radius 12px.
  - Ticket background image displayed at the top.
  - Status badge: (e.g., "티켓 발급중" in #103783, "비활성화" in neutral gray, "기간만료" in neutral gray, "티켓 검표중" in #9BAFD9).
  - Info: Ticket Name (Bold #342A2D), Venue, Valid Date.
  - Ticket count stat: "발급된 티켓 수 / 전체 티켓 수" in #342A2D.
- Bottom Navigation: 3 tabs — "예약한 티켓" (#9BAFD9), "내가 발급한 티켓" (active, #103783), "유저 정보" (#9BAFD9).
```

---

### ⑫ 티켓 검표 화면 (QR 스캐너)
```text
[Target Page: QR Scanner for Ticket Validation]
Design the ticket validation/scanning screen for event organizers.
- Background: #342A2D (Dark background for camera mode visibility).
- Top Left: A back arrow icon in #F3FBFF.
- Header Info:
  - Ticket/Event Name in #F3FBFF.
  - If the event uses sequential entry: Display "순서대로 티켓을 취소할 수 있는 경우" and "현재 순서 번호" in #F3FBFF or #9BAFD9.
- Center: A square camera viewfinder overlay frame (simulating QR scanning). Use #103783 or #9BAFD9 for the targeting corner reticle lines.
- Scan Result Area (below viewfinder):
  - On success: "(티켓 번호)번 티켓 확인 문구" with a #103783 checkmark icon and #F3FBFF text.
  - On failure: "티켓 확인 실패 문구" with a warning/error icon in a standard alert color and #F3FBFF text.
- Bottom Navigation: "내가 발급한 티켓" tab active (#103783).
```

---

### ⑬ 유저 정보 페이지 (메인 탭 3 - 마이페이지)
```text
[Target Page: User Profile & Settings]
Design a clean settings and profile management page.
- Background: #F3FBFF
- Profile Section (Top):
  - Circular user avatar placeholder icon.
  - User Name (Bold #342A2D) with an edit (pencil) icon button.
  - User ID displayed below the name in #9BAFD9 or lighter #342A2D.
- APP SETTINGS Section:
  - "다크 모드" with a toggle switch (Off = #9BAFD9, On = #103783).
  - "푸시 알림 설정" with a toggle switch (Off = #9BAFD9, On = #103783).
- SUPPORT Section:
  - "고객 문의" with a right chevron icon (#342A2D) for navigation.
  - "Privacy Policy" with a right chevron icon (#342A2D) for navigation.
- Bottom: A "로그아웃" button, centered, text in #342A2D or subtle red for emphasis.
- Bottom Navigation: 3 tabs — "예약한 티켓" (#9BAFD9), "내가 발급한 티켓" (#9BAFD9), "유저 정보" (active, #103783).
```

---

## 3. 프롬프팅 팁 (Tips for Consistency)

1. **지속적인 컨텍스트 제공:** Stitch가 이전 화면 디자인을 기억하지 못할 수 있으므로, 매 화면을 생성할 때마다 `[Design System & Guidelines]`의 컬러 및 분위기 설명값을 항상 포함하세요.
2. **명확한 컴포넌트 분리:** "Card", "Header", "Bottom Navigation", "Input Field" 등 영역별로 지시를 명확하게 나누어 (Bullet point 활용) 작성하면 AI가 레이아웃을 잡기 훨씬 편합니다.
3. **색상 코드 명시:** "파란색 버튼"이라고 하기보다 "Primary Color(#103783) 배경의 버튼"이라고 명시적으로 적어주어야 지정한 팔레트에서 벗어나지 않습니다.
4. **상태(State) 묘사:** 입력창의 활성화/비활성화, 버튼의 Hover/Pressed 상태, 토글의 On/Off 상태를 묘사할 때 지정한 색상(주석 처리된 Primary/Secondary) 내에서 조합하도록 유도하세요. (예: "비활성 토글은 #9BAFD9, 활성 토글은 #103783 사용")
