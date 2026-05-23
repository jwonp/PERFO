# iPad Safari 장소 자동완성 미노출 분석 및 해결안

> 관련 코드:
> `frontend/app/[locale]/(main)/my-tickets/PlaceAutocompleteInput.tsx`
> `frontend/components/ui/bottom-sheet.tsx`

## 1. 문제 상황

아이패드 Safari에서 `마이 티켓 > 티켓 발급` 바텀시트를 열고 `사용 장소`를 입력해도 장소 자동완성 리스트가 뜨지 않는다.

사용자가 제공한 화면 기준 증상:

- 입력값은 들어가 있음: `올림픽`
- 자동완성 상태 문구는 `장소 자동완성을 불러오는 중입니다`
- 입력 아래 제안 리스트는 보이지 않음

이 상태는 단순 스타일 문제보다, 자동완성 서비스가 `ready` 상태로 올라오지 못한 경우와 일치한다.

## 2. 원인 분석

### 원인 1. `next/script` 재마운트 대응이 없어 `loading`에서 멈출 수 있다

`PlaceAutocompleteInput`은 Google Maps Places 스크립트 준비 여부를 `scriptLoaded` state로 관리한다.

```tsx
const [scriptLoaded, setScriptLoaded] = useState(false);

useEffect(() => {
  if (!googleMapsApiKey) {
    setStatus("unavailable");
    return;
  }

  if (!scriptLoaded || autocompleteServiceRef.current) {
    return;
  }

  const AutocompleteService = window.google?.maps?.places?.AutocompleteService;

  if (!AutocompleteService) {
    setStatus("error");
    return;
  }

  autocompleteServiceRef.current = new AutocompleteService();
  setStatus("ready");
}, [scriptLoaded]);
```

하지만 이 입력 컴포넌트는 바텀시트 내부에 있고, 바텀시트가 닫히면 통째로 언마운트된다.

`BottomSheet` 구현:

```tsx
if (!open) return null
```

즉 플로우는 아래처럼 된다.

1. 바텀시트 최초 오픈
2. Google Maps 스크립트 로드
3. 바텀시트 닫힘
4. `PlaceAutocompleteInput` 언마운트
5. 바텀시트 재오픈
6. 같은 스크립트는 이미 페이지에 존재하지만 새 컴포넌트 인스턴스의 `scriptLoaded`는 다시 `false`
7. 현재 코드는 `onLoad`가 다시 호출되지 않으면 초기화를 진행하지 못함
8. 결과적으로 `status = "loading"`이 유지되고 예측 요청도 실행되지 않음

이 경우 입력값은 보여도 리스트는 절대 열리지 않는다. 사용자가 제공한 스크린샷의 상태 문구가 정확히 이 경로와 맞는다.

### 원인 2. iPad 터치 선택 시 `onMouseDown`만 막고 있어 후속 문제가 남을 수 있다

자동완성 옵션 선택 로직은 blur race를 막기 위해 `onMouseDown`에서 `preventDefault()`를 건다.

```tsx
onMouseDown={(event) => {
  event.preventDefault();
}}
```

데스크톱 마우스 환경에서는 유효하지만, 터치 중심인 iPad Safari에서는 `pointer` 또는 `touch` 기준으로 blur가 먼저 발생할 수 있다.

즉 원인 1을 고쳐 리스트가 보이더라도, iPad에서 항목 탭 시 선택이 불안정할 가능성이 남아 있다.

이 이슈는 "리스트가 안 뜨는 직접 원인"은 아니지만, iPad 대응 완성도를 위해 함께 정리해야 한다.

## 3. 왜 현재 화면에서 리스트가 안 보이는가

스크린샷에서 보이는 문구는 `loadingLabel`이다.

`PlaceAutocompleteInput.tsx` 기준 이 문구는 `status === "loading"`일 때만 노출된다.

반면 자동완성 팝업은 아래 조건을 만족해야만 열린다.

```tsx
const shouldShowPopup =
  isOpen &&
  (predictionState === "loading" ||
    predictionState === "empty" ||
    predictions.length > 0);
```

문제는 자동완성 서비스가 초기화되지 않으면 검색 `useEffect`가 바로 return 한다는 점이다.

```tsx
if (!service || status === "error" || status === "unavailable") {
  return;
}
```

즉 현재 상태에서는:

- status는 `loading`
- service는 `null`
- predictionState는 `idle`
- predictions는 `[]`

그래서 상태 문구만 `불러오는 중`으로 남고, 팝업은 열 조건을 만족하지 못해 보이지 않는다.

## 4. 해결 방향

### 해결 1. `onLoad` 중심 초기화 대신 "이미 로드된 스크립트"도 처리해야 한다

가장 안전한 방법은 초기화 함수를 분리하고, 아래 두 경로 모두에서 실행되게 만드는 것이다.

- `Script onReady`
- 컴포넌트 마운트 시 `window.google?.maps?.places`가 이미 있으면 즉시 초기화

Next.js 공식 문서도 재마운트 케이스에는 `onReady` 사용을 권장한다.  
`onLoad`는 최초 로드 후 1회성에 가깝고, `onReady`는 첫 로드 이후와 재마운트 시점 모두에 맞다.

권장 구조:

```tsx
const initializeAutocomplete = () => {
  if (!googleMapsApiKey || autocompleteServiceRef.current) {
    return;
  }

  const AutocompleteService = window.google?.maps?.places?.AutocompleteService;

  if (!AutocompleteService) {
    setStatus("error");
    return;
  }

  autocompleteServiceRef.current = new AutocompleteService();
  setStatus("ready");
};

useEffect(() => {
  if (!googleMapsApiKey) {
    setStatus("unavailable");
    return;
  }

  if (window.google?.maps?.places?.AutocompleteService) {
    initializeAutocomplete();
  }
}, []);

<Script
  id="google-maps-places"
  src={...}
  strategy="afterInteractive"
  onReady={initializeAutocomplete}
  onError={() => setStatus("error")}
/>
```

핵심은 `scriptLoaded` 같은 별도 state에 의존하지 말고, 실제 런타임의 `window.google` 존재 여부로 초기화 가능성을 판단하는 것이다.

### 해결 2. Google Places 로딩을 `importLibrary("places")` 기반으로 바꾸는 것도 검토할 수 있다

Google Maps 공식 문서는 현재 `google.maps.importLibrary("places")` 경로를 안내한다.

```tsx
const { AutocompleteService } = await google.maps.importLibrary("places");
```

장점:

- 라이브러리 준비 여부를 promise 기반으로 다룰 수 있다
- 조건부 마운트와 재초기화 흐름을 더 명확하게 제어할 수 있다
- 추후 `AutocompleteSuggestion` 마이그레이션과도 연결하기 쉽다

단, 이번 이슈의 직접 수정만 보면 `onReady + initializeAutocomplete()`로도 충분하다.

### 해결 3. iPad 터치 선택 안정성을 보강한다

옵션 버튼에는 최소한 아래 중 하나가 필요하다.

- `onPointerDown={(event) => event.preventDefault()}`
- 필요 시 `onTouchStart` 보강

권장 예시:

```tsx
<button
  type="button"
  onPointerDown={(event) => {
    event.preventDefault();
  }}
  onClick={() => handleSelectPrediction(prediction)}
>
```

이렇게 해야 iPad Safari에서 입력 blur가 먼저 발생해 선택이 끊기는 문제를 줄일 수 있다.

## 5. 우선순위별 수정안

### 필수 수정

1. `scriptLoaded` state 의존 제거
2. `initializeAutocomplete` 함수 분리
3. `Script` 콜백을 `onLoad` 대신 `onReady`로 변경
4. 마운트 시 `window.google`가 이미 있는 경우 즉시 초기화

### 권장 수정

1. 옵션 선택 이벤트를 `onPointerDown` 중심으로 변경
2. iPad Safari 재현 테스트 추가
3. 가능하면 `AutocompleteService` 대신 최신 Places 로더 패턴 검토

## 6. 테스트 보강 포인트

현재 단위 테스트는 "스크립트 최초 로드 후 목록이 뜨는가"만 검증하고, "컴포넌트 재마운트 후에도 초기화되는가"는 검증하지 않는다.

추가해야 할 테스트:

1. `PlaceAutocompleteInput`를 mount → unmount → remount 했을 때 기존 `window.google`로 다시 `ready` 상태에 들어가는지
2. iPad 계열 터치 시뮬레이션에서 옵션 선택 후 `onPlaceSelect`가 정상 호출되는지
3. 바텀시트를 닫았다가 다시 열어도 자동완성이 계속 동작하는지

## 7. 운영 확인 항목

코드 수정 후에도 첫 진입부터 `loading`에 머문다면 아래를 별도로 확인한다.

1. 배포 환경에서 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`가 실제 프런트 빌드 시점에 주입됐는지
2. Google Maps JavaScript API referrer 제한에 `https://perfo.amaneta.me/*`가 포함돼 있는지
3. iPad Safari의 콘텐츠 차단기나 네트워크 정책이 `maps.googleapis.com` 요청을 막지 않는지

다만 현재 코드 기준으로 가장 먼저 수정해야 할 부분은 운영 설정이 아니라 재마운트 초기화 로직이다.

## 8. 결론

이번 이슈의 1차 원인은 **바텀시트 재오픈 시 `PlaceAutocompleteInput`가 다시 마운트되는데, Google Places 초기화를 `next/script onLoad` 1회성 이벤트에만 의존한 구조**다.

이 때문에 아이패드 Safari에서 현재처럼:

- 입력값은 보이지만
- 상태 문구는 계속 `불러오는 중`이고
- 자동완성 리스트는 열리지 않는

현상이 발생할 수 있다.

수정 우선순위는 아래가 맞다.

1. `onReady`와 런타임 초기화 함수로 재마운트 대응
2. `onPointerDown`으로 터치 선택 안정화
3. 재마운트/모바일 Safari 테스트 추가

## 9. 참고 문서

- Next.js `Script` API:
  `https://nextjs.org/docs/app/api-reference/components/script`
- Google Maps Places AutocompleteService:
  `https://developers.google.com/maps/documentation/javascript/reference/places-autocomplete-service`
- Google Maps Places migration overview:
  `https://developers.google.com/maps/documentation/javascript/places-migration-overview`
