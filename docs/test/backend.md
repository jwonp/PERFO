# Backend 테스트 가이드 (JUnit 5 + Mockito)

## 설치된 도구

| 도구 | 역할 |
|------|------|
| `JUnit 5` | 테스트 프레임워크 |
| `Mockito` | 의존성 mock/stub |
| `AssertJ` | 가독성 높은 assertion (`assertThat`) |
| `MockMvc` | Controller HTTP 요청/응답 테스트 |
| `H2` | 테스트용 인메모리 데이터베이스 |
| `spring-security-test` | 인증 시뮬레이션 |

---

## 테스트 종류

### 1. 단위 테스트 (Unit Test) - Service

- Spring 컨텍스트 **없이** 실행 → 빠름
- 의존성은 Mockito로 대체

```java
@ExtendWith(MockitoExtension.class)  // Spring 없이 Mockito만
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;  // 가짜 의존성

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;       // 실제 테스트 대상

    @Test
    @DisplayName("회원가입 성공")
    void signUp_success() {
        // given - 조건 설정
        given(userRepository.existsByEmail(any())).willReturn(false);
        given(userRepository.save(any())).willReturn(savedUser);

        // when - 실행
        AuthDto.AuthResponse result = authService.signUp(request);

        // then - 검증
        assertThat(result.getEmail()).isEqualTo("test@example.com");
        then(userRepository).should().save(any(User.class));
    }
}
```

### 2. 슬라이스 테스트 (Slice Test) - Controller

- **Web 레이어만** 로드 → DB/Service는 mock
- HTTP 요청/응답 검증

```java
@WebMvcTest(AuthController.class)  // Controller + MockMvc만 로드
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;  // Spring 컨텍스트에 mock 빈 등록

    @Test
    @WithMockUser  // 인증된 사용자로 요청
    void signUp_returns200() throws Exception {
        given(authService.signUp(any())).willReturn(response);

        mockMvc.perform(post("/api/auth/signup")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("test@example.com"));
    }
}
```

### 3. 통합 테스트 (Integration Test)

- **H2 인메모리 DB** 사용 → 실제 DB 없이 전체 흐름 검증
- Spring 컨텍스트 전체 로드 → 느림

```java
@SpringBootTest
@ActiveProfiles("test")          // application-test.properties 사용
@AutoConfigureMockMvc
@Transactional                   // 테스트 후 롤백
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void 회원가입_후_로그인_성공() throws Exception {
        // 1. 회원가입
        mockMvc.perform(post("/api/auth/signup")
                .contentType(APPLICATION_JSON)
                .content("""
                    {"email":"test@example.com","password":"Pass123!","name":"테스터"}
                """))
            .andExpect(status().isOk());

        // 2. 로그인
        mockMvc.perform(post("/api/auth/login")
                .contentType(APPLICATION_JSON)
                .content("""
                    {"email":"test@example.com","password":"Pass123!"}
                """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("test@example.com"));
    }
}
```

---

## Mock 패턴 (Mockito BDD 스타일)

```java
// 반환값 설정
given(repository.findById(1L)).willReturn(Optional.of(user));
given(encoder.matches(rawPw, encodedPw)).willReturn(true);

// void 메서드 stub
willDoNothing().given(service).delete(any());

// 예외 throw
given(repository.findById(99L))
    .willThrow(new RuntimeException("Not found"));

// 호출 검증
then(repository).should().save(any(User.class));
then(repository).should(never()).delete(any());
then(repository).should(times(2)).findById(any());
```

---

## AssertJ 주요 매처

```java
// 기본 값 비교
assertThat(result).isEqualTo("expected");
assertThat(result).isNotNull();
assertThat(result).isNull();

// 컬렉션
assertThat(list).hasSize(3);
assertThat(list).contains("item1", "item2");
assertThat(list).isEmpty();

// 예외
assertThatThrownBy(() -> service.doSomething())
    .isInstanceOf(RuntimeException.class)
    .hasMessage("error message");

// 문자열
assertThat(str).startsWith("prefix");
assertThat(str).contains("substring");

// 객체 필드 검증
assertThat(user)
    .hasFieldOrPropertyWithValue("email", "test@example.com")
    .hasFieldOrPropertyWithValue("provider", "credentials");
```

---

## PERFO 테스트 작성 예시

### TicketService 단위 테스트 (TDD - 구현 전 작성)

```java
@ExtendWith(MockitoExtension.class)
class TicketServiceTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private RedisInventoryService redisInventoryService;

    @InjectMocks
    private TicketService ticketService;

    @Test
    @DisplayName("재고가 있을 때 티켓팅 요청 성공")
    void requestTicket_stockAvailable_success() {
        // given
        given(redisInventoryService.decrementStock("event-1")).willReturn(true);
        given(ticketRepository.save(any())).willReturn(ticket);

        // when
        TicketResponse result = ticketService.requestTicket("user-1", "event-1");

        // then
        assertThat(result.getStatus()).isEqualTo("SUCCESS");
    }

    @Test
    @DisplayName("재고 없을 때 SOLD_OUT 반환")
    void requestTicket_noStock_returnsSoldOut() {
        // given
        given(redisInventoryService.decrementStock("event-1")).willReturn(false);

        // when
        TicketResponse result = ticketService.requestTicket("user-1", "event-1");

        // then
        assertThat(result.getStatus()).isEqualTo("SOLD_OUT");
        then(ticketRepository).should(never()).save(any());
    }
}
```

---

## 실행 명령어

```bash
# 전체 테스트 실행
./gradlew test

# 특정 클래스만
./gradlew test --tests "com.perfo.backend.service.AuthServiceTest"

# 특정 메서드만
./gradlew test --tests "*.AuthServiceTest.signUp_success"

# 실패 시 상세 출력
./gradlew test --info

# HTML 리포트 확인
open backend/build/reports/tests/test/index.html
```

---

## 테스트 작성 원칙

### DisplayName 규칙
```
"[대상] - [조건] - [결과]" 형식 권장
✅ "회원가입 - 이미 존재하는 이메일 - 예외를 던진다"
✅ "checkEmail - 미가입 이메일 - exists=false를 반환한다"
```

### AAA 패턴 (Arrange-Act-Assert)
```java
@Test
void 테스트_이름() {
    // given (Arrange) - 조건 세팅
    ...

    // when (Act) - 실행
    ...

    // then (Assert) - 검증
    ...
}
```

### 테스트 1개 = 1가지 동작만 검증
```java
// ✅ 좋음 - 하나의 명확한 동작
void signUp_duplicateEmail_throwsException()

// ❌ 나쁨 - 여러 동작을 한 테스트에서 검증
void signUp_variousCases()
```
