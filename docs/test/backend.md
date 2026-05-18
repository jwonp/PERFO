# Backend 테스트 가이드 (Kotlin + JUnit 5 + Mockito)

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

```kotlin
@ExtendWith(MockitoExtension::class) // Spring 없이 Mockito만
class AuthServiceTest {

    @Mock
    lateinit var userRepository: UserRepository // 가짜 의존성

    @Mock
    lateinit var passwordEncoder: PasswordEncoder

    @InjectMocks
    lateinit var authService: AuthService // 실제 테스트 대상

    @Test
    @DisplayName("회원가입 성공")
    fun signUp_success() {
        // given - 조건 설정
        given(userRepository.existsByEmail(any())).willReturn(false)
        given(userRepository.save(any())).willReturn(savedUser)

        // when - 실행
        val result = authService.signUp(request)

        // then - 검증
        assertThat(result.email).isEqualTo("test@example.com")
        then(userRepository).should().save(any<User>())
    }
}
```

### 2. 슬라이스 테스트 (Slice Test) - Controller

- **Web 레이어만** 로드 → DB/Service는 mock
- HTTP 요청/응답 검증

```kotlin
@WebMvcTest(AuthController::class) // Controller + MockMvc만 로드
class AuthControllerTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @MockBean
    lateinit var authService: AuthService // Spring 컨텍스트에 mock 빈 등록

    @Test
    @WithMockUser // 인증된 사용자로 요청
    fun signUp_returns200() {
        given(authService.signUp(any())).willReturn(response)

        mockMvc.perform(post("/api/auth/signup")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("test@example.com"))
    }
}
```

### 3. 통합 테스트 (Integration Test)

- **H2 인메모리 DB** 사용 → 실제 DB 없이 전체 흐름 검증
- Spring 컨텍스트 전체 로드 → 느림

```kotlin
@SpringBootTest
@ActiveProfiles("test") // application-test.properties 사용
@AutoConfigureMockMvc
@Transactional // 테스트 후 롤백
class AuthIntegrationTest {

    @Autowired
    lateinit var mockMvc: MockMvc

    @Test
    fun 회원가입_후_로그인_성공() {
        // 1. 회원가입
        mockMvc.perform(post("/api/auth/signup")
                .contentType(APPLICATION_JSON)
                .content("""
                    {"email":"test@example.com","password":"Pass123!","name":"테스터"}
                """))
            .andExpect(status().isOk())

        // 2. 로그인
        mockMvc.perform(post("/api/auth/login")
                .contentType(APPLICATION_JSON)
                .content("""
                    {"email":"test@example.com","password":"Pass123!"}
                """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("test@example.com"))
    }
}
```

---

## Mock 패턴 (Mockito BDD 스타일)

```kotlin
// 반환값 설정
given(repository.findById(1L)).willReturn(Optional.of(user))
given(encoder.matches(rawPw, encodedPw)).willReturn(true)

// void 메서드 stub
willDoNothing().given(service).delete(any())

// 예외 throw
given(repository.findById(99L))
    .willThrow(RuntimeException("Not found"))

// 호출 검증
then(repository).should().save(any<User>())
then(repository).should(never()).delete(any())
then(repository).should(times(2)).findById(any())
```

---

## AssertJ 주요 매처

```kotlin
// 기본 값 비교
assertThat(result).isEqualTo("expected")
assertThat(result).isNotNull()
assertThat(result).isNull()

// 컬렉션
assertThat(list).hasSize(3)
assertThat(list).contains("item1", "item2")
assertThat(list).isEmpty()

// 예외
assertThatThrownBy { service.doSomething() }
    .isInstanceOf(RuntimeException::class.java)
    .hasMessage("error message")

// 문자열
assertThat(str).startsWith("prefix")
assertThat(str).contains("substring")

// 객체 필드 검증
assertThat(user)
    .hasFieldOrPropertyWithValue("email", "test@example.com")
    .hasFieldOrPropertyWithValue("provider", "credentials")
```

---

## PERFO 테스트 작성 예시

### TicketingService 통합 테스트

```kotlin
@SpringBootTest
@ActiveProfiles("test")
class TicketingServiceTest {

    @Autowired
    private lateinit var eventRepository: EventRepository

    @Autowired
    private lateinit var ticketRepository: TicketRepository

    @Autowired
    private lateinit var ticketingService: TicketingService

    @Test
    @DisplayName("판매 오픈 이후면 즉시 성공하고 재고와 티켓 번호를 같은 트랜잭션에서 반영한다")
    fun submitRequest_afterOpen_createsTicketsAndDecrementsInventory() {
        val event = eventRepository.save(activeEvent(remainingQuantity = 5, nextTicketNumber = 10))

        val response = ticketingService.submitRequest(
            authenticatedUserId = 2L,
            request = TicketDto.TicketingRequestSubmitRequest(
                requestId = "req_after_open_0001",
                eventId = event.id!!,
                quantity = 2,
            ),
        )

        val persistedEvent = eventRepository.findById(event.id!!).orElseThrow()
        val tickets = ticketRepository.findByEventIdAndUserIdOrderByIdAsc(event.id!!, 2L)

        assertThat(response.result).isEqualTo(TicketPurchaseResult.SUCCESS)
        assertThat(response.ticketNumbers).containsExactly(10, 11)
        assertThat(persistedEvent.remainingQuantity).isEqualTo(3)
        assertThat(tickets).hasSize(2)
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
```kotlin
@Test
fun 테스트_이름() {
    // given (Arrange) - 조건 세팅
    ...

    // when (Act) - 실행
    ...

    // then (Assert) - 검증
    ...
}
```

### 테스트 1개 = 1가지 동작만 검증
```kotlin
// ✅ 좋음 - 하나의 명확한 동작
fun signUp_duplicateEmail_throwsException()

// ❌ 나쁨 - 여러 동작을 한 테스트에서 검증
fun signUp_variousCases()
```
