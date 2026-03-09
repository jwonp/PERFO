# syntax=docker/dockerfile:1
FROM eclipse-temurin:17-jdk AS base
WORKDIR /app
COPY gradle gradle
COPY gradlew build.gradle settings.gradle ./
# --mount=type=cache: ~/.gradle를 호스트에 캐시 → build.gradle이 바뀌어도 재다운로드 없음
RUN --mount=type=cache,id=gradle-cache,target=/root/.gradle \
    chmod +x gradlew && ./gradlew dependencies --no-daemon

# --- Production build ---
FROM base AS build
COPY src src
RUN --mount=type=cache,id=gradle-cache,target=/root/.gradle \
    ./gradlew bootJar --no-daemon

FROM eclipse-temurin:17-jre AS prod
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]

# --- Development (hot reload via bootRun) ---
FROM base AS dev
CMD ["./gradlew", "bootRun", "--no-daemon"]
