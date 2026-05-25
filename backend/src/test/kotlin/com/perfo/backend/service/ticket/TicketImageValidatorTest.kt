package com.perfo.backend.service.ticket

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.mock.web.MockMultipartFile

class TicketImageValidatorTest {

    @Test
    @DisplayName("PNG 업로드 파일은 검증을 통과한다")
    fun validateUploadFileAcceptsPng() {
        val file = MockMultipartFile(
            "file",
            "cover.png",
            "image/png",
            byteArrayOf(
                0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0x00, 0x00, 0x00, 0x0D,
            ),
        )

        TicketImageValidator.validateUploadFile(file)
    }

    @Test
    @DisplayName("SVG 업로드 파일은 검증을 거부한다")
    fun validateUploadFileRejectsSvg() {
        val file = MockMultipartFile(
            "file",
            "cover.svg",
            "image/svg+xml",
            "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>".toByteArray(),
        )

        assertThatThrownBy { TicketImageValidator.validateUploadFile(file) }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Unsupported ticket image format")
    }

    @Test
    @DisplayName("JPEG 매직 바이트를 감지한다")
    fun detectSupportedImageDetectsJpeg() {
        val detected = TicketImageValidator.detectSupportedImage(
            byteArrayOf(0xFF.toByte(), 0xD8.toByte(), 0xFF.toByte(), 0x00),
        )

        assertThat(detected.contentType).isEqualTo("image/jpeg")
        assertThat(detected.extension).isEqualTo("jpg")
    }

    @Test
    @DisplayName("SVG 바이트는 감지를 거부한다")
    fun detectSupportedImageRejectsSvgBytes() {
        assertThatThrownBy {
            TicketImageValidator.detectSupportedImage(
                "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>".toByteArray(),
            )
        }
            .isInstanceOf(IllegalArgumentException::class.java)
            .hasMessage("Unsupported ticket image format")
    }
}
